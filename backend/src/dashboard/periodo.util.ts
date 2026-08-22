import { BadRequestException } from '@nestjs/common';

export type TipoPeriodo = 'mes' | 'bimestre' | 'trimestre' | 'semestre' | 'anio';

const VALORES_MAXIMOS: Record<Exclude<TipoPeriodo, 'anio'>, number> = {
  mes: 12,
  bimestre: 6,
  trimestre: 4,
  semestre: 2,
};

const MESES_LABEL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function validarTipoYValor(tipo: string, valor?: number): asserts tipo is TipoPeriodo {
  if (!['mes', 'bimestre', 'trimestre', 'semestre', 'anio'].includes(tipo)) {
    throw new BadRequestException(`Tipo de período inválido: "${tipo}". Usa mes, bimestre, trimestre, semestre o anio.`);
  }
  if (tipo === 'anio') return;

  const max = VALORES_MAXIMOS[tipo as Exclude<TipoPeriodo, 'anio'>];
  if (!valor || valor < 1 || valor > max) {
    throw new BadRequestException(`Para el período "${tipo}" el valor debe estar entre 1 y ${max}.`);
  }
}

/** Mes calendario (1-12) en el que arranca el N-ésimo bloque de un tipo de período */
function mesInicioDelBloque(tipo: Exclude<TipoPeriodo, 'anio'>, valor: number): number {
  const mesesPorBloque = { mes: 1, bimestre: 2, trimestre: 3, semestre: 6 }[tipo];
  return (valor - 1) * mesesPorBloque + 1;
}

export function calcularRangoPeriodo(tipo: TipoPeriodo, anio: number, valor?: number): { desde: Date; hasta: Date; etiqueta: string } {
  if (tipo === 'anio') {
    return { desde: new Date(anio, 0, 1), hasta: new Date(anio, 11, 31), etiqueta: `${anio}` };
  }

  const mesesPorBloque = { mes: 1, bimestre: 2, trimestre: 3, semestre: 6 }[tipo];
  const mesInicio = mesInicioDelBloque(tipo, valor!);
  const desde = new Date(anio, mesInicio - 1, 1);
  const hasta = new Date(anio, mesInicio - 1 + mesesPorBloque, 0);

  let etiqueta: string;
  if (tipo === 'mes') {
    etiqueta = `${MESES_LABEL[mesInicio - 1]} ${anio}`;
  } else {
    const mesFinLabel = MESES_LABEL[mesInicio - 1 + mesesPorBloque - 1];
    const abrevInicio = MESES_LABEL[mesInicio - 1].slice(0, 3);
    const abrevFin = mesFinLabel.slice(0, 3);
    const nombreTipo = { bimestre: 'Bimestre', trimestre: 'Trimestre', semestre: 'Semestre' }[tipo];
    etiqueta = `${nombreTipo} ${valor} (${abrevInicio}-${abrevFin} ${anio})`;
  }

  return { desde, hasta, etiqueta };
}

export function periodoAnterior(tipo: TipoPeriodo, anio: number, valor?: number): { anio: number; valor?: number } {
  if (tipo === 'anio') return { anio: anio - 1 };

  const max = VALORES_MAXIMOS[tipo as Exclude<TipoPeriodo, 'anio'>];
  const valorAnterior = valor! - 1;
  if (valorAnterior < 1) return { anio: anio - 1, valor: max };
  return { anio, valor: valorAnterior };
}

export function calcularCrecimiento(actual: number, anterior: number): { delta: number; porcentaje: number | null } {
  const delta = actual - anterior;
  if (anterior === 0) {
    return { delta, porcentaje: actual === 0 ? null : 100 };
  }
  return { delta, porcentaje: Math.round((delta / anterior) * 100) };
}
