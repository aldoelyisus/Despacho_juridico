import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, FindManyOptions } from 'typeorm';
import { Cliente } from './entities/cliente.entity';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

const LIMITE_MAXIMO = 100;

@Injectable()
export class ClientesService {
  constructor(
    @InjectRepository(Cliente) private repo: Repository<Cliente>,
    private auditoriaService: AuditoriaService,
  ) {}

  async findAll(despachoId: number, query: any = {}, usuario?: { id: number; nombre: string; apellido: string }, ip?: string) {
    const { busqueda, activo } = query;
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Number(query.limite) || 20));

    const filtroActivo = activo !== undefined ? { activo: activo === 'true' } : {};
    const texto = typeof busqueda === 'string' ? busqueda.trim() : '';

    const where: FindManyOptions<Cliente>['where'] = texto
      ? [
          { despachoId, nombre: Like(`%${texto}%`), ...filtroActivo },
          { despachoId, apellido: Like(`%${texto}%`), ...filtroActivo },
          { despachoId, email: Like(`%${texto}%`), ...filtroActivo },
          { despachoId, rfc: Like(`%${texto}%`), ...filtroActivo },
          { despachoId, curp: Like(`%${texto}%`), ...filtroActivo },
          { despachoId, telefono: Like(`%${texto}%`), ...filtroActivo },
          { despachoId, celular: Like(`%${texto}%`), ...filtroActivo },
        ]
      : { despachoId, ...filtroActivo };

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limite,
      skip: (pagina - 1) * limite,
    });

    if (texto) {
      await this.registrarAuditoria(despachoId, 'BUSCAR', usuario, ip, `Búsqueda de clientes: "${texto}" (${total} resultado${total === 1 ? '' : 's'})`);
    }

    return { items, total, pagina, limite, totalPaginas: Math.ceil(total / limite) };
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
    const data = this.normalizar(dto);
    await this.assertSinDuplicados(data, despachoId);
    const cliente = this.repo.create({ ...data, despachoId });
    return this.repo.save(cliente);
  }

  async update(id: number, dto: UpdateClienteDto, despachoId: number) {
    const cliente = await this.findOne(id, despachoId);
    const data = this.normalizar(dto);
    await this.assertSinDuplicados(data, despachoId, id);
    Object.assign(cliente, data);
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

  /** Recorta espacios en blanco de los campos de texto para evitar duplicados falsos y datos sucios */
  private normalizar(dto: Record<string, any>): Record<string, any> {
    const data: Record<string, any> = { ...dto };
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'string') data[key] = data[key].trim();
    }
    if (data.email) data.email = data.email.toLowerCase();
    return data;
  }

  private async assertSinDuplicados(
    data: { email?: string; rfc?: string; curp?: string },
    despachoId: number,
    excluirId?: number,
  ) {
    const checks: Array<{ campo: 'email' | 'rfc' | 'curp'; valor?: string; etiqueta: string }> = [
      { campo: 'email', valor: data.email, etiqueta: 'email' },
      { campo: 'rfc', valor: data.rfc, etiqueta: 'RFC' },
      { campo: 'curp', valor: data.curp, etiqueta: 'CURP' },
    ];
    for (const { campo, valor, etiqueta } of checks) {
      if (!valor) continue;
      const existente = await this.repo.findOne({
        where: {
          despachoId,
          [campo]: valor,
          ...(excluirId ? { id: Not(excluirId) } : {}),
        } as any,
      });
      if (existente) {
        throw new ConflictException(`Ya existe un cliente con este ${etiqueta} en tu despacho`);
      }
    }
  }

  private async registrarAuditoria(
    despachoId: number,
    accion: string,
    usuario: { id: number; nombre: string; apellido: string } | undefined,
    ip: string | undefined,
    descripcion: string,
  ) {
    if (!usuario) return;
    try {
      await this.auditoriaService.log({
        despachoId,
        usuarioId: usuario.id,
        usuarioNombre: `${usuario.nombre} ${usuario.apellido}`,
        accion,
        modulo: 'CLIENTES',
        descripcion,
        ip,
      });
    } catch {
      // La auditoría nunca debe interrumpir la operación del usuario
    }
  }
}
