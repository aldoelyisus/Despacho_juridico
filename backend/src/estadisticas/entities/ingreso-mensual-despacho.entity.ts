import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * Consolidado mensual de IngresoDiarioDespacho: una fila por despacho por mes, calculada por un
 * cron el día 1 sumando las ~30 filas diarias del mes que acaba de cerrar. Permite consultar
 * ingresos de varios años sin sumar miles de filas diarias cada vez.
 */
@Entity('ingresos_mensuales_despacho')
@Index(['despachoId', 'anio', 'mes'], { unique: true })
export class IngresoMensualDespacho extends BaseEntity {
  @Column({ name: 'despacho_id' })
  @ApiProperty()
  despachoId: number;

  @Column({ type: 'smallint' })
  @ApiProperty({ example: 2026 })
  anio: number;

  @Column({ type: 'tinyint' })
  @ApiProperty({ example: 8, description: 'Mes (1-12)' })
  mes: number;

  @Column({ name: 'monto_total', type: 'decimal', precision: 14, scale: 2, default: 0 })
  @ApiProperty()
  montoTotal: number;

  @Column({ name: 'num_tickets', default: 0 })
  @ApiProperty({ description: 'Número de abonos registrados en el mes' })
  numTickets: number;
}
