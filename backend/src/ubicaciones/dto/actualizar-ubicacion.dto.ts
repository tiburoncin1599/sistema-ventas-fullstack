import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsLatitude,
  IsLongitude,
  MaxLength,
  Min,
} from 'class-validator';

export class ActualizarUbicacionDto {
  @Type(() => Number)
  @IsLatitude()
  latitud!: number;

  @Type(() => Number)
  @IsLongitude()
  longitud!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  timestamp?: string;
}
