import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InventarioModule } from '../inventario/inventario.module';
import { PedidosModule } from '../pedidos/pedidos.module';
import { ProductosModule } from '../productos/productos.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AsistenteController } from './asistente.controller';
import { AsistenteService } from './asistente.service';
import { JwtOpcionalGuard } from './jwt-opcional.guard';

@Module({
  imports: [
    AuthModule,
    UsuariosModule,
    ProductosModule,
    InventarioModule,
    PedidosModule,
  ],
  controllers: [AsistenteController],
  providers: [AsistenteService, JwtOpcionalGuard],
})
export class AsistenteModule {}
