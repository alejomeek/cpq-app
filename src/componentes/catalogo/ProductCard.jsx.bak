import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/ui/card.jsx';
import { Badge } from '@/ui/badge.jsx';
import { Button } from '@/ui/button.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu.jsx";
import { 
  MoreVertical, 
  Edit, 
  Copy, 
  Trash2,
  Eye,
  Package
} from 'lucide-react';

const ProductCard = ({ product, onClick, onEdit, onDuplicate, onDelete }) => {
  // Mapea el tipo de producto a una variante de color del Badge
  const getBadgeVariant = (type) => {
    switch (type) {
      case 'simple': return 'default';
      case 'composite': return 'secondary';
      case 'kit': return 'outline';
      default: return 'secondary';
    }
  };

  // Formateador para el precio
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  // Evitar que el click en acciones dispare el onClick del card
  const handleActionClick = (e, action) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card 
      className="group relative flex flex-col h-full cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden"
      onClick={onClick}
    >
      {/* Header con imagen */}
      <CardHeader className="p-0 relative">
        <div className="relative h-48 w-full overflow-hidden bg-muted">
          <img 
            className="h-full w-full object-cover transition-transform group-hover:scale-110" 
            src={product.imagenUrl || 'https://placehold.co/600x400/1e293b/94a3b8?text=Sin+Imagen'} 
            alt={product.nombre || 'Producto'}
            onError={(e) => {
              e.target.src = 'https://placehold.co/600x400/1e293b/94a3b8?text=Sin+Imagen';
            }}
          />
          
          {/* Overlay con acciones rápidas */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => handleActionClick(e, onClick)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
            {onEdit && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => handleActionClick(e, () => onEdit(product))}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
          </div>

          {/* Badge de tipo */}
          <Badge 
            variant={getBadgeVariant(product.tipo)}
            className="absolute top-3 left-3 capitalize font-semibold"
          >
            {product.tipo || 'simple'}
          </Badge>

          {/* Menú de acciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 h-8 w-8 bg-background/90 hover:bg-background"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={(e) => handleActionClick(e, onClick)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={(e) => handleActionClick(e, () => onEdit(product))}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={(e) => handleActionClick(e, () => onDuplicate(product))}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => handleActionClick(e, () => onDelete(product))}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1 p-4 space-y-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-lg line-clamp-1" title={product.nombre}>
            {product.nombre || 'Sin nombre'}
          </h3>
          {product.sku && (
            <p className="text-xs text-muted-foreground font-mono">
              SKU: {product.sku}
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.descripcion || 'Sin descripción'}
        </p>

        {/* Atributos */}
        {product.atributos && Object.keys(product.atributos).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {Object.entries(product.atributos).slice(0, 3).map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs">
                {key}: {value}
              </Badge>
            ))}
            {Object.keys(product.atributos).length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{Object.keys(product.atributos).length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Categorías */}
        {product.categorias && product.categorias.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.categorias.slice(0, 2).map((cat, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {cat}
              </Badge>
            ))}
            {product.categorias.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{product.categorias.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      {/* Footer */}
      <CardFooter className="p-4 pt-0 flex justify-between items-end border-t mt-auto">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(product.precioBase)}
            </span>
          </div>
          {product.costo && (
            <p className="text-xs text-muted-foreground">
              Costo: {formatCurrency(product.costo)}
            </p>
          )}
        </div>

        {/* Margen/Ganancia */}
        {product.precioBase && product.costo && (
          <div className="text-right">
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(product.precioBase - product.costo)}
            </p>
            <p className="text-xs text-muted-foreground">
              {((((product.precioBase - product.costo) / product.precioBase) * 100) || 0).toFixed(1)}% margen
            </p>
          </div>
        )}
      </CardFooter>

      {/* Indicador de estado (si está inactivo) */}
      {product.activo === false && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Package className="mr-2 h-5 w-5" />
            Inactivo
          </Badge>
        </div>
      )}
    </Card>
  );
};

export default ProductCard;