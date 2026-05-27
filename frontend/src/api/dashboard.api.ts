import api from './axios';

export const dashboardApi = {
  kpis: () => api.get('/dashboard/kpis').then((r) => r.data),
  rendimientoUsuarios: () => api.get('/dashboard/rendimiento-usuarios').then((r) => r.data),
  ingresosHistorico: (meses?: number) =>
    api.get('/dashboard/ingresos-historico', { params: { meses } }).then((r) => r.data),
};
