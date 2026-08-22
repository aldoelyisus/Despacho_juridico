import { Entity, Column, DeleteDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('planes')
export class Plan extends BaseEntity {
  @Column({ length: 150 })
  @ApiProperty({ example: 'Plan Profesional' })
  nombre: string;

  @Column({ name: 'costo_mensualidad', type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ description: 'Costo mensual del plan', example: 999 })
  costoMensualidad: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 16 })
  @ApiProperty({ description: 'Porcentaje de IVA aplicado', example: 16 })
  iva: number;

  @Column({ name: 'is_persona_moral', default: true })
  @ApiProperty({ description: 'Plan disponible para personas morales' })
  isPersonaMoral: boolean;

  @Column({ name: 'is_persona_fisica', default: true })
  @ApiProperty({ description: 'Plan disponible para personas físicas' })
  isPersonaFisica: boolean;

  @Column({ name: 'numero_usuarios', type: 'int', nullable: true })
  @ApiProperty({ description: 'Número de usuarios incluidos en el plan. null = sin límite (ilimitados)', example: 5, nullable: true })
  numeroUsuarios: number | null;

  @Column({ name: 'precio_usuario_extra', type: 'decimal', precision: 10, scale: 2, default: 0 })
  @ApiProperty({ description: 'Costo por cada usuario adicional al límite del plan', example: 150 })
  precioUsuarioExtra: number;

  @Column({ name: 'numero_expedientes', type: 'int', nullable: true })
  @ApiProperty({ description: 'Número de expedientes incluidos en el plan. null = sin límite (ilimitados)', example: 50, nullable: true })
  numeroExpedientes: number | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  @ApiProperty({ description: 'Descripción del nivel de soporte, para mostrar en la landing pública', example: 'Soporte prioritario', nullable: true })
  soporte: string | null;

  @Column({ name: 'nivel_dashboard', type: 'varchar', length: 150, nullable: true })
  @ApiProperty({ description: 'Descripción del nivel de dashboard, para mostrar en la landing pública', example: 'Dashboard avanzado', nullable: true })
  nivelDashboard: string | null;

  @Column({ name: 'visible_en_landing', default: false })
  @ApiProperty({ description: 'Si el plan se muestra en la sección de precios de la landing pública' })
  visibleEnLanding: boolean;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
