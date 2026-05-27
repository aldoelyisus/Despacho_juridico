import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './entities/rol.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private repo: Repository<Usuario>,
    @InjectRepository(Rol) private rolRepo: Repository<Rol>,
  ) {}

  async findAll(despachoId: number) {
    return this.repo.find({
      where: { despachoId },
      relations: { rol: true },
      order: { nombre: 'ASC' },
      select: { id: true, nombre: true, apellido: true, email: true, telefono: true, avatar: true, activo: true, ultimoAcceso: true, createdAt: true, rolId: true },
    });
  }

  async findOne(id: number, despachoId: number) {
    const u = await this.repo.findOne({ where: { id, despachoId }, relations: { rol: true } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return u;
  }

  async create(dto: any, despachoId: number) {
    const existing = await this.repo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('El email ya está en uso');
    const hash = await bcrypt.hash(dto.password, 12);
    const u = this.repo.create({ ...dto, despachoId, password: hash, email: dto.email.toLowerCase() });
    const saved = await this.repo.save(u);
    const { password, ...rest } = saved as any;
    return rest;
  }

  async update(id: number, dto: any, despachoId: number) {
    const u = await this.findOne(id, despachoId);
    if (dto.password) dto.password = await bcrypt.hash(dto.password, 12);
    Object.assign(u, dto);
    const saved = await this.repo.save(u);
    const { password, ...rest } = saved as any;
    return rest;
  }

  async toggleActivo(id: number, despachoId: number) {
    const u = await this.findOne(id, despachoId);
    u.activo = !u.activo;
    return this.repo.save(u);
  }

  async getRoles() {
    return this.rolRepo.find({ order: { nombre: 'ASC' } });
  }

  async getStats(despachoId: number) {
    const total = await this.repo.count({ where: { despachoId } });
    const activos = await this.repo.count({ where: { despachoId, activo: true } });
    return { total, activos };
  }
}
