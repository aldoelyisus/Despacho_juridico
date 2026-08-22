import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
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
import PerfilPage from './pages/perfil/PerfilPage';
import DescuentosPage from './pages/descuentos/DescuentosPage';

function RootRoute({ children }: { children: React.ReactNode }) {
  const { token, usuario } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (usuario?.rol?.nombre?.toLowerCase() !== 'root') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function NormalRoute({ children }: { children: React.ReactNode }) {
  const { token, usuario } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (usuario?.rol?.nombre?.toLowerCase() === 'root') return <Navigate to="/root" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
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
        <Route path="auditoria"     element={<RootAuditoriaPage />} />
        <Route path="perfil"        element={<PerfilPage />} />
      </Route>

      {/* NORMAL — usuarios de despacho */}
      <Route
        path="/"
        element={<NormalRoute><Layout /></NormalRoute>}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"        element={<DashboardPage />} />
        <Route path="clientes"         element={<ClientesPage />} />
        <Route path="clientes/:id"     element={<ClienteDetallePage />} />
        <Route path="expedientes"      element={<ExpedientesPage />} />
        <Route path="expedientes/:id"  element={<ExpedienteDetallePage />} />
        <Route path="agenda"           element={<AgendaPage />} />
        <Route path="pagos"            element={<PagosPage />} />
        <Route path="usuarios"         element={<UsuariosPage />} />
        <Route path="catalogos"        element={<CatalogosPage />} />
        <Route path="descuentos"       element={<DescuentosPage />} />
        <Route path="auditoria"        element={<AuditoriaPage />} />
        <Route path="configuracion"    element={<ConfiguracionPage />} />
        <Route path="perfil"           element={<PerfilPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
