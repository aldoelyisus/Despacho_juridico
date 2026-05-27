import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Expediente } from './expediente.entity';

@Entity('observaciones')
export class Observacion extends BaseEntity {
  @Column({ name: 'expediente_id' })
  expedienteId: number;

  @Column({ name: 'despacho_id' })
  despachoId: number;

  @Column({ name: 'usuario_id' })
  usuarioId: number;

  @Column({ name: 'usuario_nombre', length: 200 })
  @ApiProperty()
  usuarioNombre: string;

  @Column({ type: 'text' })
  @ApiProperty()
  contenido: string;

  @ManyToOne(() => Expediente, (e) => e.observaciones)
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;
}
