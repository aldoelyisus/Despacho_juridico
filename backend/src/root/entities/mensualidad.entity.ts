import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

export enum EstadoMensualidad {
  PAGADO   = 'pagado',
  PENDIENTE = 'pendiente',
  VENCIDO  = 'vencido',
}

export enum TipoMensualidad {
  PLAN = 'plan',
  USUARIO_EXTRA = 'usuario_extra',
}

@Entity('mensualidades')
@Index(['despachoId', 'fechaVencimiento'])
export class Mensualidad extends BaseEntity {
  @Column({ name: 'despacho_id' })
  @ApiProperty()
  despachoId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @ApiProperty({ example: 1500 })
  monto: number;

  @Column({ name: 'fecha_pago', type: 'date', nullable: true })
  @ApiProperty()
  fechaPago: Date;

  @Column({ name: 'fecha_vencimiento', type: 'date' })
  @ApiProperty()
  fechaVencimiento: Date;

  @Column({
    type: 'enum',
    enum: EstadoMensualidad,
    default: EstadoMensualidad.PENDIENTE,
  })
  @ApiProperty({ enum: EstadoMensualidad })
  estado: EstadoMensualidad;

  @Column({
    type: 'enum',
    enum: TipoMensualidad,
    default: TipoMensualidad.PLAN,
  })
  @ApiProperty({ enum: TipoMensualidad, description: 'Cargo de plan mensual u cargo por usuario extra' })
  tipo: TipoMensualidad;

  @Column({ name: 'usuario_id', nullable: true })
  @ApiProperty({ description: 'Usuario que originó el cargo (solo para tipo usuario_extra)' })
  usuarioId: number;

  @Column({ name: 'periodo_mes', type: 'tinyint', nullable: true })
  @ApiProperty({ description: 'Mes (1-12) del periodo facturado, para evitar cobros duplicados' })
  periodoMes: number;

  @Column({ name: 'periodo_anio', type: 'smallint', nullable: true })
  @ApiProperty({ description: 'Año del periodo facturado' })
  periodoAnio: number;

  @Column({ name: 'metodo_pago', length: 100, nullable: true })
  @ApiProperty()
  metodoPago: string;

  @Column({ length: 200, nullable: true })
  @ApiProperty()
  referencia: string;

  @Column({ type: 'text', nullable: true })
  @ApiProperty()
  notas: string;
}
