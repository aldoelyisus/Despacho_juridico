import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { LogAuditoria } from './entities/log-auditoria.entity';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(LogAuditoria) private repo: Repository<LogAuditoria>,
  ) {}

  /** despachoId null → logs de nivel sistema (panel Root) */
  async findAll(despachoId: number | null, query: any = {}) {
    const { usuarioId, accion, modulo, pagina = 1, limite = 50 } = query;
    const where: any = { despachoId: despachoId === null ? IsNull() : despachoId };
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
