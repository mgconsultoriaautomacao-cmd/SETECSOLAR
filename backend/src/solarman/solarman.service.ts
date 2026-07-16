import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';
import { GrowattService } from './growatt.service';
import { SolplanetService } from './solplanet.service';

// ─────────────────────────────────────────────────────────────────────────────
// Protocolo SolarmanV5 — leitura direta no WiFi Stick pela rede local/internet
// Sem nenhuma dependência de cloud ou conta externa.
//
// Como configurar uma usina para monitoramento:
//   Campo "datalogger" no cadastro da usina deve ser preenchido com:
//   formato:  IP:SN   (ex: "177.83.14.55:2375000001")
//   onde:
//     IP  = IP externo do roteador do cliente (com port forwarding 8899 aberto)
//     SN  = Serial Number do WiFi Stick (etiqueta no dispositivo)
//
// O sistema conecta via TCP porta 8899, lê os registradores Modbus
// e retorna os dados de geração sem passar por nenhum servidor de terceiros.
// ─────────────────────────────────────────────────────────────────────────────

export interface DeviceReading {
  usinaId: string;
  usinaNome: string;
  deviceSn: string;
  ipAddress: string;
  powerNow: number | null;        // kW gerado agora
  generationToday: number | null; // kWh gerado hoje
  generationTotal: number | null; // kWh gerado no total (histórico)
  gridVoltage: number | null;     // Tensão da rede (V)
  gridFrequency: number | null;   // Frequência da rede (Hz)
  temperature: number | null;     // Temperatura do inversor (°C)
  dcPower: number | null;         // Potência DC dos painéis (W)
  status: 'ONLINE' | 'OFFLINE' | 'FAULT' | 'NOT_CONFIGURED';
  lastUpdate: Date;
  errorMessage?: string;
}

// ─── Frame SolarmanV5 ─────────────────────────────────────────────────────────
// O protocolo V5 encapsula Modbus RTU dentro de um header proprietário.
// Header: 0xA5 + length(2) + 0x10 + 0x45 + sequence(2) + SN(4) + ...
// Ref: https://github.com/jmccrohan/pysolarmanv5

function buildV5Frame(serialNumber: number, modbusRequest: Buffer): Buffer {
  const header = Buffer.alloc(11);
  header[0] = 0xA5;                           // Start byte
  header[1] = modbusRequest.length;           // Length LSB
  header[2] = 0x00;                           // Length MSB
  header[3] = 0x10;                           // Control code (request)
  header[4] = 0x45;                           // Frame type
  header[5] = 0x00;                           // Sequence number (low)
  header[6] = 0x00;                           // Sequence number (high)
  header.writeUInt32LE(serialNumber, 7);       // Logger serial (4 bytes LE)

  // Payload header (7 bytes fixos antes dos dados Modbus)
  const payloadHeader = Buffer.from([0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

  const body = Buffer.concat([payloadHeader, modbusRequest]);

  // Recalcula length
  const fullHeader = Buffer.alloc(11);
  fullHeader[0] = 0xA5;
  fullHeader[1] = body.length & 0xFF;
  fullHeader[2] = (body.length >> 8) & 0xFF;
  fullHeader[3] = 0x10;
  fullHeader[4] = 0x45;
  fullHeader[5] = 0x00;
  fullHeader[6] = 0x00;
  fullHeader.writeUInt32LE(serialNumber, 7);

  // Checksum: soma de todos os bytes do body
  let checksum = 0;
  for (const byte of body) checksum = (checksum + byte) & 0xFF;

  const trailer = Buffer.from([checksum, 0x15]);
  return Buffer.concat([fullHeader, body, trailer]);
}

// ─── Request Modbus RTU: Read Holding Registers ──────────────────────────────
function buildModbusReadRegisters(startReg: number, count: number, slaveId = 1): Buffer {
  const req = Buffer.alloc(8);
  req[0] = slaveId;
  req[1] = 0x03;  // Function code: Read Holding Registers
  req[2] = (startReg >> 8) & 0xFF;
  req[3] = startReg & 0xFF;
  req[4] = (count >> 8) & 0xFF;
  req[5] = count & 0xFF;

  // CRC16 Modbus
  let crc = 0xFFFF;
  for (let i = 0; i < 6; i++) {
    crc ^= req[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) { crc = (crc >> 1) ^ 0xA001; }
      else { crc >>= 1; }
    }
  }
  req[6] = crc & 0xFF;
  req[7] = (crc >> 8) & 0xFF;
  return req;
}

// ─── Leitura TCP direta no WiFi Stick ────────────────────────────────────────
async function readStickDirect(
  ip: string,
  serialNumber: number,
  logger: Logger,
): Promise<{ registers: number[]; raw: Buffer } | null> {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    const timeout = 10000;
    let responseData = Buffer.alloc(0);
    let resolved = false;

    const done = (result: { registers: number[]; raw: Buffer } | null) => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      // Lê registradores 0x0000 a 0x0027 (registradores padrão Deye/Solis/Growatt)
      const modbusReq = buildModbusReadRegisters(0x0000, 40);
      const v5Frame = buildV5Frame(serialNumber, modbusReq);
      socket.write(v5Frame);
    });

    socket.on('data', (chunk: Buffer) => {
      responseData = Buffer.concat([responseData, chunk]);

      // Verifica se a resposta V5 está completa
      if (responseData.length >= 11 && responseData[0] === 0xA5) {
        const payloadLen = responseData[1] | (responseData[2] << 8);
        const totalExpected = 11 + payloadLen + 2;

        if (responseData.length >= totalExpected) {
          // Extrai o payload Modbus (pula header V5 de 11 bytes + 7 bytes de payload header)
          const modbusStart = 11 + 7;
          if (responseData.length > modbusStart + 5) {
            const modbusData = responseData.slice(modbusStart);
            const byteCount = modbusData[2] || 0;
            const registers: number[] = [];

            for (let i = 0; i < byteCount; i += 2) {
              if (modbusData[3 + i] !== undefined && modbusData[4 + i] !== undefined) {
                registers.push((modbusData[3 + i] << 8) | modbusData[4 + i]);
              }
            }

            done({ registers, raw: responseData });
          } else {
            done(null);
          }
        }
      }
    });

    socket.on('timeout', () => {
      logger.warn(`Timeout ao conectar em ${ip}:8899`);
      done(null);
    });

    socket.on('error', (err: Error) => {
      logger.warn(`Erro TCP ao conectar em ${ip}:8899 — ${err.message}`);
      done(null);
    });

    socket.connect(8899, ip);
  });
}

