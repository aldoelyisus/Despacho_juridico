import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

function resMock() {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as any;
}

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { [k: string]: jest.Mock };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      changePasswordRequired: jest.fn(),
      refreshToken: jest.fn(),
      verify2FA: jest.fn(),
      getUsuarioActual: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: { get: jest.fn((key: string, fallback?: any) => fallback) } },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  describe('login', () => {
    it('sets httpOnly cookies and strips tokens from the response body on success', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'acc123', refreshToken: 'ref456', usuario: { id: 1, nombre: 'Ana' },
      });
      const res = resMock();

      const body = await controller.login({ email: 'a@a.com', password: 'x' } as any, '127.0.0.1', res);

      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'acc123', expect.objectContaining({ httpOnly: true, path: '/' }));
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'ref456', expect.objectContaining({ httpOnly: true, path: '/auth' }));
      expect(body).toEqual({ usuario: { id: 1, nombre: 'Ana' } });
      expect(body).not.toHaveProperty('accessToken');
      expect(body).not.toHaveProperty('refreshToken');
    });

    it('passes through requiresPasswordChange/requires2FA without touching cookies', async () => {
      authService.login.mockResolvedValue({ requires2FA: true, tempToken: 'temp789' });
      const res = resMock();

      const body = await controller.login({ email: 'a@a.com', password: 'x' } as any, '127.0.0.1', res);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(body).toEqual({ requires2FA: true, tempToken: 'temp789' });
    });
  });

  describe('changePasswordRequired', () => {
    it('sets cookies and strips tokens on success', async () => {
      authService.changePasswordRequired.mockResolvedValue({
        accessToken: 'acc', refreshToken: 'ref', usuario: { id: 1 },
      });
      const res = resMock();

      const body = await controller.changePasswordRequired({ tempToken: 't', newPassword: 'p' } as any, '127.0.0.1', res);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(body).toEqual({ usuario: { id: 1 } });
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when there is no refreshToken cookie', async () => {
      const req = { cookies: {} } as any;
      const res = resMock();
      await expect(controller.refresh(req, res)).rejects.toThrow(UnauthorizedException);
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });

    it('reads the refresh token from the cookie (not the body) and rotates both cookies', async () => {
      authService.refreshToken.mockResolvedValue({ accessToken: 'newAcc', refreshToken: 'newRef' });
      const req = { cookies: { refreshToken: 'oldRef' } } as any;
      const res = resMock();

      const body = await controller.refresh(req, res);

      expect(authService.refreshToken).toHaveBeenCalledWith('oldRef');
      expect(res.cookie).toHaveBeenCalledWith('accessToken', 'newAcc', expect.anything());
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'newRef', expect.anything());
      expect(body).toEqual({ success: true });
    });
  });

  describe('logout', () => {
    it('clears both cookies using the same paths they were set with', () => {
      const res = resMock();
      const body = controller.logout(res);
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken', { path: '/' });
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/auth' });
      expect(body).toEqual({ success: true });
    });
  });

  describe('me', () => {
    it('returns the current user from the service', async () => {
      authService.getUsuarioActual.mockResolvedValue({ id: 1, nombre: 'Ana' });
      const result = await controller.me(1);
      expect(authService.getUsuarioActual).toHaveBeenCalledWith(1);
      expect(result).toEqual({ usuario: { id: 1, nombre: 'Ana' } });
    });
  });

  describe('verify2FA', () => {
    it('sets cookies and strips tokens on success', async () => {
      authService.verify2FA.mockResolvedValue({ accessToken: 'acc', refreshToken: 'ref', usuario: { id: 1 } });
      const res = resMock();

      const body = await controller.verify2FA({ tempToken: 't', code: '123456' }, '127.0.0.1', res);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(body).toEqual({ usuario: { id: 1 } });
    });
  });
});
