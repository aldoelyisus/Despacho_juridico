import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { IngresoDiarioDespacho } from './entities/ingreso-diario-despacho.entity';
import { IngresoMensualDespacho } from './entities/ingreso-mensual-despacho.entity';
import { ExpedienteEstadoSnapshot } from './entities/expediente-estado-snapshot.entity';
import { PagoDetalle } from '../pagos/entities/pago-detalle.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';

const fechaISO = (d: Date) => d.toISOString().split('T')[0];

@Injectable()
export class EstadisticasService {
  private readonly logger = new Logger(EstadisticasService.name);

  constructor(
    @InjectRepository(IngresoDiarioDespacho) private ingresoDiarioRepo: Repository<IngresoDiarioDespacho>,
    @InjectRepository(IngresoMensualDespacho) private ingresoMensualRepo: Repository<IngresoMensualDespacho>,
    @InjectRepository(ExpedienteEstadoSnapshot) private snapshotRepo: Repository<ExpedienteEstadoSnapshot>,
    @InjectRepository(PagoDetalle) private pagoDetalleRepo: Repository<PagoDetalle>,
    @InjectRepository(Expediente) private expedienteRepo: Repository<Expediente>,
  ) {}

  // ── CRONS ─────────────────────────────────────────────────────────────────

  /** Cada noche, 2am — cierra el día anterior: ingresos por despacho y foto de expedientes por estatus */
  @Cron('0 2 * * *', { timeZone: 'America/Mexico_City' })
  async cronRollupDiario() {
    const ayer = new Date(Date.now() - 86400000);
    const ingresos = await this.rollupIngresosDia(ayer);
    const snapshot = await this.snapshotExpedientesHoy();
    this.logger.log(
      `Rollup diario (${ingresos.fecha}): ${ingresos.despachos} despacho(s) con ingresos, ${snapshot.filas} fila(s) de snapshot de expedientes`,
    );
  }

  /** Día 1 de cada mes, 3:30am — consolida el mes que acaba de cerrar sumando sus filas diarias */
  @Cron('30 3 1 * *', { timeZone: 'America/Mexico_City' })
  async cronRollupMensual() {
    const hoy = new Date();
    const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const resultado = await this.rollupIngresosMes(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1);
    this.logger.log(`Rollup mensual (${resultado.periodo}): ${resultado.despachos} despacho(s) consolidados`);
  }

  // ── ROLLUPS ───────────────────────────────────────────────────────────────

  /** Suma los abonos (PagoDetalle) de una fecha específica por despacho, y hace upsert en ingresos_diarios_despacho */
  async rollupIngresosDia(fecha: Date) {
    const fechaStr = fechaISO(fecha);
    const filas = await this.pagoDetalleRepo
      .createQueryBuilder('d')
      .select('d.despachoId', 'despachoId')
      .addSelect('SUM(d.monto)', 'montoTotal')
      .addSelect('COUNT(*)', 'numTickets')
      .where('d.fechaPago = :fecha', { fecha: fechaStr })
      .groupBy('d.despachoId')
      .getRawMany();

    for (const fila of filas) {
      await this.upsertIngresoDiario(+fila.despachoId, fechaStr, Number(fila.montoTotal), Number(fila.numTickets));
    }
    return { despachos: filas.length, fecha: fechaStr };
  }

  private async upsertIngresoDiario(despachoId: number, fecha: string, montoTotal: number, numTickets: number) {
    const existente = await this.ingresoDiarioRepo.findOne({ where: { despachoId, fecha: fecha as any } });
    if (existente) {
      await this.ingresoDiarioRepo.update(existente.id, { montoTotal, numTickets });
    } else {
      await this.ingresoDiarioRepo.save(this.ingresoDiarioRepo.create({ despachoId, fecha: fecha as any, montoTotal, numTickets }));
    }
  }

