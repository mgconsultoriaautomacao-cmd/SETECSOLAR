import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import * as https from 'https';

export interface SolplanetReading {
  powerNow: number | null;
  generationToday: number | null;
  generationTotal: number | null;
  temperature?: number | null;
  status: string;
}

export interface SolplanetDiscoveryResult {
  totalPlants: number;
  totalDevices: number;
  plants: any[];
  devices: any[];
  error?: string;
  rawResponse?: any;
}

// Host oficial conforme documentação AISWEI API Business Singapore
const SOLPLANET_HOSTS = [
  'https://ap-southeast-1-api-genergal.aisweicloud.com',
  'https://api.general.aisweicloud.com',
  'https://api.aisweicloud.com',
];

@Injectable()
export class SolplanetService {
  private readonly logger = new Logger(SolplanetService.name);

  /**
   * Gera a assinatura HMAC-SHA256 para o Alibaba Cloud API Gateway da AISWEI / Solplanet.
   */
  private generateSignature(
    endpoint: string, // path + query string com parâmetros ordenados alfabeticamente
    appKey: string,
    appSecret: string
  ): Record<string, string> {
    const method = 'GET';
    const accept = 'application/json';
    const contentType = 'application/json; charset=UTF-8';

    const stringToSign = `${method}\n${accept}\n\n${contentType}\n\nX-Ca-Key:${appKey}\n${endpoint}`;

    const signature = crypto
      .createHmac('sha256', appSecret)
      .update(stringToSign)
      .digest('base64');

    return {
      'User-Agent': 'SETEC-Energia/1.0',
      'Content-Type': contentType,
      'Accept': accept,
      'X-Ca-Signature-Headers': 'X-Ca-Key',
      'X-Ca-Key': String(appKey),
      'X-Ca-Signature': signature,
      'X-Ca-Stage': 'RELEASE',
    };
  }

