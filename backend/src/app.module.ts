import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ClientModule } from './client/client.module';
import { UsinaModule } from './usina/usina.module';
import { SolarmanModule } from './solarman/solarman.module';
import { WorkOrderModule } from './work-order/work-order.module';
import { TicketModule } from './ticket/ticket.module';

@Module({
  imports: [PrismaModule, ClientModule, UsinaModule, SolarmanModule, WorkOrderModule, TicketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