  /** Suma las filas diarias de un mes por despacho, y hace upsert en ingresos_mensuales_despacho */
  async rollupIngresosMes(anio: number, mes: number) {
    const inicio = fechaISO(new Date(anio, mes - 1, 1));
    const fin = fechaISO(new Date(anio, mes, 0));

    const filas = await this.ingresoDiarioRepo
      .createQueryBuilder('d')
      .select('d.despachoId', 'despachoId')
      .addSelect('SUM(d.montoTotal)', 'montoTotal')
      .addSelect('SUM(d.numTickets)', 'numTickets')
      .where('d.fecha BETWEEN :inicio AND :fin', { inicio, fin })
      .groupBy('d.despachoId')
      .getRawMany();

    for (const fila of filas) {
      await this.upsertIngresoMensual(+fila.despachoId, anio, mes, Number(fila.montoTotal), Number(fila.numTickets));
    }
    return { despachos: filas.length, periodo: `${mes}/${anio}` };
  }

  private async upsertIngresoMensual(despachoId: number, anio: number, mes: number, montoTotal: number, numTickets: number) {
    const existente = await this.ingresoMensualRepo.findOne({ where: { despachoId, anio, mes } });
    if (existente) {
      await this.ingresoMensualRepo.update(existente.id, { montoTotal, numTickets });
    } else {
      await this.ingresoMensualRepo.save(this.ingresoMensualRepo.create({ despachoId, anio, mes, montoTotal, numTickets }));
    }
  }

  /** Cuenta expedientes por estatus — en vivo, sin persistir. Sin despachoId, cuenta todos (uso del cron) */
  private async contarExpedientesPorEstadoEnVivo(despachoId?: number) {
    const qb = this.expedienteRepo
      .createQueryBuilder('e')
      .select('e.despachoId', 'despachoId')
      .addSelect('e.estado', 'estado')
      .addSelect('COUNT(*)', 'cantidad')
      .groupBy('e.despachoId')
      .addGroupBy('e.estado');
    if (despachoId !== undefined) qb.where('e.despachoId = :despachoId', { despachoId });
    return qb.getRawMany();
  }

  /** Cuenta expedientes por estatus, agrupados por despacho, y guarda la foto de HOY (una fila por despacho+estatus) */
  async snapshotExpedientesHoy() {
    const hoyStr = fechaISO(new Date());
    const filas = await this.contarExpedientesPorEstadoEnVivo();

    for (const fila of filas) {
      const existente = await this.snapshotRepo.findOne({
        where: { despachoId: +fila.despachoId, fecha: hoyStr as any, estado: fila.estado },
      });
      if (existente) {
        await this.snapshotRepo.update(existente.id, { cantidad: Number(fila.cantidad) });
      } else {
        await this.snapshotRepo.save(this.snapshotRepo.create({
          despachoId: +fila.despachoId, fecha: hoyStr as any, estado: fila.estado, cantidad: Number(fila.cantidad),
        }));
      }
    }
    return { filas: filas.length, fecha: hoyStr };
  }

  // ── LECTURA (usada por el dashboard) ─────────────────────────────────────

  /**
   * Ingreso (monto + número de tickets) de un despacho en un rango [desde, hasta] (inclusivo),
   * combinando lo ya cerrado por el rollup diario con una suma en vivo del día de hoy (que el
   * cron nocturno aún no procesó).
   */
  async getIngresosPeriodo(despachoId: number, desde: Date, hasta: Date): Promise<{ monto: number; numTickets: number }> {
    const hoyStr = fechaISO(new Date());
    const desdeStr = fechaISO(desde);
    const hastaStr = fechaISO(hasta);
    const hastaRollupStr = hastaStr < hoyStr ? hastaStr : fechaISO(new Date(Date.now() - 86400000));
    const incluyeHoy = desdeStr <= hoyStr && hoyStr <= hastaStr;

    const [rollup, hoyEnVivo] = await Promise.all([
      desdeStr <= hastaRollupStr
        ? this.ingresoDiarioRepo
            .createQueryBuilder('d')
            .select('SUM(d.montoTotal)', 'total')
            .addSelect('SUM(d.numTickets)', 'numTickets')
            .where('d.despachoId = :despachoId AND d.fecha BETWEEN :desde AND :hasta', { despachoId, desde: desdeStr, hasta: hastaRollupStr })
            .getRawOne()
        : Promise.resolve({ total: 0, numTickets: 0 }),
      incluyeHoy
        ? this.pagoDetalleRepo
            .createQueryBuilder('p')
            .select('SUM(p.monto)', 'total')
            .addSelect('COUNT(*)', 'numTickets')
            .where('p.despachoId = :despachoId AND p.fechaPago = :hoy', { despachoId, hoy: hoyStr })
            .getRawOne()
        : Promise.resolve({ total: 0, numTickets: 0 }),
    ]);

    return {
      monto: Number(rollup?.total || 0) + Number(hoyEnVivo?.total || 0),
      numTickets: Number(rollup?.numTickets || 0) + Number(hoyEnVivo?.numTickets || 0),
    };
  }

