import api from './axios';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then((r) => r.data),

  // 2FA
  verify2FA: (tempToken: string, code: string) =>
    api.post('/auth/2fa/verify', { tempToken, code }).then((r) => r.data),

  get2FAStatus: () =>
    api.get('/auth/2fa/status').then((r) => r.data),

  setup2FA: () =>
    api.post('/auth/2fa/setup').then((r) => r.data),

  enable2FA: (code: string) =>
    api.post('/auth/2fa/enable', { code }).then((r) => r.data),

  disable2FA: (code: string) =>
    api.post('/auth/2fa/disable', { code }).then((r) => r.data),
};
