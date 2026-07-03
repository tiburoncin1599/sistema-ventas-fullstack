import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeudasController } from './deudas.controller';
import { DeudasService } from './deudas.service';
import { Deuda } from './deuda.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Deuda])],
  controllers: [DeudasController],
  providers: [DeudasService],
})
export class DeudasModule {}
