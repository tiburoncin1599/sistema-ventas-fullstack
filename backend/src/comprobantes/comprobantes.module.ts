import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from '../pedidos/pedido.entity';
import { DetallePedido } from '../pedidos/detalle-pedido.entity';
import { Deuda } from '../deudas/deuda.entity';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { ComprobantesService } from './comprobantes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pedido, DetallePedido, Deuda]),
    ConfiguracionModule,
  ],
  providers: [ComprobantesService],
  exports: [ComprobantesService],
})
export class ComprobantesModule {}
