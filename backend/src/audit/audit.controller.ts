import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.auditService.findAll(Number(page) || 1, Number(limit) || 50);
  }

  @Get(':entidad/:id')
  findByEntity(
    @Param('entidad') entidad: string,
    @Param('id') id: string,
  ) {
    return this.auditService.findByEntity(entidad, +id);
  }
}
