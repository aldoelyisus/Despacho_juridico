import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('landing_contactos')
export class Contacto extends BaseEntity {
  @Column({ length: 150 })
  @ApiProperty({ example: 'Ana Torres' })
  nombre: string;

  @Column({ length: 200 })
  @ApiProperty({ example: 'ana@despacho.com' })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  @ApiProperty({ required: false, example: '618-246-6273' })
  telefono: string | null;

  @Column({ type: 'text' })
  @ApiProperty({ example: 'Somos un despacho de 5 abogados, nos interesa el plan Profesional.' })
  mensaje: string;

  @Column({ default: false })
  @ApiProperty({ description: 'Marca si el equipo ya le dio seguimiento a este contacto' })
  atendido: boolean;
}
