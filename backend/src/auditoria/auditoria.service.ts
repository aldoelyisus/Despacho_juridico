import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LogAuditoria } from './entities/log-auditoria.entity';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(LogAuditoria) private repo: Repository<LogAuditoria>,
  ) {}

  async findAll(despachoId: number, query: any = {}) {
    const { usuarioId, accion, modulo, pagina = 1, limite = 50 } = query;
    const where: any = { despachoId };
    if (usuarioId) where.usuarioId = +usuarioId;
    if (accion) where.accion = accion;
    if (modulo) where.modulo = modulo;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: +limite,
      skip: (+pagina - 1) * +limite,
    });

    return { items, total, pagina: +pagina, totalPaginas: Math.ceil(total / +limite) };
  }

  async log(data: Partial<LogAuditoria>) {
    const log = this.repo.create(data);
    return this.repo.save(log);
  }
}
