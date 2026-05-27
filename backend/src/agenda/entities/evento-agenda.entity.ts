import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoEvento {
  CITA_CLIENTE = 'cita_cliente',
  REUNION_INTERNA = 'reunion_interna',
  AUDIENCIA = 'audiencia',
  ENTREGA = 'entrega',
  VENCIMIENTO = 'vencimiento',
  OTRO = 'otro',
}

@Entity('eventos_agenda')
export class EventoAgenda extends BaseEntity {
  @Column({ name: 'despacho_id' })
  despachoId: number;

  @Column({ name: 'creador_id' })
  creadorId: number;

  @Column({ name: 'expediente_id', nullable: true })
  expedienteId: number;

  @Column({ length: 300 })
  @ApiProperty()
  titulo: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  descripcion: string;

  @Column({ name: 'fecha_inicio', type: 'datetime' })
  @ApiProperty()
  fechaInicio: Date;

  @Column({ name: 'fecha_fin', type: 'datetime', nullable: true })
  @ApiProperty()
  fechaFin: Date;

  @Column({ length: 100, nullable: true })
  @ApiProperty()
  lugar: string;

  @Column({
    type: 'enum',
    enum: TipoEvento,
    default: TipoEvento.OTRO,
  })
  @ApiProperty({ enum: TipoEvento })
  tipo: TipoEvento;

  @Column({ length: 20, default: '#6366f1' })
  @ApiProperty()
  color: string;

  @Column({ default: false })
  @ApiProperty()
  completado: boolean;

  @ManyToMany(() => Usuario)
  @JoinTable({
    name: 'evento_usuarios',
    joinColumn: { name: 'evento_id' },
    inverseJoinColumn: { name: 'usuario_id' },
  })
  participantes: Usuario[];
}
