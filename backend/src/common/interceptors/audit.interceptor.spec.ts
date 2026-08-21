import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditInterceptor } from './audit.interceptor';
import { LogAuditoria } from '../../auditoria/entities/log-auditoria.entity';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        { provide: getRepositoryToken(LogAuditoria), useValue: { create: jest.fn(), save: jest.fn() } },
      ],
    }).compile();

    interceptor = module.get(AuditInterceptor);
  });

  // Los métodos de armado de descripción son privados pero puros — se prueban directamente
  // en lugar de simular el Observable completo con su tap() asíncrono "fire and forget".
  const describir = (method: string, url: string, response: any) =>
    (interceptor as any).getDescripcion(method, url, response);
  const modulo = (url: string) => (interceptor as any).getModule(url);

  describe('getDescripcion — cobros y abonos', () => {
    it('describes a cobro creation with its numero and total', () => {
      expect(describir('POST', '/pagos', { numero: 'REC-2026-0001', montoTotal: 900 }))
        .toBe('CREAR — Cobro REC-2026-0001 — $900.00');
    });

    it('describes an abono with the total and remaining balance', () => {
      expect(describir('POST', '/pagos/5/abonos', { numero: 'REC-2026-0001', montoTotal: 900, montoPendiente: 0 }))
        .toBe('CREAR — Abono a REC-2026-0001 — total $900.00, pendiente $0.00');
    });

    it('does not treat a numero field on a different route as a cobro', () => {
      expect(describir('POST', '/expedientes', { numero: 'EXP-2026-0001', titulo: 'Caso X' }))
        .toBe('CREAR — Caso X');
    });
  });

  describe('getDescripcion — fallback genérico', () => {
    it('falls back to nombre + apellido', () => {
      expect(describir('POST', '/clientes', { nombre: 'Ana', apellido: 'Ruiz' })).toBe('CREAR — Ana Ruiz');
    });

    it('falls back to nombre alone when there is no apellido', () => {
      expect(describir('PATCH', '/catalogos/areas/3', { nombre: 'Derecho Penal' })).toBe('ACTUALIZAR — Derecho Penal');
    });

    it('falls back to the raw method and url when nothing is recognized', () => {
      expect(describir('DELETE', '/expedientes/3/eventos', {})).toBe('DELETE /expedientes/3/eventos');
    });
  });

  describe('getModule', () => {
    it('extracts the module from a direct route', () => {
      expect(modulo('/pagos/5/abonos')).toBe('PAGOS');
    });

    it('extracts the real module from a /root/<modulo> route', () => {
      expect(modulo('/root/despachos/3')).toBe('DESPACHOS');
    });
  });

  describe('isManuallyAudited', () => {
    const manual = (method: string, url: string) => (interceptor as any).isManuallyAudited(method, url);

    it('skips the expediente estado-change route, which logs its own before/after entry', () => {
      expect(manual('PATCH', '/expedientes/7/estado')).toBe(true);
      expect(manual('PATCH', '/expedientes/7/estado?foo=bar')).toBe(true);
    });

    it('does not skip other expediente routes', () => {
      expect(manual('PATCH', '/expedientes/7')).toBe(false);
      expect(manual('POST', '/expedientes/7/eventos')).toBe(false);
    });

    it('does not skip the estado route for a different HTTP method', () => {
      expect(manual('POST', '/expedientes/7/estado')).toBe(false);
    });
  });
});
