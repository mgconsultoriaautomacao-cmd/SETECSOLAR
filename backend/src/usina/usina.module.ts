import { Module } from '@nestjs/common';
import { UsinaController } from './usina.controller';
import { UsinaService } from './usina.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsinaController],
  providers: [UsinaService],
  exports: [UsinaService],
})
export class UsinaModule {}
