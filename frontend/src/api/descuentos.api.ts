import api from './axios';

export const descuentosApi = {
  list: (params?: { activos?: boolean }) =>
    api.get('/descuentos', { params }).then(r => r.data),
  create: (data: any) => api.post('/descuentos', data).then(r => r.data),
  update: (id: number, data: any) => api.patch(`/descuentos/${id}`, data).then(r => r.data),
  remove: (id: number) => api.delete(`/descuentos/${id}`).then(r => r.data),
};
