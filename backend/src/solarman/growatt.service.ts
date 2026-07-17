import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as qs from 'qs';

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

@Injectable()
export class GrowattService {
  private readonly logger = new Logger(GrowattService.name);
  private readonly defaultBaseUrl = 'https://openapi.growatt.com';

  private getHeaders(customToken?: string): Record<string, string> {
    const token = customToken || process.env.GROWATT_API_TOKEN || '';
    return {
      'token': token,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'NestJS Growatt API Client',
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
  async readUsinaFromCloud(deviceSn: string, deviceType: string = 'inv', customToken?: string): Promise<GrowattReading | null> {
    try {
      const headers = this.getHeaders(customToken);

      // Busca usando a API V1 last_new_data para obter os dados reais mais recentes
      const response = await axios.get(`${this.defaultBaseUrl}/v1/device/inverter/last_new_data`, {
        headers,
        params: {
          device_sn: deviceSn,
        },
      });

      if (response.data && response.data.error_code === 0 && response.data.data) {
        const data = response.data.data;

        // pac = potência atual (Watts). Converter para kW
        const powerNow = data.pac !== undefined && data.pac !== null
          ? parseFloat(data.pac) / 1000 
          : null;

        // powerToday (kWh)
        const generationToday = data.powerToday !== undefined && data.powerToday !== null
          ? parseFloat(data.powerToday) 
          : null;

        // powerTotal (kWh)
        const generationTotal = data.powerTotal !== undefined && data.powerTotal !== null
          ? parseFloat(data.powerTotal) 
          : null;

        // temperature (°C)
        const temperature = data.temperature !== undefined && data.temperature !== null
          ? parseFloat(data.temperature) 
          : null;

        const statusRaw = data.status;
        let status: 'ONLINE' | 'OFFLINE' | 'FAULT' = 'ONLINE';
        if (statusRaw === 0) status = 'OFFLINE';
        if (statusRaw === 3) status = 'FAULT';

        return {
          powerNow,
          generationToday,
          generationTotal,
          temperature,
          status,
        };
      } else {
        this.logger.warn(`Erro na resposta da Growatt API para ${deviceSn}: ${JSON.stringify(response.data)}`);
      }
    } catch (err: any) {
      this.logger.error(`Erro ao buscar dados do device ${deviceSn} via Growatt API: ${err.message}`);
    }
    return null;
  }
}
