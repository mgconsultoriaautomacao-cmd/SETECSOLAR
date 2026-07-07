import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ClientService } from './client.service';
import { RoleGuard } from '../auth/role.guard';

@Controller('clients')
@UseGuards(RoleGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  findAll(@Req() req: any, @Query('search') search?: string) {
    return this.clientService.findAll(req.user, search);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.clientService.findOne(req.user, id);
  }

  @Post()
  create(@Body() createClientDto: any) {
    return this.clientService.create(createClientDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateClientDto: any) {
    return this.clientService.update(id, updateClientDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientService.remove(id);
  }
}
