import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pago, EstadoPago } from './entities/pago.entity';
import { PagoDetalle } from './entities/pago-detalle.entity';
import { Servicio } from '../catalogos/entities/servicio.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { DescuentosService } from '../descuentos/descuentos.service';

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago) private repo: Repository<Pago>,
    @InjectRepository(PagoDetalle) private detalleRepo: Repository<PagoDetalle>,
    @InjectRepository(Servicio) private servicioRepo: Repository<Servicio>,
    @InjectRepository(Expediente) private expRepo: Repository<Expediente>,
    private descuentosService: DescuentosService,
  ) {}


  async findAll(despachoId: number, query: any = {}) {
    const { clienteId, expedienteId, estado, pagina = 1, limite = 20 } = query;
    const where: any = { despachoId };
    if (clienteId) where.clienteId = +clienteId;
    if (expedienteId) where.expedienteId = +expedienteId;
    if (estado) where.estado = estado;
    const [items, total] = await this.repo.findAndCount({
      where,
      relations: { detalles: true },
      order: { createdAt: 'DESC' },
      take: +limite,
      skip: (+pagina - 1) * +limite,
    });
    return { items, total, pagina: +pagina, totalPaginas: Math.ceil(total / +limite) };
  }

  async findOne(id: number, despachoId: number) {
    const p = await this.repo.findOne({
      where: { id, despachoId },
      relations: { detalles: true },
    });
    if (!p) throw new NotFoundException('Pago no encontrado');
    return p;
  }

  async create(dto: any, despachoId: number, usuarioId: number) {
    if (!dto.servicioId) throw new BadRequestException('Debe seleccionar un servicio');
    const servicio = await this.servicioRepo.findOne({ where: { id: dto.servicioId, despachoId } });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');

    const montoOriginal = Number(servicio.costo);
    let montoTotal = montoOriginal;
    let montoDescuento = 0;

    // Aplicar descuento si se proporciona
    if (dto.descuentoId) {
      const descuento = await this.descuentosService.findOne(+dto.descuentoId, despachoId);
      if (!descuento || !descuento.activo) {
        throw new BadRequestException('El descuento seleccionado no existe o está inactivo');
      }
      const calc = this.descuentosService.calcularMontoConDescuento(montoOriginal, descuento);
      montoDescuento = calc.montoDescuento;
      montoTotal = calc.montoFinal;
    }

    const count = await this.repo.count({ where: { despachoId } });
    const year = new Date().getFullYear();
    const numero = `REC-${year}-${String(count + 1).padStart(4, '0')}`;

    const pago = this.repo.create({
      ...dto,
      despachoId,
      usuarioId,
      numero,
      montoOriginal,
      montoDescuento,
      montoTotal,
      montoPendiente: montoTotal,
      montoPagado: 0,
      concepto: dto.concepto || servicio.nombre,
      estado: EstadoPago.PENDIENTE,
    });
    const saved = await this.repo.save(pago);

    if (dto.expedienteId) {
      await this.recalcularTotalExpediente(dto.expedienteId, despachoId);
    }
    return saved;
  }

  private async recalcularTotalExpediente(expedienteId: number, despachoId: number) {
    const result = await this.repo
      .createQueryBuilder('p')
      .select('SUM(p.montoTotal)', 'total')
      .where('p.expedienteId = :expedienteId AND p.despachoId = :despachoId AND p.estado != :cancelado', {
        expedienteId, despachoId, cancelado: EstadoPago.CANCELADO,
      })
      .getRawOne();
    const total = Number(result?.total || 0);
    await this.expRepo.update({ id: expedienteId, despachoId }, { montoTotal: total });
  }

  async registrarAbono(id: number, dto: any, despachoId: number) {
    const pago = await this.findOne(id, despachoId);
    const detalle = this.detalleRepo.create({ ...dto, pagoId: id, despachoId });
    await this.detalleRepo.save(detalle);

    pago.montoPagado = Number(pago.montoPagado) + Number(dto.monto);
    pago.montoPendiente = Number(pago.montoTotal) - Number(pago.montoPagado);
    if (pago.montoPendiente <= 0) pago.estado = EstadoPago.PAGADO;
    else pago.estado = EstadoPago.PARCIAL;

    const saved = await this.repo.save(pago);
    return saved;
  }

  async getStats(despachoId: number, query: any = {}) {
    const { inicio, fin } = query;
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.despachoId = :despachoId', { despachoId });

    if (inicio) qb.andWhere('p.createdAt >= :inicio', { inicio });
    if (fin) qb.andWhere('p.createdAt <= :fin', { fin });

    const result = await qb
      .select('SUM(p.montoPagado)', 'totalRecaudado')
      .addSelect('COUNT(*)', 'totalPagos')
      .getRawOne();

    return {
      totalRecaudado: result?.totalRecaudado || 0,
      totalPagos: result?.totalPagos || 0,
    };
  }
}
