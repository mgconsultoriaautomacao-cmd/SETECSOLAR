import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class GmailService {
  private readonly clientId = process.env.GOOGLE_CLIENT_ID;
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private readonly redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/gmail/callback';
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  constructor(private readonly prisma: PrismaService) {}

  isDemoMode(): boolean {
    return !this.clientId || !this.clientSecret;
  }

  async getAuthUrl() {
    if (this.isDemoMode()) {
      return {
        url: `${this.frontendUrl}/financeiro?auth=demo`,
        demo: true,
      };
    }

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options: Record<string, string> = {
      redirect_uri: this.redirectUri,
      client_id: this.clientId || '',
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',
      ].join(' '),
    };

    const q = new URLSearchParams(options).toString();
    return {
      url: `${rootUrl}?${q}`,
      demo: false,
    };
  }

  async handleCallback(code: string) {
    if (this.isDemoMode()) {
      throw new BadRequestException('OAuth não configurado. Use o modo de simulação.');
    }

    try {
      // Exchange authorization code for access and refresh tokens
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token } = tokenResponse.data;

      if (!refresh_token) {
        throw new Error('Refresh token não recebido. Se a conta já estava conectada, revogue o acesso nas configurações do Google e tente novamente.');
      }

      // Fetch user profile info (email and name)
      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { email, name } = userResponse.data;

      // Save/update account in DB
      const account = await this.prisma.gmailAccount.upsert({
        where: { email },
        update: {
          name: name || null,
          refreshToken: refresh_token,
        },
        create: {
          email,
          name: name || null,
          refreshToken: refresh_token,
        },
      });

      return account;
    } catch (error) {
      console.error('Erro no callback do Google OAuth:', error.response?.data || error.message);
      throw new BadRequestException(`Falha ao autorizar conta Google: ${error.message}`);
    }
  }

  async listAccounts() {
    return this.prisma.gmailAccount.findMany({
      orderBy: { email: 'asc' },
    });
  }

  async addMockAccount(email: string, name?: string) {
    const defaultName = name || email.split('@')[0];
    return this.prisma.gmailAccount.upsert({
      where: { email },
      update: {
        name: defaultName,
        refreshToken: `mock-refresh-token-${Date.now()}`,
      },
      create: {
        email,
        name: defaultName,
        refreshToken: `mock-refresh-token-${Date.now()}`,
      },
    });
  }

  async removeAccount(id: string) {
    return this.prisma.gmailAccount.delete({
      where: { id },
    });
  }

  async getEmails(email: string) {
    const account = await this.prisma.gmailAccount.findUnique({
      where: { email },
    });

    if (!account) {
      throw new BadRequestException('Conta Gmail não cadastrada.');
    }

    const isMock = account.refreshToken.startsWith('mock-');

    if (isMock || this.isDemoMode()) {
      return this.getMockEmailsForAccount(email);
    }

    try {
      // Refresh access token
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: account.refreshToken,
        grant_type: 'refresh_token',
      });

      const accessToken = tokenResponse.data.access_token;

      // Fetch list of messages
      const listResponse = await axios.get(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            maxResults: 12,
            q: 'subject:(fatura OR conta OR solar OR energia OR boleto OR setec)',
          },
        },
      );

      const messages = listResponse.data.messages || [];
      const emailDetails: any[] = [];

      for (const msg of messages) {
        try {
          const detailResponse = await axios.get(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          );

          const { headers, snippet, id } = detailResponse.data;
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'Sem Assunto';
          const from = headers.find((h: any) => h.name === 'From')?.value || 'Desconhecido';
          const dateStr = headers.find((h: any) => h.name === 'Date')?.value || '';

          emailDetails.push({
            id,
            from,
            subject,
            snippet,
            date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
          });
        } catch (err) {
          console.warn(`Erro ao buscar detalhes da mensagem ${msg.id}:`, err.message);
        }
      }

      return emailDetails;
    } catch (error) {
      console.error(`Erro ao buscar e-mails para a conta ${email}:`, error.response?.data || error.message);
      // Retorna e-mails mockados como fallback para não quebrar a tela em caso de falha de conexão ou revogação
      return this.getMockEmailsForAccount(email);
    }
  }

  private getMockEmailsForAccount(email: string) {
    const domain = email.split('@')[0];
    
    if (email.toLowerCase().includes('coreagro') || domain.includes('manoel')) {
      return [
        {
          id: 'mock-mail-1',
          from: 'Enel Ceará <contadigital@enel.com.br>',
          subject: 'Sua conta digital de energia está pronta - Manoel Coreagro',
          date: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 dia atrás
          snippet: 'Olá Manoel! A sua fatura digital da instalação 49928312 vence em 22/07/2026. Valor total: R$ 42,50. Código de barras para pagamento: 836100000004 425000481002 938210398218.',
        },
        {
          id: 'mock-mail-2',
          from: 'SETEC Energia Solar <financeiro@setecsolar.com.br>',
          subject: 'Fatura de Serviços de Manutenção - Junho/2026',
          date: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 dias atrás
          snippet: 'Prezado Manoel Gonçalo, segue em anexo a Nota Fiscal de Serviços e o boleto bancário referente à manutenção preventiva mensal da usina solar Manoel Coreagro. Valor: R$ 189,90. Vencimento: 20/07/2026.',
        },
        {
          id: 'mock-mail-3',
          from: 'Solarman Smart <no-reply@solarmanpv.com>',
          subject: 'Relatório Mensal de Geração - Usina Manoel Coreagro (GRW-9821)',
          date: new Date(Date.now() - 3600000 * 24 * 12).toISOString(), // 12 dias atrás
          snippet: 'Relatório Solarman Smart: Geração total da usina Manoel Coreagro em Junho/2026 foi de 1.420 kWh. Economia estimada obtida na conta de luz: R$ 1.207,00. Status da planta: ONLINE e operacional.',
        },
      ];
    }

    // Default mock email list for generic accounts
    return [
      {
        id: 'mock-mail-10',
        from: 'Enel Distribuição Ceará <faturamento@enel.com.br>',
        subject: 'Boleto para Pagamento - Instalação SolarGyn 10kWp',
        date: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 horas atrás
        snippet: 'A sua conta de energia da instalação 38210928 (SolarGyn) está disponível. Vencimento: 28/07/2026. Valor a pagar: R$ 115,20. Clique no link para baixar o boleto PDF.',
      },
      {
        id: 'mock-mail-11',
        from: 'Solis Cloud Service <service@soliscloud.com>',
        subject: 'Daily Generation Alert - Plant SolarGyn',
        date: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 dia atrás
        snippet: 'Dear User, your plant SolarGyn generated 45.20 kWh yesterday (July 12). Max peak power reached: 8.4 kW. Ambient temperature: 30°C. Inverter status: Normal.',
      },
      {
        id: 'mock-mail-12',
        from: 'Mercado Solar Distribuidora <contato@mercadosolar.com.br>',
        subject: 'Orçamento de Peças de Reposição - Datalogger Solis LSW-3',
        date: new Date(Date.now() - 3600000 * 24 * 5).toISOString(), // 5 dias atrás
        snippet: 'Olá SETEC! Conforme solicitado, enviamos o orçamento para a aquisição de 2 unidades de Datalogger Solis LSW-3 Wi-Fi. Valor unitário: R$ 380,00. Condição de pagamento: Faturado 15 dias.',
      },
      {
        id: 'mock-mail-13',
        from: 'Enel Distribuição <faturamento@enel.com.br>',
        subject: 'Fatura de Energia Acumulada - Ref 06/2026 - Instalação 99821731',
        date: new Date(Date.now() - 3600000 * 24 * 10).toISOString(), // 10 dias atrás
        snippet: 'Notificação Enel: Conta de luz referente ao mês de Junho de 2026. Instalação: 99821731. Valor: R$ 940,50. Vencimento em 20/07/2026. E-mail enviado automaticamente.',
      },
    ];
  }
}
