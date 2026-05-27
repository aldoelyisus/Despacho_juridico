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
  token: string | null;
  refreshToken: string | null;
  usuario: Usuario | null;
  setAuth: (token: string, refreshToken: string, usuario: Usuario) => void;
  logout: () => void;
  updateUsuario: (usuario: Partial<Usuario>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      usuario: null,
      setAuth: (token, refreshToken, usuario) =>
        set({ token, refreshToken, usuario }),
      logout: () => set({ token: null, refreshToken: null, usuario: null }),
      updateUsuario: (updates) =>
        set((s) => ({ usuario: s.usuario ? { ...s.usuario, ...updates } : null })),
    }),
    {
      name: 'despacho-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        usuario: state.usuario,
      }),
    },
  ),
);
