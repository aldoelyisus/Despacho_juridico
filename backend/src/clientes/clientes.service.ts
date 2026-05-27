import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente) private repo: Repository<Cliente>,
  ) {}

  async findAll(despachoId: number, query: any = {}) {
    const { busqueda, pagina = 1, limite = 20, activo } = query;
    const where: any = { despachoId };
    if (activo !== undefined) where.activo = activo === 'true';
    const options: FindManyOptions<Cliente> = {
      where: busqueda
        ? [
            { despachoId, nombre: Like(`%${busqueda}%`) },
            { despachoId, apellido: Like(`%${busqueda}%`) },
            { despachoId, email: Like(`%${busqueda}%`) },
          ]
        : where,
      order: { createdAt: 'DESC' },
      take: +limite,
      skip: (+pagina - 1) * +limite,
    };
    const [items, total] = await this.repo.findAndCount(options);
    return {
      items,
      total,
      pagina: +pagina,
      limite: +limite,
      totalPaginas: Math.ceil(total / +limite),
    };
  }

  async findOne(id: number, despachoId: number) {
    const c = await this.repo.findOne({
      where: { id, despachoId },
      relations: { expedientes: true },
    });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
  }

  async create(dto: CreateClienteDto, despachoId: number) {
    const cliente = this.repo.create({ ...dto, despachoId });
    return this.repo.save(cliente);
  }

  async update(id: number, dto: Partial<CreateClienteDto>, despachoId: number) {
    const cliente = await this.findOne(id, despachoId);
    Object.assign(cliente, dto);
    return this.repo.save(cliente);
  }

  async remove(id: number, despachoId: number) {
    const cliente = await this.findOne(id, despachoId);
    cliente.activo = false;
    return this.repo.save(cliente);
  }

  async getStats(despachoId: number) {
    const total = await this.repo.count({ where: { despachoId } });
    const activos = await this.repo.count({ where: { despachoId, activo: true } });
    return { total, activos, inactivos: total - activos };
  }
}
