import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { DespachosController } from './despachos.controller';
import { DespachosService } from './despachos.service';
import { Despacho } from './entities/despacho.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Despacho]),
    MulterModule.register({ dest: './uploads/logos' }),
  ],
  controllers: [DespachosController],
  providers: [DespachosService],
  exports: [DespachosService],
})
export class DespachosModule {}
