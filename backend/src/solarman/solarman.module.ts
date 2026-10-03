import { Module } from '@nestjs/common';
import { SolarmanService } from './solarman.service';
import { SolarmanController } from './solarman.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GrowattService } from './growatt.service';
import { SolplanetService } from './solplanet.service';
import { SolisService } from './solis.service';
import { GoodWeService } from './goodwe.service';
import { SofarService } from './sofar.service';

@Module({
  imports: [PrismaModule],
  controllers: [SolarmanController],
  providers: [SolarmanService, GrowattService, SolplanetService, SolisService, GoodWeService, SofarService],
  exports: [SolarmanService, GrowattService, SolplanetService, SolisService, GoodWeService, SofarService],
})
export class SolarmanModule {}


