import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { authApi } from './api/auth.api';
import { usePuedeVer, type Modulo } from './utils/permisos';
import Layout from './components/layout/Layout';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClientesPage from './pages/clientes/ClientesPage';
import ClienteDetallePage from './pages/clientes/ClienteDetallePage';
import ExpedientesPage from './pages/expedientes/ExpedientesPage';
import ExpedienteDetallePage from './pages/expedientes/ExpedienteDetallePage';
import AgendaPage from './pages/agenda/AgendaPage';
import PagosPage from './pages/pagos/PagosPage';
import UsuariosPage from './pages/usuarios/UsuariosPage';
import CatalogosPage from './pages/catalogos/CatalogosPage';
import AuditoriaPage from './pages/auditoria/AuditoriaPage';
import ConfiguracionPage from './pages/configuracion/ConfiguracionPage';
import RootDashboardPage from './pages/root/RootDashboardPage';
import RootDespachosPage from './pages/root/RootDespachosPage';
import RootMensualidadesPage from './pages/root/RootMensualidadesPage';
import RootPlanesPage from './pages/root/RootPlanesPage';
import RootAuditoriaPage from './pages/root/RootAuditoriaPage';
import RootLandingPage from './pages/root/RootLandingPage';
import PerfilPage from './pages/perfil/PerfilPage';
import DescuentosPage from './pages/descuentos/DescuentosPage';

function FullPageSpinner() {
  return (
    <div className="dashboard-loading">
      <div className="spinner spinner-lg" />
    </div>
  );
}

// No bloquea la landing con un spinner mientras se confirma la sesión — la inmensa mayoría de
// las visitas son anónimas. Si resulta que sí hay sesión activa, redirige en cuanto se sepa.
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { sessionChecked, isAuthenticated, usuario } = useAuthStore();
  if (sessionChecked && isAuthenticated) {
    const esRoot = usuario?.rol?.nombre?.toLowerCase() === 'root';
    return <Navigate to={esRoot ? '/root' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}

function RootRoute({ children }: { children: React.ReactNode }) {
  const { sessionChecked, isAuthenticated, usuario } = useAuthStore();
  if (!sessionChecked) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (usuario?.rol?.nombre?.toLowerCase() !== 'root') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function NormalRoute({ children }: { children: React.ReactNode }) {
  const { sessionChecked, isAuthenticated, usuario } = useAuthStore();
  if (!sessionChecked) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (usuario?.rol?.nombre?.toLowerCase() === 'root') return <Navigate to="/root" replace />;
  return <>{children}</>;
}

// Además de autenticado y no-root (ya cubierto por NormalRoute), exige que el rol del usuario
// tenga acceso a este módulo — así alguien no puede entrar a una página escribiendo la URL
// directamente aunque el link esté oculto en el menú.
function ModuloRoute({ modulo, children }: { modulo: Modulo; children: React.ReactNode }) {
  const puedeVer = usePuedeVer(modulo);
  if (!puedeVer) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    authApi.me()
      .then(({ usuario }) => useAuthStore.getState().setSessionChecked(usuario))
      .catch(() => useAuthStore.getState().setSessionChecked(null));
  }, []);

  return (
    <Routes>
      {/* Pública — landing de ventas */}
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/login" element={<LoginPage />} />

      {/* ROOT — panel SaaS exclusivo */}
      <Route
        path="/root"
        element={<RootRoute><Layout /></RootRoute>}
      >
        <Route index element={<Navigate to="/root/dashboard" replace />} />
        <Route path="dashboard"     element={<RootDashboardPage />} />
        <Route path="despachos"     element={<RootDespachosPage />} />
        <Route path="planes"       element={<RootPlanesPage />} />
        <Route path="mensualidades" element={<RootMensualidadesPage />} />
        <Route path="landing"       element={<RootLandingPage />} />
        <Route path="auditoria"     element={<RootAuditoriaPage />} />
        <Route path="perfil"        element={<PerfilPage />} />
      </Route>

      {/* NORMAL — usuarios de despacho. Layout route sin path propio: las URLs de abajo son
          absolutas y no cambian, solo se comparte el wrapper NormalRoute+Layout. */}
      <Route element={<NormalRoute><Layout /></NormalRoute>}>
        <Route path="/dashboard"        element={<DashboardPage />} />
        <Route path="/clientes"         element={<ClientesPage />} />
        <Route path="/clientes/:id"     element={<ClienteDetallePage />} />
        <Route path="/expedientes"      element={<ExpedientesPage />} />
        <Route path="/expedientes/:id"  element={<ExpedienteDetallePage />} />
        <Route path="/agenda"           element={<AgendaPage />} />
        <Route path="/pagos"            element={<PagosPage />} />
        <Route path="/usuarios"         element={<ModuloRoute modulo="usuarios"><UsuariosPage /></ModuloRoute>} />
        <Route path="/catalogos"        element={<ModuloRoute modulo="catalogos"><CatalogosPage /></ModuloRoute>} />
        <Route path="/descuentos"       element={<ModuloRoute modulo="descuentos"><DescuentosPage /></ModuloRoute>} />
        <Route path="/auditoria"        element={<ModuloRoute modulo="auditoria"><AuditoriaPage /></ModuloRoute>} />
        <Route path="/configuracion"    element={<ModuloRoute modulo="configuracion"><ConfiguracionPage /></ModuloRoute>} />
        <Route path="/perfil"           element={<PerfilPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
