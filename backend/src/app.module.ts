import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ProductosModule } from './productos/productos.module';
import { InventarioModule } from './inventario/inventario.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ClientesModule } from './clientes/clientes.module';
import { DeudasModule } from './deudas/deudas.module';
import { AuditModule } from './audit/audit.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { InventarioMovimientosModule } from './inventario-movimientos/inventario-movimientos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportesModule } from './reportes/reportes.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { POSModule } from './pos/pos.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,
      limit: 3,
    }, {
      name: 'medium',
      ttl: 10000,
      limit: 20,
    }, {
      name: 'long',
      ttl: 60000,
      limit: 100,
    }]),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      autoLoadEntities: true,
      synchronize: false,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    }),
    AuthModule,
    UsuariosModule,
    ProductosModule,
    InventarioModule,
    PedidosModule,
    CategoriasModule,
    ClientesModule,
    DeudasModule,
    AuditModule,
    ConfiguracionModule,
    InventarioMovimientosModule,
    DashboardModule,
    ReportesModule,
    ProveedoresModule,
    NotificacionesModule,
    POSModule,
  ],
})
export class AppModule {}
