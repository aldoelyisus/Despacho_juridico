import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('logs_auditoria')
@Index(['despachoId', 'createdAt'])
export class LogAuditoria {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @Column({ name: 'despacho_id' })
  @ApiProperty()
  despachoId: number;

  @Column({ name: 'usuario_id', nullable: true })
  @ApiProperty()
  usuarioId: number;

  @Column({ name: 'usuario_nombre', length: 200, nullable: true })
  @ApiProperty()
  usuarioNombre: string;

  @Column({ length: 50 })
  @ApiProperty()
  accion: string;

  @Column({ length: 100, nullable: true })
  @ApiProperty()
  modulo: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  descripcion: string;

  @Column({ length: 50, nullable: true })
  @ApiProperty()
  ip: string;

  @Column({ name: 'duracion_ms', nullable: true })
  @ApiProperty()
  duracionMs: number;

  @CreateDateColumn({ name: 'created_at' })
  @ApiProperty()
  createdAt: Date;
}
