import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TipoDescuento {
  PORCENTAJE = 'porcentaje',
  MONTO_FIJO = 'monto_fijo',
}

@Entity('descuentos')
@Index(['despachoId', 'activo'])
export class Descuento extends BaseEntity {
  @Column({ name: 'despacho_id' })
  despachoId: number;

  @Column({ length: 150 })
  @ApiProperty({ example: 'Descuento clientes frecuentes' })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  descripcion: string;

  @Column({ type: 'enum', enum: TipoDescuento })
  @ApiProperty({ enum: TipoDescuento })
  tipo: TipoDescuento;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Valor: % si tipo=porcentaje, $ si tipo=monto_fijo' })
  valor: number;

  @Column({ default: true })
  @ApiProperty()
  activo: boolean;
}
