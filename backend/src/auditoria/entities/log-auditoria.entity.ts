import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('logs_auditoria')
@Index(['despachoId', 'createdAt'])
export class LogAuditoria {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @Column({ name: 'despacho_id', type: 'int', nullable: true })
  @ApiProperty({ description: 'Null para acciones de nivel sistema (panel Root)' })
  despachoId: number | null;

  @Column({ name: 'usuario_id', type: 'int', nullable: true })
  @ApiProperty()
  usuarioId: number | null;

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
