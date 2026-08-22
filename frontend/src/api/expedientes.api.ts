import api from './axios';

export const expedientesApi = {
  list: (params?: any) => api.get('/expedientes', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/expedientes/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/expedientes', data).then((r) => r.data),
  update: (id: number, data: any) => api.patch(`/expedientes/${id}`, data).then((r) => r.data),
  cambiarEstado: (id: number, estado: string) =>
    api.patch(`/expedientes/${id}/estado`, { estado }).then((r) => r.data),
  stats: () => api.get('/expedientes/stats').then((r) => r.data),

  addDocumento: (id: number, formData: FormData) =>
    api.post(`/expedientes/${id}/documentos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  getDocumentoUrl: (id: number, documentoId: number) =>
    api.get(`/expedientes/${id}/documentos/${documentoId}/url`).then((r) => r.data),

  deleteDocumento: (id: number, documentoId: number) =>
    api.delete(`/expedientes/${id}/documentos/${documentoId}`).then((r) => r.data),

  addObservacion: (id: number, contenido: string) =>
    api.post(`/expedientes/${id}/observaciones`, { contenido }).then((r) => r.data),

  addEvento: (id: number, data: any) =>
    api.post(`/expedientes/${id}/eventos`, data).then((r) => r.data),
};
