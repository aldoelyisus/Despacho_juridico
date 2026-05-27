import { Entity, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Usuario } from './usuario.entity';

@Entity('roles')
export class Rol extends BaseEntity {
  @Column({ length: 80, unique: true })
  @ApiProperty({ example: 'administrador' })
  nombre: string;

  @Column({ length: 200, nullable: true })
  @ApiProperty()
  descripcion: string;

  @Column({ type: 'json', nullable: true })
  @ApiProperty({ description: 'Permisos por módulo' })
  permisos: Record<string, string[]>;

  @OneToMany(() => Usuario, (u) => u.rol)
  usuarios: Usuario[];
}
