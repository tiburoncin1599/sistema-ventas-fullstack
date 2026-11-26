import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
import { UbicacionesModule } from './ubicaciones/ubicaciones.module';
import { AsistenteModule } from './asistente/asistente.module';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: join(__dirname, '..', '.env') });

const rawDatabaseUrl = process.env.DATABASE_URL ?? '';
const dbSslEnv = process.env.DB_SSL ?? process.env.DATABASE_SSL;

const isLocalDatabase =
  dbSslEnv === 'false' ||
  /localhost|127\.0\.0\.1|^postgresql:\/\/[^@]+@db[:/]|^postgresql:\/\/[^@]+@postgres[:/]/.test(
    rawDatabaseUrl,
  ) ||
  /@db:|@postgres:/.test(rawDatabaseUrl);

if (!rawDatabaseUrl) {
  throw new Error(
    'DATABASE_URL requerida: define la variable DATABASE_URL en backend/.env o en el entorno antes de iniciar el backend.',
  );
}

function sanitizeSslParams(url: string): string {
  if (!url) return url;
  const parsed = new URL(url);
  parsed.searchParams.delete('sslmode');
  parsed.searchParams.delete('sslrootcert');
  parsed.searchParams.delete('sslcert');
  parsed.searchParams.delete('sslkey');
  return parsed.toString();
}

const typeOrmUrl = isLocalDatabase
  ? rawDatabaseUrl
  : sanitizeSslParams(rawDatabaseUrl);

const useSsl = dbSslEnv === 'true' ? true : dbSslEnv === 'false' ? false : !isLocalDatabase;

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 20,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: typeOrmUrl,
      ssl: useSsl ? { rejectUnauthorized: true } : false,
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
    UbicacionesModule,
    AsistenteModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
