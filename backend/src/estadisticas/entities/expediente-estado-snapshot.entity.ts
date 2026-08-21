import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';
import { EstadoExpediente } from '../../expedientes/entities/expediente.entity';

/**
 * Métrica de ESTADO/FOTO (NO aditiva): a diferencia de los ingresos, esto nunca se suma entre
 * fechas. Cada fila es un conteo del momento — "el día X había N expedientes en estado Y" — no
 * "N expedientes nuevos ese día". Un cron nocturno guarda una fila por despacho por estatus con
 * el conteo actual, para poder graficar tendencias sin tener que recalcular en vivo cada vez ni
 * (imposible de todos modos) reconstruir el pasado, ya que antes de esta tabla no se guardaba
 * ningún histórico de estatus.
 */
@Entity('expediente_estado_snapshot_diario')
@Index(['despachoId', 'fecha', 'estado'], { unique: true })
export class ExpedienteEstadoSnapshot extends BaseEntity {
  @Column({ name: 'despacho_id' })
  @ApiProperty()
  despachoId: number;

  @Column({ type: 'date' })
  @ApiProperty()
  fecha: string;

  @Column({ type: 'enum', enum: EstadoExpediente })
  @ApiProperty({ enum: EstadoExpediente })
  estado: EstadoExpediente;

  @Column()
  @ApiProperty({ description: 'Cuántos expedientes había en ese estado ese día — no se suma con otras fechas' })
  cantidad: number;
}
