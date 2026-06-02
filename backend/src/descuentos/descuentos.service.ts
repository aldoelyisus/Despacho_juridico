import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Descuento } from './entities/descuento.entity';

@Injectable()
export class DescuentosService {
  constructor(
    @InjectRepository(Descuento) private repo: Repository<Descuento>,
  ) {}

  findAll(despachoId: number, soloActivos = false) {
    const where: any = { despachoId };
    if (soloActivos) where.activo = true;
    return this.repo.find({ where, order: { nombre: 'ASC' } });
  }

  findOne(id: number, despachoId: number) {
    return this.repo.findOne({ where: { id, despachoId } });
  }

  create(dto: any, despachoId: number) {
    const d = this.repo.create({ ...dto, despachoId });
    return this.repo.save(d);
  }

  async update(id: number, dto: any, despachoId: number) {
    await this.repo.update({ id, despachoId }, dto);
    return this.repo.findOne({ where: { id, despachoId } });
  }

  async remove(id: number, despachoId: number) {
    const d = await this.repo.findOne({ where: { id, despachoId } });
    if (!d) throw new NotFoundException('Descuento no encontrado');
    return this.repo.remove(d);
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
