import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { UsinaService } from './usina.service';
import { RoleGuard } from '../auth/role.guard';

@Controller('usinas')
@UseGuards(RoleGuard)
export class UsinaController {
  constructor(private readonly usinaService: UsinaService) {}

  @Get()
  findAll(@Req() req: any, @Query('search') search?: string) {
    return this.usinaService.findAll(req.user, search);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.usinaService.findOne(req.user, id);
  }

  @Post()
  create(@Body() createUsinaDto: any) {
    return this.usinaService.create(createUsinaDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUsinaDto: any) {
    return this.usinaService.update(id, updateUsinaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usinaService.remove(id);
  }
}
