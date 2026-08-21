import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { Despacho } from '../../despachos/entities/despacho.entity';
import { Rol } from './rol.entity';

@Entity('usuarios')
@Index(['despachoId', 'email'])
export class Usuario extends BaseEntity {
  @Column({ name: 'despacho_id', nullable: true })
  despachoId: number;

  @Column({ name: 'rol_id', nullable: true })
  rolId: number;

  @Column({ length: 100 })
  @ApiProperty()
  nombre: string;

  @Column({ length: 100 })
  @ApiProperty()
  apellido: string;

  @Column({ length: 200 })
  @ApiProperty()
  email: string;

  @Column({ type: 'text' })
  @Exclude()
  password: string;

  @Column({ length: 20, nullable: true })
  @ApiProperty()
  telefono: string;

  @Column({ length: 200, nullable: true })
  @ApiProperty()
  avatar: string;

  @Column({ default: true })
  @ApiProperty()
  activo: boolean;

  @Column({ name: 'ultimo_acceso', nullable: true })
  @ApiProperty()
  ultimoAcceso: Date;

  @Column({ name: 'two_factor_secret', length: 200, nullable: true })
  twoFactorSecret: string;

  @Column({ name: 'two_factor_enabled', default: false })
  @ApiProperty()
  twoFactorEnabled: boolean;

  @Column({ name: 'two_factor_backup_codes', type: 'json', nullable: true })
  twoFactorBackupCodes: string[];

  @Column({ name: 'debe_cambiar_password', default: false })
  @ApiProperty({ description: 'Si es true, el usuario debe fijar una nueva contraseña antes de continuar' })
  debeCambiarPassword: boolean;

  @Column({ name: 'intentos_fallidos', default: 0 })
  @Exclude()
  intentosFallidos: number;

  @Column({ name: 'bloqueado_hasta', nullable: true })
  @Exclude()
  bloqueadoHasta: Date;

  @ManyToOne(() => Despacho, (d) => d.usuarios)
  @JoinColumn({ name: 'despacho_id' })
  despacho: Despacho;

  @ManyToOne(() => Rol, (r) => r.usuarios)
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;
}
