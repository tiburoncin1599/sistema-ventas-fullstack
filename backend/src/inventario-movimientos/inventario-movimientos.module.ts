import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioMovimiento } from './inventario-movimiento.entity';
import { InventarioMovimientosService } from './inventario-movimientos.service';
import { InventarioMovimientosController } from './inventario-movimientos.controller';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [TypeOrmModule.forFeature([InventarioMovimiento]), InventarioModule],
  controllers: [InventarioMovimientosController],
  providers: [InventarioMovimientosService],
  exports: [InventarioMovimientosService],
})
export class InventarioMovimientosModule {}
