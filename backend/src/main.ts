import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AuthService } from './auth/auth.service';
import { EstadisticasService } from './estadisticas/estadisticas.service';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Static files for uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Despacho Jurídico API')
    .setDescription(
      'API REST para el Sistema de Gestión de Bufete de Abogados. Plataforma multi-despacho con gestión de expedientes, clientes, pagos, agenda y más.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('🔐 Autenticación', 'Login, registro y gestión de sesiones')
    .addTag('🏢 Despachos', 'Gestión de despachos jurídicos')
    .addTag('👤 Usuarios', 'Gestión de usuarios, roles y permisos')
    .addTag('👥 Clientes', 'Registro y gestión de clientes')
    .addTag('📁 Expedientes', 'Gestión de casos y expedientes legales')
    .addTag('📅 Agenda', 'Calendario y eventos')
    .addTag('💳 Pagos', 'Registro de cobros y comprobantes')
    .addTag('📚 Catálogos', 'Áreas del derecho, subáreas y servicios')
    .addTag('📊 Dashboard', 'KPIs e indicadores de rendimiento')
    .addTag('🔍 Auditoría', 'Registro de actividad del sistema')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Despacho Jurídico — API Docs',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`\n🏛️  Despacho Jurídico API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs\n`);

  // Seed root user and default roles on first boot
  const authService = app.get(AuthService);
  await authService.seedSystem();

  // Reconstruye ingresos_diarios_despacho / ingresos_mensuales_despacho desde el historial
  // existente — solo la primera vez que arranca con esta funcionalidad (es un no-op después).
  const estadisticasService = app.get(EstadisticasService);
  await estadisticasService.ensureBackfillIngresos();
}
bootstrap();
