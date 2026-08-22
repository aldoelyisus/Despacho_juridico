import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';
import { Testimonio } from './entities/testimonio.entity';
import { Contacto } from './entities/contacto.entity';
import { Plan } from '../planes/entities/plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Testimonio, Contacto, Plan])],
  controllers: [LandingController],
  providers: [LandingService],
})
export class LandingModule {}
