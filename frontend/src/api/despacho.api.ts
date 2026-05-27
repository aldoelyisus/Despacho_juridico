import api from './axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const despachoApi = {
  miDespacho: () => api.get('/despachos/mi-despacho').then((r) => r.data),
  update: (data: any) => api.patch('/despachos/mi-despacho', data).then((r) => r.data),
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/despachos/mi-despacho/logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  getLogoUrl: (path: string | null | undefined) =>
    path ? `${BASE_URL}${path}` : null,
};
