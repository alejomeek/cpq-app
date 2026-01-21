import React, { useState, useMemo } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/useAuth'; // ¡NUEVO!

// --- Importaciones de Dnd-Kit ---
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

// --- Importaciones de Componentes de UI ---
import { QuoteColumn } from './QuoteColumn';
import { SortableQuoteCard } from './SortableQuoteCard';
import QuoteCard from './QuoteCard';
import { ScrollArea, ScrollBar } from "@/ui/scroll-area.jsx";

// --- Constantes del Tablero ---
const BOARD_COLUMNS = {
  'Borrador': 'Borrador',
  'Enviada': 'Enviada',
  'Ganada': 'Ganada',
  'Perdida': 'Perdida',
};

// ¡CAMBIO! Ya NO recibe 'user' como prop
export function QuoteBoard({ quotes, setQuotes, db, setNotification, fetchQuotes }) {
  // ¡NUEVO! Obtener user del Context
  const { user } = useAuth();

  const [activeQuote, setActiveQuote] = useState(null);
  const [originalDragStatus, setOriginalDragStatus] = useState(null);

  const quoteGroups = useMemo(() => {
    const groups = {};
    Object.keys(BOARD_COLUMNS).forEach(status => groups[status] = []);
    quotes.forEach(quote => {
      const status = quote.estado && BOARD_COLUMNS[quote.estado] ? quote.estado : 'Borrador';
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(quote);
    });
    return groups;
  }, [quotes]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ¡CAMBIO! handleUpdateQuoteStatus ahora usa la ruta anidada
  const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
    // ¡NUEVO! Validar que el usuario esté autenticado
    if (!user || !user.uid) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Error: Usuario no autenticado.'
      });
      return;
    }

    // ¡CAMBIO! Ruta anidada con user.uid
    const quoteRef = doc(db, "usuarios", user.uid, "cotizaciones", quoteId);
    try {
      await updateDoc(quoteRef, { estado: newStatus });
      setNotification({
        type: 'success',
        title: 'Cotización actualizada',
        message: `El estado se cambió a ${newStatus}.`
      });
    } catch (err) {
      console.error("Error updating quote status:", err);
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar el estado.'
      });
      if (fetchQuotes) fetchQuotes();
    }
  };

  // --- Manejadores de D&D ---

  function handleDragStart(event) {
    const { active } = event;
    const quote = quotes.find(q => q.id === active.id);
    setActiveQuote(quote);
    setOriginalDragStatus(quote.estado);
  }

  function handleDragOver(event) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveAQuote = active.data.current?.type === 'Quote';
    const isOverAQuote = over.data.current?.type === 'Quote';
    const isOverAColumn = over.data.current?.type === 'Column';

    if (!isActiveAQuote) return;

    let newStatus;
    if (isOverAColumn) {
      newStatus = over.data.current.status;
    } else if (isOverAQuote) {
      newStatus = over.data.current.status;
    } else {
      return;
    }

    const activeQuote = quotes.find(q => q.id === activeId);
    if (activeQuote && activeQuote.estado !== newStatus) {
      setQuotes(prevQuotes => {
        const activeIndex = prevQuotes.findIndex(q => q.id === activeId);
        if (activeIndex === -1) return prevQuotes;

        const newQuotes = [...prevQuotes];
        newQuotes[activeIndex] = {
          ...newQuotes[activeIndex],
          estado: newStatus,
        };
        return newQuotes;
      });
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;

    setActiveQuote(null);
    setOriginalDragStatus(null);

    if (!over) return;

    const activeId = active.id;
    const originalStatus = originalDragStatus;

    const isOverAQuote = over.data.current?.type === 'Quote';
    const isOverAColumn = over.data.current?.type === 'Column';

    let newStatus;
    if (isOverAColumn) {
      newStatus = over.data.current.status;
    } else if (isOverAQuote) {
      newStatus = over.data.current.status;
    } else {
      return;
    }

    if (originalStatus === newStatus) return;

    handleUpdateQuoteStatus(activeId, newStatus);
  }

  // --- Renderizado del Tablero ---
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full whitespace-nowrap rounded-lg">
        <div className="flex gap-6 pb-4">
          {Object.entries(BOARD_COLUMNS).map(([status, title]) => (
            <QuoteColumn
              key={status}
              id={status}
              title={title}
              quotes={quoteGroups[status] || []}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeQuote ? (
          <QuoteCard quote={activeQuote} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}