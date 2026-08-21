import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * Métrica de FLUJO (aditiva): el ingreso de cada día se suma a los demás días.
 * Una fila por despacho por día, calculada por un cron a partir de los abonos (PagoDetalle)
 * recibidos ese día — así el dashboard nunca tiene que volver a sumar ticket por ticket.
 */
@Entity('ingresos_diarios_despacho')
@Index(['despachoId', 'fecha'], { unique: true })
export class IngresoDiarioDespacho extends BaseEntity {
  @Column({ name: 'despacho_id' })
  @ApiProperty()
  despachoId: number;

  @Column({ type: 'date' })
  @ApiProperty()
  fecha: string;

  @Column({ name: 'monto_total', type: 'decimal', precision: 14, scale: 2, default: 0 })
  @ApiProperty({ description: 'Suma de los abonos recibidos ese día' })
  montoTotal: number;

  @Column({ name: 'num_tickets', default: 0 })
  @ApiProperty({ description: 'Número de abonos registrados ese día' })
  numTickets: number;
}
