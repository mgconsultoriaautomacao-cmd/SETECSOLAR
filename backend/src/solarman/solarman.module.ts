import { Module } from '@nestjs/common';
import { SolarmanService } from './solarman.service';
import { SolarmanController } from './solarman.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GrowattService } from './growatt.service';

@Module({
  imports: [PrismaModule],
  controllers: [SolarmanController],
  providers: [SolarmanService, GrowattService],
  exports: [SolarmanService, GrowattService],
})
export class SolarmanModule {}
