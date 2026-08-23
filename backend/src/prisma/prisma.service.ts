import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Prisma connected to PostgreSQL directly.');
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn('Direct PostgreSQL socket connection unavailable. Using Supabase REST API fallback.');
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }

  // REST Fallback Client para Vercel Serverless
  get rest() {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://dpmpxuahlpxucqeonrhk.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbXB4dWFobHB4dWNxZW9ucmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTcxNTYsImV4cCI6MjA5Njc3MzE1Nn0.KiC0krWgbb2CDJRmQ8HPxDZD2g71ZyePtQuYQ0ZQnCY';

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    return {
      async get(table: string, queryParams: string = '') {
        const url = `${supabaseUrl}/rest/v1/${table}?${queryParams}`;
        const res = await axios.get(url, { headers, timeout: 10000 });
        return res.data;
      },
      async post(table: string, data: any) {
        const url = `${supabaseUrl}/rest/v1/${table}`;
        const res = await axios.post(url, data, { headers, timeout: 10000 });
        return Array.isArray(res.data) ? res.data[0] : res.data;
      },
      async patch(table: string, id: string, data: any) {
        const url = `${supabaseUrl}/rest/v1/${table}?id=eq.${id}`;
        const res = await axios.patch(url, data, { headers, timeout: 10000 });
        return Array.isArray(res.data) ? res.data[0] : res.data;
      },
      async delete(table: string, id: string) {
        const url = `${supabaseUrl}/rest/v1/${table}?id=eq.${id}`;
        const res = await axios.delete(url, { headers, timeout: 10000 });
        return Array.isArray(res.data) ? res.data[0] : res.data;
      }
    };
  }
}
