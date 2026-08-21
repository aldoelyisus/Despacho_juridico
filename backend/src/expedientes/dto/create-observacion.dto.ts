import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateObservacionDto {
  @IsNotEmpty({ message: 'La observación no puede estar vacía' })
  @IsString()
  @Length(1, 5000, { message: 'La observación no puede exceder 5000 caracteres' })
  @ApiProperty({ example: 'Se presentó la demanda ante el juzgado de lo familiar.' })
  contenido: string;
}
