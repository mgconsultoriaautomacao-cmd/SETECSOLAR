import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

export interface SofarReading {
  powerNow: number | null;
  generationToday: number | null;
  generationTotal: number | null;
  temperature?: number | null;
  status: string;
}

export interface SofarStation {
  id: string;
  name: string;
  powerKw: number;
  energyTodayKwh: number;
  energyTotalKwh: number;
  capacityKwp: number;
  latitude: number | null;
  longitude: number | null;
  address: string;
  status: number | string;
  inverterSns: string[];
  raw?: any;
}

const DEFAULT_SOLARMAN_APP_ID = '302407178765198';
const DEFAULT_SOLARMAN_APP_SECRET = '498bdb2be4a5c9f3a3d22332f28395c7';

const SOFAR_BASE_URLS = [
  'https://globalapi.solarmanpv.com',
  'https://eu.sofarcloud.com/api',
  'https://api.sofarcloud.com',
  'https://global.sofarcloud.com/api',
];

@Injectable()
export class SofarService {
  private readonly logger = new Logger(SofarService.name);
  private tokenCache = new Map<string, { accessToken: string; expiresAt: number; baseUrl: string; isSolarmanOpenApi: boolean }>();

  /**
   * Realiza login no Sofar / Solarman Open API ou Sofar Cloud.
   */
  async login(
    account: string,
    passwordOrSecret: string,
    appId?: string,
    appSecret?: string
  ): Promise<{ accessToken: string; baseUrl: string; isSolarmanOpenApi: boolean } | null> {
    if (!account || !passwordOrSecret) return null;

    const actualAppId = (appId && appId.trim() !== '' && appId !== account) ? appId.trim() : DEFAULT_SOLARMAN_APP_ID;
    const actualAppSecret = (appSecret && appSecret.trim() !== '' && appSecret !== passwordOrSecret) ? appSecret.trim() : DEFAULT_SOLARMAN_APP_SECRET;

    const cacheKey = `${account}_${passwordOrSecret}_${actualAppId}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { accessToken: cached.accessToken, baseUrl: cached.baseUrl, isSolarmanOpenApi: cached.isSolarmanOpenApi };
    }

    // 1. Tenta autenticação via Solarman Open API (padrão global Sofar/Solarman)
    if (actualAppId && actualAppSecret) {
      try {
        const sha256Password = /^[a-f0-9]{64}$/i.test(passwordOrSecret)
          ? passwordOrSecret
          : crypto.createHash('sha256').update(passwordOrSecret).digest('hex');

        this.logger.log(`Conectando ao Sofar via Solarman OpenAPI (globalapi.solarmanpv.com) para conta: ${account}...`);
        
        // Testa com email
        let response = await axios.post(
          `https://globalapi.solarmanpv.com/account/v1.0/token?appId=${actualAppId}&language=en`,
          {
            appSecret: actualAppSecret,
            email: account,
            password: sha256Password,
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );

        if (response.data?.access_token) {
          const accessToken = response.data.access_token;
          this.logger.log(`✅ Login Sofar/Solarman OpenAPI efetuado com sucesso para ${account}`);
          const resObj = {
            accessToken,
            expiresAt: Date.now() + 2 * 60 * 60 * 1000,
            baseUrl: 'https://globalapi.solarmanpv.com',
            isSolarmanOpenApi: true,
          };
          this.tokenCache.set(cacheKey, resObj);
          return resObj;
        }

        // Se falhou, tenta com username
        response = await axios.post(
          `https://globalapi.solarmanpv.com/account/v1.0/token?appId=${actualAppId}&language=en`,
          {
            appSecret: actualAppSecret,
            username: account,
            password: sha256Password,
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
        );

        if (response.data?.access_token) {
          const accessToken = response.data.access_token;
          this.logger.log(`✅ Login Sofar/Solarman OpenAPI efetuado com sucesso (via username) para ${account}`);
          const resObj = {
            accessToken,
            expiresAt: Date.now() + 2 * 60 * 60 * 1000,
            baseUrl: 'https://globalapi.solarmanpv.com',
            isSolarmanOpenApi: true,
          };
          this.tokenCache.set(cacheKey, resObj);
          return resObj;
        }
      } catch (err: any) {
        this.logger.warn(`Tentativa via Solarman OpenAPI falhou: ${err.response?.data?.msg || err.message}`);
      }
    }

    // 2. Fallback: Tenta endpoints diretos do Sofar Cloud legado
    const payload = {
      accountName: account,
      password: passwordOrSecret,
      expireTime: 18000,
    };

