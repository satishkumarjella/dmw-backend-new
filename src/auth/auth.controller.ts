import { Controller, Post, Body, Get, Request, UseGuards, Put, Delete, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body() body: { email: string, password: string, firstName: string, lastName: string, company: string, phone: string, title: string, companyAddress: string, city: string, state: string, zipcode: string, role: string }) {
    return this.authService.register(body.email, body.password, body.role, body.firstName, body.lastName, body.company, body.phone, body.title, body.companyAddress, body.city, body.state, body.zipcode);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async findBySubProject(@Request() req,) {
    return this.authService.getAllUsers(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('users/update/:id')
  async update(@Param('id') id: string, @Body() body: { email: string, password: string, firstName: string, lastName: string, company: string, phone: string, title: string, companyAddress: string, city: string, state: string, zipcode: string, role: string }, @Request() req) {
    if (req.user.role !== 'admin') throw new Error('Unauthorized');
    return this.authService.updateUser(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('users/delete/:id')
  async delete(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin') throw new Error('Unauthorized');
    return this.authService.deleteUser(id);
  }
}