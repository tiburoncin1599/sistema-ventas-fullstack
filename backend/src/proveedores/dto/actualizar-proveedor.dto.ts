import { PartialType } from '@nestjs/swagger';
import { CrearProveedorDto } from './crear-proveedor.dto';

export class ActualizarProveedorDto extends PartialType(CrearProveedorDto) {}
