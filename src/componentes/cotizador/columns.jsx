import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import QuotePDF from './QuotePDF.jsx';
import { Button } from "@/ui/button.jsx";
import { Checkbox } from "@/ui/checkbox.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/ui/dropdown-menu.jsx";
import { ArrowUpDown, MoreHorizontal, Mail } from "lucide-react";

// Función de Badge
const getStatusBadge = (status = 'Borrador') => {
    const s = status.toLowerCase().replace(/\s/g, '-');
    const styles = {
        'borrador': 'bg-blue-500/10 text-blue-400', 
        'aprobada': 'bg-green-500/10 text-green-400',
        'rechazada': 'bg-red-500/10 text-red-400', 
        'enviada': 'bg-amber-500/10 text-amber-400',
        'en-negociacion': 'bg-purple-500/10 text-purple-400', 
        'vencida': 'bg-gray-500/10 text-gray-400'
    };
    return `px-2.5 py-0.5 text-xs font-semibold rounded-full ${styles[s] || 'bg-gray-500/10 text-gray-400'}`;
};

// Función principal createColumns
export const createColumns = (
  onEditQuote,
  onDeleteQuote,
  clients,
  quoteStyleName,
  onSendEmail, // callback para enviar email
  products // productos para mostrar imágenes en PDF
) => [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "numero",
    header: ({ column }) => (
      <div className="text-center">
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Número <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        <Button
          variant="link"
          className="p-0 h-auto font-medium"
          onClick={() => onEditQuote(row.original.id)}
        >
          {row.getValue("numero")}
        </Button>
      </div>
    ),
  },
  {
    accessorKey: "clienteNombre",
    header: () => <div className="text-center">Cliente</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("clienteNombre")}</div>
    ),
  },
  {
    accessorKey: "total",
    header: () => <div className="text-center">Total</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total") || 0);
      const formatted = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
      return <div className="text-center font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "estado",
    header: () => <div className="text-center">Estado</div>,
    cell: ({ row }) => (
      <div className="text-center">
        <span className={getStatusBadge(row.getValue("estado"))}>
            {row.getValue("estado")}
        </span>
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => {
      const quote = row.original;
      const client = clients.find(c => c.id === quote.clienteId);

      return (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              
              <DropdownMenuItem onClick={() => onEditQuote(quote.id)}>
                Editar Cotización
              </DropdownMenuItem>

              {/* Descargar PDF */}
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  {client ? (
                      <PDFDownloadLink
                          document={<QuotePDF quote={quote} client={client} products={products} styleName={quoteStyleName} />}
                          fileName={`${quote.numero || 'cotizacion'}.pdf`}
                          style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}
                      >
                          {({ loading }) => (loading ? 'Generando...' : 'Descargar PDF')}
                      </PDFDownloadLink>
                  ) : (
                      <span style={{color: 'gray', fontSize: '12px'}}>Cargando datos cliente...</span>
                  )}
              </DropdownMenuItem>

              {/* NUEVO: Enviar por Email */}
              <DropdownMenuItem 
                onClick={() => onSendEmail && onSendEmail(quote, client)}
                disabled={!client || !client.email}
              >
                <Mail className="mr-2 h-4 w-4" />
                Enviar por Email
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                onClick={() => onDeleteQuote(quote.id)}
              >
                Eliminar Cotización
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
];