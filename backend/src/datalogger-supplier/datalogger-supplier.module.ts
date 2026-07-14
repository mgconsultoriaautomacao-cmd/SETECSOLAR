import { Module } from '@nestjs/common';
import { DataloggerSupplierController } from './datalogger-supplier.controller';
import { DataloggerSupplierService } from './datalogger-supplier.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DataloggerSupplierController],
  providers: [DataloggerSupplierService],
  exports: [DataloggerSupplierService],
})
export class DataloggerSupplierModule {}
