import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { In, Repository } from 'typeorm';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Mensualidad, EstadoMensualidad, TipoMensualidad } from '../root/entities/mensualidad.entity';
import { calcularFechaLimiteMensualidad } from './facturacion.util';

@Injectable()
export class FacturacionService {
  private readonly logger = new Logger(FacturacionService.name);

  constructor(
    @InjectRepository(Despacho) private despachoRepo: Repository<Despacho>,
    @InjectRepository(Mensualidad) private mensualidadRepo: Repository<Mensualidad>,
  ) {}

  /** Día 1 de cada mes, 3am — genera el adeudo del mes para cada despacho activo */
  @Cron('0 3 1 * *')
  async cronGenerarAdeudos() {
    const resultado = await this.generarAdeudosMensuales();
    this.logger.log(`Adeudos mensuales: ${resultado.generados} generados, ${resultado.omitidos} omitidos (periodo ${resultado.periodo})`);
  }

  /** Cada noche, 1am — bloquea despachos cuya fecha límite de pago ya pasó */
  @Cron('0 1 * * *')
  async cronBloquearMorosos() {
    const resultado = await this.bloquearMorosos();
    this.logger.log(`Bloqueo de morosos: ${resultado.bloqueados} despachos bloqueados de ${resultado.revisados} revisados`);
  }

  async generarAdeudosMensuales() {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();

    const despachos = await this.despachoRepo.find({ where: { activo: true }, relations: { plan: true } });

    let generados = 0;
    let omitidos = 0;
    for (const despacho of despachos) {
      const monto = Number(despacho.planMensual) > 0
        ? Number(despacho.planMensual)
        : Number(despacho.plan?.costoMensualidad || 0);
      if (!monto || monto <= 0) { omitidos++; continue; }

      // Si el despacho ya pagó por adelantado (o ya se generó) el periodo actual, no duplicar
      const yaExiste = await this.mensualidadRepo.findOne({
        where: {
          despachoId: despacho.id,
          tipo: TipoMensualidad.PLAN,
          periodoMes: mes,
          periodoAnio: anio,
        },
      });
      if (yaExiste) { omitidos++; continue; }

      await this.mensualidadRepo.save(this.mensualidadRepo.create({
        despachoId: despacho.id,
        monto,
        tipo: TipoMensualidad.PLAN,
        estado: EstadoMensualidad.PENDIENTE,
        periodoMes: mes,
        periodoAnio: anio,
        fechaVencimiento: calcularFechaLimiteMensualidad(despacho.createdAt, anio, mes),
      }));
      generados++;
    }

    return { generados, omitidos, periodo: `${mes}/${anio}` };
  }

  async bloquearMorosos() {
    const hoyStr = new Date().toISOString().split('T')[0];

    const vencidas = await this.mensualidadRepo.createQueryBuilder('m')
      .where('m.tipo = :tipo', { tipo: TipoMensualidad.PLAN })
      .andWhere('m.estado != :pagado', { pagado: EstadoMensualidad.PAGADO })
      .andWhere('m.fechaVencimiento <= :hoy', { hoy: hoyStr })
      .getMany();

    const despachoIds = new Set<number>();
    for (const m of vencidas) {
      despachoIds.add(m.despachoId);
      if (m.estado === EstadoMensualidad.PENDIENTE) {
        await this.mensualidadRepo.update(m.id, { estado: EstadoMensualidad.VENCIDO });
      }
    }

    if (despachoIds.size) {
      await this.despachoRepo.update({ id: In([...despachoIds]) }, { bloqueado: true });
    }

    return { bloqueados: despachoIds.size, revisados: vencidas.length };
  }
}
