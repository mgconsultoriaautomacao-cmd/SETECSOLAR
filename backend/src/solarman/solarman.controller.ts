import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SolarmanService } from './solarman.service';
import { GrowattService } from './growatt.service';
import { SolplanetService } from './solplanet.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleGuard } from '../auth/role.guard';

@Controller('solarman')
@UseGuards(RoleGuard)
export class SolarmanController {
  constructor(
    private readonly solarmanService: SolarmanService,
    private readonly growattService: GrowattService,
    private readonly solplanetService: SolplanetService,
    private readonly prisma: PrismaService,
  ) {}

  // GET /solarman/readings — retorna cache de leituras de todas as usinas
  @Get('readings')
  getReadings() {
    return this.solarmanService.getAllReadings();
  }

  // GET /solarman/analytics — métricas de geração com filtro de período opcional
  // Parâmetros: usinaId (opcional), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
  @Get('analytics')
  async getAnalytics(
    @Query('usinaId') usinaId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.solarmanService.getGenerationAnalytics(usinaId, startDate, endDate);
  }

  // GET /solarman/status — verifica configuração do serviço
  @Get('status')
  getStatus() {
    return this.solarmanService.getConfigStatus();
  }

  // GET /solarman/api-status — verifica em tempo real o status de cada fornecedor cadastrado
  @Get('api-status')
  async getApiStatus() {
    return this.solarmanService.getApiStatus();
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

  /**
   * GET /solarman/growatt/diagnose — Diagnóstico da API Growatt
   * Retorna o JSON bruto de cada endpoint para verificar quais campos a API está retornando.
   * Use para comparar com os valores do app Growatt e identificar discrepâncias.
   * Query params: deviceSn (obrigatório), supplierId (opcional)
   */
  @Get('growatt/diagnose')
  async diagnoseGrowatt(
    @Query('deviceSn') deviceSn: string,
    @Query('supplierId') supplierId?: string,
  ) {
    if (!deviceSn) {
      return { error: 'Parâmetro "deviceSn" é obrigatório. Ex: /solarman/growatt/diagnose?deviceSn=SEU_SN' };
    }

    let customToken: string | undefined;
    if (supplierId) {
      try {
        const supplier = await this.prisma.dataloggerSupplier.findUnique({ where: { id: supplierId } });
        customToken = supplier?.token || undefined;
      } catch (e) { /* ignora */ }
    }

    const results = await this.growattService.diagnose(deviceSn, customToken);

    return {
      deviceSn,
      supplierId: supplierId || 'usando token do .env',
      note: 'Verifique os campos "extractedFields" — generationToday e generationTotal devem estar em kWh.',
      results,
    };
  }

  // ─── Solplanet: Descoberta e Sincronização ────────────────────────────────

  // POST /solarman/solplanet/sync — Sincroniza plantas Solplanet → cria/atualiza usinas no banco
  @Post('solplanet/sync')
  async syncSolplanetPlants(@Body() body: { clientId?: string; supplierId?: string }) {
    return this.solarmanService.syncSolplanetPlants(body.clientId, body.supplierId);
  }

  /**
   * GET /solarman/solplanet/diagnose — Diagnóstico completo da API Solplanet Pro
   * Retorna o JSON bruto de cada endpoint e uma recomendação de ação.
   * Use para verificar se as credenciais estão corretas e se a conta tem acesso à API.
   * Query params: supplierId (opcional — usa env se não fornecido)
   */
  @Get('solplanet/diagnose')
  async diagnoseSolplanet(@Query('supplierId') supplierId?: string) {
    let appKey = process.env.SOLPLANET_APP_KEY || '';
    let appSecret = process.env.SOLPLANET_API_KEY || '';
    let token: string | undefined;
    let apiKey: string | undefined;

    if (supplierId) {
      try {
        const supplier = await this.prisma.dataloggerSupplier.findUnique({ where: { id: supplierId } });
        if (supplier) {
          appKey = supplier.appId || appKey;
          appSecret = supplier.appSecret || appSecret;
          token = supplier.token || undefined;
          apiKey = (supplier as any).apiKey || undefined;
        }
      } catch (e) { /* ignora */ }
    }

    if (!appKey || !appSecret) {
      return {
        error: 'Credenciais Solplanet não configuradas.',
        hint: 'Configure SOLPLANET_APP_KEY e SOLPLANET_API_KEY no .env, ou forneça um supplierId válido.',
      };
    }

    return this.solplanetService.diagnose(appKey, appSecret, token, apiKey);
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
