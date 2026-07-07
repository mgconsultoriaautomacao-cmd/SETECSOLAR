import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { RoleGuard } from '../auth/role.guard';

@Controller('work-orders')
@UseGuards(RoleGuard)
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  @Get()
  findAll() {
    return this.workOrderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workOrderService.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.workOrderService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.workOrderService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workOrderService.remove(id);
  }

  @Post(':id/parts')
  addPart(@Param('id') id: string, @Body() dto: any) {
    return this.workOrderService.addPart(id, dto);
  }

  @Delete(':id/parts/:partId')
  removePart(@Param('partId') partId: string) {
    return this.workOrderService.removePart(partId);
  }
}
