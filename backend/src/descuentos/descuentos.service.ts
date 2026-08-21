import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Descuento, TipoDescuento } from './entities/descuento.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { CreateDescuentoDto } from './dto/create-descuento.dto';
import { UpdateDescuentoDto } from './dto/update-descuento.dto';

@Injectable()
export class DescuentosService {
  constructor(
    @InjectRepository(Descuento) private repo: Repository<Descuento>,
    @InjectRepository(Pago) private pagoRepo: Repository<Pago>,
  ) {}

  findAll(despachoId: number, soloActivos = false) {
    const where: any = { despachoId };
    if (soloActivos) where.activo = true;
    return this.repo.find({ where, order: { nombre: 'ASC' } });
  }

  findOne(id: number, despachoId: number) {
    return this.repo.findOne({ where: { id, despachoId } });
  }

  async create(dto: CreateDescuentoDto, despachoId: number) {
    this.validarValor(dto.tipo, dto.valor);
    const nombre = dto.nombre.trim();
    await this.assertNoDuplicado(nombre, despachoId);
    const d = this.repo.create({ ...dto, nombre, despachoId });
    return this.repo.save(d);
  }

  async update(id: number, dto: UpdateDescuentoDto, despachoId: number) {
    const descuento = await this.findDescuentoOrFail(id, despachoId);
    this.validarValor(dto.tipo ?? descuento.tipo, dto.valor ?? Number(descuento.valor));

    if (dto.nombre) {
      const nombre = dto.nombre.trim();
      await this.assertNoDuplicado(nombre, despachoId, id);
      dto = { ...dto, nombre };
    }
    Object.assign(descuento, dto);
    return this.repo.save(descuento);
  }

  async remove(id: number, despachoId: number) {
    const descuento = await this.findDescuentoOrFail(id, despachoId);
    const pagosVinculados = await this.pagoRepo.count({ where: { descuentoId: id, despachoId } });
    if (pagosVinculados > 0) {
      throw new ConflictException(
        `No se puede eliminar: este descuento se aplicó en ${pagosVinculados} pago${pagosVinculados === 1 ? '' : 's'} ya registrado${pagosVinculados === 1 ? '' : 's'}. Desactívalo en su lugar para conservar el historial de cobros.`,
      );
    }
    return this.repo.remove(descuento);
  }

  private async findDescuentoOrFail(id: number, despachoId: number) {
    const descuento = await this.repo.findOne({ where: { id, despachoId } });
    if (!descuento) throw new NotFoundException('Descuento no encontrado');
    return descuento;
  }

  private async assertNoDuplicado(nombre: string, despachoId: number, excluirId?: number) {
    const existente = await this.repo.findOne({
      where: { despachoId, nombre, ...(excluirId ? { id: Not(excluirId) } : {}) },
    });
    if (existente) throw new ConflictException('Ya existe un descuento con este nombre en tu despacho');
  }

  private validarValor(tipo: TipoDescuento, valor: number) {
    if (tipo === TipoDescuento.PORCENTAJE && valor > 100) {
      throw new BadRequestException('Un descuento de porcentaje no puede ser mayor a 100%');
    }
  }

  /** Calcula el monto final después de aplicar un descuento */
  calcularMontoConDescuento(montoOriginal: number, descuento: Descuento) {
    const val = Number(descuento.valor);
    if (descuento.tipo === 'porcentaje') {
      const montoDescuento = Math.round((montoOriginal * val) / 100 * 100) / 100;
      return { montoDescuento, montoFinal: montoOriginal - montoDescuento };
    }
    const montoDescuento = Math.min(val, montoOriginal); // nunca negativo
    return { montoDescuento, montoFinal: montoOriginal - montoDescuento };
  }
}
