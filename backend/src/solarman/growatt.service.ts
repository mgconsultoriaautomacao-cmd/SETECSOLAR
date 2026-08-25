import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface GrowattReading {
  powerNow: number | null;        // kW
  generationToday: number | null; // kWh
  generationTotal: number | null; // kWh
  temperature: number | null;     // °C
  status: 'ONLINE' | 'OFFLINE' | 'FAULT';
}

export interface GrowattPlant {
  plantId: string;
  name: string;
  peakPower: string;       // kWp
  country: string;
  city: string;
  createDate: string;
  currentPower: string;    // kW
  totalEnergy: string;     // kWh
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
}

export interface GrowattDevice {
  deviceSn: string;
  dataloggerSn: string;
  deviceType: number;      // 1: Inverter, 2: Storage, etc.
  model: string;
  status: number;          // 0: Offline, 1: Online, 3: Fault
  lastUpdateTime: string;
  plantId: string;
  plantName: string;
}

export interface GrowattDiscoveryResult {
  plants: GrowattPlant[];
  devices: GrowattDevice[];
  totalPlants: number;
  totalDevices: number;
}

// ─── Mapeamento robusto de campos de energia da Growatt API ─────────────────
// A Growatt OpenAPI pode retornar os campos com nomes diferentes dependendo
// do endpoint e versão do firmware do inversor. Este helper cobre todos os casos.
function extractGrowattEnergy(data: any): { generationToday: number | null; generationTotal: number | null; powerNow: number | null; temperature: number | null; status: 'ONLINE' | 'OFFLINE' | 'FAULT' } {
  if (!data) return { generationToday: null, generationTotal: null, powerNow: null, temperature: null, status: 'OFFLINE' };

  // ─── Geração de hoje (kWh) ─────────────────────────────────────────────────
  // Campos possíveis, por ordem de prioridade (Growatt OpenAPI v4 oficial)
  const todayRaw =
    data.eToday    ??  // Growatt OpenAPI v4 oficial
    data.e_today   ??  // Growatt API alternativo
    data.today_energy ??
    data.todayEnergy  ??
    data.powerToday   ??  // campo legado
    data.pac_today    ??
    data.etd          ??
    data.epvtoday     ??
    null;

  // ─── Geração total acumulada (kWh) ─────────────────────────────────────────
  const totalRaw =
    data.eTotal    ??  // Growatt OpenAPI v4 oficial
    data.e_total   ??
    data.total_energy ??
    data.totalEnergy  ??
    data.powerTotal   ??  // campo legado
    data.pac_total    ??
    data.etotal       ??
    data.epvtotal     ??
    null;

  // ─── Potência atual (W → kW) ──────────────────────────────────────────────
  // pac = Active power in Watts (Growatt padrão)
  const pacRaw =
    data.pac          ??  // Growatt oficial (W)
    data.outputPower  ??
    data.activepower  ??
    data.currentPower ??
    null;

  // ─── Temperatura (°C) ────────────────────────────────────────────────────
  const tempRaw =
    data.temperature ??
    data.temp        ??
    data.inverterTemp ??
    null;

  // ─── Status ──────────────────────────────────────────────────────────────
  const statusCode =
    data.status       ??
    data.deviceStatus ??
    data.workMode     ??
    null;

  let status: 'ONLINE' | 'OFFLINE' | 'FAULT' = 'ONLINE';
  if (statusCode === 0 || statusCode === '0' || statusCode === 'offline') status = 'OFFLINE';
  if (statusCode === 3 || statusCode === '3' || statusCode === 'fault') status = 'FAULT';

  // ─── Parse e validação ─────────────────────────────────────────────────────
  const generationToday = todayRaw !== null ? parseFloat(String(todayRaw)) : null;
  const generationTotal = totalRaw !== null ? parseFloat(String(totalRaw)) : null;
  const pacW = pacRaw !== null ? parseFloat(String(pacRaw)) : null;

  // pac da Growatt OpenAPI vem em Watts — converter para kW
  // Alguns endpoints já retornam em kW (valor < 100 geralmente = kW)
  let powerNow: number | null = null;
  if (pacW !== null && !isNaN(pacW)) {
    powerNow = pacW > 100 ? pacW / 1000 : pacW; // heurística: > 100 = Watts
  }

  const temperature = tempRaw !== null && !isNaN(parseFloat(String(tempRaw)))
    ? parseFloat(String(tempRaw))
    : null;

  return {
    generationToday: generationToday !== null && !isNaN(generationToday) ? generationToday : null,
    generationTotal: generationTotal !== null && !isNaN(generationTotal) ? generationTotal : null,
    powerNow,
    temperature,
    status,
  };
}

