import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

export interface SolplanetReading {
  powerNow: number | null;
  generationToday: number | null;
  generationTotal: number | null;
  status: string;
}

@Injectable()
export class SolplanetService {
  private readonly logger = new Logger(SolplanetService.name);
  private readonly baseUrl = 'https://api.general.aisweicloud.com';

  private generateSignature(
    method: string,
    path: string,
    queryParams: Record<string, string>,
    appKey: string,
    appSecret: string
  ): { signature: string; headers: Record<string, string> } {
    const accept = 'application/json';
    const contentType = 'application/json';
    const contentMD5 = '';
    const date = '';

    // Ordenar parâmetros alfabeticamente
    const sortedKeys = Object.keys(queryParams).sort();
    const sortedQueryString = sortedKeys
      .map(key => `${key}=${queryParams[key]}`)
      .join('&');

    const pathAndParams = sortedQueryString ? `${path}?${sortedQueryString}` : path;

    // String de cabeçalhos assinados (X-Ca-Key é obrigatório)
    const signedHeaders = `X-Ca-Key:${appKey}`;
    const stringToSign = `${method}\n${accept}\n${contentMD5}\n${contentType}\n${date}\n${signedHeaders}\n${pathAndParams}`;

    // Gerar a assinatura HMAC-SHA256 em Base64
    const signature = crypto
      .createHmac('sha256', appSecret)
      .update(stringToSign)
      .digest('base64');

    return {
      signature,
      headers: {
        'Accept': accept,
        'Content-Type': contentType,
        'X-Ca-Key': appKey,
        'X-Ca-Signature-Headers': 'X-Ca-Key',
        'X-Ca-Signature': signature,
      }
    };
  }

  async readUsinaFromCloud(
    deviceSn: string,
    appKey: string,
    appSecret: string,
    token: string
  ): Promise<SolplanetReading | null> {
    try {
      const path = '/getInverter';
      const queryParams = {
        isnos: deviceSn,
        token: token,
      };

      const { headers } = this.generateSignature('POST', path, queryParams, appKey, appSecret);

      this.logger.debug(`Requisitando Solplanet API para SN ${deviceSn}...`);

      const response = await axios.post(`${this.baseUrl}${path}`, {}, {
        params: queryParams,
        headers: headers,
        timeout: 10000,
      });

      if (response.data && (response.data.status === 200 || response.data.status === '200')) {
        const resultList = response.data.data?.result || [];
        const inverterData = resultList.find((inv: any) => inv.sn === deviceSn) || resultList[0];

        if (inverterData) {
          const pac = parseFloat(inverterData.pac);
          const etd = parseFloat(inverterData.etd);
          const eto = parseFloat(inverterData.eto);

          return {
            powerNow: isNaN(pac) ? null : (pac > 100 ? pac / 1000 : pac), // Converte W para kW se > 100
            generationToday: isNaN(etd) ? null : etd,
            generationTotal: isNaN(eto) ? null : eto,
            status: pac > 10 ? 'ONLINE' : 'OFFLINE',
          };
        }
      } else {
        this.logger.error(`Erro da API Solplanet: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      const errMsg = error.response?.headers?.['x-ca-error-message'] || error.message;
      this.logger.error(`Erro ao buscar dados do device ${deviceSn} via Solplanet API: ${errMsg}`);
    }
    return null;
  }
}