    for (const baseUrl of SOFAR_BASE_URLS.filter(u => u.includes('sofarcloud'))) {
      try {
        this.logger.log(`Conectando ao Sofar Cloud legado (${baseUrl}) para conta: ${account}...`);
        const response = await axios.post(
          `${baseUrl}/user/auth/he/login`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json, text/plain, */*',
              'scene': 'eu',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0',
            },
            timeout: 10000,
          }
        );

        const data = response.data;
        if (data && (data.code === '0' || data.code === 0) && data.data?.accessToken) {
          const accessToken = data.data.accessToken;
          this.logger.log(`✅ Login Sofar Cloud efetuado com sucesso para ${account}`);

          const resObj = {
            accessToken,
            expiresAt: Date.now() + 2 * 60 * 60 * 1000,
            baseUrl,
            isSolarmanOpenApi: false,
          };
          this.tokenCache.set(cacheKey, resObj);
          return resObj;
        }
      } catch (err: any) {
        this.logger.warn(`Tentativa de login Sofar Cloud falhou em ${baseUrl}: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Helper de cabeçalhos autenticados do Sofar Cloud.
   */
  private getAuthHeaders(accessToken: string) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
      'authorization': `Bearer ${accessToken}`,
      'Authorization': `bearer ${accessToken}`,
      'scene': 'eu',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0',
    };
  }

  /**
   * Lista todas as usinas (estações) com dados de geração e dispositivos cadastrados no Sofar.
   */
  async listStations(
    account: string,
    passwordOrSecret: string,
    appId?: string,
    appSecret?: string
  ): Promise<SofarStation[]> {
    const loginRes = await this.login(account, passwordOrSecret, appId, appSecret);
    if (!loginRes) return [];

    const { accessToken, baseUrl, isSolarmanOpenApi } = loginRes;
    const headers = this.getAuthHeaders(accessToken);

    if (isSolarmanOpenApi) {
      try {
        const res = await axios.post(
          'https://globalapi.solarmanpv.com/station/v1.0/list',
          { page: 1, size: 100 },
          { headers, timeout: 12000 }
        );

        const stationList: any[] = res.data?.stationList || res.data?.data?.stationList || res.data?.data || [];
        const stations: SofarStation[] = [];

        for (const st of stationList) {
          const id = String(st.id || st.stationId || '');
          const name = st.name || st.stationName || `Sofar Plant ${id}`;
          const capacityKwp = parseFloat(st.installedCapacity || st.capacity || '0');
          const powerKw = parseFloat(st.generationPower || st.currPower || '0');
          const energyTodayKwh = parseFloat(st.generationToday || st.todayEnergy || '0');
          const energyTotalKwh = parseFloat(st.generationTotal || st.totalEnergy || '0');

          stations.push({
            id,
            name,
            powerKw: isNaN(powerKw) ? 0 : powerKw,
            energyTodayKwh: isNaN(energyTodayKwh) ? 0 : energyTodayKwh,
            energyTotalKwh: isNaN(energyTotalKwh) ? 0 : energyTotalKwh,
            capacityKwp: isNaN(capacityKwp) ? 0 : capacityKwp,
            latitude: st.locationLat ? parseFloat(st.locationLat) : null,
            longitude: st.locationLng ? parseFloat(st.locationLng) : null,
            address: st.locationAddress || st.address || '',
            status: st.networkStatus === 'OFFLINE' ? 'OFFLINE' : (powerKw > 0 ? 'ONLINE' : 'ONLINE'),
            inverterSns: [id],
            raw: st,
          });
        }

        return stations;
      } catch (err: any) {
        this.logger.error(`Erro ao listar usinas Sofar/Solarman OpenAPI: ${err.message}`);
        return [];
      }
    }

    // Sofar Cloud legado
    try {
      const res = await axios.post(
        `${baseUrl}/device/stationInfo/selectStationListPages`,
        { page: 1, size: 100 },
        { headers, timeout: 12000 }
      );

      const records = res.data?.data?.records || res.data?.data?.list || [];
      if (!Array.isArray(records)) {
        this.logger.warn(`Estrutura de estações Sofar Cloud não esperada: ${JSON.stringify(res.data)}`);
        return [];
      }

      const stations: SofarStation[] = [];

      for (const st of records) {
        const id = String(st.id || st.stationId || '');
        const name = st.stationName || st.name || `Sofar Plant ${id}`;
        const powerKw = parseFloat(st.currPower || st.realTimePower || st.power || '0');
        const energyTodayKwh = parseFloat(st.todayEnergy || st.dayEnergy || st.dailyGeneration || '0');
        const energyTotalKwh = parseFloat(st.totalEnergy || st.totalGeneration || '0');
        const capacityKwp = parseFloat(st.capacity || st.installedCapacity || '0');

        let inverterSns: string[] = [];
        if (Array.isArray(st.deviceSnList)) {
          inverterSns = st.deviceSnList;
        } else if (st.sn) {
          inverterSns = [String(st.sn)];
        }

        stations.push({
          id,
          name,
          powerKw: isNaN(powerKw) ? 0 : powerKw,
          energyTodayKwh: isNaN(energyTodayKwh) ? 0 : energyTodayKwh,
          energyTotalKwh: isNaN(energyTotalKwh) ? 0 : energyTotalKwh,
          capacityKwp: isNaN(capacityKwp) ? 0 : capacityKwp,
          latitude: st.latitude ? parseFloat(st.latitude) : null,
          longitude: st.longitude ? parseFloat(st.longitude) : null,
          address: st.address || st.location || '',
          status: st.status ?? 1,
          inverterSns,
          raw: st,
        });
      }

      return stations;
    } catch (err: any) {
      this.logger.error(`Erro ao listar usinas Sofar Cloud: ${err.message}`);
      return [];
    }
  }

  /**
   * Diagnóstico completo das credenciais da Sofar API.
   */
  async diagnose(
    account: string,
    passwordOrSecret: string,
    appId?: string,
    appSecret?: string
  ): Promise<{
    credentials: any;
    loginResult: any;
    stationListResult: any;
    recommendation: string;
  }> {
    this.logger.log(`🔍 Executando diagnóstico Sofar para conta: ${account}...`);

    let loginRes: any = null;
    let stationListRes: any = null;

    try {
      const loginObj = await this.login(account, passwordOrSecret, appId, appSecret);
      if (loginObj) {
        loginRes = { status: 'SUCCESS', baseUrl: loginObj.baseUrl, mode: loginObj.isSolarmanOpenApi ? 'Solarman OpenAPI' : 'Sofar Cloud' };

        const stations = await this.listStations(account, passwordOrSecret, appId, appSecret);
        stationListRes = {
          total: stations.length,
          stations: stations.map(s => ({
            id: s.id,
            name: s.name,
            powerKw: s.powerKw,
            todayKwh: s.energyTodayKwh,
            totalKwh: s.energyTotalKwh,
            inverters: s.inverterSns,
          })),
        };
      } else {
        loginRes = {
          status: 'AUTH_FAILED',
          message: 'Não foi possível autenticar na Sofar / Solarman API.',
          hint: 'Verifique se o usuário/e-mail, senha e App ID / App Secret estão corretos.',
        };
      }
    } catch (e: any) {
      loginRes = { status: 'ERROR', message: e.message };
    }

    const isOk = loginRes && loginRes.status === 'SUCCESS';

    return {
      credentials: {
        account,
        company: 'SETE SOLAR ENERGIA',
        hasPassword: !!passwordOrSecret,
      },
      loginResult: loginRes,
      stationListResult: stationListRes,
      recommendation: isOk
        ? `✅ Conexão Sofar 100% OK! ${stationListRes?.total || 0} usina(s) encontradas.`
        : '⚠️ Falha na autenticação Sofar. Verifique as credenciais no portal Solarman / Sofar.',
    };
  }

  /**
   * Lê telemetria de uma usina Sofar por ID da Estação ou SN do Inversor/Datalogger.
   */
  async readUsinaFromCloud(
    stationIdOrSn: string,
    account: string,
    passwordOrSecret: string,
    appId?: string,
    appSecret?: string
  ): Promise<SofarReading | null> {
    if (!stationIdOrSn) return null;

    const cleanQuery = stationIdOrSn.trim().toLowerCase();

    try {
      const loginRes = await this.login(account, passwordOrSecret, appId, appSecret);
      if (!loginRes) return null;

      // Se for Solarman OpenAPI, tenta primeiro via station realTime
      if (loginRes.isSolarmanOpenApi) {
        const headers = this.getAuthHeaders(loginRes.accessToken);

        if (/^\d+$/.test(cleanQuery)) {
          try {
            const rtRes = await axios.post(
              'https://globalapi.solarmanpv.com/station/v1.0/realTime',
              { stationId: Number(cleanQuery) },
              { headers, timeout: 8000 }
            );

            if (rtRes.data?.success || rtRes.data?.generationPower !== undefined) {
              const d = rtRes.data;
              const powerKw = parseFloat(d.generationPower || d.usePower || '0') || null;
              const genToday = parseFloat(d.generationToday || d.todayEnergy || '0') || null;
              const genTotal = parseFloat(d.generationTotal || d.totalEnergy || '0') || null;

              return {
                powerNow: powerKw,
                generationToday: genToday,
                generationTotal: genTotal,
                temperature: null,
                status: (powerKw !== null && powerKw > 0) ? 'ONLINE' : 'ONLINE',
              };
            }
          } catch (e: any) {
            // Fallthrough to station list
          }
        }
      }

      const stations = await this.listStations(account, passwordOrSecret, appId, appSecret);
      if (!stations || stations.length === 0) return null;

      const matched = stations.find(s => {
        if (s.id.toLowerCase() === cleanQuery) return true;
        if (s.name.toLowerCase() === cleanQuery) return true;
        if (s.inverterSns.some(sn => sn.toLowerCase() === cleanQuery)) return true;
        return false;
      });

      if (matched) {
        const powerKw = matched.powerKw > 0 ? matched.powerKw : null;
        const genToday = matched.energyTodayKwh > 0 ? matched.energyTodayKwh : null;
        const genTotal = matched.energyTotalKwh > 0 ? matched.energyTotalKwh : null;

        return {
          powerNow: powerKw,
          generationToday: genToday,
          generationTotal: genTotal,
          temperature: null,
          status: (powerKw !== null && powerKw > 0) || matched.status === 1 || matched.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
        };
      }

      this.logger.warn(`Usina Sofar não encontrada para o identificador/SN: ${stationIdOrSn}`);
    } catch (err: any) {
      this.logger.error(`Erro ao ler usina Sofar (${stationIdOrSn}): ${err.message}`);
    }

    return null;
  }
}
