import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

// ─── Service Principal ────────────────────────────────────────────────────────

@Injectable()
export class SolarmanService implements OnModuleInit {
  private readonly logger = new Logger(SolarmanService.name);
  private readings = new Map<string, DeviceReading>();

  constructor(private prisma: PrismaService) {}

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
      select: { id: true, name: true, datalogger: true },
    });

    if (usinas.length === 0) {
      this.logger.debug('Nenhuma usina com datalogger configurado.');
      return;
    }

    this.logger.log(`🔄 Polling de ${usinas.length} usina(s)...`);

    for (const usina of usinas) {
      const reading = await this.readUsina(usina.id, usina.name, usina.datalogger);
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
  async readUsina(usinaId: string, usinaNome: string, datalogger: string): Promise<DeviceReading> {
    // Valida formato "IP:SN"
    if (!datalogger.includes(':')) {
      this.logger.warn(`Usina "${usinaNome}" com formato inválido de datalogger: "${datalogger}". Use "IP:SN".`);
      return {
        usinaId, usinaNome,
        deviceSn: datalogger,
        ipAddress: '',
        powerNow: null, generationToday: null, generationTotal: null,
        gridVoltage: null, gridFrequency: null, temperature: null, dcPower: null,
        status: 'NOT_CONFIGURED',
        lastUpdate: new Date(),
        errorMessage: 'Formato inválido. Use "IP:SN" (ex: 177.83.14.55:2375000001)',
      };
    }

    const [ip, snStr] = datalogger.split(':');
    const serialNumber = parseInt(snStr, 10);

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

    const result = await readStickDirect(ip, serialNumber, this.logger);

    if (!result || result.registers.length === 0) {
      this.logger.warn(`  ✗ ${usinaNome} — sem resposta (offline ou port forwarding não configurado)`);
      return {
        usinaId, usinaNome, deviceSn: snStr, ipAddress: ip,
        powerNow: null, generationToday: null, generationTotal: null,
        gridVoltage: null, gridFrequency: null, temperature: null, dcPower: null,
        status: 'OFFLINE',
        lastUpdate: new Date(),
        errorMessage: 'Sem resposta do WiFi Stick. Verifique o port forwarding.',
      };
    }

    const parsed = parseRegisters(result.registers);
    this.logger.log(`  ✔ ${usinaNome} — ${parsed.status ?? 'ONLINE'} — ${(parsed.powerNow ?? 0).toFixed(2)} kW`);

    return {
      usinaId, usinaNome, deviceSn: snStr, ipAddress: ip,
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
  async testConnection(ip: string, sn: string): Promise<{
    success: boolean;
    message: string;
    data?: Partial<DeviceReading>;
  }> {
    if (!ip || !sn) {
      return { success: false, message: 'IP e SN são obrigatórios.' };
    }

    const serialNumber = parseInt(sn, 10);
    if (isNaN(serialNumber)) {
      return { success: false, message: 'SN inválido. Deve ser um número (ex: 2375000001).' };
    }

    this.logger.log(`🔍 Testando conexão: ${ip}:8899 (SN: ${serialNumber})`);

    const result = await readStickDirect(ip, serialNumber, this.logger);

    if (!result || result.registers.length === 0) {
      return {
        success: false,
        message: `Sem resposta do WiFi Stick em ${ip}:8899. Verifique:\n• Se o IP está correto\n• Se o port forwarding da porta 8899 está ativo no roteador\n• Se o SN (número de série) é o correto (etiqueta no stick)`,
      };
    }

    const parsed = parseRegisters(result.registers);
    this.logger.log(`✔ Teste OK — ${(parsed.powerNow ?? 0).toFixed(2)} kW agora`);

    return {
      success: true,
      message: `✅ Datalogger respondeu! ${ip}:8899 (SN ${sn})`,
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
  async activateMonitoring(usinaId: string, ip: string, sn: string): Promise<{
    success: boolean;
    message: string;
    reading?: DeviceReading;
  }> {
    const testResult = await this.testConnection(ip, sn);

    if (!testResult.success) {
      return { success: false, message: testResult.message };
    }

    const datalogger = `${ip}:${sn}`;

    try {
      const usina = await this.prisma.usina.update({
        where: { id: usinaId },
        data: { datalogger, status: 'ONLINE' },
        select: { id: true, name: true, datalogger: true },
      });

      // Faz leitura imediata e salva no cache
      const reading = await this.readUsina(usina.id, usina.name, usina.datalogger);
      this.readings.set(usina.id, reading);

      this.logger.log(`✅ Monitoramento ativado para usina ${usina.name} → ${datalogger}`);

      return {
        success: true,
        message: `Monitoramento ativado para "${usina.name}"! Próxima leitura automática em 5 minutos.`,
        reading,
      };
    } catch (e) {
      this.logger.error('Erro ao salvar datalogger:', e);
      return { success: false, message: 'Erro ao salvar configuração no banco de dados.' };
    }
  }
}

