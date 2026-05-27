import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('despachos')
export class Despacho extends BaseEntity {
  @Column({ length: 200 })
  @ApiProperty({ example: 'Despacho Jurídico García & Asociados' })
  nombre: string;

  @Column({ name: 'nombre_comercial', length: 200, nullable: true })
  @ApiProperty()
  nombreComercial: string;

  @Column({ length: 200, nullable: true })
  @ApiProperty()
  logo: string;

  @Column({ length: 300, nullable: true })
  @ApiProperty()
  direccion: string;

  @Column({ length: 100, nullable: true })
  @ApiProperty()
  ciudad: string;

  @Column({ length: 100, nullable: true })
  @ApiProperty()
  estado: string;

  @Column({ length: 20, nullable: true })
  @ApiProperty()
  telefono: string;

  @Column({ length: 200, nullable: true })
  @ApiProperty()
  email: string;

  @Column({ length: 200, nullable: true })
  @ApiProperty()
  sitioWeb: string;

  @Column({ name: 'rfc', length: 20, nullable: true })
  @ApiProperty()
  rfc: string;

  @Column({ default: true })
  @ApiProperty()
  activo: boolean;

  @Column({ default: false })
  @ApiProperty({ description: 'Acceso bloqueado por falta de pago' })
  bloqueado: boolean;

  @Column({ name: 'fecha_vencimiento_pago', type: 'date', nullable: true })
  @ApiProperty({ description: 'Fecha de vencimiento del próximo pago' })
  fechaVencimientoPago: Date;

  @Column({ name: 'plan_mensual', type: 'decimal', precision: 10, scale: 2, default: 0 })
  @ApiProperty({ description: 'Costo mensual del plan' })
  planMensual: number;

  @Column({ name: 'whatsapp_numero', length: 30, nullable: true })
  @ApiProperty({ description: 'Número para integración futura de WhatsApp' })
  whatsappNumero: string;

  @Column({ name: 'whatsapp_token', type: 'text', nullable: true })
  @ApiProperty({ description: 'Token API WhatsApp Business (integración futura)' })
  whatsappToken: string;

  @OneToMany(() => Usuario, (u) => u.despacho)
  usuarios: Usuario[];
}
