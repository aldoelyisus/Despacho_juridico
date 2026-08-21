import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EstadoExpediente } from '../entities/expediente.entity';

export class CambiarEstadoExpedienteDto {
  @IsNotEmpty({ message: 'El estado es obligatorio' })
  @IsEnum(EstadoExpediente, { message: 'El estado seleccionado no es válido' })
  @ApiProperty({ enum: EstadoExpediente, example: EstadoExpediente.ACTIVO })
  estado: EstadoExpediente;
}
