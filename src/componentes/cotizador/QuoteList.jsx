import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/useAuth';
import { getFunctions } from 'firebase/functions';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { createColumns } from './columns.jsx';
import { DataTable } from '@/ui/DataTable.jsx';
import AlertDialog from '../comunes/AlertDialog.jsx';
import CardView from '../comunes/CardView';
import QuoteCard from './QuoteCard';
import { QuoteBoard } from './QuoteBoard.jsx';
import { SendEmailDialog } from './SendEmailDialog.jsx';
import { useSendQuoteEmail } from '@/hooks/useSendQuoteEmail.jsx';

// --- Icons (sin cambios) ---
const ListIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 9a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 14a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"></path></svg>;
const CardsIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>;
const BoardIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm7 0a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1V3zm7 0a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1h-4a1 1 0 01-1-1V3z"></path></svg>;
const PlusIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>;
const SearchIcon = () => <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;

// --- normalizarTexto (sin cambios) ---
const normalizarTexto = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

const QuoteList = ({ db, onAddNewQuote, onEditQuote, setNotification, clients, loadingClients }) => {
    const { user } = useAuth();

    // --- State variables ---
    const [quotes, setQuotes] = useState([]);
    const [loadingQuotes, setLoadingQuotes] = useState(true);
    const [error, setError] = useState(null);
    const [view, setView] = useState('list');
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [itemsToDelete, setItemsToDelete] = useState([]);
    const [filtroGlobal, setFiltroGlobal] = useState('');

    const [globalConfig, setGlobalConfig] = useState(null);
    const [loadingConfig, setLoadingConfig] = useState(true);

    // NUEVO: Estado para productos
    const [products, setProducts] = useState([]);

    // NUEVO: Estados para email
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);

    // NUEVO: Hook de envío de email
    const functions = getFunctions();
    const { sendQuoteEmail, sending: sendingEmail } = useSendQuoteEmail(functions);

    const handleDeleteQuote = (quoteId) => {
        setItemsToDelete([quoteId]);
        setDialogOpen(true);
    };

    // NUEVO: Función para abrir dialog de email
    const handleSendEmail = (quote, client) => {
        setSelectedQuote(quote);
        setSelectedClient(client);
        setEmailDialogOpen(true);
    };

    // NUEVO: Función para cargar productos
    const fetchProducts = useCallback(async () => {
        if (!user || !user.uid) return;
        try {
            const productsSnap = await getDocs(collection(db, "usuarios", user.uid, "productos"));
            setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }, [db, user]);

    // NUEVO: Función para enviar email
    const handleSendEmailSubmit = async (email) => {
        try {
            await sendQuoteEmail({
                quoteId: selectedQuote.id,
                quote: selectedQuote,
                client: {
                    ...selectedClient,
                    email: email
                },
                products: products,
                quoteStyleName: globalConfig?.quoteStyle || 'Bubble'
            });

            // Recargar cotizaciones para reflejar el cambio de estado
            fetchQuotes();

            setNotification({
                type: 'success',
                title: 'Email enviado',
                message: `Cotización enviada exitosamente a ${email}`
            });
        } catch (error) {
            console.error('Error enviando email:', error);
            setNotification({
                type: 'error',
                title: 'Error',
                message: error.message || 'No se pudo enviar el email'
            });
        }
    };

    // ¡CAMBIO! useEffect para cargar configuración DEL USUARIO
    useEffect(() => {
        const fetchGlobalConfig = async () => {
            // ¡NUEVO! Validar que el usuario esté autenticado
            if (!db || !user || !user.uid) {
                setLoadingConfig(false);
                return;
            }

            setLoadingConfig(true);
            try {
                // ¡CAMBIO! Ruta anidada con user.uid
                const configRef = doc(db, 'usuarios', user.uid, 'configuracion', 'global');
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    setGlobalConfig(configSnap.data());
                    console.log("[QuoteList] Global config loaded:", configSnap.data());
                } else {
                    console.warn("[QuoteList] Global config document not found.");
                    setGlobalConfig({});
                }
            } catch (err) {
                console.error("[QuoteList] Error fetching global config:", err);
                setError("Error al cargar configuración global.");
                setGlobalConfig({});
            } finally {
                setLoadingConfig(false);
            }
        };
        fetchGlobalConfig();
    }, [db, user]); // ¡CAMBIO! Añadir 'user' a las dependencias

    // NUEVO: useEffect para cargar productos
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const columns = useMemo(() => {
        const quoteStyle = globalConfig?.quoteStyle || 'Bubble';
        console.log("[QuoteList] Passing quoteStyle to createColumns:", quoteStyle);
        return createColumns(
            onEditQuote,
            handleDeleteQuote,
            clients,
            quoteStyle,
            handleSendEmail, // Pasar función de email
            products, // NUEVO: Pasar productos para imágenes en PDF
            user?.uid // NUEVO: Pasar userId para cargar logo
        );
    }, [onEditQuote, clients, globalConfig, products, user]);

    // ¡CAMBIO! fetchQuotes ahora obtiene cotizaciones DEL USUARIO
    const fetchQuotes = useCallback(async () => {
        // ¡NUEVO! Validar que el usuario esté autenticado
        if (!user || !user.uid) {
            setLoadingQuotes(false);
            return;
        }

        setLoadingQuotes(true);
        setError(null);
        try {
            // ¡CAMBIO! Ruta anidada con user.uid
            const querySnapshot = await getDocs(
                collection(db, "usuarios", user.uid, "cotizaciones")
            );
            const quotesData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    vencimiento: data.vencimiento ? data.vencimiento.toDate() : null
                };
            });
            quotesData.sort((a, b) => (b.fechaCreacion?.toMillis() || 0) - (a.fechaCreacion?.toMillis() || 0));
            setQuotes(quotesData);
        } catch (err) {
            console.error("Error fetching quotes:", err);
            setError("No se pudieron cargar las cotizaciones.");
        } finally {
            setLoadingQuotes(false);
        }
    }, [db, user]); // ¡CAMBIO! Añadir 'user' a las dependencias

    useEffect(() => {
        fetchQuotes();
    }, [fetchQuotes]);

    const quotesFiltrados = useMemo(() => {
        const terminoNormalizado = normalizarTexto(filtroGlobal);
        if (!terminoNormalizado) {
            return quotes;
        }
        return quotes.filter(quote => {
            const numeroNormalizado = normalizarTexto(quote.numero);
            const clienteNormalizado = normalizarTexto(quote.clienteNombre);
            return (
                numeroNormalizado.includes(terminoNormalizado) ||
                clienteNormalizado.includes(terminoNormalizado)
            );
        });
    }, [quotes, filtroGlobal]);

    const handleDeleteSelected = (selectedRows) => {
        const idsToDelete = selectedRows.map(row => row.original.id);
        setItemsToDelete(idsToDelete);
        setDialogOpen(true);
    };

    // ¡CAMBIO! confirmDeletion ahora elimina de la ruta anidada
    const confirmDeletion = async () => {
        // ¡NUEVO! Validar que el usuario esté autenticado
        if (!user || !user.uid) {
            setNotification({ type: 'error', title: 'Error', message: 'No se pudo verificar el usuario para eliminar.' });
            return;
        }

        try {
            const batch = writeBatch(db);
            itemsToDelete.forEach(id => {
                // ¡CAMBIO! Ruta anidada con user.uid
                batch.delete(doc(db, "usuarios", user.uid, "cotizaciones", id));
            });
            await batch.commit();
            fetchQuotes();
            setNotification({
                type: 'success',
                title: 'Operación exitosa',
                message: `${itemsToDelete.length} cotización(es) eliminada(s).`
            });
            setDialogOpen(false);
            setItemsToDelete([]);
        } catch (err) {
            setNotification({ type: 'error', title: 'Error', message: 'No se pudieron eliminar las cotizaciones.' });
            console.error("Error deleting quotes:", err);
        }
    };

    if (loadingQuotes || loadingClients || loadingConfig) return <div className="text-center p-10 text-muted-foreground">Cargando datos...</div>;
    if (error) return <div className="text-center p-10 text-destructive">{error}</div>;

    return (
        <div className="min-w-0">
            <AlertDialog
                isOpen={isDialogOpen}
                onClose={() => setDialogOpen(false)}
                onConfirm={confirmDeletion}
                title="¿Estás completamente seguro?"
                description={`Esta acción no se puede deshacer. Se eliminarán permanente ${itemsToDelete.length} cotización(es).`}
            />

            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Cotizaciones</h1>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-muted rounded-lg p-1 border">
                        <button onClick={() => setView('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Vista de Lista"><ListIcon /></button>
                        <button onClick={() => setView('card')} className={`p-1.5 rounded-md ${view === 'card' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Vista de Tarjetas"><CardsIcon /></button>
                        <button onClick={() => setView('board')} className={`p-1.5 rounded-md ${view === 'board' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Vista de Tablero"><BoardIcon /></button>
                    </div>
                    <Button onClick={onAddNewQuote}><PlusIcon className="mr-2 h-4 w-4" /> Nueva Cotización</Button>
                </div>
            </div>

            <div className="mb-4 relative">
                <Input placeholder="Filtrar por número o cliente..." value={filtroGlobal} onChange={(e) => setFiltroGlobal(e.target.value)} className="max-w-sm pl-10" />
                <div className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></div>
            </div>

            {quotesFiltrados.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    {filtroGlobal ? "No hay resultados para tu búsqueda." : "No hay cotizaciones."}
                </div>
            ) : view === 'list' ? (
                <DataTable
                    columns={columns}
                    data={quotesFiltrados}
                    onDeleteSelectedItems={handleDeleteSelected}
                />
            ) : view === 'card' ? (
                <CardView
                    items={quotesFiltrados}
                    onCardClick={onEditQuote}
                    renderCard={(quote) => <QuoteCard quote={quote} />}
                />
            ) : (
                <QuoteBoard
                    quotes={quotesFiltrados}
                    setQuotes={setQuotes}
                    db={db}
                    setNotification={setNotification}
                    fetchQuotes={fetchQuotes}
                />
            )}

            {/* NUEVO: Dialog de Envío de Email */}
            {emailDialogOpen && (
                <SendEmailDialog
                    open={emailDialogOpen}
                    onOpenChange={setEmailDialogOpen}
                    client={selectedClient}
                    quote={selectedQuote}
                    onSend={handleSendEmailSubmit}
                    sending={sendingEmail}
                />
            )}
        </div>
    );
};

export default QuoteList;