  /**
   * Ingreso de un despacho en un rango [desde, hasta] (inclusivo) — solo el monto.
   * @see getIngresosPeriodo para monto + número de tickets.
   */
  async getIngresoRango(despachoId: number, desde: Date, hasta: Date): Promise<number> {
    return (await this.getIngresosPeriodo(despachoId, desde, hasta)).monto;
  }

  /** Ingreso de un despacho en un mes calendario — lee el consolidado si el mes ya cerró, o lo calcula en vivo si está en curso */
  async getIngresoMes(despachoId: number, anio: number, mes: number): Promise<number> {
    const hoy = new Date();
    const esMesActual = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1;

    if (!esMesActual) {
      const row = await this.ingresoMensualRepo.findOne({ where: { despachoId, anio, mes } });
      return Number(row?.montoTotal || 0);
    }

    return this.getIngresoRango(despachoId, new Date(anio, mes - 1, 1), new Date(anio, mes, 0));
  }

  /** Serie histórica de expedientes por estatus de los últimos N días (para graficar tendencia) */
  async getExpedientesHistorico(despachoId: number, dias = 30) {
    const desde = fechaISO(new Date(Date.now() - dias * 86400000));
    return this.snapshotRepo.find({
      where: { despachoId, fecha: MoreThanOrEqual(desde) as any },
      order: { fecha: 'ASC' },
    });
  }

  /**
   * Conteo de expedientes por estatus tal como estaban al cierre de una fecha específica —
   * nunca se suma con otras fechas. Si la fecha es hoy (o futura), se calcula en vivo porque el
   * cron nocturno todavía no la guardó; si es pasada, se lee la foto ya guardada de ese día
   * exacto (arreglo vacío si esa fecha es anterior a que existiera esta funcionalidad).
   */
  async getExpedientesEnFecha(despachoId: number, fecha: Date): Promise<{ estado: string; cantidad: number }[]> {
    const hoyStr = fechaISO(new Date());
    const fechaStr = fechaISO(fecha);

    if (fechaStr >= hoyStr) {
      const filas = await this.contarExpedientesPorEstadoEnVivo(despachoId);
      return filas.map((f: any) => ({ estado: f.estado, cantidad: Number(f.cantidad) }));
    }

    const filas = await this.snapshotRepo.find({ where: { despachoId, fecha: fechaStr as any } });
    return filas.map((f) => ({ estado: f.estado, cantidad: f.cantidad }));
  }

  // ── BACKFILL (única vez) ─────────────────────────────────────────────────

  /** Se ejecuta una sola vez, al arrancar, si nunca se ha corrido: reconstruye ingresos_diarios_despacho
   *  y ingresos_mensuales_despacho a partir de los PagoDetalle históricos que ya existían antes de esta
   *  funcionalidad. El histórico de expedientes por estatus NO se puede reconstruir — nunca se guardó. */
  async ensureBackfillIngresos() {
    const yaExiste = await this.ingresoDiarioRepo.count();
    if (yaExiste > 0) return { ejecutado: false };
    const resultado = await this.backfillIngresos();
    this.logger.log(`Backfill de ingresos: ${resultado.diasProcesados} día(s), ${resultado.mesesProcesados} mes(es)`);
    return { ejecutado: true, ...resultado };
  }

  async backfillIngresos() {
    const dias = await this.pagoDetalleRepo
      .createQueryBuilder('d')
      .select('DISTINCT d.fechaPago', 'fecha')
      .orderBy('d.fechaPago', 'ASC')
      .getRawMany();

    for (const { fecha } of dias) {
      await this.rollupIngresosDia(new Date(fecha));
    }

    const meses = new Set<string>();
    for (const { fecha } of dias) {
      const d = new Date(fecha);
      meses.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    }
    for (const clave of meses) {
      const [anio, mes] = clave.split('-').map(Number);
      await this.rollupIngresosMes(anio, mes);
    }

    return { diasProcesados: dias.length, mesesProcesados: meses.size };
  }
}
