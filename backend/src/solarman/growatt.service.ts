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

@Injectable()
export class GrowattService {
  private readonly logger = new Logger(GrowattService.name);
  private readonly baseUrl = 'https://openapi.growatt.com';

  private getHeaders(): Record<string, string> {
    const token = process.env.GROWATT_API_TOKEN || '82774gx5t68b8zdei81ux6ov3t5rd4k1';
    return {
      'token': token,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'NestJS Growatt API Client',
    };
  }

  async readUsinaFromCloud(deviceSn: string, deviceType: string = 'inv'): Promise<GrowattReading | null> {
    try {
      const headers = this.getHeaders();
      const body = qs.stringify({
        deviceType,
        deviceSn,
      });

      const response = await axios.post(
        `${this.baseUrl}/v4/new-api/queryLastData`,
        body,
        { headers }
      );

      if (response.data && response.data.code === 0 && response.data.data) {
        // A API da Growatt retorna os dados indexados pelo SN do aparelho
        const snData = response.data.data[deviceSn];
        if (snData) {
          // Extrai o pac (Output power (W)) e converte para kW
          const powerNow = snData.pac !== undefined && snData.pac !== null
            ? parseFloat(snData.pac) / 1000 
            : null;

          // Extrai o powerToday (Power generated today (kWh))
          const generationToday = snData.powerToday !== undefined && snData.powerToday !== null
            ? parseFloat(snData.powerToday) 
            : null;

          // Extrai o powerTotal (Total power generated (kWh))
          const generationTotal = snData.powerTotal !== undefined && snData.powerTotal !== null
            ? parseFloat(snData.powerTotal) 
            : null;

          // Extrai a temperatura do inversor (°C)
          const temperature = snData.temperature !== undefined && snData.temperature !== null
            ? parseFloat(snData.temperature) 
            : null;

          // Define status baseado na chave status do Growatt (0: Waiting, 1: Normal, 3: Fault) ou lost: true
          const rawStatus = snData.status;
          let status: 'ONLINE' | 'OFFLINE' | 'FAULT' = 'ONLINE';
          
          if (rawStatus === 3) {
            status = 'FAULT';
          } else if (snData.lost === true || snData.lost === 'true') {
            status = 'OFFLINE';
          }

          return {
            powerNow,
            generationToday,
            generationTotal,
            temperature,
            status,
          };
        }
      } else {
        this.logger.warn(`Erro na resposta da Growatt API para ${deviceSn}: ${JSON.stringify(response.data)}`);
      }
    } catch (err: any) {
      this.logger.error(`Erro ao buscar dados do device ${deviceSn} via Growatt API:`, err.message);
    }
    return null;
  }
}
