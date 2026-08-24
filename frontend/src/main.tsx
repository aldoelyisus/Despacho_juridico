import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';
import './styles/modules.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#141f38',
              color: '#f0f4ff',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: '10px',
              fontSize: '0.875rem',
            },
            // Un error necesita más tiempo de lectura que un simple "listo" — que no se
            // desvanezca antes de que el usuario alcance a entender qué pasó.
            success: { duration: 2500, iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { duration: 6000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
