import React from 'react'; 
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const QuoteCard = React.forwardRef(({ quote, isDragging, ...props }, ref) => {
  
  // Esta función no se toca. Los colores de estado (azul, verde, rojo)
  // deben ser los mismos en ambos temas.
  const getStatusBadge = (status = 'Borrador') => {
    const s = status.toLowerCase().replace(/\s/g, '-');
    const styles = {
        'borrador': 'bg-blue-500/10 text-blue-400', 'aprobada': 'bg-green-500/10 text-green-400',
        'rechazada': 'bg-red-500/10 text-red-400', 'enviada': 'bg-amber-500/10 text-amber-400',
        'en-negociacion': 'bg-purple-500/10 text-purple-400', 'vencida': 'bg-gray-500/10 text-gray-400'
    };
    return `px-2 py-1 text-xs font-medium rounded-full ${styles[s] || 'bg-gray-500/10 text-gray-400'}`;
  };

  const formattedDate = quote.fechaCreacion 
    ? format(quote.fechaCreacion.toDate(), 'PPP', { locale: es }) 
    : 'Sin fecha';

  const style = {
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  };

  return (
    // --- ¡CAMBIOS AQUÍ! ---
    <div 
      ref={ref} 
      style={style} 
      {...props} 
      // Reemplazamos clases hard-codeadas por variables de tema
      className="bg-card p-4 rounded-lg border h-full flex flex-col justify-between transition-colors hover:bg-accent"
    >
      {/* Cabecera de la tarjeta */}
      <div className="flex justify-between items-start gap-2">
        <div className="overflow-hidden flex-1 min-w-0">
          <h3 className="font-bold text-card-foreground truncate">{quote.numero}</h3>
          <p className="text-sm text-muted-foreground truncate">{quote.clienteNombre}</p>
        </div>
        <span className={getStatusBadge(quote.estado)}>{quote.estado}</span>
      </div>

      {/* Pie de la tarjeta */}
      <div className="mt-4 flex justify-between items-end">
        {/* --- ¡CAMBIO! text-slate-500 -> text-muted-foreground --- */}
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
        {/* --- ¡CAMBIO! text-white -> text-card-foreground --- */}
        <span className="font-semibold text-card-foreground">
          ${(quote.total || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  );
});

export default QuoteCard;