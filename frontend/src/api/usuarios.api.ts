import api from './axios';

export const usuariosApi = {
  list: () => api.get('/usuarios').then((r) => r.data),
  roles: () => api.get('/usuarios/roles').then((r) => r.data),
  get: (id: number) => api.get(`/usuarios/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/usuarios', data).then((r) => r.data),
  update: (id: number, data: any) => api.patch(`/usuarios/${id}`, data).then((r) => r.data),
  toggle: (id: number) => api.patch(`/usuarios/${id}/toggle`).then((r) => r.data),
};
