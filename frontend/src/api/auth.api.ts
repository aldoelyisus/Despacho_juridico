import api from './axios';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  register: (data: {
    nombreDespacho: string;
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    telefono?: string;
  }) => api.post('/auth/register', data).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then((r) => r.data),
};
