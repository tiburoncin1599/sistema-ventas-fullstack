import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { ProductosService } from './productos.service';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditService } from '../audit/audit.service';

interface AuthRequest extends Request {
  user?: { id: number; rol: string };
}

const EXTENSIONES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Controller('productos')
export class ProductosController {
  constructor(
    private readonly productosService: ProductosService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.productosService.findAll(
      Math.max(1, Number(page) || 1),
      Math.min(100, Math.max(1, Number(limit) || 50)),
    );
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  findAllAdmin() {
    return this.productosService.findAllInclusoInactivos();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const producto = await this.productosService.findOne(+id);
    // El detalle público solo muestra productos activos (los admins usan /admin)
    if (!producto.activo) {
      throw new NotFoundException('Producto no encontrado');
    }
    return producto;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  async crear(@Body() body: CrearProductoDto, @Req() req: AuthRequest) {
    const user = req.user as { id: number; rol: string };
    this.productosService.crear(body);
    await this.auditService.registrar({
      accion: 'crear',
      entidad: 'producto',
      entidad_id: body.codigo ? Number(body.codigo) : 1, // Usar codigo o ID por defecto
      valor_nuevo: {
        nombre: body.nombre,
        codigo: body.codigo,
        precio: body.precio,
        activo: true, // Por defecto al crear
      },
      usuario_id: user.id,
      usuario_rol: user.rol,
    });
    return { mensaje: 'Producto creado correctamente' };
  }

@Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  async actualizar(@Param('id') id: string, @Body() body: ActualizarProductoDto, @Req() req: AuthRequest) {
    const user = req.user as { id: number; rol: string };
    this.productosService.actualizar(+id, body);
    // Obtener el producto anterior para el registro de auditoría
    const productoAnterior = await this.productosService.findOne(+id);
    await this.auditService.registrar({
      accion: 'modificar',
      entidad: 'producto',
      entidad_id: +id,
      valor_anterior: {
        nombre: productoAnterior?.nombre,
        precio: productoAnterior?.precio,
        activo: productoAnterior?.activo,
      },
      valor_nuevo: {
        nombre: body.nombre ?? productoAnterior?.nombre,
        precio: body.precio ?? productoAnterior?.precio,
        activo: body.activo ?? productoAnterior?.activo,
      },
      usuario_id: user.id,
      usuario_rol: user.rol,
    });
    return { mensaje: 'Producto actualizado correctamente' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  async desactivar(@Param('id') id: string, @Req() req: AuthRequest, @Body() body: any) {
    const user = req.user as { id: number; rol: string };
    this.productosService.desactivar(+id);
    await this.auditService.registrar({
      accion: 'desactivar',
      entidad: 'producto',
      entidad_id: +id,
      valor_anterior: {
        nombre: body?.nombre,
        activo: true,
      },
      valor_nuevo: {
        nombre: body?.nombre,
        activo: false,
      },
      usuario_id: user.id,
      usuario_rol: user.rol,
    });
    return { mensaje: 'Producto desactivado correctamente' };
  }

  @Post('upload/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  @UseInterceptors(
    FileInterceptor('imagen', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'uploads', 'productos'),
        filename: (_req, file, cb) => {
          const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${EXTENSIONES[file.mimetype] || ''}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!EXTENSIONES[file.mimetype]) {
          cb(new BadRequestException('Solo se permiten imágenes JPG, PNG, WEBP o GIF'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadImagen(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Archivo no recibido');
    const url = `/uploads/productos/${file.filename}`;
    await this.productosService.actualizar(+id, { imagen_url: url });
    return { imagen_url: url };
  }
}
