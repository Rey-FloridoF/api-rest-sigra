import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class CreateReporteDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser un texto' })
  nombre: string;

  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  @Type(() => Date)
  @IsDate({ message: 'La fecha de inicio debe ser una fecha válida' })
  fechaInicio: Date;

  @IsNotEmpty({ message: 'La fecha fin es requerida' })
  @Type(() => Date)
  @IsDate({ message: 'La fecha fin debe ser una fecha válida' })
  fechaFin: Date;
}
