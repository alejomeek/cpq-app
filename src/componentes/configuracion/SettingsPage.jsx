import React from 'react';
import { useAuth } from '@/context/useAuth'; // ¡NUEVO!
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/breadcrumb.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs.jsx";

// Import modules
import ConditionsModule from './condiciones/ConditionsModule.jsx';
import TaxesModule from './impuestos/TaxesModule.jsx';
import QuoteStylesModule from './estilos/QuoteStylesModule.jsx';
import WixIntegrationModule from './WixIntegrationModule.jsx';

// ¡CAMBIO! Ya NO recibe 'user' ni 'auth' como props
const SettingsPage = ({ db, navigate }) => {
  // ¡NUEVO! Obtener user del Context (aunque no lo usemos directamente aquí,
  // los módulos hijos lo necesitarán)
  const { user } = useAuth();

  // ¡NUEVO! Si el usuario no está autenticado, mostrar mensaje
  if (!user || !user.uid) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* --- Page Header with Breadcrumb --- */}
      <div className="mb-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate('dashboard')} className="cursor-pointer">
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Configuración</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <h1 className="text-2xl font-bold mb-8 text-foreground">Gestión de Parámetros</h1>

      <Tabs defaultValue="condiciones" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-4xl">
          <TabsTrigger value="condiciones">Condiciones de Pago</TabsTrigger>
          <TabsTrigger value="impuestos">Impuestos</TabsTrigger>
          <TabsTrigger value="estilos">Estilos de Cotización</TabsTrigger>
          <TabsTrigger value="wix">Integración Wix</TabsTrigger>
        </TabsList>

        <TabsContent value="condiciones" className="mt-6">
          <ConditionsModule db={db} />
        </TabsContent>

        <TabsContent value="impuestos" className="mt-6">
          <TaxesModule db={db} />
        </TabsContent>

        <TabsContent value="estilos" className="mt-6">
          <QuoteStylesModule db={db} />
        </TabsContent>

        <TabsContent value="wix" className="mt-6">
          <WixIntegrationModule db={db} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;