import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Pago } from './pago.entity';

@Entity('pago_detalles')
export class PagoDetalle extends BaseEntity {
  @Column({ name: 'pago_id' })
  pagoId: number;

  @Column({ name: 'despacho_id' })
  despachoId: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @ApiProperty()
  monto: number;

  @Column({ name: 'fecha_pago', type: 'date' })
  @ApiProperty()
  fechaPago: Date;

  @Column({ length: 100, nullable: true })
  @ApiProperty({ example: 'Transferencia bancaria' })
  metodoPago: string;

  @Column({ length: 200, nullable: true })
  @ApiProperty()
  referencia: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  notas: string;

  @ManyToOne(() => Pago, (p) => p.detalles)
  @JoinColumn({ name: 'pago_id' })
  pago: Pago;
}
