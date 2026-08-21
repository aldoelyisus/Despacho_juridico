import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { DespachosModule } from './despachos/despachos.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ClientesModule } from './clientes/clientes.module';
import { ExpedientesModule } from './expedientes/expedientes.module';
import { AgendaModule } from './agenda/agenda.module';
import { PagosModule } from './pagos/pagos.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { RootModule } from './root/root.module';
import { DescuentosModule } from './descuentos/descuentos.module';
import { PlanesModule } from './planes/planes.module';
import { FacturacionModule } from './facturacion/facturacion.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get('DB_USER', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_NAME', 'despacho_juridico'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Solo para desarrollo — usar migrations en producción
        logging: false,
        charset: 'utf8mb4',
      }),
    }),
    AuthModule,
    DespachosModule,
    UsuariosModule,
    ClientesModule,
    ExpedientesModule,
    AgendaModule,
    PagosModule,
    CatalogosModule,
    DashboardModule,
    AuditoriaModule,
    RootModule,
    DescuentosModule,
    PlanesModule,
    FacturacionModule,
    EstadisticasModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
