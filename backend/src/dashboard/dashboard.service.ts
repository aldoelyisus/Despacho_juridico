import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { EventoAgenda } from '../agenda/entities/evento-agenda.entity';
import { LogAuditoria } from '../auditoria/entities/log-auditoria.entity';
import { EstadisticasService } from '../estadisticas/estadisticas.service';
import {
  TipoPeriodo, validarTipoYValor, calcularRangoPeriodo, periodoAnterior, calcularCrecimiento,
} from './periodo.util';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Expediente) private expRepo: Repository<Expediente>,
    @InjectRepository(Cliente) private clienteRepo: Repository<Cliente>,
    @InjectRepository(Pago) private pagoRepo: Repository<Pago>,
    @InjectRepository(EventoAgenda) private eventoRepo: Repository<EventoAgenda>,
    @InjectRepository(LogAuditoria) private logRepo: Repository<LogAuditoria>,
    private estadisticasService: EstadisticasService,
  ) {}

  async getKpis(despachoId: number) {
    const [expedientesStats, clientesStats, financieroStats, agendaStats, actividadReciente] =
      await Promise.all([
        this.getExpedientesStats(despachoId),
        this.getClientesStats(despachoId),
        this.getFinancieroStats(despachoId),
        this.getAgendaStats(despachoId),
        this.getActividadReciente(despachoId),
      ]);

    return {
      expedientes: expedientesStats,
      clientes: clientesStats,
      financiero: financieroStats,
      agenda: agendaStats,
      actividadReciente,
    };
  }

  private async getExpedientesStats(despachoId: number) {
    const byStatus = await this.expRepo
      .createQueryBuilder('e')
      .select('e.estado', 'estado')
      .addSelect('COUNT(*)', 'total')
      .where('e.despachoId = :despachoId', { despachoId })
      .groupBy('e.estado')
      .getRawMany();

    const total = byStatus.reduce((sum, s) => sum + +s.total, 0);
    const ganados = +(byStatus.find((s) => s.estado === 'ganado')?.total || 0);
    const perdidos = +(byStatus.find((s) => s.estado === 'perdido')?.total || 0);
    const cerrados = ganados + perdidos;
    const tasaExito = cerrados > 0 ? Math.round((ganados / cerrados) * 100) : 0;

    return { total, byStatus, ganados, perdidos, tasaExito };
  }

  private async getClientesStats(despachoId: number) {
    const total = await this.clienteRepo.count({ where: { despachoId } });
    const activos = await this.clienteRepo.count({ where: { despachoId, activo: true } });
    return { total, activos };
  }

  private async getFinancieroStats(despachoId: number) {
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const inicioSemana = new Date();
    inicioSemana.setDate(now.getDate() - now.getDay());

    // Ingresos por rango: se apoyan en el rollup diario (ingresos_diarios_despacho) en vez de
    // volver a sumar cada abono cada vez — con años de historial esto se mantiene barato.
    const [ingresosMes, ingresosSemana, porServicio] = await Promise.all([
      this.estadisticasService.getIngresoRango(despachoId, inicioMes, now),
      this.estadisticasService.getIngresoRango(despachoId, inicioSemana, now),
      this.pagoRepo
        .createQueryBuilder('p')
        .select('p.servicioId', 'servicioId')
        .addSelect('SUM(p.montoPagado)', 'total')
        .where('p.despachoId = :despachoId', { despachoId })
        .groupBy('p.servicioId')
        .getRawMany(),
    ]);

    return { ingresosMes, ingresosSemana, porServicio };
  }

  private async getAgendaStats(despachoId: number) {
    const hoy = new Date();
    const finSemana = new Date();
    finSemana.setDate(hoy.getDate() + 7);

    const proximosEventos = await this.eventoRepo
      .createQueryBuilder('e')
      .where('e.despachoId = :despachoId AND e.fechaInicio >= :hoy AND e.fechaInicio <= :fin', {
        despachoId, hoy, fin: finSemana,
      })
      .orderBy('e.fechaInicio', 'ASC')
      .take(5)
      .getMany();

    const totalSemana = await this.eventoRepo
      .createQueryBuilder('e')
      .where('e.despachoId = :despachoId AND e.fechaInicio >= :hoy AND e.fechaInicio <= :fin', {
        despachoId, hoy, fin: finSemana,
      })
      .getCount();

    return { proximosEventos, totalSemana };
  }

  private async getActividadReciente(despachoId: number) {
    return this.logRepo.find({
      where: { despachoId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  async getRendimientoUsuarios(despachoId: number) {
    return this.expRepo
      .createQueryBuilder('e')
      .innerJoin('expediente_colaboradores', 'ec', 'ec.expediente_id = e.id')
      .innerJoin('usuarios', 'u', 'u.id = ec.usuario_id')
      .select('u.id', 'usuarioId')
      .addSelect("CONCAT(u.nombre, ' ', u.apellido)", 'nombre')
      .addSelect('COUNT(e.id)', 'totalExpedientes')
      .addSelect("SUM(CASE WHEN e.estado = 'ganado' THEN 1 ELSE 0 END)", 'ganados')
      .addSelect("SUM(CASE WHEN e.estado = 'perdido' THEN 1 ELSE 0 END)", 'perdidos')
      .addSelect("SUM(CASE WHEN e.estado = 'cancelado' THEN 1 ELSE 0 END)", 'cancelados')
      .where('e.despachoId = :despachoId', { despachoId })
      .groupBy('u.id')
      .getRawMany();
  }

  /** Ingresos de los últimos N meses — lee del consolidado mensual (rápido incluso con años de
   *  historial); solo el mes en curso se calcula combinando lo ya cerrado con el día de hoy. */
  async getIngresosHistorico(despachoId: number, meses = 6) {
    const hoy = new Date();
    const result: { mes: string; total: number }[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const total = await this.estadisticasService.getIngresoMes(despachoId, fecha.getFullYear(), fecha.getMonth() + 1);
      result.push({
        mes: fecha.toLocaleString('es-MX', { month: 'short', year: '2-digit' }),
        total,
      });
    }
    return result;
  }

  /** Tendencia de expedientes por estatus de los últimos N días — foto diaria, nunca sumada entre fechas */
  async getExpedientesHistorico(despachoId: number, dias = 30) {
    return this.estadisticasService.getExpedientesHistorico(despachoId, dias);
  }

  private resumenExpedientes(filas: { estado: string; cantidad: number }[]) {
    return {
      byStatus: filas,
      total: filas.reduce((s, f) => s + f.cantidad, 0),
      activos: filas.find((f) => f.estado === 'activo')?.cantidad || 0,
      ganados: filas.find((f) => f.estado === 'ganado')?.cantidad || 0,
    };
  }

  /**
   * Resumen de ingresos (sumados) y expedientes (foto al cierre) de un período, comparado con el
   * período inmediato anterior del mismo tipo — con crecimiento en % y valor absoluto.
   */
  async getResumenPeriodo(despachoId: number, tipo: string, anio: number, valor?: number) {
    validarTipoYValor(tipo, valor);
    const tipoValido = tipo as TipoPeriodo;

    const actual = calcularRangoPeriodo(tipoValido, anio, valor);
    const ant = periodoAnterior(tipoValido, anio, valor);
    const anterior = calcularRangoPeriodo(tipoValido, ant.anio, ant.valor);

    const hoy = new Date();
    const cierreActual = actual.hasta > hoy ? hoy : actual.hasta;
    const cierreAnterior = anterior.hasta > hoy ? hoy : anterior.hasta;

    const [ingActual, ingAnterior, expActualFilas, expAnteriorFilas] = await Promise.all([
      this.estadisticasService.getIngresosPeriodo(despachoId, actual.desde, actual.hasta),
      this.estadisticasService.getIngresosPeriodo(despachoId, anterior.desde, anterior.hasta),
      this.estadisticasService.getExpedientesEnFecha(despachoId, cierreActual),
      this.estadisticasService.getExpedientesEnFecha(despachoId, cierreAnterior),
    ]);

    const expActual = this.resumenExpedientes(expActualFilas);
    const expAnterior = this.resumenExpedientes(expAnteriorFilas);

    return {
      periodo: {
        tipo: tipoValido, anio, valor: valor ?? null,
        desde: actual.desde.toISOString().split('T')[0], hasta: actual.hasta.toISOString().split('T')[0],
        etiqueta: actual.etiqueta,
      },
      periodoAnterior: {
        anio: ant.anio, valor: ant.valor ?? null,
        desde: anterior.desde.toISOString().split('T')[0], hasta: anterior.hasta.toISOString().split('T')[0],
        etiqueta: anterior.etiqueta,
      },
      ingresos: {
        actual: ingActual,
        anterior: ingAnterior,
        crecimientoMonto: calcularCrecimiento(ingActual.monto, ingAnterior.monto),
        crecimientoTickets: calcularCrecimiento(ingActual.numTickets, ingAnterior.numTickets),
      },
      expedientes: {
        actual: expActual,
        anterior: expAnterior,
        crecimientoTotal: calcularCrecimiento(expActual.total, expAnterior.total),
        crecimientoActivos: calcularCrecimiento(expActual.activos, expAnterior.activos),
        crecimientoGanados: calcularCrecimiento(expActual.ganados, expAnterior.ganados),
      },
    };
  }

  /** Ingresos sumados y expedientes al cierre de un rango de días específico (dentro de un mes) */
  async getResumenDia(despachoId: number, desde: string, hasta: string) {
    if (!desde || !hasta) throw new BadRequestException('Debes indicar "desde" y "hasta" (YYYY-MM-DD)');
    if (desde > hasta) throw new BadRequestException('"desde" no puede ser posterior a "hasta"');

    const [ingresos, filas] = await Promise.all([
      this.estadisticasService.getIngresosPeriodo(despachoId, new Date(desde), new Date(hasta)),
      this.estadisticasService.getExpedientesEnFecha(despachoId, new Date(hasta)),
    ]);

    return { desde, hasta, ingresos, expedientes: this.resumenExpedientes(filas) };
  }
}
