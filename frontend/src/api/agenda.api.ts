import api from './axios';

export const agendaApi = {
  list: (params?: any) => api.get('/agenda', { params }).then((r) => r.data),
  proximos: () => api.get('/agenda/proximos').then((r) => r.data),
  get: (id: number) => api.get(`/agenda/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/agenda', data).then((r) => r.data),
  update: (id: number, data: any) => api.patch(`/agenda/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/agenda/${id}`).then((r) => r.data),
};
