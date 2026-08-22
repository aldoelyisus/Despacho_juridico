import { BadRequestException } from '@nestjs/common';
import { validarTipoYValor, calcularRangoPeriodo, periodoAnterior, calcularCrecimiento } from './periodo.util';

describe('validarTipoYValor', () => {
  it('rejects an unknown tipo', () => {
    expect(() => validarTipoYValor('semana', 1)).toThrow(BadRequestException);
  });

  it('rejects a valor out of range for mes', () => {
    expect(() => validarTipoYValor('mes', 13)).toThrow(BadRequestException);
    expect(() => validarTipoYValor('mes', 0)).toThrow(BadRequestException);
  });

  it('rejects a missing valor for tipos that require one', () => {
    expect(() => validarTipoYValor('bimestre', undefined)).toThrow(BadRequestException);
  });

  it('does not require valor for anio', () => {
    expect(() => validarTipoYValor('anio', undefined)).not.toThrow();
  });

  it('accepts valid combinations for every tipo', () => {
    expect(() => validarTipoYValor('mes', 12)).not.toThrow();
    expect(() => validarTipoYValor('bimestre', 6)).not.toThrow();
    expect(() => validarTipoYValor('trimestre', 4)).not.toThrow();
    expect(() => validarTipoYValor('semestre', 2)).not.toThrow();
  });
});

describe('calcularRangoPeriodo', () => {
  it('computes the range for a specific mes', () => {
    const r = calcularRangoPeriodo('mes', 2026, 8);
    expect(r.desde).toEqual(new Date(2026, 7, 1));
    expect(r.hasta).toEqual(new Date(2026, 7, 31));
    expect(r.etiqueta).toBe('Agosto 2026');
  });

  it('computes the range for febrero including leap-year length', () => {
    const r = calcularRangoPeriodo('mes', 2024, 2);
    expect(r.hasta).toEqual(new Date(2024, 1, 29));
  });

  it('computes bimestre 1 as enero-febrero', () => {
    const r = calcularRangoPeriodo('bimestre', 2026, 1);
    expect(r.desde).toEqual(new Date(2026, 0, 1));
    expect(r.hasta).toEqual(new Date(2026, 1, 28));
  });

  it('computes bimestre 6 as noviembre-diciembre', () => {
    const r = calcularRangoPeriodo('bimestre', 2026, 6);
    expect(r.desde).toEqual(new Date(2026, 10, 1));
    expect(r.hasta).toEqual(new Date(2026, 11, 31));
  });

  it('computes trimestre 1 as enero-marzo (Q1 calendario)', () => {
    const r = calcularRangoPeriodo('trimestre', 2026, 1);
    expect(r.desde).toEqual(new Date(2026, 0, 1));
    expect(r.hasta).toEqual(new Date(2026, 2, 31));
  });

  it('computes semestre 2 as julio-diciembre', () => {
    const r = calcularRangoPeriodo('semestre', 2026, 2);
    expect(r.desde).toEqual(new Date(2026, 6, 1));
    expect(r.hasta).toEqual(new Date(2026, 11, 31));
  });

  it('computes the full calendar year for anio', () => {
    const r = calcularRangoPeriodo('anio', 2026);
    expect(r.desde).toEqual(new Date(2026, 0, 1));
    expect(r.hasta).toEqual(new Date(2026, 11, 31));
    expect(r.etiqueta).toBe('2026');
  });
});

describe('periodoAnterior', () => {
  it('goes back one mes within the same year', () => {
    expect(periodoAnterior('mes', 2026, 8)).toEqual({ anio: 2026, valor: 7 });
  });

  it('wraps mes 1 to mes 12 of the previous year', () => {
    expect(periodoAnterior('mes', 2026, 1)).toEqual({ anio: 2025, valor: 12 });
  });

  it('wraps bimestre 1 to bimestre 6 of the previous year', () => {
    expect(periodoAnterior('bimestre', 2026, 1)).toEqual({ anio: 2025, valor: 6 });
  });

  it('wraps trimestre 1 to trimestre 4 of the previous year', () => {
    expect(periodoAnterior('trimestre', 2026, 1)).toEqual({ anio: 2025, valor: 4 });
  });

  it('wraps semestre 1 to semestre 2 of the previous year', () => {
    expect(periodoAnterior('semestre', 2026, 1)).toEqual({ anio: 2025, valor: 2 });
  });

  it('goes back one full year for anio', () => {
    expect(periodoAnterior('anio', 2026)).toEqual({ anio: 2025 });
  });
});

describe('calcularCrecimiento', () => {
  it('computes a normal percentage growth', () => {
    expect(calcularCrecimiento(1180, 1000)).toEqual({ delta: 180, porcentaje: 18 });
  });

  it('computes a negative percentage when it shrank', () => {
    expect(calcularCrecimiento(800, 1000)).toEqual({ delta: -200, porcentaje: -20 });
  });

  it('returns 100% when the previous period was zero and there is now activity', () => {
    expect(calcularCrecimiento(500, 0)).toEqual({ delta: 500, porcentaje: 100 });
  });

  it('returns a null percentage when both periods are zero (nothing to compare)', () => {
    expect(calcularCrecimiento(0, 0)).toEqual({ delta: 0, porcentaje: null });
  });
});
