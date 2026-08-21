import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

const repoMockFactory = () => ({
  findOne: jest.fn(),
  update: jest.fn(),
});

const CONFIG_VALUES: Record<string, any> = {
  JWT_SECRET: 'test-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  LOGIN_MAX_INTENTOS: 3,
  LOGIN_BLOQUEO_MINUTOS: 15,
};

describe('AuthService', () => {
  let service: AuthService;
  let usuarioRepo: ReturnType<typeof repoMockFactory>;
  let jwtService: { sign: jest.Mock; signAsync: jest.Mock; verify: jest.Mock };
  let auditoriaService: { log: jest.Mock };

  const buildUsuario = (overrides: Partial<Usuario> = {}): Usuario => ({
    id: 1,
    despachoId: 10,
    rolId: 2,
    nombre: 'Ana',
    apellido: 'Ruiz',
    email: 'ana@despacho.com',
    password: bcrypt.hashSync('CorrectaSegura1!', 12),
    telefono: '',
    avatar: '',
    activo: true,
    ultimoAcceso: null as any,
    twoFactorSecret: null as any,
    twoFactorEnabled: false,
    twoFactorBackupCodes: null as any,
    debeCambiarPassword: false,
    intentosFallidos: 0,
    bloqueadoHasta: null as any,
    despacho: { id: 10, activo: true, bloqueado: false } as Despacho,
    rol: { id: 2, nombre: 'administrador' } as Rol,
    ...overrides,
  } as Usuario);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Despacho), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Rol), useFactory: repoMockFactory },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'temp-token'), signAsync: jest.fn(() => Promise.resolve('token')), verify: jest.fn() },
        },
        { provide: ConfigService, useValue: { get: (key: string, fallback?: any) => CONFIG_VALUES[key] ?? fallback } },
        { provide: AuditoriaService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(AuthService);
    usuarioRepo = module.get(getRepositoryToken(Usuario));
    jwtService = module.get(JwtService) as any;
    auditoriaService = module.get(AuditoriaService) as any;
  });

  describe('login — timing & enumeración', () => {
    it('returns the same generic message for an unknown email and a wrong password', async () => {
      usuarioRepo.findOne.mockResolvedValueOnce(null);
      let unknownEmailError: any;
      try { await service.login({ email: 'nadie@x.com', password: 'x' } as any); } catch (e) { unknownEmailError = e; }

      usuarioRepo.findOne.mockResolvedValueOnce(buildUsuario());
      let wrongPasswordError: any;
      try { await service.login({ email: 'ana@despacho.com', password: 'incorrecta' } as any); } catch (e) { wrongPasswordError = e; }

      expect(unknownEmailError.message).toBe(wrongPasswordError.message);
    });
  });

  describe('login — bloqueo por intentos', () => {
    it('blocks login while bloqueadoHasta is in the future', async () => {
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ bloqueadoHasta: new Date(Date.now() + 60_000) }));
      await expect(service.login({ email: 'ana@despacho.com', password: 'x' } as any)).rejects.toThrow(ForbiddenException);
    });

    it('locks the account after reaching LOGIN_MAX_INTENTOS failed attempts', async () => {
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ intentosFallidos: 2 }));
      await expect(
        service.login({ email: 'ana@despacho.com', password: 'incorrecta' } as any),
      ).rejects.toThrow(UnauthorizedException);

      const updateArg = usuarioRepo.update.mock.calls[0][1];
      expect(updateArg.bloqueadoHasta).toBeInstanceOf(Date);
      expect(auditoriaService.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'CUENTA_BLOQUEADA' }));
    });
  });

  describe('login — flujos de éxito', () => {
    it('returns tokens directly when 2FA and forced password change are both off', async () => {
      usuarioRepo.findOne.mockResolvedValue(buildUsuario());
      const result = await service.login({ email: 'ana@despacho.com', password: 'CorrectaSegura1!' } as any);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('usuario');
    });

    it('returns requiresPasswordChange before evaluating 2FA', async () => {
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ debeCambiarPassword: true, twoFactorEnabled: true }));
      const result = await service.login({ email: 'ana@despacho.com', password: 'CorrectaSegura1!' } as any);
      expect(result).toEqual({ requiresPasswordChange: true, tempToken: 'temp-token' });
    });

    it('returns requires2FA when 2FA is enabled and no password change is pending', async () => {
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ twoFactorEnabled: true }));
      const result = await service.login({ email: 'ana@despacho.com', password: 'CorrectaSegura1!' } as any);
      expect(result).toEqual({ requires2FA: true, tempToken: 'temp-token' });
    });

    it('rejects login for a despacho that is blocked for non-payment', async () => {
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ despacho: { id: 10, activo: true, bloqueado: true } as Despacho }));
      await expect(service.login({ email: 'ana@despacho.com', password: 'CorrectaSegura1!' } as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('changePasswordRequired', () => {
    it('rejects a new password equal to the current one', async () => {
      const usuario = buildUsuario({ debeCambiarPassword: true });
      jwtService.verify.mockReturnValue({ sub: 1, type: 'password_change_pending' });
      usuarioRepo.findOne.mockResolvedValue(usuario);

      await expect(
        service.changePasswordRequired('temp-token', 'CorrectaSegura1!'),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the password, clears the flag and continues the login flow', async () => {
      const usuario = buildUsuario({ debeCambiarPassword: true });
      jwtService.verify.mockReturnValue({ sub: 1, type: 'password_change_pending' });
      usuarioRepo.findOne.mockResolvedValue(usuario);

      const result = await service.changePasswordRequired('temp-token', 'NuevaSegura1!');

      expect(usuarioRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({ debeCambiarPassword: false }));
      expect(result).toHaveProperty('accessToken');
    });

    it('rejects a token that is not of type password_change_pending', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, type: '2fa_pending' });
      await expect(service.changePasswordRequired('temp-token', 'NuevaSegura1!')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('rejects an expired or malformed refresh token', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });
      await expect(service.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the user was deactivated after the refresh token was issued', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      usuarioRepo.findOne.mockResolvedValue(null); // activo:true en el where — no lo encuentra
      await expect(service.refreshToken('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the despacho was blocked for non-payment after the refresh token was issued', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ despacho: { id: 10, activo: true, bloqueado: true } as Despacho }));
      await expect(service.refreshToken('valid-token')).rejects.toThrow(ForbiddenException);
    });

    it('rejects when the despacho was deactivated after the refresh token was issued', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ despacho: { id: 10, activo: false, bloqueado: false } as Despacho }));
      await expect(service.refreshToken('valid-token')).rejects.toThrow(ForbiddenException);
    });

    it('does not check despacho status for a root user', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ rol: { id: 1, nombre: 'root' } as Rol, despacho: null as any }));
      await expect(service.refreshToken('valid-token')).resolves.toHaveProperty('accessToken');
    });

    it('issues fresh tokens for a still-active user in a healthy despacho', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      usuarioRepo.findOne.mockResolvedValue(buildUsuario());
      const result = await service.refreshToken('valid-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('verify2FA — bloqueo por intentos', () => {
    const speakeasy = require('speakeasy');

    it('rejects while the account is locked from prior failed attempts, without checking the code', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, type: '2fa_pending' });
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ twoFactorEnabled: true, twoFactorSecret: 'SECRET', bloqueadoHasta: new Date(Date.now() + 60_000) }));
      const spy = jest.spyOn(speakeasy.totp, 'verify');

      await expect(service.verify2FA('temp-token', '000000')).rejects.toThrow(ForbiddenException);
      expect(spy).not.toHaveBeenCalled();
    });

    it('locks the account after reaching LOGIN_MAX_INTENTOS wrong codes', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, type: '2fa_pending' });
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ twoFactorEnabled: true, twoFactorSecret: 'SECRET', intentosFallidos: 2 }));
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(false);

      await expect(service.verify2FA('temp-token', '000000')).rejects.toThrow(UnauthorizedException);

      const updateArg = usuarioRepo.update.mock.calls.find((c: any) => c[1].bloqueadoHasta instanceof Date)?.[1];
      expect(updateArg?.bloqueadoHasta).toBeInstanceOf(Date);
      expect(auditoriaService.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'CUENTA_BLOQUEADA' }));
    });

    it('does not lock the account when a wrong code is followed by a valid backup code', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, type: '2fa_pending' });
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({
        twoFactorEnabled: true, twoFactorSecret: 'SECRET', twoFactorBackupCodes: ['AAAA-BBBB'],
      }));
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(false);

      const result = await service.verify2FA('temp-token', 'aaaa-bbbb');
      expect(result).toHaveProperty('accessToken');
      expect(auditoriaService.log).not.toHaveBeenCalledWith(expect.objectContaining({ accion: '2FA_FALLIDO' }));
    });

    it('resets the failed-attempt counter on a successful code', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, type: '2fa_pending' });
      usuarioRepo.findOne.mockResolvedValue(buildUsuario({ twoFactorEnabled: true, twoFactorSecret: 'SECRET', intentosFallidos: 2 }));
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(true);

      await service.verify2FA('temp-token', '123456');

      expect(usuarioRepo.update).toHaveBeenCalledWith(1, { intentosFallidos: 0, bloqueadoHasta: null });
    });
  });

  describe('generateBackupCodes (via enable2FA)', () => {
    it('produces 8 unique codes in XXXX-XXXX format using an unambiguous alphabet', async () => {
      const usuario = buildUsuario({ twoFactorSecret: 'JBSWY3DPEHPK3PXP', twoFactorEnabled: false });
      usuarioRepo.findOne.mockResolvedValue(usuario);
      const speakeasy = require('speakeasy');
      jest.spyOn(speakeasy.totp, 'verify').mockReturnValue(true);

      const { backupCodes } = await service.enable2FA(1, '123456');

      expect(backupCodes).toHaveLength(8);
      expect(new Set(backupCodes).size).toBe(8);
      backupCodes.forEach((code: string) => expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/));
    });
  });
});
