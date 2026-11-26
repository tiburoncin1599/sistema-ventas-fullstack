import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { Pedido } from './pedido.entity';
import { DetallePedido } from './detalle-pedido.entity';
import { Deuda } from '../deudas/deuda.entity';
import { InventarioModule } from '../inventario/inventario.module';
import { InventarioMovimientosModule } from '../inventario-movimientos/inventario-movimientos.module';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { AuditModule } from '../audit/audit.module';
import { FacturaService } from './factura.service';
import { ComprobantesModule } from '../comprobantes/comprobantes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pedido, DetallePedido, Deuda]),
    InventarioModule,
    InventarioMovimientosModule,
    ConfiguracionModule,
    AuditModule,
    ComprobantesModule,
  ],
  controllers: [PedidosController],
  providers: [PedidosService, FacturaService],
  exports: [PedidosService],
})
export class PedidosModule {}
