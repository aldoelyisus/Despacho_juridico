import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Subarea } from './subarea.entity';

@Entity('areas_derecho')
@Index(['despachoId', 'nombre'])
export class AreaDerecho extends BaseEntity {
  @Column({ name: 'despacho_id' })
  @ApiProperty()
  despachoId: number;

  @Column({ length: 150 })
  @ApiProperty({ example: 'Derecho Penal' })
  nombre: string;

  @Column({ length: 300, nullable: true })
  @ApiProperty()
  descripcion: string;

  @Column({ length: 20, default: '#6366f1' })
  @ApiProperty()
  color: string;

  @Column({ default: true })
  @ApiProperty()
  activo: boolean;

  @OneToMany(() => Subarea, (s) => s.area)
  subareas: Subarea[];
}
