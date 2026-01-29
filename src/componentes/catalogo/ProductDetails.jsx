import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/ui/sheet.jsx";
import { Badge } from '@/ui/badge.jsx';
import { Button } from '@/ui/button.jsx';
import { Separator } from '@/ui/separator.jsx';
import {
  Edit,
  Trash2,
  Package,
  DollarSign,
  Tag,
  FileText,
  Calendar
} from 'lucide-react';

const ProductDetails = ({ product, open, onOpenChange, onEdit, onDelete }) => {
  if (!product) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBadgeVariant = (type) => {
    switch (type) {
      case 'simple': return 'default';
      case 'composite': return 'secondary';
      case 'kit': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">{product.nombre || 'Sin nombre'}</SheetTitle>
          <SheetDescription>
            Detalles completos del producto
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Imagen */}
          <div className="relative h-64 w-full overflow-hidden rounded-lg bg-muted">
            <img
              src={product.imagen_url || 'https://placehold.co/600x400/1e293b/94a3b8?text=Sin+Imagen'}
              alt={product.nombre}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.src = 'https://placehold.co/600x400/1e293b/94a3b8?text=Sin+Imagen';
              }}
            />
          </div>

          {/* Acciones rápidas */}
          <div className="flex gap-2">
            {!product.lastSync && onEdit && (
              <Button onClick={() => {
                onEdit(product);
                onOpenChange(false);
              }} className="flex-1">
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
            {!product.lastSync && onDelete && (
              <Button
                onClick={() => {
                  onDelete(product);
                  onOpenChange(false);
                }}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Separator />

          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información Básica
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge variant={getBadgeVariant(product.tipo)} className="mt-1 capitalize">
                  {product.tipo || 'simple'}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge 
                  variant={product.activo !== false ? "default" : "secondary"}
                  className="mt-1"
                >
                  {product.activo !== false ? "Activo" : "Inactivo"}
                </Badge>
              </div>

              {product.sku && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-mono text-sm mt-1">{product.sku}</p>
                </div>
              )}
            </div>

            {product.descripcion && (
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="mt-1 text-sm">{product.descripcion}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Precio */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Precio
            </h3>

            <div className="p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Precio</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(product.precio_iva_incluido || product.precioBase)}
              </p>
            </div>
          </div>

          {/* Categorías */}
          {product.categorias && product.categorias.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Categorías
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.categorias.map((cat, index) => (
                    <Badge key={index} variant="secondary">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Atributos */}
          {product.atributos && Object.keys(product.atributos).length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Atributos
                </h3>
                <div className="space-y-2">
                  {Object.entries(product.atributos).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm font-medium">{key}</span>
                      <Badge variant="outline">{value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Fechas */}
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Información de Sistema
            </h3>
            <div className="space-y-2 text-sm">
              {product.fechaCreacion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creado:</span>
                  <span>{formatDate(product.fechaCreacion)}</span>
                </div>
              )}
              {product.fechaActualizacion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Última actualización:</span>
                  <span>{formatDate(product.fechaActualizacion)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductDetails;