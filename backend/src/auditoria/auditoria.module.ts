import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { LogAuditoria } from './entities/log-auditoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LogAuditoria])],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService, TypeOrmModule],
})
export class AuditoriaModule {}
