import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface GoodWeReading {
  powerNow: number | null;
  generationToday: number | null;
  generationTotal: number | null;
  temperature?: number | null;
  status: string;
}

export interface GoodWeDiscoveryResult {
  totalPlants: number;
  totalDevices: number;
  plants: any[];
  devices: any[];
  error?: string;
  rawResponse?: any;
}

const GOODWE_BASE_URLS = [
  'https://www.semsportal.com',
  'https://us-xxzx.semsportal.com',
  'https://eu-xxzx.semsportal.com',
  'https://globalapi.semsportal.com',
];

@Injectable()
export class GoodWeService {
  private readonly logger = new Logger(GoodWeService.name);
  private tokenCache = new Map<string, { token: any; expiresAt: number; clusterUrl: string }>();

  /**
   * Constrói o cabeçalho 'token' exigido pela API GoodWe SEMS Portal.
   */
  private getHeaderToken(uid?: string, token?: string): string {
    return JSON.stringify({
      version: 'v2.1.0',
      client: 'ios',
      language: 'en',
      timestamp: Date.now(),
      uid: uid || '',
      token: token || '',
    });
  }

  /**
   * Realiza login no GoodWe SEMS Portal (CrossLogin).
   */
  async login(account: string, passwordOrSecret: string): Promise<{ uid: string; token: string; clusterUrl: string } | null> {
    const cacheKey = `${account}_${passwordOrSecret}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { uid: cached.token.uid, token: cached.token.token, clusterUrl: cached.clusterUrl };
    }

    const payload = {
      account,
      pwd: passwordOrSecret,
    };

    for (const baseUrl of GOODWE_BASE_URLS) {
      try {
        const response = await axios.post(`${baseUrl}/api/v2/Common/CrossLogin`, payload, {
          headers: {
            'Content-Type': 'application/json',
            'token': this.getHeaderToken(),
          },
          timeout: 8000,
        });

        const data = response.data;
        if (data && !data.hasError && data.data && data.data.token) {
          const uid = data.data.uid;
          const token = data.data.token;
          const clusterUrl = data.components?.msgSocketAdr || baseUrl;

          this.logger.log(`✅ Login GoodWe efetuado com sucesso para ${account}`);
          this.tokenCache.set(cacheKey, {
            token: { uid, token },
            expiresAt: Date.now() + 60 * 60 * 1000, // 1 hora de cache
            clusterUrl,
          });

          return { uid, token, clusterUrl };
        } else if (data && data.components?.msgSocketAdr && data.components.msgSocketAdr !== baseUrl) {
          // Tenta no servidor regional retornado
          const targetUrl = data.components.msgSocketAdr;
          this.logger.debug(`Redirecionando login GoodWe para servidor regional: ${targetUrl}`);
          try {
            const res2 = await axios.post(`${targetUrl}/api/v2/Common/CrossLogin`, payload, {
              headers: {
                'Content-Type': 'application/json',
                'token': this.getHeaderToken(),
              },
              timeout: 8000,
            });
            if (res2.data && !res2.data.hasError && res2.data.data && res2.data.data.token) {
              const uid = res2.data.data.uid;
              const token = res2.data.data.token;
              this.tokenCache.set(cacheKey, {
                token: { uid, token },
                expiresAt: Date.now() + 60 * 60 * 1000,
                clusterUrl: targetUrl,
              });
              return { uid, token, clusterUrl: targetUrl };
            }
          } catch (err2: any) {
            this.logger.warn(`Erro na tentativa secundária em ${targetUrl}: ${err2.message}`);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Tentativa de login GoodWe falhou em ${baseUrl}: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Diagnóstico completo das credenciais da GoodWe SEMS+ API.
   */
  async diagnose(
    account?: string,
    clientId?: string,
    clientSecret?: string
  ): Promise<{
    credentials: any;
    loginResult: any;
    stationListResult: any;
    recommendation: string;
  }> {
    const effAccount = account || 'setesolarseg@gmail.com';
    const effClientId = clientId || 'setesolarseg@gmail.com';
    const effSecret = clientSecret || '120687@Eli';

    this.logger.log(`🔍 Executando diagnóstico GoodWe para conta: ${effAccount}...`);

    let loginRes: any = null;
    let stationListRes: any = null;

    // Tenta CrossLogin com a conta e secret / password
    try {
      const loginObj = await this.login(effAccount, effSecret);
      if (loginObj) {
        loginRes = { status: 'SUCCESS', ...loginObj };

        // Tenta buscar lista de plantas
        stationListRes = await this.listPlants(loginObj.uid, loginObj.token, loginObj.clusterUrl);
      } else {
        // Tenta também com clientId
        const loginObj2 = await this.login(effClientId, effSecret);
        if (loginObj2) {
          loginRes = { status: 'SUCCESS_VIA_CLIENT_ID', ...loginObj2 };
          stationListRes = await this.listPlants(loginObj2.uid, loginObj2.token, loginObj2.clusterUrl);
        } else {
          loginRes = {
            status: 'AUTH_FAILED',
            message: 'Não foi possível autenticar no SEMS Portal usando o usuário/e-mail e senha informados.',
            hint: 'Verifique se o e-mail (setesolarseg@gmail.com) e a senha no SEMS Portal estão corretos.',
          };
        }
      }
    } catch (e: any) {
      loginRes = { status: 'ERROR', message: e.message };
    }

    const isOk = loginRes && (loginRes.status === 'SUCCESS' || loginRes.status === 'SUCCESS_VIA_CLIENT_ID');

    return {
      credentials: {
        account: effAccount,
        company: 'SETE SOLAR ENERGIA',
        clientIdPreview: effClientId ? `${effClientId.substring(0, 8)}...` : null,
        clientSecretPreview: effSecret ? `${effSecret.substring(0, 8)}...` : null,
      },
      loginResult: loginRes,
      stationListResult: stationListRes,
      recommendation: isOk
        ? '✅ Conexão com o GoodWe SEMS Portal estabelecida com sucesso!'
        : '⚠️ As credenciais foram registradas no sistema. Se o status retornar erro de autenticação, verifique o e-mail ou a senha no SEMS Portal.',
    };
  }

  /**
   * Lista todas as plantas/usinas da conta GoodWe SEMS Portal.
   */
  async listPlants(uid: string, token: string, clusterUrl = 'https://www.semsportal.com'): Promise<any[]> {
    try {
      const headerToken = this.getHeaderToken(uid, token);
      const res = await axios.post(
        `${clusterUrl}/api/v2/PowerStation/GetPowerStationList`,
        { page_index: 1, page_size: 100 },
        {
          headers: {
            'Content-Type': 'application/json',
            'token': headerToken,
          },
          timeout: 10000,
        }
      );

      if (res.data && res.data.data && Array.isArray(res.data.data.list)) {
        return res.data.data.list;
      }
      return [];
    } catch (err: any) {
      this.logger.error(`Erro ao listar plantas GoodWe em ${clusterUrl}: ${err.message}`);
      return [];
    }
  }

  /**
   * Lê telemetria de uma planta ou inversor GoodWe.
   */
  async readUsinaFromCloud(
    stationIdOrSn: string,
    account = 'setesolarseg@gmail.com',
    clientSecret = '120687@Eli'
  ): Promise<GoodWeReading | null> {
    try {
      const loginObj = await this.login(account, clientSecret);
      if (!loginObj) return null;

      const headerToken = this.getHeaderToken(loginObj.uid, loginObj.token);

      // Tenta obter os detalhes de monitoramento por Station ID
      const res = await axios.post(
        `${loginObj.clusterUrl}/api/v2/PowerStation/GetMonitorDetailByPowerstationId`,
        { powerStationId: stationIdOrSn },
        {
          headers: {
            'Content-Type': 'application/json',
            'token': headerToken,
          },
          timeout: 10000,
        }
      );

      if (res.data && res.data.data) {
        const d = res.data.data;
        const kwhToday = parseFloat(d.kwh_actual || d.etoday || '0');
        const kwhTotal = parseFloat(d.kwh_total || d.etotal || '0');
        const powerKw = parseFloat(d.pac || d.power || '0') / 1000;

        return {
          powerNow: powerKw > 0 ? powerKw : null,
          generationToday: kwhToday > 0 ? kwhToday : null,
          generationTotal: kwhTotal > 0 ? kwhTotal : null,
          status: powerKw > 0 || kwhToday > 0 ? 'ONLINE' : 'OFFLINE',
        };
      }
    } catch (err: any) {
      this.logger.error(`Erro ao ler usina GoodWe (${stationIdOrSn}): ${err.message}`);
    }

    return null;
  }
}
