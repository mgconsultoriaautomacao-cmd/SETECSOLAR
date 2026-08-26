import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

export interface SolisReading {
  powerNow: number | null;        // kW
  generationToday: number | null; // kWh
  generationTotal: number | null; // kWh
  temperature: number | null;     // °C
  status: 'ONLINE' | 'OFFLINE' | 'FAULT';
}

export interface SolisPlant {
  stationId: string;
  name: string;
  capacityKwp: number;
  country: string;
  region: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export interface SolisDevice {
  deviceSn: string;
  dataloggerSn?: string;
  model: string;
  powerKw: number;
  stationId: string;
  stationName: string;
  status: 'ONLINE' | 'OFFLINE' | 'FAULT';
}

export interface SolisDiscoveryResult {
  plants: SolisPlant[];
  devices: SolisDevice[];
  totalPlants: number;
  totalDevices: number;
}

@Injectable()
export class SolisService {
  private readonly logger = new Logger(SolisService.name);
  private readonly baseUrl = 'https://www.soliscloud.com:13333';

  private buildHeaders(path: string, bodyObj: any, keyId: string, keySecret: string) {
    const bodyStr = JSON.stringify(bodyObj || {});
    const contentMd5 = crypto.createHash('md5').update(bodyStr, 'utf8').digest('base64');
    const dateStr = new Date().toUTCString();
    const contentType = 'application/json';

    // Format: "POST\n[Content-MD5]\napplication/json\n[Date]\n[CanonicalResource]"
    const stringToSign = `POST\n${contentMd5}\n${contentType}\n${dateStr}\n${path}`;
    const signature = crypto.createHmac('sha1', keySecret).update(stringToSign, 'utf8').digest('base64');

    return {
      headers: {
        'Content-Type': contentType,
        'Content-MD5': contentMd5,
        'Date': dateStr,
        'Authorization': `API ${keyId}:${signature}`,
      },
      bodyStr,
    };
  }

  private async makeRequest(path: string, bodyObj: any, keyId: string, keySecret: string): Promise<any> {
    const { headers, bodyStr } = this.buildHeaders(path, bodyObj, keyId, keySecret);
    const url = `${this.baseUrl}${path}`;

    try {
      this.logger.debug(`SolisCloud POST ${url}`);
      const response = await axios.post(url, bodyStr, { headers, timeout: 15000 });

      if (response.data && response.data.code === '0') {
        return response.data.data;
      } else {
        this.logger.warn(`SolisCloud erro na resposta: ${JSON.stringify(response.data)}`);
        return null;
      }
    } catch (err: any) {
      this.logger.error(`SolisCloud erro na requisição ${path}: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
      return null;
    }
  }

  // ─── Listar Usinas (Estações) ──────────────────────────────────────────────
  async listStations(keyId: string, keySecret: string): Promise<SolisPlant[]> {
    const data = await this.makeRequest('/v1/api/userStationList', { pageNo: 1, pageSize: 50 }, keyId, keySecret);
    if (!data || !data.page || !data.page.records) return [];

    return data.page.records.map((r: any) => ({
      stationId: String(r.id),
      name: r.stationName || r.sno || 'Usina Solis',
      capacityKwp: parseFloat(r.capacity || r.installedCapacity || '0'),
      country: r.countryStr || 'Brasil',
      region: r.regionStr || '',
      city: r.cityStr || '',
      address: r.addr || '',
      latitude: r.latitude ? parseFloat(r.latitude) : null,
      longitude: r.longitude ? parseFloat(r.longitude) : null,
    }));
  }

  // ─── Listar Inversores ─────────────────────────────────────────────────────
  async listInverters(keyId: string, keySecret: string): Promise<SolisDevice[]> {
    const data = await this.makeRequest('/v1/api/inverterList', { pageNo: 1, pageSize: 50 }, keyId, keySecret);
    if (!data || !data.page || !data.page.records) return [];

    return data.page.records.map((r: any) => {
      const state = Number(r.state ?? 2);
      const status: 'ONLINE' | 'OFFLINE' | 'FAULT' =
        state === 1 || state === 0 ? 'ONLINE' :
        state === 3 ? 'FAULT' : 'ONLINE'; // Na Solis state 2 / 1 = conectado

      return {
        deviceSn: r.sn || r.inverterSn || '',
        dataloggerSn: r.collectorId ? String(r.collectorId) : undefined,
        model: r.machine || r.model || 'Solis Inverter',
        powerKw: parseFloat(r.power || '0'),
        stationId: String(r.stationId || ''),
        stationName: r.stationName || '',
        status,
      };
    });
  }

  // ─── Descoberta Completa ───────────────────────────────────────────────────
  async discoverAll(keyId: string, keySecret: string): Promise<SolisDiscoveryResult> {
    const plants = await this.listStations(keyId, keySecret);
    const devices = await this.listInverters(keyId, keySecret);

    return {
      plants,
      devices,
      totalPlants: plants.length,
      totalDevices: devices.length,
    };
  }

  // ─── Leitura em Tempo Real por SN do Inversor ──────────────────────────────
  async readUsinaFromCloud(deviceSn: string, keyId: string, keySecret: string): Promise<SolisReading | null> {
    try {
      // 1. Tenta pegar detalhe direto do inversor
      const detail = await this.makeRequest('/v1/api/inverterDetail', { sn: deviceSn }, keyId, keySecret);
      if (detail) {
        const pac = parseFloat(detail.pac ?? detail.power ?? '0');
        const etoday = parseFloat(detail.etoday ?? detail.dayEnergy ?? '0');
        const etotalRaw = parseFloat(detail.etotal ?? detail.totalEnergy ?? '0');
        // Se etotalStr for MWh, converte para kWh
        const etotal = detail.etotalStr === 'MWh' ? etotalRaw * 1000 : etotalRaw;
        const temp = parseFloat(detail.inverterTemperature ?? detail.temperature ?? '0');

        return {
          powerNow: isNaN(pac) ? null : pac,
          generationToday: isNaN(etoday) ? null : etoday,
          generationTotal: isNaN(etotal) ? null : etotal,
          temperature: isNaN(temp) || temp <= 0 ? null : temp,
          status: pac > 0.01 ? 'ONLINE' : 'OFFLINE',
        };
      }

      // 2. Fallback: busca na lista de inversores
      const invList = await this.makeRequest('/v1/api/inverterList', { pageNo: 1, pageSize: 50 }, keyId, keySecret);
      if (invList && invList.page && invList.page.records) {
        const inv = invList.page.records.find((r: any) => (r.sn === deviceSn || r.inverterSn === deviceSn));
        if (inv) {
          const pac = parseFloat(inv.pac ?? inv.power ?? '0');
          const etoday = parseFloat(inv.etoday ?? inv.dayEnergy ?? '0');
          const etotalRaw = parseFloat(inv.etotal ?? inv.totalEnergy ?? '0');
          const etotal = inv.etotalStr === 'MWh' ? etotalRaw * 1000 : etotalRaw;

          return {
            powerNow: isNaN(pac) ? null : pac,
            generationToday: isNaN(etoday) ? null : etoday,
            generationTotal: isNaN(etotal) ? null : etotal,
            temperature: null,
            status: pac > 0.01 ? 'ONLINE' : 'OFFLINE',
          };
        }
      }
    } catch (err: any) {
      this.logger.error(`Erro ao ler inversor Solis ${deviceSn}: ${err.message}`);
    }

    return null;
  }
}
