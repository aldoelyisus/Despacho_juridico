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

  @Column({ name: 'numero_usuarios', type: 'int' })
  @ApiProperty({ description: 'Número de usuarios incluidos en el plan', example: 5 })
  numeroUsuarios: number;

  @Column({ name: 'precio_usuario_extra', type: 'decimal', precision: 10, scale: 2, default: 0 })
  @ApiProperty({ description: 'Costo por cada usuario adicional al límite del plan', example: 150 })
  precioUsuarioExtra: number;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
