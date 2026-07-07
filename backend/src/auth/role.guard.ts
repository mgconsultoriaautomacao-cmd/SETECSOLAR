import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RoleGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const role = request.headers['x-user-role'];
    const email = request.headers['x-user-email'];

    if (!role || !email) {
      throw new UnauthorizedException('Perfil de acesso não autenticado.');
    }

    const isWriteAction = ['POST', 'PUT', 'DELETE'].includes(request.method);

    if (isWriteAction) {
      // Only SUPER_ADMIN and GESTOR can register/edit/delete clients and plants
      if (role !== 'SUPER_ADMIN' && role !== 'GESTOR') {
        throw new ForbiddenException('Acesso negado para alteração de dados.');
      }
    }

    // Attach user information to request
    request.user = { role, email };

    return true;
  }
}