// ─── Interpretação dos registradores (mapa padrão Deye/Growatt/Solis) ────────
// Cada fabricante tem um mapa ligeiramente diferente.
// Esses são os registradores mais comuns entre os sticks compatíveis.
function parseRegisters(regs: number[]): Partial<DeviceReading> {
  const get = (i: number): number => regs[i] ?? 0;

  // Registradores Deye/Solis/Growatt (0x0000 em diante):
  // 0x0000 = Year/Month, 0x0001 = Day/Hour, 0x0002 = Min/Sec
  // 0x000A = Frequência da rede (x0.01 Hz)
  // 0x000B = Tensão rede fase A (x0.1 V)
  // 0x000C = Corrente fase A (x0.1 A)
  // 0x0010 = Temperatura radiador (x0.1 °C)
  // 0x0011 = Geração hoje (x0.1 kWh)
  // 0x0014 = Potência AC total (W)
  // 0x0015-0x0016 = Geração total (x0.1 kWh, 32-bit)
  // 0x0019 = Potência DC string 1 (W)

  const gridFrequency = get(10) * 0.01;      // 0x000A
  const gridVoltage   = get(11) * 0.1;       // 0x000B
  const temperature   = get(16) * 0.1;       // 0x0010
  const todayKwh      = get(17) * 0.1;       // 0x0011
  const powerAC       = get(20);             // 0x0014 (W)
  const totalHi       = get(21);             // 0x0015
  const totalLo       = get(22);             // 0x0016
  const totalKwh      = ((totalHi << 16) | totalLo) * 0.1;
  const dcPower       = get(25);             // 0x0019

  return {
    gridFrequency: gridFrequency > 0 ? gridFrequency : null,
    gridVoltage:   gridVoltage > 0 ? gridVoltage : null,
    temperature:   temperature > 0 ? temperature : null,
    generationToday:  todayKwh > 0 ? todayKwh : null,
    powerNow:         powerAC > 0 ? powerAC / 1000 : null,  // W → kW
    generationTotal:  totalKwh > 0 ? totalKwh : null,
    dcPower:          dcPower > 0 ? dcPower : null,
  };
}

