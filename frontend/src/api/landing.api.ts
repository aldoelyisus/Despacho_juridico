import api from './axios';

export const landingApi = {
  planes: () => api.get('/landing/planes').then((r) => r.data),
  testimonios: () => api.get('/landing/testimonios').then((r) => r.data),
  enviarTestimonio: (data: any) => api.post('/landing/testimonios', data).then((r) => r.data),
  enviarContacto: (data: any) => api.post('/landing/contacto', data).then((r) => r.data),

  // Root — moderación
  testimoniosTodos: () => api.get('/landing/testimonios/todos').then((r) => r.data),
  aprobarTestimonio: (id: number) => api.patch(`/landing/testimonios/${id}/aprobar`).then((r) => r.data),
  eliminarTestimonio: (id: number) => api.delete(`/landing/testimonios/${id}`).then((r) => r.data),
  contactos: () => api.get('/landing/contactos').then((r) => r.data),
  marcarContactoAtendido: (id: number) => api.patch(`/landing/contactos/${id}/atendido`).then((r) => r.data),
};
