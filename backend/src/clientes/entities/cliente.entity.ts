import { Entity, Column, ManyToMany, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Expediente } from '../../expedientes/entities/expediente.entity';

@Entity('clientes')
@Index(['despachoId'])
export class Cliente extends BaseEntity {
  @Column({ name: 'despacho_id' })
  @ApiProperty()
  despachoId: number;

  @Column({ length: 100 })
  @ApiProperty({ example: 'Juan' })
  nombre: string;

  @Column({ length: 100 })
  @ApiProperty({ example: 'Pérez López' })
  apellido: string;

  @Column({ length: 200, nullable: true })
  @ApiProperty()
  email: string;

  @Column({ length: 20, nullable: true })
  @ApiProperty()
  telefono: string;

  @Column({ length: 20, nullable: true })
  @ApiProperty()
  celular: string;

  @Column({ length: 20, nullable: true })
  @ApiProperty()
  rfc: string;

  @Column({ length: 20, nullable: true })
  @ApiProperty()
  curp: string;

  @Column({ type: 'date', nullable: true, name: 'fecha_nacimiento' })
  @ApiProperty()
  fechaNacimiento: Date;

  @Column({ length: 300, nullable: true })
  @ApiProperty()
  direccion: string;

  @Column({ length: 100, nullable: true })
  @ApiProperty()
  ciudad: string;

  @Column({ length: 100, nullable: true })
  @ApiProperty()
  estado: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  notas: string;

  @Column({ default: true })
  @ApiProperty()
  activo: boolean;

  @ManyToMany(() => Expediente, (e) => e.clientes)
  expedientes: Expediente[];
}