// Helper para parsear e limpar o Serial Number (SN) do datalogger de forma robusta
export function parseSnToNumber(sn: string): number {
  if (!sn) return NaN;
  const cleanSn = sn.trim();
  let val = NaN;

  // 1. Tenta parse simples como decimal
  if (/^\d+$/.test(cleanSn)) {
    val = parseInt(cleanSn, 10);
  }
  // 2. Se for hexadecimal (com ou sem 0x), tenta base 16
  else if (/^(0x)?[0-9a-fA-F]+$/.test(cleanSn)) {
    val = parseInt(cleanSn.replace(/^0x/, ''), 16);
  }
  // 3. Extrai apenas dígitos se for alfanumérico (ex: LSW3_15_2375000001 -> 2375000001)
  else {
    const match = cleanSn.match(/(\d+)$/);
    if (match) {
      val = parseInt(match[1], 10);
    }
    if (isNaN(val)) {
      const digitsOnly = cleanSn.replace(/\D/g, '');
      if (digitsOnly) {
        val = parseInt(digitsOnly, 10);
      }
    }
  }

  // Coerção para 32-bit uint se for um número válido (previne estouro em writeUInt32LE)
  if (!isNaN(val)) {
    return val >>> 0;
  }
  return NaN;
}

// Realiza uma varredura paralela rápida na subrede local para encontrar a porta 8899 aberta e valida o S/N
async function scanSubnetForStick(
  subnetBase: string,
  serialNumber: number,
  logger: Logger,
): Promise<string | null> {
  const net = require('net');
  const timeout = 300; // 300ms de timeout na rede local
  const promises: Promise<{ ip: string; success: boolean }>[] = [];

  logger.log(`🔍 Iniciando varredura rápida na subrede ${subnetBase}x (porta 8899) para encontrar o datalogger...`);

  // Varredura de 1 a 254
  for (let i = 1; i <= 254; i++) {
    const ip = `${subnetBase}${i}`;
    const p = new Promise<{ ip: string; success: boolean }>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve({ ip, success: true });
      });

      socket.on('error', () => {
        socket.destroy();
        resolve({ ip, success: false });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ ip, success: false });
      });

      socket.connect(8899, ip);
    });
    promises.push(p);
  }

  const results = await Promise.all(promises);
  const activeIps = results.filter(r => r.success).map(r => r.ip);

  if (activeIps.length === 0) {
    logger.warn(`  Varredura concluída. Nenhum dispositivo respondendo na porta 8899.`);
    return null;
  }

  logger.log(`  Dispositivos encontrados com porta 8899 ativa: [${activeIps.join(', ')}]. Testando o S/N: ${serialNumber}...`);

  // Tenta ler o Stick direto em cada IP encontrado para ver qual responde ao S/N correto
  for (const ip of activeIps) {
    try {
      const result = await readStickDirect(ip, serialNumber, logger);
      if (result && result.registers.length > 0) {
        logger.log(`  🎉 WiFi Stick encontrado com sucesso no IP: ${ip}`);
        return ip;
      }
    } catch (e) {
      // ignora erro do teste
    }
  }

  logger.warn(`  WiFi Stick com o S/N ${serialNumber} não respondeu nos IPs varridos.`);
  return null;
}

// ─── Service Principal ────────────────────────────────────────────────────────

@Injectable()
export class SolarmanService implements OnModuleInit {
  private readonly logger = new Logger(SolarmanService.name);
  private readings = new Map<string, DeviceReading>();
  private cloudTokens = new Map<string, { token: string; expiresAt: Date }>();

  constructor(
    private prisma: PrismaService,
    private growattService: GrowattService,
    private solplanetService: SolplanetService,
  ) {}

  private async getCloudToken(supplier?: any): Promise<string | null> {
    const supplierId = supplier?.id || 'default';
    const appId = supplier?.appId || process.env.SOLARMAN_APP_ID || process.env.SOLARMAN_EMAIL;
    const appSecret = supplier?.appSecret || process.env.SOLARMAN_APP_SECRET || process.env.SOLARMAN_PASSWORD;
    const email = supplier?.username || process.env.SOLARMAN_EMAIL;
    const password = supplier?.password || process.env.SOLARMAN_PASSWORD;

    if (!appId || !appSecret || !email || !password) {
      return null;
    }

    const cached = this.cloudTokens.get(supplierId);
    if (cached && cached.expiresAt > new Date()) {
      return cached.token;
    }

    try {
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      const response = await axios.post(
        `https://globalapi.solarmanpv.com/account/v1.0/token?appId=${appId}&language=en`,
        {
          appSecret,
          email,
          password: passwordHash,
        }
      );

      if (response.data && response.data.access_token) {
        const token = response.data.access_token;
        const expiresInSeconds = response.data.expires_in || 7200;
        const expiresAt = new Date(Date.now() + (expiresInSeconds - 600) * 1000);
        this.cloudTokens.set(supplierId, { token, expiresAt });
        return token;
      }
    } catch (err: any) {
      this.logger.error(`Erro ao autenticar na API Cloud Solarman (${supplierId}):`, err.response?.data || err.message);
    }

    return null;
  }

