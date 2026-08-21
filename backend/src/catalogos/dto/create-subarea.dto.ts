import { IsNotEmpty, IsString, IsInt, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubareaDto {
  @IsNotEmpty({ message: 'El nombre de la subárea es obligatorio' })
  @IsString()
  @Length(1, 150, { message: 'El nombre no puede exceder 150 caracteres' })
  @ApiProperty({ example: 'Delitos patrimoniales' })
  nombre: string;

  @IsNotEmpty({ message: 'Debes seleccionar el área a la que pertenece' })
  @IsInt({ message: 'El área seleccionada no es válida' })
  @ApiProperty({ example: 1 })
  areaId: number;
}
