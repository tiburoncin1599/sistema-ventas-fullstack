import { IsBoolean } from 'class-validator';

export class TrackingDto {
  @IsBoolean()
  activo!: boolean;
}
