import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import * as https from 'https';

export interface SolplanetReading {
  powerNow: number | null;
  generationToday: number | null;
  generationTotal: number | null;
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

// Hosts da API Solplanet Pro (AISWEI Cloud) — EU primeiro, depois global
const SOLPLANET_HOSTS = [
  'https://api.general.aisweicloud.com',
  'https://eu-api.general.aisweicloud.com',
  'https://api.aisweicloud.com',
];

@Injectable()
export class SolplanetService {
  private readonly logger = new Logger(SolplanetService.name);

  /**
   * Gera a assinatura HMAC-SHA256 para autenticação na API Aiswei/Solplanet Pro.
   *
   * Estrutura da string de assinatura (conforme documentação e implementações open-source):
   *   {METHOD}\n{Accept}\n\n{Content-Type}\n\nX-Ca-Key:{appKey}\n{endpoint_com_query_string}
   *
   * O endpoint assinado DEVE conter os parâmetros em ordem alfabética.
   */
  private generateSignature(
    endpoint: string, // path + query string ordenada alfabeticamente
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
      'X-Ca-Key': appKey,
      'X-Ca-Signature': signature,
    };
  }

  /**
   * Monta o path?query com parâmetros ordenados ALFABETICAMENTE (obrigatório pela API).
   * Parâmetros com valor vazio são incluídos somente se não forem opcionais.
   */
  private buildEndpoint(
    path: string,
    params: Record<string, string | undefined>
  ): string {
    // Remove chaves com valor undefined/null/vazio
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        clean[k] = v;
      }
    }

    // Ordenação alfabética das chaves (requisito Aiswei)
    const sorted = Object.keys(clean)
      .sort()
      .map(k => `${k}=${clean[k]}`)
      .join('&');

    return sorted ? `${path}?${sorted}` : path;
  }

  /**
   * Executa um GET autenticado na API Solplanet Pro, tentando os hosts em ordem.
   * Retorna o primeiro resultado bem-sucedido ou lança o último erro.
   */
  private async makeRequest(
    path: string,
    params: Record<string, string | undefined>,
    appKey: string,
    appSecret: string,
  ): Promise<any> {
    const endpoint = this.buildEndpoint(path, params);
    const headers = this.generateSignature(endpoint, appKey, appSecret);

    let lastError: any = null;
    let lastResponse: any = null;

    for (const host of SOLPLANET_HOSTS) {
      const url = `${host}${endpoint}`;
      try {
        this.logger.debug(`Solplanet → ${url}`);
        const response = await axios.get(url, {
          headers,
          timeout: 12000,
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });

        // Captura o header de erro da Aiswei API (presente em erros de auth)
        const apiError = response.headers?.['x-ca-error-message'] || response.headers?.['x-ca-error-code'];
        if (apiError) {
          this.logger.warn(`Solplanet X-Ca-Error em ${host}: ${apiError}`);
        }

        if (response.data !== undefined) {
          lastResponse = response.data;
          // Verifica se há sucesso real ou se é erro de autenticação
          if (response.data?.success === false || response.data?.code !== undefined && response.data?.code !== 0) {
            this.logger.warn(`Solplanet resposta com erro em ${host}: ${JSON.stringify(response.data)}`);
            // Continua tentando outros hosts
            continue;
          }
          return response.data;
        }
      } catch (err: any) {
        const apiErr = err.response?.headers?.['x-ca-error-message'] || err.response?.headers?.['x-ca-error-code'];
        lastError = {
          host,
          message: err.message,
          status: err.response?.status,
          apiError: apiErr,
          responseData: err.response?.data,
        };
        this.logger.warn(`Solplanet falhou em ${host}: ${err.message}${apiErr ? ` | X-Ca-Error: ${apiErr}` : ''}`);
      }
    }

    // Se chegou aqui, nenhum host respondeu com sucesso
    const errMsg = lastError
      ? `${lastError.message}${lastError.apiError ? ` | Erro API: ${lastError.apiError}` : ''}`
      : 'Sem resposta de nenhum host Solplanet';

    throw Object.assign(new Error(errMsg), { lastResponse, lastError });
  }

  /**
   * Lê dados em tempo real de um inversor Solplanet via Cloud API Pro.
   *
   * Parâmetros de credenciais conforme documentação Aiswei:
   *   - appKey    = ID da conta Pro (ex: "205024856")
   *   - appSecret = APP_SECRET ou API_KEY da conta
   *   - isnos     = Serial Number do inversor (ex: "AP001005P2482178")
   *
   * O campo "token" é opcional para algumas contas Pro. Se não disponível,
   * o sistema usa apikey como token (comportamento padrão da API pública).
   */
  async readUsinaFromCloud(
    inverterSn: string,
    appKey: string,
    appSecret: string,
    token?: string,
    apiKey?: string,
  ): Promise<SolplanetReading | null> {
    try {
      // Na API Solplanet Pro, apikey é o parâmetro de acesso ao inversor
      // token é o token de autenticação Pro (separado do apikey)
      const effectiveApiKey = apiKey || appSecret; // fallback: usa appSecret como apiKey

      // Tentativa 1: getInverterOverviewPro — dados em tempo real do inversor
      const overviewData = await this.makeRequest(
        '/pro/getInverterOverviewPro',
        {
          apikey: effectiveApiKey,
          isnos: inverterSn,
          ...(token ? { token } : {}),
        },
        appKey,
        appSecret,
      ).catch((err) => {
        this.logger.debug(`getInverterOverviewPro falhou: ${err.message}`);
        return null;
      });

      if (overviewData?.success && overviewData.data) {
        return this.parseOverviewData(overviewData.data);
      }

      // Tentativa 2: getLastTsDataPro — última telemetria
      const tsData = await this.makeRequest(
        '/pro/getLastTsDataPro',
        {
          apikey: effectiveApiKey,
          isnos: inverterSn,
          ...(token ? { token } : {}),
        },
        appKey,
        appSecret,
      ).catch(() => null);

      if (tsData?.success && tsData.data) {
        const list: any[] = Array.isArray(tsData.data) ? tsData.data : [tsData.data];
        const device = list.find((d: any) => d?.sn === inverterSn) || list[0];
        if (device) return this.parseDeviceData(device);
      }

      this.logger.warn(`Solplanet: nenhum dado retornado para SN ${inverterSn}. Conta pode precisar de liberação de API.`);
      return null;
    } catch (error: any) {
      this.logger.error(`Erro Solplanet API (SN ${inverterSn}): ${error.message}`);
      return null;
    }
  }

  private parseOverviewData(d: any): SolplanetReading {
    const pac = parseFloat(d.pac ?? d.power ?? '0');
    const etd = parseFloat(d.etoday ?? d.etd ?? '0');
    const eto = parseFloat(d.etotal ?? d.eto ?? '0');
    return {
      powerNow: isNaN(pac) ? null : (pac > 100 ? pac / 1000 : pac),
      generationToday: isNaN(etd) ? null : etd,
      generationTotal: isNaN(eto) ? null : eto,
      status: pac > 10 ? 'ONLINE' : 'OFFLINE',
    };
  }

  private parseDeviceData(device: any): SolplanetReading {
    const pac = parseFloat(device.pac ?? '0');
    const etd = parseFloat(device.etoday ?? device.etd ?? '0');
    const eto = parseFloat(device.etotal ?? device.eto ?? '0');
    return {
      powerNow: isNaN(pac) ? null : (pac > 100 ? pac / 1000 : pac),
      generationToday: isNaN(etd) ? null : etd,
      generationTotal: isNaN(eto) ? null : eto,
      status: pac > 10 ? 'ONLINE' : 'OFFLINE',
    };
  }

  /**
   * Lista todas as plantas/usinas da conta Solplanet Pro.
   *
   * IMPORTANTE: Este endpoint pode exigir liberação explícita pela Solplanet.
   * Se retornar vazio ou erro de permissão, entre em contato com:
   *   service.latam@solplanet.net — solicitar "liberação das interfaces de lista de plantas e dispositivos"
   */
  async listPlants(
    appKey: string,
    appSecret: string,
    token?: string,
    apiKey?: string,
  ): Promise<any[]> {
    const effectiveApiKey = apiKey || appSecret;

    try {
      const data = await this.makeRequest(
        '/pro/getPlanListPro',
        {
          apikey: effectiveApiKey,
          ...(token ? { token } : {}),
          // isnos não é incluído para listagem geral
        },
        appKey,
        appSecret,
      );

      if (data?.success) {
        const list = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);
        this.logger.log(`Solplanet: ${list.length} planta(s) encontrada(s).`);
        return list;
      }

      this.logger.warn(`Solplanet listPlants: resposta sem sucesso: ${JSON.stringify(data)}`);
      return [];
    } catch (error: any) {
      this.logger.error(`Erro ao listar plantas Solplanet: ${error.message}`);
      return [];
    }
  }

  /**
   * Descobre plantas e dispositivos Solplanet via API Pro.
   *
   * ATENÇÃO: NÃO há fallback de dados fictícios. Se a API falhar, retorna
   * resultado vazio com o erro real para diagnóstico correto.
   */
  async discoverSolplanetPlants(
    appKey: string,
    appSecret: string,
    token?: string,
    apiKey?: string,
  ): Promise<SolplanetDiscoveryResult> {
    const effectiveApiKey = apiKey || appSecret;

    try {
      const plantList = await this.listPlants(appKey, appSecret, token, apiKey);

      if (plantList && plantList.length > 0) {
        const plants = plantList.map(p => ({
          plantId: p.pid || p.id || p.plantId || String(Math.floor(Math.random() * 10000)),
          name: p.name || p.pname || `Usina Solplanet ${p.pid || ''}`,
          peakPower: p.peakPower || p.capacity || '0',
          city: p.city || '',
          createDate: p.createDate || new Date().toISOString(),
          gpsLatitude: p.lat || null,
          gpsLongitude: p.lng || null,
        }));

        const devices: any[] = [];
        for (const p of plantList) {
          const snList = p.snList || p.inverterList || [];
          if (Array.isArray(snList) && snList.length > 0) {
            snList.forEach((snObj: any) => {
              const sn = typeof snObj === 'string' ? snObj : (snObj.sn || snObj.isno);
              if (sn) {
                devices.push({
                  deviceSn: sn,
                  plantId: p.pid || p.id || '',
                  plantName: p.name || p.pname || 'Usina Solplanet',
                  model: snObj.model || 'Solplanet ASW Series',
                  status: 1,
                });
              }
            });
          } else if (p.sn || p.isno) {
            devices.push({
              deviceSn: p.sn || p.isno,
              plantId: p.pid || p.id || '',
              plantName: p.name || p.pname || 'Usina Solplanet',
              model: 'Solplanet ASW Series',
              status: 1,
            });
          }
        }

        return { totalPlants: plants.length, totalDevices: devices.length, plants, devices };
      }

      // API retornou lista vazia — pode ser conta sem liberação
      return {
        totalPlants: 0,
        totalDevices: 0,
        plants: [],
        devices: [],
        error: 'A API Solplanet retornou lista vazia. Verifique se a conta tem acesso à API Pro. ' +
               'Se necessário, solicite liberação em: service.latam@solplanet.net',
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
   * Diagnóstico completo da API Solplanet.
   * Retorna o JSON bruto de cada endpoint para inspeção e depuração.
   */
  async diagnose(appKey: string, appSecret: string, token?: string, apiKey?: string): Promise<{
    credentials: any;
    endpoints: { endpoint: string; host: string; status: number | null; headers?: any; rawResponse: any; error?: string }[];
    recommendation: string;
  }> {
    const effectiveApiKey = apiKey || appSecret;
    const endpoints = [
      {
        path: '/pro/getPlanListPro',
        params: { apikey: effectiveApiKey, ...(token ? { token } : {}) },
        label: 'Lista de Plantas (getPlanListPro)',
      },
      {
        path: '/pro/getInverterOverviewPro',
        params: { apikey: effectiveApiKey, isnos: 'TEST_SN', ...(token ? { token } : {}) },
        label: 'Overview Inversor (getInverterOverviewPro)',
      },
    ];

    const results: any[] = [];

    for (const ep of endpoints) {
      const endpointStr = this.buildEndpoint(ep.path, ep.params as any);
      const headers = this.generateSignature(endpointStr, appKey, appSecret);

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
          break; // Usa o primeiro host que responder (qualquer resposta)
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

    // Analisa os resultados para dar recomendação
    const hasAuth = results.some(r => r.rawResponse?.success === true || r.status === 200 && !r.error);
    const hasAppKeyError = results.some(r =>
      r.headers?.['x-ca-error-message']?.toLowerCase().includes('appkey') ||
      r.headers?.['x-ca-error-message']?.toLowerCase().includes('invalid') ||
      r.rawResponse?.errorMsg?.toLowerCase().includes('appkey')
    );

    let recommendation = '';
    if (hasAuth) {
      recommendation = '✅ Autenticação OK. Se a lista de plantas está vazia, solicite liberação da interface em service.latam@solplanet.net';
    } else if (hasAppKeyError) {
      recommendation = '❌ Erro de AppKey inválida. Verifique se appKey = ID da conta (ex: 205024856) e appSecret = API Key correta.';
    } else {
      recommendation = '⚠️ Não foi possível conectar. Verifique conectividade e credenciais. Se o erro persistir, contate service.latam@solplanet.net solicitando liberação de API Pro.';
    }

    return {
      credentials: {
        appKey,
        appSecretPreview: appSecret ? `${appSecret.substring(0, 6)}...${appSecret.slice(-4)}` : null,
        token: token ? `${token.substring(0, 6)}...` : null,
        apiKey: apiKey ? `${apiKey.substring(0, 6)}...` : null,
      },
      endpoints: results,
      recommendation,
    };
  }
}
