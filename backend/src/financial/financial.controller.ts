import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { RoleGuard } from '../auth/role.guard';

@Controller('financial')
@UseGuards(RoleGuard)
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.financialService.findAll(type, status, search);
  }

  @Get('summary')
  getSummary() {
    return this.financialService.getSummary();
  }

  @Post()
  create(@Body() createDto: any) {
    return this.financialService.create(createDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.financialService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.financialService.remove(id);
  }
}
