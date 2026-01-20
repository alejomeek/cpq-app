import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { syncWixToFirestore } from '../../services/wixService';
import { useAuth } from '../../context/useAuth';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function WixIntegrationModule({ db }) {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);

  // Cargar última sincronización
  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;

      try {
        const syncDoc = await getDoc(doc(db, `usuarios/${user.uid}/settings/wix_sync`));
        if (syncDoc.exists()) {
          const data = syncDoc.data();
          if (data.lastSync) {
            setLastSync({
              date: data.lastSync.toDate(),
              count: data.productsCount || 0
            });
          }
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
      }
    };

    loadData();
  }, [db, user]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await syncWixToFirestore(db, user.uid);

      setSyncResult({
        success: true,
        message: `✅ ${result.count} productos sincronizados exitosamente`,
        count: result.count
      });

      setLastSync({
        date: new Date(),
        count: result.count
      });
    } catch (err) {
      console.error('Error al sincronizar:', err);
      setError(`❌ Error al sincronizar: ${err.message}`);
      setSyncResult({
        success: false,
        message: err.message
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Nunca';
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Integración con Wix
        </CardTitle>
        <CardDescription>
          Sincroniza productos desde tu tienda Wix manualmente.
          Presiona "Sincronizar Ahora" cuando quieras actualizar el catálogo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Información de última sincronización */}
        {lastSync && (
          <div className="p-4 bg-muted rounded-md">
            <div className="text-sm space-y-1">
              <p>
                <strong>Última sincronización:</strong> {formatDate(lastSync.date)}
              </p>
              <p>
                <strong>Productos sincronizados:</strong> {lastSync.count.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Botón de sincronización */}
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="w-full"
          size="lg"
        >
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Ahora
            </>
          )}
        </Button>

        {/* Resultado de sincronización */}
        {syncResult && (
          <div className={`flex items-start gap-2 p-3 rounded-md ${syncResult.success
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
            {syncResult.success ? (
              <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            )}
            <div className="text-sm">
              {syncResult.message}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 text-red-800 border border-red-200">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="pt-3 border-t text-center">
          <p className="text-xs text-muted-foreground">
            <strong>Nota:</strong> Los productos se sincronizarán manualmente al presionar el botón.
            <br />
            Se recomienda sincronizar 1-2 veces al día.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
