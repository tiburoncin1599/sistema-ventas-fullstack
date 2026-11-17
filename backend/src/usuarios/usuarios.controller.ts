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
  Req,
  BadRequestException,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditService } from '../audit/audit.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import * as bcrypt from 'bcryptjs';
import { omitPassword } from '../common/utils';

interface AuthRequest extends Request {
  user?: { id: number; rol: string };
}

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.usuariosService.findAll(Number(page) || 1, Number(limit) || 50);
  }

  @Get('vendedores')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'inventario')
  vendedores() {
    return this.usuariosService.findVendedores();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ) {
    const user = req.user as { id: number; rol: string };
    if (user.rol !== 'admin' && user.id !== +id) {
      throw new ForbiddenException('No tienes acceso a este usuario');
    }
    const usuario = await this.usuariosService.findOne(+id);
    return omitPassword(usuario);
  }

  private get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS || 'aaas@gmail.com').split(',');
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async crear(@Body() body: CrearUsuarioDto, @Req() req: AuthRequest) {
    const user = req.user as { id: number; rol: string };
    const existe = await this.usuariosService.findByEmail(body.email);
    if (existe) throw new BadRequestException('El email ya está registrado');
    if (body.rol === 'admin' && !this.adminEmails.includes(body.email)) {
      throw new BadRequestException(
        'Email no autorizado para el rol de administrador',
      );
    }
    const hash = await bcrypt.hash(body.password, 10);
    const usuario = await this.usuariosService.crear({
      nombre: body.nombre,
      email: body.email,
      password_hash: hash,
      rol: body.rol || 'cliente',
    });
    const result = omitPassword(usuario);
    await this.auditService.registrar({
      accion: 'crear',
      entidad: 'usuario',
      entidad_id: usuario.id,
      valor_nuevo: {
        nombre: body.nombre,
        email: body.email,
        rol: usuario.rol,
      },
      usuario_id: user.id,
      usuario_rol: user.rol,
    });
    return result;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async actualizar(
    @Param('id') id: string,
    @Body() body: ActualizarUsuarioDto,
    @Req() req: AuthRequest,
  ) {
    const user = req.user as { id: number; rol: string };
    const anterior = await this.usuariosService.findOne(+id);
    // No modificamos email en esta operación para mantener consistencia con DTO
    const usuario = await this.usuariosService.findOne(+id);
    if (body.rol === 'admin' && !this.adminEmails.includes(usuario.email)) {
      throw new BadRequestException(
        'Email no autorizado para el rol de administrador',
      );
    }
    if (
      this.adminEmails.includes(usuario.email) &&
      body.rol &&
      body.rol !== 'admin'
    ) {
      throw new BadRequestException(
        'No se puede cambiar el rol del administrador principal',
      );
    }
    const data: Partial<import('./usuario.entity').Usuario> = {};
    if (body.nombre) data.nombre = body.nombre;
    if (body.password)
      data.password_hash = await bcrypt.hash(body.password, 10);
    if (body.rol) data.rol = body.rol;
    if (body.activo !== undefined) data.activo = body.activo;
    await this.usuariosService.actualizar(+id, data);
    await this.auditService.registrar({
      accion: 'modificar',
      entidad: 'usuario',
      entidad_id: +id,
      valor_anterior: {
        nombre: anterior.nombre,
        email: anterior.email,
        rol: anterior.rol,
        activo: anterior.activo,
      },
      valor_nuevo: {
        nombre: body.nombre ?? anterior.nombre,
        email: anterior.email, // email no cambia en esta operación
        rol: body.rol ?? anterior.rol,
        activo: body.activo ?? anterior.activo,
      },
      usuario_id: user.id,
      usuario_rol: user.rol,
    });
    return this.usuariosService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async eliminar(@Param('id') id: string, @Req() req: AuthRequest) {
    const user = req.user as { id: number; rol: string };
    const usuario = await this.usuariosService.findOne(+id);
    if (this.adminEmails.includes(usuario.email)) {
      throw new BadRequestException('No se puede eliminar al administrador principal');
    }
    await this.usuariosService.eliminar(+id);
    await this.auditService.registrar({
      accion: 'eliminar',
      entidad: 'usuario',
      entidad_id: +id,
      valor_anterior: {
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
      usuario_id: user.id,
      usuario_rol: user.rol,
    });
    return { message: 'Usuario eliminado' };
  }
}
