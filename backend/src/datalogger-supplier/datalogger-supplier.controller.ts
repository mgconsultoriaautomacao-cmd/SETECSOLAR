import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { DataloggerSupplierService } from './datalogger-supplier.service';
import { RoleGuard } from '../auth/role.guard';

@Controller('datalogger-suppliers')
@UseGuards(RoleGuard)
export class DataloggerSupplierController {
  constructor(private readonly supplierService: DataloggerSupplierService) {}

  @Get()
  findAll() {
    return this.supplierService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supplierService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.supplierService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.supplierService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.supplierService.remove(id);
  }
}
