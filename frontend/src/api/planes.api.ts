import api from './axios';

export const planesApi = {
  list: () => api.get('/planes').then((r) => r.data),
  get: (id: number) => api.get(`/planes/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/planes', data).then((r) => r.data),
  update: (id: number, data: any) => api.patch(`/planes/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/planes/${id}`).then((r) => r.data),
};
