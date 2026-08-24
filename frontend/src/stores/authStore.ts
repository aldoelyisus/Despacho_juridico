import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  avatar?: string;
  rol: { id: number; nombre: string };
  despacho?: { id: number; nombre: string; logo?: string } | null;
}

interface AuthState {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  /** true una vez que /auth/me ya respondió (éxito o 401) al cargar la app */
  sessionChecked: boolean;
  setAuth: (usuario: Usuario) => void;
  setSessionChecked: (usuario: Usuario | null) => void;
  logout: () => void;
  updateUsuario: (usuario: Partial<Usuario>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      isAuthenticated: false,
      sessionChecked: false,
      setAuth: (usuario) => set({ usuario, isAuthenticated: true, sessionChecked: true }),
      setSessionChecked: (usuario) => set({ usuario, isAuthenticated: !!usuario, sessionChecked: true }),
      logout: () => set({ usuario: null, isAuthenticated: false }),
      updateUsuario: (updates) =>
        set((s) => ({ usuario: s.usuario ? { ...s.usuario, ...updates } : null })),
    }),
    {
      name: 'despacho-auth',
      // Solo se persiste el perfil (no sensible) para pintar la UI sin parpadeo mientras se
      // confirma la sesión con /auth/me — los tokens ya no viven en el cliente, son cookies httpOnly.
      partialize: (state) => ({ usuario: state.usuario }),
    },
  ),
);
