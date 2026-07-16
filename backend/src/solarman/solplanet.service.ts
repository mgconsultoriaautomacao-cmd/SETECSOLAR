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

@Injectable()
export class SolplanetService {
  private readonly logger = new Logger(SolplanetService.name);

  // Host EU (Europa/Internacional) - conforme documentação oficial (github.com/PatMan6889/AISWEI-Solplanet-Cloud-API)
  private readonly baseUrl = 'https://eu-api-genergal.aisweicloud.com';

  /**
   * Gera a assinatura HMAC-SHA256 para autenticação na API Aiswei/Solplanet.
   * Baseado na implementação oficial: github.com/PatMan6889/AISWEI-Solplanet-Cloud-API
   *
   * String to sign: "{METHOD}\n{Accept}\n\n{Content-Type}\n\nX-Ca-Key:{appKey}\n{path}?{sorted_params}"
   */
  private generateSignature(
    endpoint: string, // path + query string já montada e ordenada
    appKey: string,
    appSecret: string
  ): Record<string, string> {
    const method = 'GET';
    const accept = 'application/json';
    const contentType = 'application/json; charset=UTF-8';

    // String to sign exatamente como na lib Python oficial
    const stringToSign = `${method}\n${accept}\n\n${contentType}\n\nX-Ca-Key:${appKey}\n${endpoint}`;

    const signature = crypto
      .createHmac('sha256', appSecret)
      .update(stringToSign)
      .digest('base64');

    return {
      'User-Agent': 'app 1.0',
      'Content-Type': contentType,
      'Accept': accept,
      'X-Ca-Signature-Headers': 'X-Ca-Key',
      'X-Ca-Key': appKey,
      'X-Ca-Signature': signature,
    };
  }

  /**
   * Monta o endpoint com os parâmetros obrigatórios e os ordena alfabeticamente.
   * Conforme documentação: apikey, token e isnos são adicionados a cada request.
   */
  private buildEndpoint(
    path: string,
    baseParams: Record<string, string>,
    apiKey: string,
    token: string,
    inverterSn: string
  ): string {
    // Parâmetros obrigatórios em todos os requests
    const allParams: Record<string, string> = {
      ...baseParams,
      apikey: apiKey,
      token: token,
      isnos: inverterSn,
    };

    // Ordenar alfabeticamente (requisito da API)
    const sorted = Object.keys(allParams)
      .sort()
      .map(k => `${k}=${allParams[k]}`)
      .join('&');

    return `${path}?${sorted}`;
  }

  /**
   * Faz um request GET para a API Solplanet Pro.
   */
  private async makeRequest(
    path: string,
    baseParams: Record<string, string>,
    appKey: string,
    appSecret: string,
    apiKey: string,
    token: string,
    inverterSn: string
  ): Promise<any> {
    const endpoint = this.buildEndpoint(path, baseParams, apiKey, token, inverterSn);
    const headers = this.generateSignature(endpoint, appKey, appSecret);
    const url = `${this.baseUrl}${endpoint}`;

    this.logger.debug(`Solplanet request: ${url}`);

    const response = await axios.get(url, {
      headers,
      timeout: 15000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    return response.data;
  }

  /**
   * Lê os dados da usina/inversor via Solplanet Pro Cloud API.
   *
   * @param inverterSn - Serial number do INVERSOR (ex: AP001005P2482178), NÃO do WiFi Stick
   * @param appKey     - APP_KEY da conta Pro (ex: 205024856)
   * @param appSecret  - APP_SECRET da conta Pro
   * @param apiKey     - API_KEY específico do inversor
   * @param token      - Token Pro da conta
   */
  async readUsinaFromCloud(
    inverterSn: string,
    appKey: string,
    appSecret: string,
    token: string,
    apiKey?: string,
  ): Promise<SolplanetReading | null> {
    try {
      // Usar apiKey se fornecido, senão usar token como fallback
      const effectiveApiKey = apiKey || token;

      // 3.12 - getInverterOverviewPro: dados em tempo real do inversor
      const overviewData = await this.makeRequest(
        '/pro/getInverterOverviewPro',
        {},
        appKey,
        appSecret,
        effectiveApiKey,
        token,
        inverterSn,
      ).catch(() => null);

      if (overviewData?.success && overviewData.data) {
        const d = overviewData.data;
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

      // Fallback: 3.7 - getLastTsDataPro: últimos dados de telemetria
      const tsData = await this.makeRequest(
        '/pro/getLastTsDataPro',
        {},
        appKey,
        appSecret,
        effectiveApiKey,
        token,
        inverterSn,
      ).catch(() => null);

      if (tsData?.success) {
        const list: any[] = Array.isArray(tsData.data) ? tsData.data : [tsData.data];
        const device = list.find((d: any) => d?.sn === inverterSn) || list[0];

        if (device) {
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
      }

      // Fallback: 3.2 - getPlantOverviewPro: visão geral da planta
      const plantData = await this.makeRequest(
        '/pro/getPlantOverviewPro',
        {},
        appKey,
        appSecret,
        effectiveApiKey,
        token,
        inverterSn,
      ).catch(() => null);

      if (plantData?.success && plantData.data) {
        const d = plantData.data;
        const power = parseFloat(d.power ?? '0');
        const etoday = parseFloat(d.etoday ?? '0');
        const etotal = parseFloat(d.etotal ?? '0');

        return {
          powerNow: isNaN(power) ? null : power,
          generationToday: isNaN(etoday) ? null : etoday,
          generationTotal: isNaN(etotal) ? null : etotal,
          status: power > 0 ? 'ONLINE' : 'OFFLINE',
        };
      }

      this.logger.warn(`Solplanet Pro API: nenhum dado retornado para SN ${inverterSn}`);
      return null;
    } catch (error: any) {
      const errMsg =
        error.response?.headers?.['x-ca-error-message'] ||
        error.response?.data?.errorMsg ||
        error.message;
      this.logger.error(`Erro Solplanet API (SN ${inverterSn}): ${errMsg}`);
      return null;
    }
  }

  /**
   * Lista todas as usinas/plantas da conta Pro.
   * Útil para descobrir os serial numbers dos inversores disponíveis.
   */
  async listPlants(
    appKey: string,
    appSecret: string,
    token: string,
    apiKey?: string,
  ): Promise<any[]> {
    try {
      const effectiveApiKey = apiKey || token;
      const data = await this.makeRequest(
        '/pro/getPlanListPro',
        {},
        appKey,
        appSecret,
        effectiveApiKey,
        token,
        '', // isnos pode ser vazio para listagem geral
      );
      if (data?.success) {
        return Array.isArray(data.data) ? data.data : [data.data];
      }
    } catch (error: any) {
      this.logger.error(`Erro ao listar plantas Solplanet: ${error.message}`);
    }
    return [];
  }
}
