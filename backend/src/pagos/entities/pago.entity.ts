import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Cliente } from '../../clientes/entities/cliente.entity';
import { Expediente } from '../../expedientes/entities/expediente.entity';
import { Servicio } from '../../catalogos/entities/servicio.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Descuento } from '../../descuentos/entities/descuento.entity';
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

  @Column({ name: 'descuento_id', nullable: true })
  @ApiProperty({ description: 'Descuento aplicado (nullable)' })
  descuentoId: number;

  @Column({ name: 'monto_descuento', type: 'decimal', precision: 12, scale: 2, default: 0 })
  @ApiProperty()
  montoDescuento: number;

  @Column({ name: 'monto_original', type: 'decimal', precision: 12, scale: 2, default: 0 })
  @ApiProperty({ description: 'Costo del servicio antes del descuento' })
  montoOriginal: number;

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

  @ManyToOne(() => Cliente)
  @JoinColumn({ name: 'cliente_id' })
  cliente: Cliente;

  @ManyToOne(() => Expediente, { nullable: true })
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;

  @ManyToOne(() => Servicio, { nullable: true })
  @JoinColumn({ name: 'servicio_id' })
  servicio: Servicio;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Descuento, { nullable: true })
  @JoinColumn({ name: 'descuento_id' })
  descuento: Descuento;

  @OneToMany(() => PagoDetalle, (d) => d.pago, { cascade: true })
  detalles: PagoDetalle[];
}
