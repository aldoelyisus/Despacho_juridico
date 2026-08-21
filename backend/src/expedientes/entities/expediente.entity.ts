import {
  Entity, Column, ManyToMany, JoinTable,
  ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { AreaDerecho } from '../../catalogos/entities/area-derecho.entity';
import { Subarea } from '../../catalogos/entities/subarea.entity';
import { Documento } from './documento.entity';
import { Observacion } from './observacion.entity';
import { EventoExpediente } from './evento-expediente.entity';

export enum EstadoExpediente {
  ACTIVO = 'activo',
  EN_PROCESO = 'en_proceso',
  CERRADO = 'cerrado',
  GANADO = 'ganado',
  PERDIDO = 'perdido',
  SUSPENDIDO = 'suspendido',
}

@Entity('expedientes')
@Index(['despachoId', 'estado'])
export class Expediente extends BaseEntity {
  @Column({ name: 'despacho_id' })
  @ApiProperty()
  despachoId: number;

  @Column({ length: 100, unique: false })
  @ApiProperty({ example: 'EXP-2024-001' })
  numero: string;

  @Column({ length: 300 })
  @ApiProperty()
  titulo: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  descripcion: string;

  @Column({ name: 'area_id', nullable: true })
  @ApiProperty()
  areaId: number;

  @Column({ name: 'subarea_id', nullable: true })
  @ApiProperty()
  subareaId: number;

  @ManyToOne(() => AreaDerecho, { nullable: true })
  @JoinColumn({ name: 'area_id' })
  area: AreaDerecho;

  @ManyToOne(() => Subarea, { nullable: true })
  @JoinColumn({ name: 'subarea_id' })
  subarea: Subarea;

  @Column({
    type: 'enum',
    enum: EstadoExpediente,
    default: EstadoExpediente.ACTIVO,
  })
  @ApiProperty({ enum: EstadoExpediente })
  estado: EstadoExpediente;

  @Column({ name: 'fecha_inicio', type: 'date', nullable: true })
  @ApiProperty()
  fechaInicio: Date;

  @Column({ name: 'fecha_cierre', type: 'date', nullable: true })
  @ApiProperty()
  fechaCierre: Date;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  notas: string;

  @Column({ name: 'monto_total', type: 'decimal', precision: 12, scale: 2, default: 0 })
  @ApiProperty()
  montoTotal: number;

  @ManyToMany(() => Cliente, (c) => c.expedientes)
  @JoinTable({
    name: 'expediente_clientes',
    joinColumn: { name: 'expediente_id' },
    inverseJoinColumn: { name: 'cliente_id' },
  })
  clientes: Cliente[];

  @ManyToMany(() => Usuario)
  @JoinTable({
    name: 'expediente_colaboradores',
    joinColumn: { name: 'expediente_id' },
    inverseJoinColumn: { name: 'usuario_id' },
  })
  colaboradores: Usuario[];

  @OneToMany(() => Documento, (d) => d.expediente)
  documentos: Documento[];

  @OneToMany(() => Observacion, (o) => o.expediente)
  observaciones: Observacion[];

  @OneToMany(() => EventoExpediente, (e) => e.expediente)
  eventosExpediente: EventoExpediente[];
}
