import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { EventoAgenda } from '../agenda/entities/evento-agenda.entity';
import { LogAuditoria } from '../auditoria/entities/log-auditoria.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Expediente) private expRepo: Repository<Expediente>,
    @InjectRepository(Cliente) private clienteRepo: Repository<Cliente>,
    @InjectRepository(Pago) private pagoRepo: Repository<Pago>,
    @InjectRepository(EventoAgenda) private eventoRepo: Repository<EventoAgenda>,
    @InjectRepository(LogAuditoria) private logRepo: Repository<LogAuditoria>,
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

    const [totalMes, totalSemana, porServicio] = await Promise.all([
      this.pagoRepo
        .createQueryBuilder('p')
        .select('SUM(p.montoPagado)', 'total')
        .where('p.despachoId = :despachoId AND p.createdAt >= :inicio', { despachoId, inicio: inicioMes })
        .getRawOne(),
      this.pagoRepo
        .createQueryBuilder('p')
        .select('SUM(p.montoPagado)', 'total')
        .where('p.despachoId = :despachoId AND p.createdAt >= :inicio', { despachoId, inicio: inicioSemana })
        .getRawOne(),
      this.pagoRepo
        .createQueryBuilder('p')
        .select('p.servicioId', 'servicioId')
        .addSelect('SUM(p.montoPagado)', 'total')
        .where('p.despachoId = :despachoId', { despachoId })
        .groupBy('p.servicioId')
        .getRawMany(),
    ]);

    return {
      ingresosMes: +(totalMes?.total || 0),
      ingresosSemana: +(totalSemana?.total || 0),
      porServicio,
    };
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

  async getIngresosHistorico(despachoId: number, meses = 6) {
    const result: { mes: string; total: number }[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
      const data = await this.pagoRepo
        .createQueryBuilder('p')
        .select('SUM(p.montoPagado)', 'total')
        .where('p.despachoId = :despachoId AND p.createdAt BETWEEN :inicio AND :fin', { despachoId, inicio, fin })
        .getRawOne();
      result.push({
        mes: inicio.toLocaleString('es-MX', { month: 'short', year: '2-digit' }),
        total: +(data?.total || 0),
      });
    }
    return result;
  }
}
