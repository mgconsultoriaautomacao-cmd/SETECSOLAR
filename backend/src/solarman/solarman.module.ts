import { Module } from '@nestjs/common';
import { SolarmanService } from './solarman.service';
import { SolarmanController } from './solarman.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SolarmanController],
  providers: [SolarmanService],
  exports: [SolarmanService],
})
export class SolarmanModule {}
