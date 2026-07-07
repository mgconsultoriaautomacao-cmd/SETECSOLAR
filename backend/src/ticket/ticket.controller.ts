import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { RoleGuard } from '../auth/role.guard';

@Controller('tickets')
@UseGuards(RoleGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  findAll() {
    return this.ticketService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketService.findOne(id);
  }

  @Post()
  create(@Body() dto: any) {
    return this.ticketService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.ticketService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketService.remove(id);
  }
}
