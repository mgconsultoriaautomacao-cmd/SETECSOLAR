import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url || '';
    const method = request.method;

    // Rotas públicas que não requerem autenticação
    if (
      path.includes('/auth/login') ||
      path.includes('/gmail/callback') ||
      path === '/' ||
      path === '/api' ||
      path === '/api/'
    ) {
      return true;
    }

    // Extração do cabeçalho de autorização
    const authHeader = request.headers['authorization'];
    if (!authHeader || typeof authHeader !== 'string') {
      this.logger.warn(`Tentativa de acesso não autenticado bloqueada na rota ${method} ${path}`);
      throw new UnauthorizedException('Token de autenticação não fornecido. Faça login para continuar.');
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn(`Cabeçalho de autorização malformado na rota ${method} ${path}`);
      throw new UnauthorizedException('Formato do token inválido. O cabeçalho deve ser no formato "Bearer <token>".');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Token vazio. Faça login para continuar.');
    }

    // Verificação criptográfica do token junto ao Supabase
    let sbUser: any;
    try {
      sbUser = await this.authService.verifyToken(token);
    } catch (err: any) {
      this.logger.warn(`Token inválido ou expirado em ${method} ${path}: ${err.message}`);
      throw new UnauthorizedException('Sessão expirada ou token inválido. Efetue login novamente.');
    }

    // Busca perfil e papel (role) real do usuário
    const profile = await this.authService.getUserProfile(sbUser.email || '', sbUser);
    const { role, email } = profile;

    // Restrições de autorização por papel (RBAC)
    const isWriteAction = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    // 1. Clientes não podem acessar rotas administrativas sensíveis
    if (role === 'CLIENTE') {
      const isRestrictedForClient =
        path.includes('/financial') ||
        path.includes('/datalogger-supplier') ||
        path.includes('/gmail') ||
        (path.includes('/client') && isWriteAction) ||
        (path.includes('/usina') && isWriteAction);

      if (isRestrictedForClient) {
        this.logger.warn(`Acesso negado para cliente ${email} na rota ${method} ${path}`);
        throw new ForbiddenException('Acesso negado: clientes não têm permissão para acessar ou modificar esta área.');
      }
    }

    // 2. Operações de escrita em configurações/fornecedores/financeiro restritas a SUPER_ADMIN e GESTOR
    if (isWriteAction) {
      const isSystemAdminPath =
        path.includes('/datalogger-supplier') ||
        path.includes('/financial') ||
        path.includes('/gmail');

      if (isSystemAdminPath && role !== 'SUPER_ADMIN' && role !== 'GESTOR') {
        this.logger.warn(`Tentativa de modificação em rota administrativa por ${email} (${role})`);
        throw new ForbiddenException('Apenas Administradores e Gestores podem alterar esses dados.');
      }
    }

    // Anexa informações verificadas e seguras à requisição
    request.user = profile;

    return true;
  }
}
