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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();

  app.use(cookieParser());

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
    .setDescription('API completa del sistema de ventas — módulos: auth, productos, pedidos, inventario, clientes, deudas, categorías, usuarios, dashboard, reportes, proveedores, auditoría, configuración, notificaciones, movimientos de inventario')
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
    .addTag('Health', 'Estado del servidor')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 3001);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
