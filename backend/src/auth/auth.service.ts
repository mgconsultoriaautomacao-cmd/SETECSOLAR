import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private supabaseAdmin: SupabaseClient | null = null;
  private supabaseUrl: string;
  private serviceRoleKey: string;
  private anonKey: string;

  constructor(private prisma: PrismaService) {
    this.supabaseUrl = (process.env.SUPABASE_URL || 'https://dpmpxuahlpxucqeonrhk.supabase.co').replace(/^['"]|['"]$/g, '');
    this.serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/^['"]|['"]$/g, '');
    this.anonKey = (process.env.SUPABASE_ANON_KEY || '').replace(/^['"]|['"]$/g, '');

    const keyToUse = this.serviceRoleKey || this.anonKey;
    if (this.supabaseUrl && keyToUse) {
      this.supabaseAdmin = createClient(this.supabaseUrl, keyToUse, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }

  getSupabaseAdmin(): SupabaseClient {
    if (!this.supabaseAdmin) {
      throw new Error('Supabase client não está inicializado.');
    }
    return this.supabaseAdmin;
  }

  async verifyToken(token: string) {
    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }

    const sb = this.getSupabaseAdmin();
    const { data: { user }, error } = await sb.auth.getUser(token);

    if (error || !user) {
      this.logger.warn(`Falha na validação do token Supabase: ${error?.message || 'Usuário não encontrado'}`);
      throw new UnauthorizedException('Sessão expirada ou token inválido. Faça login novamente.');
    }

    return user;
  }

  async getUserProfile(email: string, sbUser?: any) {
    // 1. Busca na tabela User
    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (dbUser) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        };
      }
    } catch (err: any) {
      this.logger.warn(`Erro ao buscar User no Prisma: ${err.message}. Tentando REST fallback.`);
      try {
        const users = await this.prisma.rest.get('User', `email=eq.${encodeURIComponent(email)}`);
        if (users && users.length > 0) {
          const u = users[0];
          return {
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role,
          };
        }
      } catch {
        // ignora
      }
    }

    // 2. Busca na tabela Client
    try {
      const dbClient = await this.prisma.client.findUnique({
        where: { email },
      });

      if (dbClient) {
        return {
          id: dbClient.id,
          email: dbClient.email,
          name: dbClient.name,
          role: 'CLIENTE',
        };
      }
    } catch {
      // ignora
    }

    // 3. Fallback seguro: role vinda do Supabase ou CLIENTE (NUNCA SUPER_ADMIN por padrão)
    const role = sbUser?.user_metadata?.role;
    const validRoles = ['SUPER_ADMIN', 'GESTOR', 'OPERADOR', 'TECNICO', 'CLIENTE'];
    const safeRole = validRoles.includes(role) ? role : 'CLIENTE';

    return {
      id: sbUser?.id || '',
      email,
      name: sbUser?.user_metadata?.name || email.split('@')[0] || 'Usuário',
      role: safeRole,
    };
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('E-mail e senha são obrigatórios.');
    }

    const sb = this.getSupabaseAdmin();
    const { data, error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const profile = await this.getUserProfile(data.user.email || email, data.user);

    return {
      access_token: data.session.access_token,
      expires_at: data.session.expires_at,
      user: profile,
    };
  }

  async changePassword(userId: string, email: string, currentPass: string, newPass: string) {
    if (!newPass || newPass.length < 10) {
      throw new BadRequestException('A nova senha deve ter no mínimo 10 caracteres.');
    }

    const sb = this.getSupabaseAdmin();

    // Valida a senha atual tentando autenticar
    const { error: verifyError } = await sb.auth.signInWithPassword({
      email,
      password: currentPass,
    });

    if (verifyError) {
      throw new BadRequestException('A senha atual fornecida está incorreta.');
    }

    // Atualiza a senha no Supabase Auth via Admin API
    const { error: updateError } = await sb.auth.admin.updateUserById(userId, {
      password: newPass,
    });

    if (updateError) {
      this.logger.error(`Erro ao atualizar senha no Supabase: ${updateError.message}`);
      throw new BadRequestException(`Não foi possível atualizar a senha: ${updateError.message}`);
    }

    return { success: true, message: 'Senha atualizada com sucesso.' };
  }
}
