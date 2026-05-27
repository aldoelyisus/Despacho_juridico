import api from './axios';

export const pagosApi = {
  list: (params?: any) => api.get('/pagos', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/pagos/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/pagos', data).then((r) => r.data),
  registrarAbono: (id: number, data: any) =>
    api.post(`/pagos/${id}/abonos`, data).then((r) => r.data),
  stats: (params?: any) => api.get('/pagos/stats', { params }).then((r) => r.data),
};
