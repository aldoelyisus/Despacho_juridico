import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';

@Injectable()
export class PlanesService {
  constructor(
    @InjectRepository(Plan) private repo: Repository<Plan>,
  ) {}

  findAll() {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  create(dto: any) {
    const plan = this.repo.create(dto);
    return this.repo.save(plan);
  }

  async update(id: number, dto: any) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const plan = await this.findOne(id);
    const enUso = await this.repo.manager
      .query('SELECT COUNT(*) as total FROM despachos WHERE plan_id = ?', [id]);
    if (Number(enUso[0]?.total || 0) > 0) {
      throw new ConflictException('No se puede eliminar: hay despachos asignados a este plan');
    }
    return this.repo.softRemove(plan);
  }
}
