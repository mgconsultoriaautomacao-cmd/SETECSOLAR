import { Controller, Get, Post, Delete, Query, Param, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { GmailService } from './gmail.service';
import { RoleGuard } from '../auth/role.guard';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('auth-url')
  @UseGuards(RoleGuard)
  getAuthUrl() {
    return this.gmailService.getAuthUrl();
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Res() res: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      if (code) {
        await this.gmailService.handleCallback(code);
      }
      return res.redirect(`${frontendUrl}/financeiro?auth=success`);
    } catch (error) {
      return res.redirect(`${frontendUrl}/financeiro?auth=error&message=${encodeURIComponent(error.message)}`);
    }
  }

  @Get('accounts')
  @UseGuards(RoleGuard)
  listAccounts() {
    return this.gmailService.listAccounts();
  }

  @Post('mock-account')
  @UseGuards(RoleGuard)
  addMockAccount(@Body() body: { email: string; name?: string }) {
    return this.gmailService.addMockAccount(body.email, body.name);
  }

  @Get('emails/:email')
  @UseGuards(RoleGuard)
  getEmails(@Param('email') email: string) {
    return this.gmailService.getEmails(email);
  }

  @Delete('accounts/:id')
  @UseGuards(RoleGuard)
  removeAccount(@Param('id') id: string) {
    return this.gmailService.removeAccount(id);
  }
}
