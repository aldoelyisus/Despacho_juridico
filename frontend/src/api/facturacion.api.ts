import api from './axios';

export const facturacionApi = {
  generarAdeudos: () => api.post('/facturacion/generar-adeudos').then((r) => r.data),
  bloquearMorosos: () => api.post('/facturacion/bloquear-morosos').then((r) => r.data),
};
