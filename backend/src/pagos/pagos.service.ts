import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Pago, EstadoPago } from './entities/pago.entity';
import { PagoDetalle } from './entities/pago-detalle.entity';
import { Servicio } from '../catalogos/entities/servicio.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { DescuentosService } from '../descuentos/descuentos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CreateAbonoDto } from './dto/create-abono.dto';

const LIMITE_MAXIMO = 100;

@Injectable()
export class PagosService {
  constructor(
    @InjectRepository(Pago) private repo: Repository<Pago>,
    @InjectRepository(PagoDetalle) private detalleRepo: Repository<PagoDetalle>,
    @InjectRepository(Servicio) private servicioRepo: Repository<Servicio>,
    @InjectRepository(Expediente) private expRepo: Repository<Expediente>,
    @InjectRepository(Cliente) private clienteRepo: Repository<Cliente>,
    private descuentosService: DescuentosService,
  ) {}

  async findAll(despachoId: number, query: any = {}) {
    const { clienteId, expedienteId, estado, desde, hasta } = query;
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Number(query.limite) || 20));

    const where: any = { despachoId };
    if (clienteId) where.clienteId = +clienteId;
    if (expedienteId) where.expedienteId = +expedienteId;
    if (estado) where.estado = estado;
    if (desde && hasta) {
      where.createdAt = Between(new Date(`${desde}T00:00:00`), new Date(`${hasta}T23:59:59.999`));
    } else if (desde) {
      where.createdAt = MoreThanOrEqual(new Date(`${desde}T00:00:00`));
    } else if (hasta) {
      where.createdAt = LessThanOrEqual(new Date(`${hasta}T23:59:59.999`));
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      relations: { detalles: true, cliente: true, servicio: true, descuento: true, expediente: true },
      order: { createdAt: 'DESC' },
      take: limite,
      skip: (pagina - 1) * limite,
    });
    return { items, total, pagina, limite, totalPaginas: Math.ceil(total / limite) };
  }

  async findOne(id: number, despachoId: number) {
    const p = await this.repo.findOne({
      where: { id, despachoId },
      relations: { detalles: true, cliente: true, servicio: true, descuento: true, expediente: true },
    });
    if (!p) throw new NotFoundException('Cobro no encontrado');
    return p;
  }

  /** Registra el adeudo del cliente (el cobro) a partir del costo de un servicio, con un único descuento opcional */
  async create(dto: CreatePagoDto, despachoId: number, usuarioId: number) {
    const cliente = await this.clienteRepo.findOne({ where: { id: dto.clienteId, despachoId } });
    if (!cliente) throw new NotFoundException('El cliente seleccionado no existe en tu despacho');

    if (dto.expedienteId) {
      const expediente = await this.expRepo.findOne({ where: { id: dto.expedienteId, despachoId } });
      if (!expediente) throw new NotFoundException('El expediente seleccionado no existe en tu despacho');
    }

    const servicio = await this.servicioRepo.findOne({ where: { id: dto.servicioId, despachoId } });
    if (!servicio) throw new NotFoundException('El servicio seleccionado no existe en tu despacho');

    const montoOriginal = Number(servicio.costo);
    let montoTotal = montoOriginal;
    let montoDescuento = 0;

    if (dto.descuentoId) {
      const descuento = await this.descuentosService.findOne(dto.descuentoId, despachoId);
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

  /** Registra el abono: el monto que el cliente efectivamente entregó contra un cobro ya registrado */
  /** No se permiten abonos parciales: el monto debe cubrir exactamente el saldo pendiente */
  async registrarAbono(id: number, dto: CreateAbonoDto, despachoId: number) {
    const pago = await this.findOne(id, despachoId);

    if (pago.estado === EstadoPago.CANCELADO) {
      throw new BadRequestException('No se puede registrar un abono a un cobro cancelado');
    }
    if (Number(pago.montoPendiente) <= 0) {
      throw new BadRequestException('Este cobro ya está completamente pagado');
    }

    const pendienteCentavos = Math.round(Number(pago.montoPendiente) * 100);
    const montoCentavos = Math.round(dto.monto * 100);
    const pendienteTexto = Number(pago.montoPendiente).toFixed(2);

    if (montoCentavos < pendienteCentavos) {
      throw new BadRequestException(
        `El abono debe cubrir el saldo pendiente completo ($${pendienteTexto}). No se permiten abonos parciales.`,
      );
    }
    if (montoCentavos > pendienteCentavos) {
      throw new BadRequestException(
        `El abono no puede ser mayor al saldo pendiente ($${pendienteTexto})`,
      );
    }

    const detalle = this.detalleRepo.create({ ...dto, pagoId: id, despachoId });
    await this.detalleRepo.save(detalle);

    const montoPagado = Number(pago.montoPagado) + Number(dto.monto);
    const montoPendiente = Number(pago.montoTotal) - montoPagado;
    const estado = montoPendiente <= 0 ? EstadoPago.PAGADO : EstadoPago.PARCIAL;

    // update() en vez de save(pago): pago.detalles quedó cargado (por el findOne de arriba) desde
    // ANTES de insertar el nuevo detalle. Como la relación tiene cascade:true, guardar el objeto
    // "pago" completo haría que TypeORM compare ese arreglo desactualizado contra la BD y borre
    // el detalle recién insertado por considerarlo huérfano. update() no toca relaciones.
    await this.repo.update({ id, despachoId }, { montoPagado, montoPendiente, estado });
    return this.findOne(id, despachoId);
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
