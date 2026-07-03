import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesService } from './clientes.service';
import { ClientesController } from './clientes.controller';
import { Usuario } from '../usuarios/usuario.entity';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario]), InventarioModule],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
