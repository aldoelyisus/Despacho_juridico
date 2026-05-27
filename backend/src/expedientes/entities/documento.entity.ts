import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { Expediente } from './expediente.entity';

@Entity('documentos')
export class Documento extends BaseEntity {
  @Column({ name: 'expediente_id' })
  expedienteId: number;

  @Column({ name: 'despacho_id' })
  despachoId: number;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: number;

  @Column({ length: 300 })
  @ApiProperty()
  nombre: string;

  @Column({ length: 500 })
  @ApiProperty()
  ruta: string;

  @Column({ length: 100, nullable: true })
  @ApiProperty()
  tipo: string;

  @Column({ name: 'tamano_bytes', nullable: true })
  @ApiProperty()
  tamanoBytes: number;

  @Column({ length: 200, nullable: true })
  @ApiProperty()
  descripcion: string;

  @ManyToOne(() => Expediente, (e) => e.documentos)
  @JoinColumn({ name: 'expediente_id' })
  expediente: Expediente;
}