  /**
   * Monta a URL com os parâmetros de consulta ordenados alfabeticamente.
   */
  private buildEndpoint(
    path: string,
    params: Record<string, string | number | undefined>
  ): string {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        clean[k] = String(v);
      }
    }

    const sorted = Object.keys(clean)
      .sort()
      .map(k => `${k}=${encodeURIComponent(clean[k])}`)
      .join('&');

    return sorted ? `${path}?${sorted}` : path;
  }

  /**
   * Executa uma requisição GET autenticada aos servidores da Solplanet / AISWEI.
   */
  async makeRequest(
    path: string,
    params: Record<string, string | number | undefined>,
    appKey: string,
    appSecret: string,
  ): Promise<any> {
    const endpoint = this.buildEndpoint(path, params);
    const headers = this.generateSignature(endpoint, appKey, appSecret);

    let lastError: any = null;

    for (const host of SOLPLANET_HOSTS) {
      const url = `${host}${endpoint}`;
      try {
        this.logger.debug(`Solplanet GET ${url}`);
        const response = await axios.get(url, {
          headers,
          timeout: 12000,
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });

        if (response.data && (response.data.status === 200 || response.data.code === 200 || response.data.success)) {
          return response.data;
        }

        if (response.data) {
          this.logger.warn(`Solplanet retorno com aviso em ${host}: ${JSON.stringify(response.data)}`);
          return response.data;
        }
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Solplanet erro em ${host}: ${err.message}`);
      }
    }

    if (lastError) {
      throw lastError;
    }
    return null;
  }

  /**
   * Lista todas as usinas (plantas) cadastradas na conta Solplanet Pro via getPlanListPro.
   */
  async listPlants(
    appKey: string,
    appSecret: string,
    token: string,
    apiKey?: string,
  ): Promise<any[]> {
    try {
      const res = await this.makeRequest(
        '/pro/getPlanListPro',
        {
          token,
          order: 0,
          pageNum: 1,
          pageSize: 100,
        },
        appKey,
        appSecret,
      );

      if (res && res.data && res.data.result && Array.isArray(res.data.result)) {
        this.logger.log(`Solplanet: ${res.data.result.length} usina(s) encontrada(s) via getPlanListPro.`);
        return res.data.result;
      }

      return [];
    } catch (err: any) {
      this.logger.error(`Erro ao listar plantas Solplanet: ${err.message}`);
      return [];
    }
  }

  /**
   * Diagnóstico completo da API Solplanet.
   */
  async diagnose(appKey: string, appSecret: string, token?: string, apiKey?: string): Promise<{
    credentials: any;
    endpoints: { endpoint: string; host: string; status: number | null; headers?: any; rawResponse: any; error?: string }[];
    recommendation: string;
  }> {
    const effectiveToken = token || process.env.SOLPLANET_TOKEN || 'N1YyRFB4aHF3T2tTTmJvMjZyNDF0QT09';
    const effectiveAppKey = appKey || process.env.SOLPLANET_APP_KEY || '205024856';
    const effectiveAppSecret = appSecret || process.env.SOLPLANET_API_KEY || 'QT3qSt0ntxTI8JminCull8p2066zCDnZ';

    const endpoints = [
      {
        path: '/pro/getPlanListPro',
        params: { token: effectiveToken, order: 0, pageNum: 1, pageSize: 10 },
        label: 'Lista de Plantas (getPlanListPro)',
      },
    ];

    const results: any[] = [];

    for (const ep of endpoints) {
      const endpointStr = this.buildEndpoint(ep.path, ep.params as any);
      const headers = this.generateSignature(endpointStr, effectiveAppKey, effectiveAppSecret);

      for (const host of SOLPLANET_HOSTS) {
        const url = `${host}${endpointStr}`;
        try {
          const response = await axios.get(url, {
            headers,
            timeout: 10000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          });

          results.push({
            endpoint: ep.label,
            host,
            status: response.status,
            headers: {
              'x-ca-error-message': response.headers['x-ca-error-message'],
              'x-ca-error-code': response.headers['x-ca-error-code'],
            },
            rawResponse: response.data,
          });
          break;
        } catch (err: any) {
          results.push({
            endpoint: ep.label,
            host,
            status: err.response?.status ?? null,
            headers: {
              'x-ca-error-message': err.response?.headers?.['x-ca-error-message'],
              'x-ca-error-code': err.response?.headers?.['x-ca-error-code'],
            },
            rawResponse: err.response?.data ?? null,
            error: err.message,
          });
        }
      }
    }

    const hasSuccess = results.some(r => r.status === 200 && r.rawResponse?.status === 200);

    return {
      credentials: {
        appKey: effectiveAppKey,
        appSecretPreview: effectiveAppSecret ? `${effectiveAppSecret.substring(0, 6)}...` : null,
        token: effectiveToken ? `${effectiveToken.substring(0, 6)}...` : null,
      },
      endpoints: results,
      recommendation: hasSuccess
        ? '✅ Conexão com a Solplanet Cloud (Singapore Cluster) estabelecida com sucesso!'
        : '⚠️ Verifique suas credenciais de acesso da API Solplanet.',
    };
  }

  /**
   * Lista dispositivos/inversores de uma planta pelo apikey (NMI) da usina.
   */
  async listDevicesForPlant(
    plantApiKey: string,
    appKey: string,
    appSecret: string,
    token: string,
  ): Promise<any[]> {
    try {
      const res = await this.makeRequest(
        '/pro/getDeviceListPro',
        {
          apikey: plantApiKey,
          token,
        },
        appKey,
        appSecret,
      );

      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
      return [];
    } catch (err: any) {
      this.logger.debug(`Erro em getDeviceListPro para apikey ${plantApiKey}: ${err.message}`);
      return [];
    }
  }

  /**
   * Descobre todas as usinas e todos os inversores da Solplanet.
   */
  async discoverSolplanetPlants(
    appKey: string,
    appSecret: string,
    token?: string,
    apiKey?: string,
  ): Promise<SolplanetDiscoveryResult> {
    const effectiveToken = token || process.env.SOLPLANET_TOKEN || 'N1YyRFB4aHF3T2tTTmJvMjZyNDF0QT09';
    const effectiveAppKey = appKey || process.env.SOLPLANET_APP_KEY || '205024856';
    const effectiveAppSecret = appSecret || process.env.SOLPLANET_API_KEY || 'QT3qSt0ntxTI8JminCull8p2066zCDnZ';

    try {
      const rawPlants = await this.listPlants(effectiveAppKey, effectiveAppSecret, effectiveToken);

      if (!rawPlants || rawPlants.length === 0) {
        return {
          totalPlants: 0,
          totalDevices: 0,
          plants: [],
          devices: [],
          error: 'Nenhuma usina encontrada na API Solplanet. Verifique as credenciais da conta.',
        };
      }

      const plants: any[] = [];
      const devices: any[] = [];

      for (const p of rawPlants) {
        const plantId = p.apikey || p.pid || p.id || '';
        const plantName = p.name || `Usina Solplanet ${plantId}`;
        const peakPower = parseFloat(p.totalpower || '0');

        const plantObj = {
          plantId,
          apikey: p.apikey,
          name: plantName,
          peakPower: peakPower > 100 ? peakPower / 1000 : peakPower, // Se vier em Watts (ex: 6000W -> 6.0kW)
          city: p.city || p.position || 'Tibau',
          state: 'RN',
          country: p.country ? 'Brasil' : 'Brasil',
          createDate: p.createdt || new Date().toISOString(),
          gpsLatitude: p.wd ? parseFloat(p.wd) : null,
          gpsLongitude: p.jd ? parseFloat(p.jd) : null,
          etoday: p.etoday !== undefined ? parseFloat(p.etoday) : null,
          etotal: p.etotal !== undefined ? parseFloat(p.etotal) : null,
          status: p.status === 1 ? 'ONLINE' : 'OFFLINE',
        };
        plants.push(plantObj);

        // Busca dispositivos (inversores / dataloggers) da usina
        if (p.apikey) {
          const devList = await this.listDevicesForPlant(p.apikey, effectiveAppKey, effectiveAppSecret, effectiveToken);
          let foundInverters = false;

          for (const d of devList) {
            if (d.inverters && Array.isArray(d.inverters)) {
              for (const inv of d.inverters) {
                if (inv.isn) {
                  foundInverters = true;
                  devices.push({
                    deviceSn: inv.isn,
                    dataloggerSn: d.psn,
                    plantId: p.apikey,
                    plantName: plantName,
                    model: 'Solplanet ASW Inverter',
                    status: inv.istate === 1 ? 'ONLINE' : 'OFFLINE',
                  });
                }
              }
            }
          }

          // Se não encontrou inversores em getDeviceListPro, cria referência pela própria usina
          if (!foundInverters) {
            devices.push({
              deviceSn: p.apikey,
              plantId: p.apikey,
              plantName: plantName,
              model: 'Solplanet Cloud Station',
              status: p.status === 1 ? 'ONLINE' : 'OFFLINE',
            });
          }
        }
      }

      return {
        totalPlants: plants.length,
        totalDevices: devices.length,
        plants,
        devices,
      };
    } catch (e: any) {
      this.logger.error(`Erro em discoverSolplanetPlants: ${e.message}`);
      return {
        totalPlants: 0,
        totalDevices: 0,
        plants: [],
        devices: [],
        error: e.message,
      };
    }
  }

  /**
   * Lê telemetria em tempo real de um inversor ou usina Solplanet.
   */
  async readUsinaFromCloud(
    identifier: string, // SN do inversor OU apikey da usina
    appKey: string,
    appSecret: string,
    token?: string,
    apiKey?: string,
  ): Promise<SolplanetReading | null> {
    if (!identifier) return null;

    const effectiveToken = token || process.env.SOLPLANET_TOKEN || 'N1YyRFB4aHF3T2tTTmJvMjZyNDF0QT09';
    const effectiveAppKey = appKey || process.env.SOLPLANET_APP_KEY || '205024856';
    const effectiveAppSecret = appSecret || process.env.SOLPLANET_API_KEY || 'QT3qSt0ntxTI8JminCull8p2066zCDnZ';

    try {
      // 1. Tenta ler telemetria em tempo real por SN do inversor via getLastTsDataPro
      const tsData = await this.makeRequest(
        '/pro/getLastTsDataPro',
        {
          isnos: identifier,
          token: effectiveToken,
        },
        effectiveAppKey,
        effectiveAppSecret,
      ).catch(() => null);

      if (tsData && tsData.status === 200 && tsData.data && Array.isArray(tsData.data) && tsData.data.length > 0) {
        const dev = tsData.data[0];
        const rawPac = parseFloat(dev.pac || '0');
        const powerKw = rawPac > 0 ? (rawPac > 100 ? rawPac / 1000 : rawPac) : 0;
        const rawEtd = parseFloat(dev.etd || '0');
        const etodayKwh = rawEtd > 0 ? rawEtd / 10 : 0; // unidade: 0.1 kWh
        const rawEto = parseFloat(dev.eto || '0');
        const etotalKwh = rawEto > 0 ? rawEto / 10 : 0; // unidade: 0.1 kWh
        const rawTemp = parseFloat(dev.cf || dev.tu || '0');
        const temp = rawTemp > 0 && rawTemp < 2000 ? rawTemp / 10 : null; // unidade: 0.1 °C

        return {
          powerNow: powerKw,
          generationToday: etodayKwh,
          generationTotal: etotalKwh,
          temperature: temp,
          status: (dev.currentState === 1 || dev.stu === '1' || powerKw > 0 || etodayKwh > 0) ? 'ONLINE' : 'OFFLINE',
        };
      }

      // 2. Tenta ler dados da usina por apikey (NMI) via getPlantOverviewPro
      const overview = await this.makeRequest(
        '/pro/getPlantOverviewPro',
        {
          apikey: identifier,
          token: effectiveToken,
        },
        effectiveAppKey,
        effectiveAppSecret,
      ).catch(() => null);

      if (overview && overview.status === 200 && overview.data) {
        const d = overview.data;
        let powerKw = 0;
        if (d.Power) {
          const val = parseFloat(d.Power.value || '0');
          powerKw = d.Power.unit === 'W' ? val / 1000 : val;
        }

        let etodayKwh = 0;
        if (d['E-Today']) {
          etodayKwh = parseFloat(d['E-Today'].value || '0');
        }

        let etotalKwh = 0;
        if (d['E-Total']) {
          const val = parseFloat(d['E-Total'].value || '0');
          etotalKwh = d['E-Total'].unit === 'MWh' ? val * 1000 : val;
        }

        return {
          powerNow: powerKw,
          generationToday: etodayKwh,
          generationTotal: etotalKwh,
          status: (d.status === '1' || d.status === 1 || powerKw > 0 || etodayKwh > 0) ? 'ONLINE' : 'OFFLINE',
        };
      }
    } catch (err: any) {
      this.logger.error(`Erro ao ler telemetria Solplanet (${identifier}): ${err.message}`);
    }

    return null;
  }
}

