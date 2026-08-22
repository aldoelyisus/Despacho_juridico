import api from './axios';

export const dashboardApi = {
  kpis: () => api.get('/dashboard/kpis').then((r) => r.data),
  rendimientoUsuarios: () => api.get('/dashboard/rendimiento-usuarios').then((r) => r.data),
  ingresosHistorico: (meses?: number) =>
    api.get('/dashboard/ingresos-historico', { params: { meses } }).then((r) => r.data),

  resumenPeriodo: (tipo: string, anio: number, valor?: number) =>
    api.get('/dashboard/periodo', { params: { tipo, anio, valor } }).then((r) => r.data),

  resumenDia: (desde: string, hasta: string) =>
    api.get('/dashboard/periodo/dias', { params: { desde, hasta } }).then((r) => r.data),
};
