import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SolarmanService } from './solarman.service';
import { RoleGuard } from '../auth/role.guard';

@Controller('solarman')
@UseGuards(RoleGuard)
export class SolarmanController {
  constructor(private readonly solarmanService: SolarmanService) {}

  // GET /solarman/readings — retorna cache de leituras de todas as usinas
  @Get('readings')
  getReadings() {
    return this.solarmanService.getAllReadings();
  }

  // GET /solarman/status — verifica configuração do serviço
  @Get('status')
  getStatus() {
    return this.solarmanService.getConfigStatus();
  }

  // POST /solarman/refresh — força nova leitura imediata
  @Post('refresh')
  async forceRefresh() {
    return this.solarmanService.forceRefresh();
  }

  // POST /solarman/test — testa conexão direta com um datalogger por IP + SN
  // Body: { ip: string, sn: string, supplierId?: string }
  @Post('test')
  async testDatalogger(@Body() body: { ip: string; sn: string; supplierId?: string }) {
    return this.solarmanService.testConnection(body.ip, body.sn, body.supplierId);
  }

  // POST /solarman/activate/:usinaId — salva IP:SN no cadastro e inicia monitoramento
  // Body: { ip: string, sn: string, supplierId?: string }
  @Post('activate/:usinaId')
  async activateMonitoring(
    @Param('usinaId') usinaId: string,
    @Body() body: { ip: string; sn: string; supplierId?: string },
  ) {
    return this.solarmanService.activateMonitoring(usinaId, body.ip, body.sn, body.supplierId);
  }

  // ─── Growatt: Descoberta e Sincronização ──────────────────────────────────

  // GET /solarman/growatt/plants — Lista plantas e dispositivos da conta Growatt (preview)
  @Get('growatt/plants')
  async getGrowattPlants(@Query('supplierId') supplierId?: string) {
    return this.solarmanService.discoverGrowattPlants(supplierId);
  }

  // POST /solarman/growatt/sync — Sincroniza plantas Growatt → cria usinas no banco
  // Body: { clientId?: string, supplierId?: string }
  @Post('growatt/sync')
  async syncGrowattPlants(@Body() body: { clientId?: string; supplierId?: string }) {
    return this.solarmanService.syncGrowattPlants(body.clientId, body.supplierId);
  }

}
