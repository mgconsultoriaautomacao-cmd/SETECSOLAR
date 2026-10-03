import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RoleGuard } from './role.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, RoleGuard],
  exports: [AuthService, RoleGuard],
})
export class AuthModule {}
