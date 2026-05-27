import api from './axios';

export const rootApi = {
  // Dashboard
  dashboard: () => api.get('/root/dashboard').then(r => r.data),

  // Despachos
  despachos: () => api.get('/root/despachos').then(r => r.data),
  createDespacho: (data: any) => api.post('/root/despachos', data).then(r => r.data),
  updateDespacho: (id: number, data: any) => api.patch(`/root/despachos/${id}`, data).then(r => r.data),
  toggleBloqueo: (id: number) => api.patch(`/root/despachos/${id}/bloqueo`).then(r => r.data),

  // Usuarios de despacho
  usuariosDespacho: (id: number) => api.get(`/root/despachos/${id}/usuarios`).then(r => r.data),
  toggleUsuario: (id: number) => api.patch(`/root/usuarios/${id}/toggle`).then(r => r.data),

  // Mensualidades
  mensualidades: (params?: any) => api.get('/root/mensualidades', { params }).then(r => r.data),
  createMensualidad: (data: any) => api.post('/root/mensualidades', data).then(r => r.data),
  updateMensualidad: (id: number, data: any) => api.patch(`/root/mensualidades/${id}`, data).then(r => r.data),
  deleteMensualidad: (id: number) => api.delete(`/root/mensualidades/${id}`).then(r => r.data),
};
