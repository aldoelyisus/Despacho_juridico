import api from './axios';

export const catalogosApi = {
  areas: (params?: any) => api.get('/catalogos/areas', { params }).then((r) => r.data),
  createArea: (data: any) => api.post('/catalogos/areas', data).then((r) => r.data),
  updateArea: (id: number, data: any) => api.patch(`/catalogos/areas/${id}`, data).then((r) => r.data),
  deleteArea: (id: number) => api.delete(`/catalogos/areas/${id}`).then((r) => r.data),

  subareas: (params?: any) => api.get('/catalogos/subareas', { params }).then((r) => r.data),
  createSubarea: (data: any) => api.post('/catalogos/subareas', data).then((r) => r.data),
  updateSubarea: (id: number, data: any) => api.patch(`/catalogos/subareas/${id}`, data).then((r) => r.data),
  deleteSubarea: (id: number) => api.delete(`/catalogos/subareas/${id}`).then((r) => r.data),

  servicios: () => api.get('/catalogos/servicios').then((r) => r.data),
  createServicio: (data: any) => api.post('/catalogos/servicios', data).then((r) => r.data),
  updateServicio: (id: number, data: any) => api.patch(`/catalogos/servicios/${id}`, data).then((r) => r.data),
  deleteServicio: (id: number) => api.delete(`/catalogos/servicios/${id}`).then((r) => r.data),
};
