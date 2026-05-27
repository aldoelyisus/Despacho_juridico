import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('servicios')
export class Servicio extends BaseEntity {
  @Column({ name: 'despacho_id' })
  despachoId: number;

  @Column({ length: 200 })
  @ApiProperty({ example: 'Consulta Jurídica' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  descripcion: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  @ApiProperty()
  costo: number;

  @Column({ default: true })
  @ApiProperty()
  activo: boolean;
}
