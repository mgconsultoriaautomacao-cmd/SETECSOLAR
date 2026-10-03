import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

export interface GoodWeReading {
  powerNow: number | null;
  generationToday: number | null;
  generationTotal: number | null;
  temperature?: number | null;
  status: string;
}

export interface GoodWeStation {
  id: string;
  name: string;
  pSystem: number; // kW instantâneo
  productionToday: number; // kWh hoje
  installedPower: number; // kWp instalado
  pvInstallP: number;
  latitude: number | null;
  longitude: number | null;
  googleAddress: string;
  status: number;
  inverterSns: string[];
  dongleSns: string[];
  raw?: any;
}

export interface GoodWeDiscoveryResult {
  totalPlants: number;
  totalDevices: number;
  plants: any[];
  devices: any[];
  error?: string;
  rawResponse?: any;
}

const SEMS_PLUS_LOGIN_URL = 'https://semsplus.goodwe.com/web/sems/sems-user/api/v1/auth/cross-login';
const DEFAULT_GATEWAY_URL = 'https://us-gateway.semsportal.com/web/sems';
const WEB_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

@Injectable()
export class GoodWeService {
  private readonly logger = new Logger(GoodWeService.name);
  private tokenCache = new Map<string, { tokenObj: any; expiresAt: number; gatewayUrl: string }>();

  /**
   * Constrói a assinatura SHA256 base64 exigida pela API SEMS+.
   */
  private generateSignature(tokenObj?: any): string {
    const timestamp = Date.now();
    const uid = tokenObj?.uid || '';
    const tok = tokenObj?.token || '';
    const digest = crypto
      .createHash('sha256')
      .update(`${timestamp}@${uid}@${tok}`)
      .digest('hex');
    return Buffer.from(`${digest}@${timestamp}`).toString('base64');
  }

