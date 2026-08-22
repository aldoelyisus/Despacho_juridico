import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('landing_testimonios')
export class Testimonio extends BaseEntity {
  @Column({ length: 150 })
  @ApiProperty({ example: 'Lic. Roberto Jiménez' })
  nombre: string;

  @Column({ name: 'despacho_nombre', type: 'varchar', length: 150, nullable: true })
  @ApiProperty({ required: false, example: 'Jiménez y Asociados' })
  despachoNombre: string | null;

  @Column({ type: 'text' })
  @ApiProperty({ example: 'El sistema nos ahorró horas de trabajo administrativo cada semana.' })
  mensaje: string;

  @Column({ type: 'tinyint', nullable: true })
  @ApiProperty({ required: false, example: 5, description: 'Calificación de 1 a 5 estrellas' })
  calificacion: number | null;

  @Column({ default: false })
  @ApiProperty({ description: 'Solo los testimonios aprobados se muestran en la landing pública' })
  aprobado: boolean;
}
