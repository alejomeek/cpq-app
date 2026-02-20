import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import { ThemeProvider } from '@/ui/theme-provider.jsx';
import { SidebarTrigger } from '@/ui/sidebar.jsx';
import { SidebarProvider } from '@/ui/sidebar.jsx';
import { AppSidebar } from '@/ui/AppSidebar.jsx';

import Dashboard from '@/ui/dashboard.jsx';
import ClientesPage from '@/componentes/clientes/ClientesPage.jsx';
import CatalogoPage from '@/componentes/catalogo/CatalogoPage.jsx';
import QuotesPage from '@/componentes/cotizador/QuotesPage.jsx';
import SettingsPage from '@/componentes/configuracion/SettingsPage.jsx';
import LoginPage from '@/componentes/login/LoginPage.jsx';

import { useAuth } from '@/context/useAuth';

// ✅ Configuración de Firebase usando variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

export default function App() {
  const [route, setRoute] = useState('dashboard');
  const [targetQuoteId, setTargetQuoteId] = useState(null);
  const [navigationState, setNavigationState] = useState(null);

  const { user, loading: loadingAuth } = useAuth();

  const handleNavigate = (newRoute, payload = null, state = null) => {
    setRoute(newRoute);
    setTargetQuoteId(payload);
    setNavigationState(state);
  };

  const clearTargetQuote = () => {
    setTargetQuoteId(null);
  };

  const renderRoute = () => {
    const props = { db, navigate: handleNavigate };
    switch (route) {
      case 'dashboard':
        return <Dashboard {...props} />;
      case 'clients':
        return <ClientesPage {...props} navigationState={navigationState} />;
      case 'catalog':
        return <CatalogoPage {...props} />;
      case 'quotes':
        return (
          <QuotesPage
            {...props}
            initialQuoteId={targetQuoteId}
            onClearTargetQuote={clearTargetQuote}
          />
        );
      case 'settings':
        return <SettingsPage {...props} />;
      default:
        return <Dashboard {...props} />;
    }
  };

  if (loadingAuth) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="cpq-app-theme">
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="cpq-app-theme">
        <LoginPage auth={auth} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="cpq-app-theme">
      <SidebarProvider className="min-h-screen bg-background text-foreground">
        <AppSidebar navigate={handleNavigate} route={route} />

        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="flex justify-start items-center mb-8">
            <SidebarTrigger />
          </div>

          {renderRoute()}
        </main>
      </SidebarProvider>
    </ThemeProvider>
  );
}