import api from './axios';

export const auditoriaApi = {
  logs: (params?: any) => api.get('/auditoria/logs', { params }).then((r) => r.data),
};
