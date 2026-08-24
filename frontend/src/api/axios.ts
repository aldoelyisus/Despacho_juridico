import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  // Los tokens de sesión son cookies httpOnly — el navegador las manda solo, no hay
  // Authorization header que adjuntar desde JS.
  withCredentials: true,
});

/** Avisa al backend que borre las cookies de sesión, sin bloquear el flujo (fire-and-forget) */
function clearServerSession() {
  axios.post(`${BASE_URL}/auth/logout`, {}, { withCredentials: true }).catch(() => {});
}

const CODIGOS_DESPACHO_BLOQUEADO = ['DESPACHO_BLOQUEADO', 'DESPACHO_DESACTIVADO'];

// Response interceptor — handle 401 (refresh) y 403 (despacho bloqueado/desactivado).
// Nunca hace window.location.href aquí: eso forzaba una recarga completa de página, que remonta
// la app entera y dispara de nuevo el chequeo de sesión de App.tsx — si ese chequeo también falla,
// vuelve a caer aquí y se repite sin fin. En vez de eso, solo actualiza el store: los guards de
// rutas (NormalRoute/RootRoute) reaccionan solos y redirigen a /login con un <Navigate> normal.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 403 && CODIGOS_DESPACHO_BLOQUEADO.includes(error.response.data?.code)) {
      sessionStorage.setItem('auth_block_message', error.response.data.message);
      clearServerSession();
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // Sin body: el refresh token va en su propia cookie httpOnly. Si el backend renueva
        // la sesión, pone las cookies nuevas solo (Set-Cookie) — no hay nada que guardar en JS.
        await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        return api(original);
      } catch {
        clearServerSession();
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  },
);

export default api;
