import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditService } from './audit/audit.service';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';

const STARTUP_TIMING = process.env.STARTUP_TIMING === '1';

if (STARTUP_TIMING) {
  console.log(
    `[Arranque] Carga de módulos / inicio de Node — ${Math.round(
      process.uptime() * 1000,
    )}ms`,
  );
}

/** Solo diagnóstico (STARTUP_TIMING=1): mide una conexión fría a PostgreSQL/Neon. */
async function medirConexionBD() {
  const url = process.env.DATABASE_URL ?? '';
  const probe = new DataSource({
    type: 'postgres',
    url,
    ssl: /localhost|127\.0\.0\.1/.test(url)
      ? false
      : { rejectUnauthorized: false },
  });
  const t = Date.now();
  await probe.initialize();
  await probe.query('SELECT 1');
  const ms = Date.now() - t;
  await probe.destroy();
  return ms;
}

async function bootstrap() {
  const medir = STARTUP_TIMING;
  const t0 = Date.now();
  const paso = (etiqueta: string, desde = t0) => {
    if (medir) console.log(`[Arranque] ${etiqueta} — ${Date.now() - desde}ms`);
  };

  if (medir) {
    try {
      const msConexion = await medirConexionBD();
      console.log(
        `[Arranque] Conexión fría a PostgreSQL (probe) — ${msConexion}ms`,
      );
    } catch (err) {
      console.warn(
        '[Arranque] Probe de conexión BD falló:',
        (err as Error).message,
      );
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  paso('Nest app creada (inicialización de módulos + conexión BD)');

  const dataSource = app.get(DataSource);
  console.log(
    `[Arranque] TypeORM dataSource isInitialized=${dataSource.isInitialized}`,
  );
  if (medir) {
    const tp = Date.now();
    try {
      await dataSource.query('SELECT 1');
      paso('Ping BD (pool) — primer query');
    } catch (err) {
      console.warn('[Arranque] Ping BD falló:', (err as Error).message);
    }
  }

  await dataSource.runMigrations();
  paso('Migraciones');

  app.use(cookieParser());

  app.set('trust proxy', 1);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new AuditInterceptor(app.get(AuditService)),
  );

  const config = new DocumentBuilder()
    .setTitle('Sistema Ventas ERP API')
    .setDescription(
      'API completa del sistema de ventas — módulos: auth, productos, pedidos, inventario, clientes, deudas, categorías, usuarios, dashboard, reportes, proveedores, auditoría, configuración, notificaciones, movimientos de inventario',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refresh_token')
    .addTag('Auth', 'Autenticación y registro')
    .addTag('Productos', 'Gestión de productos')
    .addTag('Pedidos', 'Gestión de pedidos y factura PDF')
    .addTag('Inventario', 'Control de stock')
    .addTag('Inventario Movimientos', 'Kardex y movimientos de inventario')
    .addTag('Clientes', 'Gestión de clientes')
    .addTag('Deudas', 'Control de deudas y pagos')
    .addTag('Categorías', 'Categorías de productos')
    .addTag('Usuarios', 'Gestión de usuarios del sistema')
    .addTag('Dashboard', 'Métricas y estadísticas en tiempo real')
    .addTag('Reportes', 'Reportes con exportación CSV/PDF')
    .addTag('Proveedores', 'Gestión de proveedores')
    .addTag('Configuración', 'Configuración global del sistema')
    .addTag('Auditoría', 'Registro de actividades del sistema')
    .addTag('Notificaciones', 'Alertas y notificaciones')
    .addTag('Ubicaciones', 'Seguimiento en tiempo real de vendedores')
    .addTag('Health', 'Estado del servidor')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);
  paso('Swagger');

  await app.listen(process.env.PORT || 3001);
  paso(`Escuchando en ${process.env.PORT || 3001}`);
  paso('ARRANQUE COMPLETO');
  if (medir) {
    console.log(
      `[Arranque] Total desde inicio de Node — ${Math.round(
        process.uptime() * 1000,
      )}ms`,
    );
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
