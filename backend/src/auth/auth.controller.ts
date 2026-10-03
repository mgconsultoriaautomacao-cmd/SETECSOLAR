import { Controller, Get, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RoleGuard } from './role.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(RoleGuard)
  async getProfile(@Req() req: any) {
    return req.user;
  }

  @Post('change-password')
  @UseGuards(RoleGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(
      req.user.id,
      req.user.email,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { success: true, message: 'Logout realizado com sucesso.' };
  }
}
