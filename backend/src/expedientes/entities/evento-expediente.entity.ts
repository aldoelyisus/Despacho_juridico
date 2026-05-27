import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Expediente } from './expediente.entity';

@Entity('eventos_expediente')
export class EventoExpediente extends BaseEntity {
  @Column({ name: 'expediente_id' })
  expedienteId: number;

  @Column({ name: 'despacho_id' })
  despachoId: number;

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

  @Column({ default: false })
  @ApiProperty()
  completado: boolean;

  @ManyToOne(() => Expediente, (e) => e.eventosExpediente)
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;
}
