import { Button } from "@/ui/button.jsx";
import { Checkbox } from "@/ui/checkbox.jsx";
import { Badge } from "@/ui/badge.jsx";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/ui/dropdown-menu.jsx";
import { MoreHorizontal, ArrowUpDown, Edit, Copy, Trash2, Eye } from "lucide-react";

// Helper to format currency
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value || 0);
};

// Helper to get badge style based on product type
const getBadgeVariant = (type) => {
    switch (type) {
      case 'simple': return 'default';
      case 'composite': return 'secondary';
      case 'kit': return 'outline';
      default: return 'secondary';
    }
};

export const createColumns = (onProductClick, onEdit, onDuplicate, onDelete) => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todos"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "nombre",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Nombre
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="space-y-1">
        <button 
          onClick={() => onProductClick(row.original)}
          className="font-medium hover:underline hover:text-primary"
        >
          {row.getValue("nombre")}
        </button>
        {row.original.sku && (
          <p className="text-xs text-muted-foreground font-mono">
            SKU: {row.original.sku}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => (
      <Badge variant={getBadgeVariant(row.getValue("tipo"))} className="capitalize">
        {row.getValue("tipo") || 'simple'}
      </Badge>
    ),
  },
  {
    accessorKey: "categorias",
    header: "Categorías",
    cell: ({ row }) => {
      const categorias = row.getValue("categorias");
      if (!categorias || categorias.length === 0) {
        return <span className="text-muted-foreground text-sm">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {categorias.slice(0, 2).map((cat, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {cat}
            </Badge>
          ))}
          {categorias.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{categorias.length - 2}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "precio_iva_incluido",
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Precio
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const precio = row.original.precio_iva_incluido || row.original.precioBase || 0;
      const costo = row.original.costo;

      return (
        <div className="text-right space-y-1">
          <div className="font-medium">{formatCurrency(precio)}</div>
          {costo && (
            <div className="text-xs text-muted-foreground">
              Costo: {formatCurrency(costo)}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "margen",
    header: () => <div className="text-right">Margen</div>,
    cell: ({ row }) => {
      const precio = row.original.precio_iva_incluido || row.original.precioBase || 0;
      const costo = row.original.costo || 0;
      const ganancia = precio - costo;
      const margen = precio > 0 ? ((ganancia / precio) * 100) : 0;

      if (precio === 0 || costo === 0) {
        return <div className="text-right text-muted-foreground">—</div>;
      }

      return (
        <div className="text-right space-y-1">
          <div className="font-medium text-green-600 dark:text-green-400">
            {formatCurrency(ganancia)}
          </div>
          <div className="text-xs text-muted-foreground">
            {margen.toFixed(1)}%
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "activo",
    header: "Estado",
    cell: ({ row }) => {
      const activo = row.getValue("activo");
      // Si el campo no existe, asumir que está activo
      const isActive = activo === undefined ? true : activo;
      
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Activo" : "Inactivo"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onProductClick(product)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(product)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(product)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
];