  /**
   * Realiza login no GoodWe SEMS+ Portal.
   */
  async login(
    account = 'setecsolarseg@gmail.com',
    passwordOrSecret = 'Admin@123'
  ): Promise<{ uid: string; token: string; gatewayUrl: string; tokenObj: any } | null> {
    const cacheKey = `${account}_${passwordOrSecret}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        uid: cached.tokenObj.uid,
        token: cached.tokenObj.token,
        gatewayUrl: cached.gatewayUrl,
        tokenObj: cached.tokenObj,
      };
    }

    // A senha no SEMS+ é enviada como Base64 do hash MD5 da senha pura
    const pwdHash = crypto.createHash('md5').update(passwordOrSecret).digest('hex');
    const pwdEncoded = Buffer.from(pwdHash).toString('base64');

    const emptyTokenHeader = JSON.stringify({
      uid: '',
      timestamp: 0,
      token: '',
      client: 'semsPlusWeb',
      version: '',
      language: 'en',
    });

    try {
      this.logger.log(`Conectando ao GoodWe SEMS+ para conta: ${account}...`);
      const response = await axios.post(
        SEMS_PLUS_LOGIN_URL,
        {
          account,
          pwd: pwdEncoded,
          agreement: 1,
          isChinese: false,
          isLocal: false,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://semsplus.goodwe.com',
            'Referer': 'https://semsplus.goodwe.com/',
            'Token': emptyTokenHeader,
            'X-Signature': this.generateSignature({}),
            'User-Agent': WEB_USER_AGENT,
          },
          timeout: 10000,
        }
      );

      const body = response.data;
      if (body && (body.code === '00000' || body.code === 0 || body.code === '0') && body.data) {
        const tokenObj = body.data;
        const gatewayUrl = tokenObj.api || DEFAULT_GATEWAY_URL;

        this.logger.log(`✅ Login GoodWe SEMS+ efetuado com sucesso para ${account} (Gateway: ${gatewayUrl})`);
        this.tokenCache.set(cacheKey, {
          tokenObj,
          expiresAt: Date.now() + 2 * 60 * 60 * 1000, // 2 horas de cache
          gatewayUrl,
        });

        return {
          uid: tokenObj.uid,
          token: tokenObj.token,
          gatewayUrl,
          tokenObj,
        };
      } else {
        this.logger.warn(`Falha na resposta de login GoodWe SEMS+: ${JSON.stringify(body)}`);
      }
    } catch (err: any) {
      this.logger.error(`Erro ao logar no GoodWe SEMS+: ${err.message}`);
    }

    return null;
  }

  /**
   * Helper para criar cabeçalhos autenticados do SEMS+.
   */
  private getAuthHeaders(tokenObj: any) {
    const tokenHeader = JSON.stringify({
      uid: tokenObj.uid,
      timestamp: tokenObj.timestamp,
      token: tokenObj.token,
      client: tokenObj.client || 'semsPlusWeb',
      version: '',
      language: 'en',
    });

    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Token': tokenHeader,
      'X-Signature': this.generateSignature(tokenObj),
      'User-Agent': WEB_USER_AGENT,
    };
  }

  /**
   * Lista todas as plantas/estações com dados de produção e dispositivos da conta GoodWe.
   */
  async listStationsWithDevices(
    account = 'setecsolarseg@gmail.com',
    passwordOrSecret = 'Admin@123'
  ): Promise<GoodWeStation[]> {
    const loginRes = await this.login(account, passwordOrSecret);
    if (!loginRes) return [];

    const { gatewayUrl, tokenObj } = loginRes;
    const headers = this.getAuthHeaders(tokenObj);

    try {
      const res = await axios.post(
        `${gatewayUrl}/sems-plant/api/stations/page`,
        { pageIndex: 1, pageSize: 100 },
        { headers, timeout: 12000 }
      );

      const dataList = res.data?.data?.dataList;
      if (!Array.isArray(dataList)) {
        this.logger.warn(`Nenhuma usina encontrada no retorno do SEMS+: ${JSON.stringify(res.data)}`);
        return [];
      }

      const stations: GoodWeStation[] = [];

      for (const st of dataList) {
        let inverterSns: string[] = [];
        let dongleSns: string[] = [];

        // Busca dispositivos (inversores e dongles) da estação
        try {
          const devRes = await axios.get(
            `${gatewayUrl}/sems-plant/api/stations/device/all-status?stationId=${st.id}`,
            { headers, timeout: 8000 }
          );

          const devList = devRes.data?.data?.deviceDetailList || [];
          for (const group of devList) {
            if (group.deviceType === 'INVERTER') {
              for (const statusObj of group.statusDetailList || []) {
                if (Array.isArray(statusObj.snList)) {
                  inverterSns.push(...statusObj.snList);
                }
              }
            } else if (group.deviceType === 'DONGLE') {
              for (const statusObj of group.statusDetailList || []) {
                if (Array.isArray(statusObj.snList)) {
                  dongleSns.push(...statusObj.snList);
                }
              }
            }
          }
        } catch (devErr: any) {
          this.logger.warn(`Erro ao buscar dispositivos da estação ${st.name} (${st.id}): ${devErr.message}`);
        }

        stations.push({
          id: st.id,
          name: st.name,
          pSystem: typeof st.pSystem === 'number' ? st.pSystem : parseFloat(st.pSystem || '0'),
          productionToday: typeof st.productionToday === 'number' ? st.productionToday : parseFloat(st.productionToday || '0'),
          installedPower: typeof st.installedPower === 'number' ? st.installedPower : parseFloat(st.installedPower || '0'),
          pvInstallP: typeof st.pvInstallP === 'number' ? st.pvInstallP : parseFloat(st.pvInstallP || '0'),
          latitude: st.latitude ? parseFloat(st.latitude) : null,
          longitude: st.longitude ? parseFloat(st.longitude) : null,
          googleAddress: st.googleAddress || '',
          status: st.status ?? 1,
          inverterSns,
          dongleSns,
          raw: st,
        });
      }

      return stations;
    } catch (err: any) {
      this.logger.error(`Erro ao listar usinas GoodWe SEMS+: ${err.message}`);
      return [];
    }
  }

  /**
   * Diagnóstico completo das credenciais da GoodWe SEMS+.
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
    const effAccount = account || 'setecsolarseg@gmail.com';
    const effSecret = clientSecret || 'Admin@123';

    this.logger.log(`🔍 Executando diagnóstico GoodWe SEMS+ para conta: ${effAccount}...`);

    let loginRes: any = null;
    let stationListRes: any = null;

    try {
      const loginObj = await this.login(effAccount, effSecret);
      if (loginObj) {
        loginRes = {
          status: 'SUCCESS',
          uid: loginObj.uid,
          gatewayUrl: loginObj.gatewayUrl,
        };

        const stations = await this.listStationsWithDevices(effAccount, effSecret);
        stationListRes = {
          total: stations.length,
          stations: stations.map(s => ({
            id: s.id,
            name: s.name,
            powerKw: s.pSystem,
            todayKwh: s.productionToday,
            inverters: s.inverterSns,
            dongles: s.dongleSns,
            address: s.googleAddress,
          })),
        };
      } else {
        loginRes = {
          status: 'AUTH_FAILED',
          message: 'Não foi possível autenticar no GoodWe SEMS+ Portal.',
          hint: 'Verifique se o e-mail e a senha no portal SEMS+ estão corretos.',
        };
      }
    } catch (e: any) {
      loginRes = { status: 'ERROR', message: e.message };
    }

    const isOk = loginRes && loginRes.status === 'SUCCESS';

    return {
      credentials: {
        account: effAccount,
        company: 'SETE SOLAR ENERGIA',
        hasPassword: !!effSecret,
      },
      loginResult: loginRes,
      stationListResult: stationListRes,
      recommendation: isOk
        ? `✅ Conexão GoodWe SEMS+ 100% OK! ${stationListRes?.total || 0} usina(s) encontradas.`
        : '⚠️ Falha na autenticação GoodWe. Verifique o usuário e senha da conta SEMS+.',
    };
  }

  /**
   * Lê telemetria de uma usina GoodWe por ID da Estação, SN do Inversor ou SN do Dongle.
   */
  async readUsinaFromCloud(
    stationIdOrSn: string,
    account = 'setecsolarseg@gmail.com',
    passwordOrSecret = 'Admin@123'
  ): Promise<GoodWeReading | null> {
    if (!stationIdOrSn) return null;

    const cleanQuery = stationIdOrSn.trim().toLowerCase();

    try {
      const stations = await this.listStationsWithDevices(account, passwordOrSecret);
      if (!stations || stations.length === 0) return null;

      // 1. Procura por ID exato da estação, ou nome, ou SN do inversor, ou SN do dongle
      const matched = stations.find(s => {
        if (s.id.toLowerCase() === cleanQuery) return true;
        if (s.name.toLowerCase() === cleanQuery) return true;
        if (s.inverterSns.some(sn => sn.toLowerCase() === cleanQuery)) return true;
        if (s.dongleSns.some(sn => sn.toLowerCase() === cleanQuery)) return true;
        return false;
      });

      if (matched) {
        const powerKw = matched.pSystem > 0 ? matched.pSystem : null;
        const genToday = matched.productionToday > 0 ? matched.productionToday : null;

        return {
          powerNow: powerKw,
          generationToday: genToday,
          generationTotal: null,
          temperature: null,
          status: powerKw !== null && powerKw > 0 ? 'ONLINE' : (matched.status === 1 ? 'ONLINE' : 'OFFLINE'),
        };
      }

      this.logger.warn(`Usina GoodWe não encontrada para o identificador/SN: ${stationIdOrSn}`);
    } catch (err: any) {
      this.logger.error(`Erro ao ler usina GoodWe (${stationIdOrSn}): ${err.message}`);
    }

    return null;
  }
}
