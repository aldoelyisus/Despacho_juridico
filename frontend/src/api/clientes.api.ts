import api from './axios';

export const clientesApi = {
  list: (params?: any) => api.get('/clientes', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/clientes/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/clientes', data).then((r) => r.data),
  update: (id: number, data: any) => api.patch(`/clientes/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/clientes/${id}`).then((r) => r.data),
  stats: () => api.get('/clientes/stats').then((r) => r.data),
};
