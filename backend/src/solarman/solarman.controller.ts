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

  // GET /solarman/analytics — retorna histórico e métricas de geração (diário, semanal, mensal, comparativo)
  @Get('analytics')
  async getAnalytics(@Query('usinaId') usinaId?: string) {
    return this.solarmanService.getGenerationAnalytics(usinaId);
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

  // ─── Solplanet: Descoberta e Sincronização ────────────────────────────────

  // POST /solarman/solplanet/sync — Sincroniza plantas Solplanet → cria/atualiza usinas no banco
  @Post('solplanet/sync')
  async syncSolplanetPlants(@Body() body: { clientId?: string; supplierId?: string }) {
    return this.solarmanService.syncSolplanetPlants(body.clientId, body.supplierId);
  }

  // ─── Solarman Cloud: Sincronização ────────────────────────────────────────

  // POST /solarman/solarman/sync — Sincroniza plantas Solarman Cloud → cria/atualiza usinas no banco
  @Post('solarman/sync')
  async syncSolarmanPlants(@Body() body: { clientId?: string; supplierId?: string }) {
    return this.solarmanService.syncSolarmanPlants(body.clientId, body.supplierId);
  }

  // ─── Sincronização Unificada (Todos os Fornecedores Cloud) ────────────────

  // POST /solarman/sync-all — Sincroniza Growatt, Solplanet e Solarman de uma só vez
  @Post('sync-all')
  async syncAllCloudPlants(@Body() body: { clientId?: string }) {
    return this.solarmanService.syncAllCloudPlants(body.clientId);
  }
}

