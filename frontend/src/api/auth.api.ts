import api from './axios';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  changePasswordRequired: (tempToken: string, newPassword: string) =>
    api.post('/auth/change-password-required', { tempToken, newPassword }).then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

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
