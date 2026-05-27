import { Entity, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { PagoDetalle } from './pago-detalle.entity';

export enum EstadoPago {
  PENDIENTE = 'pendiente',
  PARCIAL = 'parcial',
  PAGADO = 'pagado',
  CANCELADO = 'cancelado',
}

@Entity('pagos')
export class Pago extends BaseEntity {
  @Column({ name: 'despacho_id' })
  despachoId: number;

  @Column({ name: 'cliente_id' })
  @ApiProperty()
  clienteId: number;

  @Column({ name: 'expediente_id', nullable: true })
  @ApiProperty()
  expedienteId: number;

  @Column({ name: 'servicio_id', nullable: true })
  @ApiProperty()
  servicioId: number;

  @Column({ name: 'usuario_id' })
  @ApiProperty()
  usuarioId: number;

  @Column({ length: 100, unique: false })
  @ApiProperty({ example: 'REC-2024-001' })
  numero: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  concepto: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  @ApiProperty()
  montoTotal: number;

  @Column({ name: 'monto_pagado', type: 'decimal', precision: 12, scale: 2, default: 0 })
  @ApiProperty()
  montoPagado: number;

  @Column({ name: 'monto_pendiente', type: 'decimal', precision: 12, scale: 2, default: 0 })
  @ApiProperty()
  montoPendiente: number;

  @Column({ type: 'enum', enum: EstadoPago, default: EstadoPago.PENDIENTE })
  @ApiProperty({ enum: EstadoPago })
  estado: EstadoPago;

  @Column({ name: 'fecha_vencimiento', type: 'date', nullable: true })
  @ApiProperty()
  fechaVencimiento: Date;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  notas: string;

  @OneToMany(() => PagoDetalle, (d) => d.pago, { cascade: true })
  detalles: PagoDetalle[];
}