@Injectable()
export class GrowattService {
  private readonly logger = new Logger(GrowattService.name);
  private readonly defaultBaseUrl = 'https://openapi.growatt.com';

  private getHeaders(customToken?: string): Record<string, string> {
    const token = customToken || process.env.GROWATT_API_TOKEN || '';
    return {
      'token': token,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'SETEC-Energia/1.0',
    };
  }

  private getBaseUrl(customBaseUrl?: string): string {
    return customBaseUrl || this.defaultBaseUrl;
  }

  // ─── Listar todas as plantas da conta Growatt ──────────────────────────────
  async listPlants(customToken?: string, customBaseUrl?: string): Promise<GrowattPlant[]> {
    try {
      const headers = this.getHeaders(customToken);
      const baseUrl = this.getBaseUrl(customBaseUrl);

      this.logger.log(`🌱 Buscando lista de plantas em ${baseUrl}/v1/plant/list ...`);

      const response = await axios.get(`${baseUrl}/v1/plant/list`, {
        headers,
        params: { page: 1, perpage: 100 },
        timeout: 15000,
      });

      if (response.data && (response.data.error_code === 0 || response.data.code === 0)) {
        const data = response.data.data || response.data;
        const plants: any[] = data.plants || data.datas || [];

        this.logger.log(`  ✔ Encontradas ${plants.length} planta(s).`);

        return plants.map((p: any) => ({
          plantId: String(p.plant_id || p.plantId || p.id || ''),
          name: p.name || p.plantName || 'Sem nome',
          peakPower: String(p.peak_power || p.peakPower || p.nominal_power || '0'),
          country: p.country || '',
          city: p.city || '',
          createDate: p.create_date || p.createDate || '',
          currentPower: String(p.current_power || p.currentPower || '0'),
          totalEnergy: String(p.total_energy || p.totalEnergy || '0'),
          gpsLatitude: p.latitude ? parseFloat(p.latitude) : null,
          gpsLongitude: p.longitude ? parseFloat(p.longitude) : null,
        }));
      } else {
        const errorCode = response.data?.error_code ?? response.data?.code;
        const errorMsg  = response.data?.error_msg  ?? response.data?.msg ?? '';

        // Erro 10011 = token expirado ou revogado no portal Growatt OpenAPI
        if (errorCode === 10011 || errorCode === '10011') {
          throw new Error(
            `Token Growatt expirado ou inválido (code: 10011 - ${errorMsg || 'error_permission_denied'}). ` +
            `Acesse https://openapi.growatt.com → "My Account" → "API Token" e gere um novo token. ` +
            `Em seguida, atualize GROWATT_API_TOKEN no .env e o campo "token" do fornecedor no banco.`
          );
        }

        this.logger.warn(`Resposta inesperada de /v1/plant/list: ${JSON.stringify(response.data)}`);
        return [];
      }
    } catch (err: any) {
      this.logger.error(`Erro ao listar plantas Growatt: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
      throw new Error(`Erro ao conectar na API Growatt: ${err.message}`);
    }
  }

  // ─── Listar dispositivos de uma planta ─────────────────────────────────────
  async listDevices(plantId: string, customToken?: string, customBaseUrl?: string): Promise<GrowattDevice[]> {
    try {
      const headers = this.getHeaders(customToken);
      const baseUrl = this.getBaseUrl(customBaseUrl);

      this.logger.log(`  📡 Buscando dispositivos da planta ${plantId}...`);

      const response = await axios.get(`${baseUrl}/v1/device/list`, {
        headers,
        params: { plant_id: plantId, page: 1, perpage: 100 },
        timeout: 15000,
      });

      if (response.data && (response.data.error_code === 0 || response.data.code === 0)) {
        const data = response.data.data || response.data;
        const devices: any[] = data.devices || data.datas || [];

        this.logger.log(`    ✔ Encontrados ${devices.length} dispositivo(s) na planta ${plantId}.`);

        return devices.map((d: any) => ({
          deviceSn: d.device_sn || d.deviceSn || d.sn || '',
          dataloggerSn: d.datalogger_sn || d.datalogSn || d.datalog_sn || '',
          deviceType: Number(d.type || d.deviceType || 1),
          model: d.model || d.deviceModel || '',
          status: Number(d.status ?? 0),
          lastUpdateTime: d.last_update_time || d.lastUpdateTime || '',
          plantId: String(plantId),
          plantName: '', // Será preenchido pelo discoverAll
        }));
      } else {
        this.logger.warn(`Resposta inesperada de /v1/device/list (plant ${plantId}): ${JSON.stringify(response.data)}`);
        return [];
      }
    } catch (err: any) {
      this.logger.error(`Erro ao listar dispositivos da planta ${plantId}: ${err.message}`);
      return [];
    }
  }

  // ─── Descoberta completa: plantas + dispositivos ───────────────────────────
  async discoverAll(customToken?: string, customBaseUrl?: string): Promise<GrowattDiscoveryResult> {
    const plants = await this.listPlants(customToken, customBaseUrl);
    const allDevices: GrowattDevice[] = [];

    for (const plant of plants) {
      const devices = await this.listDevices(plant.plantId, customToken, customBaseUrl);
      // Preenche o nome da planta em cada dispositivo
      for (const dev of devices) {
        dev.plantName = plant.name;
      }
      allDevices.push(...devices);
    }

    this.logger.log(`🔍 Descoberta completa: ${plants.length} planta(s), ${allDevices.length} dispositivo(s).`);

    return {
      plants,
      devices: allDevices,
      totalPlants: plants.length,
      totalDevices: allDevices.length,
    };
  }

  // ─── Leitura de dados em tempo real de um dispositivo ──────────────────────
  // Tenta múltiplos endpoints para compatibilidade máxima com a API Growatt
  async readUsinaFromCloud(deviceSn: string, deviceType: string = 'inv', customToken?: string): Promise<GrowattReading | null> {
    const headers = this.getHeaders(customToken);
    const baseUrl = this.defaultBaseUrl;

    // Endpoints a tentar em ordem de prioridade
    const endpoints = [
      // 1. Endpoint oficial Growatt OpenAPI v4 — dados do inversor
      { url: `${baseUrl}/v1/device/inverter/last_new_data`, params: { device_sn: deviceSn } },
      // 2. Fallback: dados mais recentes da planta
      { url: `${baseUrl}/v1/device/inverter/detail`, params: { device_sn: deviceSn } },
    ];

    for (const ep of endpoints) {
      try {
        this.logger.debug(`Growatt: tentando ${ep.url} para SN ${deviceSn}`);
        const response = await axios.get(ep.url, {
          headers,
          params: ep.params,
          timeout: 15000,
        });

        const code = response.data?.error_code ?? response.data?.code;

        if (response.data && (code === 0 || code === '0' || response.data.success)) {
          // O payload pode estar em data.obj, data.data ou diretamente em data
          const payload = response.data?.data?.obj
            ?? response.data?.data
            ?? response.data?.obj
            ?? response.data;

          this.logger.debug(`Growatt raw payload para ${deviceSn}: ${JSON.stringify(payload)}`);

          const extracted = extractGrowattEnergy(payload);

          this.logger.log(
            `✅ Growatt ${deviceSn}: ` +
            `powerNow=${extracted.powerNow?.toFixed(2)}kW, ` +
            `today=${extracted.generationToday}kWh, ` +
            `total=${extracted.generationTotal}kWh`
          );

          return extracted;
        } else if (code === 10011 || code === '10011') {
          this.logger.error(`Token Growatt expirado (10011) ao ler ${deviceSn}`);
          return null;
        } else {
          this.logger.debug(`Growatt endpoint ${ep.url} retornou code=${code}, tentando próximo...`);
        }
      } catch (err: any) {
        this.logger.debug(`Growatt endpoint ${ep.url} falhou: ${err.message}`);
      }
    }

    this.logger.warn(`Sem dados Growatt para ${deviceSn} em nenhum endpoint.`);
    return null;
  }

  // ─── Diagnóstico: retorna o JSON bruto da API para inspeção ────────────────
  // Útil para verificar quais campos a API está realmente retornando
  async diagnose(deviceSn: string, customToken?: string): Promise<{
    endpoint: string;
    statusCode: number;
    rawResponse: any;
    extractedFields: any;
    error?: string;
  }[]> {
    const headers = this.getHeaders(customToken);
    const baseUrl = this.defaultBaseUrl;
    const results: any[] = [];

    const endpoints = [
      `${baseUrl}/v1/device/inverter/last_new_data`,
      `${baseUrl}/v1/device/inverter/detail`,
      `${baseUrl}/v1/plant/list`,
    ];

    for (const url of endpoints) {
      try {
        const params = url.includes('plant/list')
          ? { page: 1, perpage: 5 }
          : { device_sn: deviceSn };

        const response = await axios.get(url, { headers, params, timeout: 10000 });
        const payload = response.data?.data?.obj ?? response.data?.data ?? response.data;
        const extracted = url.includes('plant') ? {} : extractGrowattEnergy(payload);

        results.push({
          endpoint: url,
          statusCode: response.status,
          rawResponse: response.data,
          extractedFields: extracted,
        });
      } catch (err: any) {
        results.push({
          endpoint: url,
          statusCode: err.response?.status ?? 0,
          rawResponse: err.response?.data ?? null,
          extractedFields: null,
          error: err.message,
        });
      }
    }

    return results;
  }
}
