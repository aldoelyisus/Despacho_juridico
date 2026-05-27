import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { AreaDerecho } from './area-derecho.entity';

@Entity('subareas')
@Index(['despachoId', 'areaId'])
export class Subarea extends BaseEntity {
  @Column({ name: 'area_id' })
  areaId: number;

  @Column({ name: 'despacho_id' })
  @ApiProperty()
  despachoId: number;

  @Column({ length: 150 })
  @ApiProperty()
  nombre: string;

  @Column({ default: true })
  @ApiProperty()
  activo: boolean;

  @ManyToOne(() => AreaDerecho, (a) => a.subareas)
  @JoinColumn({ name: 'area_id' })
  area: AreaDerecho;
}
