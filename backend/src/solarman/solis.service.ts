import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

export interface SolisReading {
  powerNow: number | null;        // kW
  generationToday: number | null; // kWh
  generationMonth: number | null; // kWh
  generationTotal: number | null; // kWh
  incomeToday: number | null;     // BRL
  incomeMonth: number | null;     // BRL
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
    const plantsMap = new Map<string, SolisPlant>();

    // 1. userStationList
    try {
      const data1 = await this.makeRequest('/v1/api/userStationList', { pageNo: 1, pageSize: 100 }, keyId, keySecret);
      if (data1 && data1.page && data1.page.records) {
        for (const r of data1.page.records) {
          const sId = String(r.id || r.stationId || r.sno || '');
          if (sId) {
            plantsMap.set(sId, {
              stationId: sId,
              name: r.stationName || r.sno || 'Usina Solis',
              capacityKwp: parseFloat(r.capacity || r.installedCapacity || r.power || '0'),
              country: r.countryStr || 'Brasil',
              region: r.regionStr || r.state || '',
              city: r.cityStr || r.city || '',
              address: r.addr || r.address || '',
              latitude: r.latitude ? parseFloat(r.latitude) : null,
              longitude: r.longitude ? parseFloat(r.longitude) : null,
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Erro ao consultar userStationList: ${err.message}`);
    }

    // 2. stationDetailList (como complemento / enriquecimento)
    try {
      const data2 = await this.makeRequest('/v1/api/stationDetailList', { pageNo: 1, pageSize: 100 }, keyId, keySecret);
      if (data2 && data2.page && data2.page.records) {
        for (const r of data2.page.records) {
          const sId = String(r.id || r.stationId || r.sno || '');
          if (sId && !plantsMap.has(sId)) {
            plantsMap.set(sId, {
              stationId: sId,
              name: r.stationName || r.sno || 'Usina Solis',
              capacityKwp: parseFloat(r.capacity || r.installedCapacity || r.power || '0'),
              country: r.countryStr || 'Brasil',
              region: r.regionStr || r.state || '',
              city: r.cityStr || r.city || '',
              address: r.addr || r.address || '',
              latitude: r.latitude ? parseFloat(r.latitude) : null,
              longitude: r.longitude ? parseFloat(r.longitude) : null,
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`stationDetailList fallback: ${err.message}`);
    }

    return Array.from(plantsMap.values());
  }

  // ─── Listar Inversores ─────────────────────────────────────────────────────
  async listInverters(keyId: string, keySecret: string, knownPlants: SolisPlant[] = []): Promise<SolisDevice[]> {
    const devicesMap = new Map<string, SolisDevice>();

    // 1. inverterList global
    try {
      const data = await this.makeRequest('/v1/api/inverterList', { pageNo: 1, pageSize: 100 }, keyId, keySecret);
      if (data && data.page && data.page.records) {
        for (const r of data.page.records) {
          const sn = r.sn || r.inverterSn || r.snList || '';
          if (sn) {
            const state = Number(r.state ?? 2);
            const status: 'ONLINE' | 'OFFLINE' | 'FAULT' =
              state === 1 || state === 0 ? 'ONLINE' :
              state === 3 ? 'FAULT' : 'ONLINE';

            devicesMap.set(sn, {
              deviceSn: sn,
              dataloggerSn: r.collectorId ? String(r.collectorId) : undefined,
              model: r.machine || r.model || 'Solis Inverter',
              powerKw: parseFloat(r.power || r.pac || r.capacity || '0'),
              stationId: String(r.stationId || r.station_id || ''),
              stationName: r.stationName || '',
              status,
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Erro ao consultar inverterList global: ${err.message}`);
    }

    // 2. Para cada estação conhecida que não teve inversor retornado na lista global, tenta buscar por stationId
    for (const plant of knownPlants) {
      const hasDev = Array.from(devicesMap.values()).some(d => d.stationId === plant.stationId);
      if (!hasDev) {
        try {
          const plantInv = await this.makeRequest('/v1/api/inverterList', { stationId: plant.stationId, pageNo: 1, pageSize: 50 }, keyId, keySecret);
          if (plantInv && plantInv.page && plantInv.page.records) {
            for (const r of plantInv.page.records) {
              const sn = r.sn || r.inverterSn || '';
              if (sn && !devicesMap.has(sn)) {
                const state = Number(r.state ?? 2);
                const status: 'ONLINE' | 'OFFLINE' | 'FAULT' =
                  state === 1 || state === 0 ? 'ONLINE' :
                  state === 3 ? 'FAULT' : 'ONLINE';

                devicesMap.set(sn, {
                  deviceSn: sn,
                  dataloggerSn: r.collectorId ? String(r.collectorId) : undefined,
                  model: r.machine || r.model || 'Solis Inverter',
                  powerKw: parseFloat(r.power || r.pac || plant.capacityKwp || '0'),
                  stationId: plant.stationId,
                  stationName: plant.name,
                  status,
                });
              }
            }
          }
        } catch (e: any) {
          this.logger.debug(`inverterList por stationId ${plant.stationId}: ${e.message}`);
        }
      }
    }

    return Array.from(devicesMap.values());
  }

  // ─── Descoberta Completa ───────────────────────────────────────────────────
  async discoverAll(keyId: string, keySecret: string): Promise<SolisDiscoveryResult> {
    const plants = await this.listStations(keyId, keySecret);
    const devices = await this.listInverters(keyId, keySecret, plants);

    return {
      plants,
      devices,
      totalPlants: plants.length,
      totalDevices: devices.length,
    };
  }

  // ─── Leitura em Tempo Real por SN do Inversor ou ID da Estação ────────────
  async readUsinaFromCloud(identifier: string, keyId: string, keySecret: string): Promise<SolisReading | null> {
    if (!identifier) return null;

    try {
      // 1. Tenta pegar detalhe direto do inversor por SN
      const detailSn = await this.makeRequest('/v1/api/inverterDetail', { sn: identifier }, keyId, keySecret);
      if (detailSn) {
        return this.parseInverterDetail(detailSn);
      }

      // 2. Tenta pegar detalhe direto do inversor por ID
      const detailId = await this.makeRequest('/v1/api/inverterDetail', { id: identifier }, keyId, keySecret);
      if (detailId) {
        return this.parseInverterDetail(detailId);
      }

      // 3. Tenta detalhe da usina / estação por ID
      const stDetail = await this.makeRequest('/v1/api/stationDetail', { id: identifier }, keyId, keySecret);
      if (stDetail) {
        const pac = parseFloat(stDetail.power ?? stDetail.pac ?? '0');
        const etoday = parseFloat(stDetail.dayEnergy ?? stDetail.eToday ?? stDetail.etoday ?? '0');
        const emonth = parseFloat(stDetail.monthEnergy ?? stDetail.eMonth ?? stDetail.emonth ?? '0');
        const etotal = parseFloat(stDetail.allEnergy ?? stDetail.totalEnergy ?? stDetail.eTotal ?? '0');
        const dayIncome = parseFloat(stDetail.dayIncome ?? stDetail.dayInCome ?? '0');
        const monthIncome = parseFloat(stDetail.monthIncome ?? stDetail.monthInCome ?? '0');
        const temp = parseFloat(stDetail.temperature ?? '0');

        return {
          powerNow: isNaN(pac) ? 0 : pac,
          generationToday: isNaN(etoday) ? 0 : etoday,
          generationMonth: isNaN(emonth) ? 0 : emonth,
          generationTotal: isNaN(etotal) ? 0 : etotal,
          incomeToday: isNaN(dayIncome) ? null : dayIncome,
          incomeMonth: isNaN(monthIncome) ? null : monthIncome,
          temperature: isNaN(temp) || temp <= 0 ? null : temp,
          status: (stDetail.state === 1 || pac > 0 || etoday > 0) ? 'ONLINE' : 'OFFLINE',
        };
      }

      // 4. Fallback: busca na lista de inversores
      const invList = await this.makeRequest('/v1/api/inverterList', { pageNo: 1, pageSize: 100 }, keyId, keySecret);
      if (invList && invList.page && invList.page.records) {
        const inv = invList.page.records.find((r: any) => (r.sn === identifier || r.inverterSn === identifier || String(r.stationId) === identifier));
        if (inv) {
          const pac = parseFloat(inv.pac ?? inv.power ?? '0');
          const etoday = parseFloat(inv.eToday ?? inv.etoday ?? inv.dayEnergy ?? '0');
          const emonth = parseFloat(inv.eMonth ?? inv.emonth ?? inv.monthEnergy ?? '0');
          const rawTotal = parseFloat(inv.allEnergyOriginal ?? inv.eTotal ?? inv.etotal ?? inv.totalEnergy ?? '0');
          const etotal = (inv.eTotalStr === 'MWh' || inv.etotalStr === 'MWh') && rawTotal < 1000 ? rawTotal * 1000 : rawTotal;

          return {
            powerNow: isNaN(pac) ? 0 : pac,
            generationToday: isNaN(etoday) ? 0 : etoday,
            generationMonth: isNaN(emonth) ? 0 : emonth,
            generationTotal: isNaN(etotal) ? 0 : etotal,
            incomeToday: null,
            incomeMonth: null,
            temperature: null,
            status: (pac > 0 || etoday > 0) ? 'ONLINE' : 'OFFLINE',
          };
        }
      }
    } catch (err: any) {
      this.logger.error(`Erro ao ler Solis ${identifier}: ${err.message}`);
    }

    return null;
  }

  private parseInverterDetail(detail: any): SolisReading {
    const pac = parseFloat(detail.pac ?? detail.pvAndAcCoupledPower ?? detail.power ?? detail.psumCal ?? '0');
    const etoday = parseFloat(detail.eToday ?? detail.etoday ?? detail.dayEnergy ?? '0');
    const emonth = parseFloat(detail.eMonth ?? detail.emonth ?? detail.monthEnergy ?? '0');

    let etotal = 0;
    if (detail.allEnergyOriginal !== undefined && detail.allEnergyOriginal !== null) {
      etotal = parseFloat(detail.allEnergyOriginal);
    } else {
      const rawTotal = parseFloat(detail.eTotal ?? detail.etotal ?? detail.totalEnergy ?? '0');
      etotal = (detail.eTotalStr === 'MWh' || detail.etotalStr === 'MWh') && rawTotal < 1000 ? rawTotal * 1000 : rawTotal;
    }

    const dayIncome = parseFloat(detail.dayInCome ?? detail.dayIncome ?? '0');
    const monthIncome = parseFloat(detail.monthInCome ?? detail.monthIncome ?? '0');
    const temp = parseFloat(detail.inverterTemperature ?? detail.temperature ?? '0');

    return {
      powerNow: isNaN(pac) ? 0 : pac,
      generationToday: isNaN(etoday) ? 0 : etoday,
      generationMonth: isNaN(emonth) ? 0 : emonth,
      generationTotal: isNaN(etotal) ? 0 : etotal,
      incomeToday: isNaN(dayIncome) ? null : dayIncome,
      incomeMonth: isNaN(monthIncome) ? null : monthIncome,
      temperature: isNaN(temp) || temp <= 0 ? null : temp,
      status: (detail.faultCodeDesc === 'Generating' || pac > 0 || etoday > 0) ? 'ONLINE' : 'OFFLINE',
    };
  }
}
