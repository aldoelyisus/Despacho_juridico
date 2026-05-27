import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Despacho } from './entities/despacho.entity';

@Injectable()
export class DespachosService {
  constructor(
    @InjectRepository(Despacho) private repo: Repository<Despacho>,
  ) {}

  async findOne(id: number) {
    const d = await this.repo.findOne({ where: { id } });
    if (!d) throw new NotFoundException('Despacho no encontrado');
    return d;
  }

  async update(id: number, data: Partial<Despacho>) {
    await this.repo.update(id, data);
    return this.findOne(id);
  }
}