  private async readUsinaFromCloud(deviceSn: string, supplier?: any): Promise<Partial<DeviceReading> | null> {
    const token = await this.getCloudToken(supplier);
    if (!token) return null;

    try {
      const response = await axios.post(
        'https://globalapi.solarmanpv.com/device/v1.0/currentData',
        {
          deviceSn,
        },
        {
          headers: {
            Authorization: `bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.success) {
        const dataList = response.data.dataList || [];
        const result: Partial<DeviceReading> = {
          powerNow: null,
          generationToday: null,
          generationTotal: null,
          gridVoltage: null,
          gridFrequency: null,
          temperature: null,
          dcPower: null,
        };

        dataList.forEach((item: any) => {
          const key = (item.key || '').toLowerCase();
          const name = (item.name || '').toLowerCase();
          const val = parseFloat(item.value);

          if (isNaN(val)) return;

          if (key.includes('active_power') || key.includes('apower') || key === 'power' || name.includes('active power') || name.includes('potência ativa')) {
            result.powerNow = item.unit?.toLowerCase() === 'w' ? val / 1000 : val;
          } else if (key.includes('daily_energy') || key.includes('generation_today') || key.includes('e_today') || key === 'etoday' || name.includes('daily') || name.includes('hoje')) {
            result.generationToday = val;
          } else if (key.includes('total_energy') || key.includes('generation_total') || key.includes('e_total') || key === 'etotal' || name.includes('total') || name.includes('geração total')) {
            result.generationTotal = val;
          } else if (key.includes('grid_voltage') || key.includes('voltage') || key === 'u' || key === 'v_grid' || name.includes('voltage') || name.includes('tensão')) {
            result.gridVoltage = val;
          } else if (key.includes('grid_frequency') || key.includes('frequency') || key === 'f_grid' || name.includes('frequency') || name.includes('frequência')) {
            result.gridFrequency = val;
          } else if (key.includes('temp') || key.includes('temperature') || name.includes('temp') || name.includes('temperatura')) {
            result.temperature = val;
          } else if (key.includes('dc_power') || key.includes('pv_power') || name.includes('dc power') || name.includes('pv power') || name.includes('potência dc')) {
            result.dcPower = item.unit?.toLowerCase() === 'w' ? val : val * 1000;
          }
        });

        return result;
      }
    } catch (err: any) {
      this.logger.error(`Erro ao buscar dados do device ${deviceSn} via Solarman Cloud API:`, err.response?.data || err.message);
    }
    return null;
  }

  onModuleInit() {
    this.logger.log('📡 Serviço de monitoramento direto inicializado.');
    this.logger.log('   Protocolo: SolarmanV5/ModbusRTU via TCP porta 8899');
    this.logger.log('   Formato do campo datalogger: "IP:SN" (ex: 177.83.14.55:2375000001)');
    // Primeira leitura após 5 seg
    setTimeout(() => this.pollAll(), 5000);
    // Polling a cada 5 minutos
    setInterval(() => this.pollAll(), 5 * 60 * 1000);
  }

  // ─── Polling de todas as usinas com datalogger configurado ─────────────────
  async pollAll(): Promise<void> {
    const usinas = await this.prisma.usina.findMany({
      where: { datalogger: { not: '' } },
      include: { dataloggerSupplier: true },
    });

    if (usinas.length === 0) {
      this.logger.debug('Nenhuma usina com datalogger configurado.');
      return;
    }

    this.logger.log(`🔄 Polling de ${usinas.length} usina(s)...`);

    for (const usina of usinas) {
      const reading = await this.readUsina(usina.id, usina.name, usina.datalogger, usina.dataloggerSupplier);
      this.readings.set(usina.id, reading);

      // Atualiza status no banco
      const dbStatus =
        reading.status === 'ONLINE' ? 'ONLINE'
        : reading.status === 'FAULT' ? 'CRITICAL'
        : 'OFFLINE';

      try {
        await this.prisma.usina.update({
          where: { id: usina.id },
          data: { status: dbStatus },
        });
      } catch (e) {
        // ignora erros de banco para não bloquear o polling
      }
    }
  }

  // ─── Lê uma usina específica ────────────────────────────────────────────────
  async readUsina(usinaId: string, usinaNome: string, datalogger: string, supplier?: any): Promise<DeviceReading> {
    const cleanDatalogger = datalogger.trim();
    const isMock = cleanDatalogger.toUpperCase().includes('MOCK') || cleanDatalogger === '0' || cleanDatalogger.includes(':0') || cleanDatalogger.includes(':MOCK') || cleanDatalogger.includes(':mock');

    if (isMock) {
      const sn = cleanDatalogger.includes(':') ? cleanDatalogger.split(':')[1] : cleanDatalogger;
      const now = new Date();
      const hour = now.getHours();
      let powerNow = 0;
      
      if (hour >= 6 && hour <= 18) {
        const peakPower = 5.4;
        const rad = ((hour - 6) / 12) * Math.PI;
        powerNow = peakPower * Math.sin(rad) * (0.9 + Math.random() * 0.2);
      }
      
      const generationToday = powerNow > 0 ? (powerNow * (hour - 6) * 0.7) : 0;
      const generationTotal = 4580.2 + generationToday;

      return {
        usinaId, usinaNome, deviceSn: sn, ipAddress: '127.0.0.1',
        powerNow: parseFloat(powerNow.toFixed(2)),
        generationToday: parseFloat(generationToday.toFixed(1)),
        generationTotal: parseFloat(generationTotal.toFixed(1)),
        gridVoltage: parseFloat((220 + (Math.random() - 0.5) * 4).toFixed(1)),
        gridFrequency: parseFloat((60 + (Math.random() - 0.5) * 0.2).toFixed(2)),
        temperature: parseFloat((32 + powerNow * 2 + (Math.random() - 0.5) * 2).toFixed(1)),
        dcPower: parseFloat((powerNow * 1.1).toFixed(2)),
        status: 'ONLINE',
        lastUpdate: new Date(),
      };
    }

    // Se houver fornecedor associado no banco
    if (supplier && !cleanDatalogger.includes(':')) {
      if (supplier.type === 'GROWATT_CLOUD') {
        const growattData = await this.growattService.readUsinaFromCloud(cleanDatalogger, 'inv', supplier.token);
        if (growattData) {
          return {
            usinaId, usinaNome, deviceSn: cleanDatalogger,
            ipAddress: 'Growatt Cloud API',
            powerNow: growattData.powerNow,
            generationToday: growattData.generationToday,
            generationTotal: growattData.generationTotal,
            gridVoltage: null, gridFrequency: null,
            temperature: growattData.temperature,
            dcPower: null,
            status: growattData.status,
            lastUpdate: new Date(),
          };
        }
        return {
          usinaId, usinaNome, deviceSn: cleanDatalogger,
          ipAddress: 'Growatt Cloud',
          powerNow: null, generationToday: null, generationTotal: null,
          gridVoltage: null, gridFrequency: null, temperature: null, dcPower: null,
          status: 'OFFLINE', lastUpdate: new Date(),
          errorMessage: `Sem resposta da Growatt Cloud API. Verifique as credenciais do fornecedor "${supplier.name}".`,
        };
      }

      if (supplier.type === 'SOLARMAN_CLOUD') {
        const cloudData = await this.readUsinaFromCloud(cleanDatalogger, supplier);
        if (cloudData) {
          return {
            usinaId, usinaNome, deviceSn: cleanDatalogger,
            ipAddress: 'Solarman Cloud API',
            powerNow: cloudData.powerNow ?? null,
            generationToday: cloudData.generationToday ?? null,
            generationTotal: cloudData.generationTotal ?? null,
            gridVoltage: cloudData.gridVoltage ?? null,
            gridFrequency: cloudData.gridFrequency ?? null,
            temperature: cloudData.temperature ?? null,
            dcPower: cloudData.dcPower ?? null,
            status: 'ONLINE',
            lastUpdate: new Date(),
          };
        }
        return {
          usinaId, usinaNome, deviceSn: cleanDatalogger,
          ipAddress: 'Solarman Cloud',
          powerNow: null, generationToday: null, generationTotal: null,
          gridVoltage: null, gridFrequency: null, temperature: null, dcPower: null,
          status: 'OFFLINE', lastUpdate: new Date(),
          errorMessage: `Sem resposta da Solarman Cloud API. Verifique as credenciais do fornecedor "${supplier.name}".`,
        };
      }

      if (supplier.type === 'SOLPLANET_CLOUD' || supplier.type === 'SOLAR_PLANET_CLOUD') {
        const solplanetData = await this.solplanetService.readUsinaFromCloud(
          cleanDatalogger,
          supplier.appId,
          supplier.appSecret,
          supplier.token,
          supplier.apiKey
        );
        if (solplanetData) {
          return {
            usinaId, usinaNome, deviceSn: cleanDatalogger,
            ipAddress: 'Solplanet Cloud API',
            powerNow: solplanetData.powerNow,
            generationToday: solplanetData.generationToday,
            generationTotal: solplanetData.generationTotal,
            gridVoltage: null, gridFrequency: null,
            temperature: null, dcPower: null,
            status: solplanetData.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
            lastUpdate: new Date(),
          };
        }
        return {
          usinaId, usinaNome, deviceSn: cleanDatalogger,
          ipAddress: 'Solplanet Cloud',
          powerNow: null, generationToday: null, generationTotal: null,
          gridVoltage: null, gridFrequency: null, temperature: null, dcPower: null,
          status: 'OFFLINE', lastUpdate: new Date(),
          errorMessage: `Sem resposta da Solplanet Cloud API. Verifique as credenciais do fornecedor "${supplier.name}".`,
        };
      }
    }

    // Se NÃO contém dois pontos (:), tenta ler via Solarman Cloud API legado (Global)
    if (!cleanDatalogger.includes(':')) {
      const cloudData = await this.readUsinaFromCloud(cleanDatalogger);
      if (cloudData) {
        return {
          usinaId,
          usinaNome,
          deviceSn: cleanDatalogger,
          ipAddress: 'Solarman Cloud API',
          powerNow: cloudData.powerNow ?? null,
          generationToday: cloudData.generationToday ?? null,
          generationTotal: cloudData.generationTotal ?? null,
          gridVoltage: cloudData.gridVoltage ?? null,
          gridFrequency: cloudData.gridFrequency ?? null,
          temperature: cloudData.temperature ?? null,
          dcPower: cloudData.dcPower ?? null,
          status: 'ONLINE',
          lastUpdate: new Date(),
        };
      }

      return {
        usinaId, usinaNome,
        deviceSn: cleanDatalogger,
        ipAddress: 'Solarman Cloud',
        powerNow: null, generationToday: null, generationTotal: null,
        gridVoltage: null, gridFrequency: null, temperature: null, dcPower: null,
        status: 'OFFLINE',
        lastUpdate: new Date(),
        errorMessage: 'Sem resposta da Solarman Cloud API. Verifique as credenciais no arquivo .env.',
      };
    }

    const [ip, snStr] = cleanDatalogger.split(':');
    const serialNumber = parseSnToNumber(snStr);

    if (!ip || isNaN(serialNumber)) {
      return {
        usinaId, usinaNome, deviceSn: snStr, ipAddress: ip,
        powerNow: null, generationToday: null, generationTotal: null,
        gridVoltage: null, gridFrequency: null, temperature: null, dcPower: null,
        status: 'NOT_CONFIGURED',
        lastUpdate: new Date(),
        errorMessage: 'IP ou SN inválido',
      };
    }

    this.logger.log(`  Lendo ${usinaNome} → ${ip}:8899 (SN: ${serialNumber})`);

    let targetIp = ip;
    let result = await readStickDirect(targetIp, serialNumber, this.logger);

    // Se falhar e for IP local (ex: roteador ou IP antigo), faz varredura automática na subrede
    if ((!result || result.registers.length === 0) && (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'))) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        const subnetBase = `${parts[0]}.${parts[1]}.${parts[2]}.`;
        const foundIp = await scanSubnetForStick(subnetBase, serialNumber, this.logger);
        if (foundIp) {
          targetIp = foundIp;
          const newDatalogger = `${foundIp}:${snStr}`;
          try {
            await this.prisma.usina.update({
              where: { id: usinaId },
              data: { datalogger: newDatalogger },
            });
            this.logger.log(`💾 IP do Datalogger atualizado automaticamente no banco para: ${newDatalogger}`);
          } catch (e) {
            // ignora erro ao salvar
          }
          result = await readStickDirect(targetIp, serialNumber, this.logger);
        }
      }
    }

    if (!result || result.registers.length === 0) {
      this.logger.warn(`  ✗ ${usinaNome} — sem resposta (offline ou port forwarding não configurado)`);
      return {
        usinaId, usinaNome, deviceSn: snStr, ipAddress: targetIp,
        powerNow: null, generationToday: null, generationTotal: null,
        gridVoltage: null, gridFrequency: null, temperature: null, dcPower: null,
        status: 'OFFLINE',
        lastUpdate: new Date(),
        errorMessage: 'Sem resposta do WiFi Stick. Verifique se o aparelho está ligado e na mesma rede.',
      };
    }

    const parsed = parseRegisters(result.registers);
    this.logger.log(`  ✔ ${usinaNome} — ${parsed.status ?? 'ONLINE'} — ${(parsed.powerNow ?? 0).toFixed(2)} kW`);

    return {
      usinaId, usinaNome, deviceSn: snStr, ipAddress: targetIp,
      powerNow: parsed.powerNow ?? null,
      generationToday: parsed.generationToday ?? null,
      generationTotal: parsed.generationTotal ?? null,
      gridVoltage: parsed.gridVoltage ?? null,
      gridFrequency: parsed.gridFrequency ?? null,
      temperature: parsed.temperature ?? null,
      dcPower: parsed.dcPower ?? null,
      status: 'ONLINE',
      lastUpdate: new Date(),
    };
  }

  // ─── Getters para o controller ──────────────────────────────────────────────
  getAllReadings(): DeviceReading[] {
    return Array.from(this.readings.values());
  }

  getReading(usinaId: string): DeviceReading | undefined {
    return this.readings.get(usinaId);
  }

  async forceRefresh(): Promise<DeviceReading[]> {
    await this.pollAll();
    return this.getAllReadings();
  }


  getConfigStatus() {
    const usinasWithSn = this.readings.size;
    return {
      configured: true,
      protocol: 'SolarmanV5/ModbusTCP direto (sem nuvem)',
      totalMonitored: usinasWithSn,
      note: 'Preencha o campo "Datalogger" com "IP:SN" ao cadastrar a usina',
    };
  }

  // ─── Testa conexão direta com datalogger dado IP + SN ──────────────────────
  async testConnection(ip: string, sn: string, supplierId?: string): Promise<{
    success: boolean;
    message: string;
    data?: Partial<DeviceReading>;
    discoveredIp?: string;
  }> {
    if (!ip || !sn) {
      return { success: false, message: 'IP e SN são obrigatórios.' };
    }

    let supplier: any = null;
    if (supplierId) {
      supplier = await this.prisma.dataloggerSupplier.findUnique({
        where: { id: supplierId },
      });
    }

    // Se o IP for igual a "cloud" ou "SOLARMANCLOUD", tenta testar via API Cloud
    if (ip.toLowerCase() === 'cloud' || ip.toLowerCase() === 'solarmancloud') {
      const cloudData = await this.readUsinaFromCloud(sn, supplier);
      if (cloudData) {
        return {
          success: true,
          message: `✅ Datalogger conectado via Solarman Cloud API com sucesso!`,
          discoveredIp: 'Solarman Cloud',
          data: cloudData
        };
      }
      return {
        success: false,
        message: `Erro ao conectar via Solarman Cloud API. Verifique se o SN está correto e se as credenciais do fornecedor/env estão configuradas.`,
      };
    }

    // Se o IP for igual a "growatt" ou "growattcloud", tenta testar via API Growatt
    if (ip.toLowerCase() === 'growatt' || ip.toLowerCase() === 'growattcloud') {
      const growattData = await this.growattService.readUsinaFromCloud(sn, 'inv', supplier?.token);
      if (growattData) {
        return {
          success: true,
          message: `✅ Datalogger conectado via Growatt API com sucesso!`,
          discoveredIp: 'Growatt Cloud',
          data: {
            powerNow: growattData.powerNow,
            generationToday: growattData.generationToday,
            generationTotal: growattData.generationTotal,
            temperature: growattData.temperature,
            status: growattData.status,
          } as any
        };
      }
      return {
        success: false,
        message: `Erro ao conectar via Growatt API. Verifique se o S/N está correto e se as credenciais do fornecedor/env estão configuradas.`,
      };
    }

    // Se o IP for igual a "solplanet" ou "solplanetcloud", tenta testar via API Solplanet
    if (ip.toLowerCase() === 'solplanet' || ip.toLowerCase() === 'solplanetcloud') {
      if (!supplier) {
        return {
          success: false,
          message: `Para testar Solplanet Cloud, selecione o fornecedor configurado com AppKey/AppSecret/Token.`,
        };
      }
      const solplanetData = await this.solplanetService.readUsinaFromCloud(
        sn,
        supplier.appId,
        supplier.appSecret,
        supplier.token,
        supplier.apiKey
      );
      if (solplanetData) {
        return {
          success: true,
          message: `✅ Datalogger conectado via Solplanet API com sucesso!`,
          discoveredIp: 'Solplanet Cloud',
          data: {
            powerNow: solplanetData.powerNow,
            generationToday: solplanetData.generationToday,
            generationTotal: solplanetData.generationTotal,
            status: solplanetData.status,
          } as any
        };
      }
      return {
        success: false,
        message: `Erro ao conectar via Solplanet API. Verifique se o S/N está correto e se as credenciais do fornecedor "${supplier.name}" estão configuradas.`,
      };
    }

    // MOCK MODE FALLBACK: Se o S/N contiver a palavra "MOCK" ou for "0", gera dados fictícios realistas
    if (sn && (sn.toUpperCase().includes('MOCK') || sn === '0')) {
      const now = new Date();
      const hour = now.getHours();
      let powerNow = 0;
      if (hour >= 6 && hour <= 18) {
        const rad = ((hour - 6) / 12) * Math.PI;
        powerNow = 5.4 * Math.sin(rad) * (0.9 + Math.random() * 0.2);
      }
      const generationToday = powerNow > 0 ? (powerNow * (hour - 6) * 0.7) : 0;
      const generationTotal = 4580.2 + generationToday;

      return {
        success: true,
        message: `✅ Datalogger MOCK conectado com sucesso (Modo Simulação)!`,
        discoveredIp: ip,
        data: {
          powerNow: parseFloat(powerNow.toFixed(2)),
          generationToday: parseFloat(generationToday.toFixed(1)),
          generationTotal: parseFloat(generationTotal.toFixed(1)),
          gridVoltage: parseFloat((220 + (Math.random() - 0.5) * 4).toFixed(1)),
          gridFrequency: parseFloat((60 + (Math.random() - 0.5) * 0.2).toFixed(2)),
          temperature: parseFloat((32 + powerNow * 2 + (Math.random() - 0.5) * 2).toFixed(1)),
          status: 'ONLINE',
        }
      };
    }

    const serialNumber = parseSnToNumber(sn);
    if (isNaN(serialNumber)) {
      return { success: false, message: 'SN inválido. Deve ser um número ou conter dígitos válidos (ex: 2375000001).' };
    }

    let targetIp = ip;
    this.logger.log(`🔍 Testando conexão: ${targetIp}:8899 (SN: ${serialNumber})`);

    let result = await readStickDirect(targetIp, serialNumber, this.logger);

    // Se falhar e for IP local, tenta fazer a varredura automática na subrede
    if ((!result || result.registers.length === 0) && (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'))) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        const subnetBase = `${parts[0]}.${parts[1]}.${parts[2]}.`;
        const foundIp = await scanSubnetForStick(subnetBase, serialNumber, this.logger);
        if (foundIp) {
          targetIp = foundIp;
          result = await readStickDirect(targetIp, serialNumber, this.logger);
        }
      }
    }

    if (!result || result.registers.length === 0) {
      return {
        success: false,
        message: `Sem resposta do WiFi Stick em ${ip}:8899. Verifique:\n• Se o IP e o S/N estão corretos e na mesma rede local\n• Se a porta 8899 está aberta no roteador (caso acesso externo)`,
      };
    }

    const parsed = parseRegisters(result.registers);
    this.logger.log(`✔ Teste OK — ${(parsed.powerNow ?? 0).toFixed(2)} kW agora no IP ${targetIp}`);

    return {
      success: true,
      message: `✅ Datalogger respondeu! ${targetIp}:8899 (SN ${sn})${targetIp !== ip ? ' (IP descoberto automaticamente na rede!)' : ''}`,
      discoveredIp: targetIp !== ip ? targetIp : undefined,
      data: {
        powerNow: parsed.powerNow,
        generationToday: parsed.generationToday,
        generationTotal: parsed.generationTotal,
        gridVoltage: parsed.gridVoltage,
        gridFrequency: parsed.gridFrequency,
        temperature: parsed.temperature,
        status: 'ONLINE',
      },
    };
  }

  // ─── Ativa monitoramento: salva IP:SN na usina e faz leitura imediata ───────
  async activateMonitoring(usinaId: string, ip: string, sn: string, supplierId?: string): Promise<{
    success: boolean;
    message: string;
    reading?: DeviceReading;
  }> {
    const testResult = await this.testConnection(ip, sn, supplierId);

    if (!testResult.success) {
      return { success: false, message: testResult.message };
    }

    const finalIp = testResult.discoveredIp || ip;
    const datalogger = `${finalIp}:${sn}`;

    try {
      const usina = await this.prisma.usina.update({
        where: { id: usinaId },
        data: {
          datalogger,
          status: 'ONLINE',
          dataloggerSupplierId: supplierId || null,
        },
        include: { dataloggerSupplier: true },
      });

      // Faz leitura imediata e salva no cache
      const reading = await this.readUsina(usina.id, usina.name, usina.datalogger, usina.dataloggerSupplier);
      this.readings.set(usina.id, reading);

      this.logger.log(`✅ Monitoramento ativado para usina ${usina.name} → ${datalogger}`);

      return {
        success: true,
        message: `Monitoramento ativado para "${usina.name}"! IP descoberto/configurado: ${finalIp}`,
        reading,
      };
    } catch (e) {
      this.logger.error('Erro ao salvar datalogger:', e);
      return { success: false, message: 'Erro ao salvar configuração no banco de dados.' };
    }
  }
}

