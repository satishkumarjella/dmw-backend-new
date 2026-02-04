import { Controller, Post, Body, Get, Request, UseGuards, Put, Delete, Param, UnauthorizedException, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body() body: { email: string, password: string, firstName: string, lastName: string, company: string, phone: string, title: string, companyAddress: string, city: string, state: string, zipcode: string, role: string, termsAccepted: boolean, signature: string, trade: string }) {
    return this.authService.register(body.email, body.password, body.role, body.firstName, body.lastName, body.company, body.phone, body.title, body.companyAddress, body.city, body.state, body.zipcode, body.termsAccepted, body.signature, body.trade);
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
  async getUsers(@Request() req) {
    return this.authService.getAllUsers(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getUser(@Request() req) {
    return this.authService.getUser(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('users/update/:id')
  async update(@Param('id') id: string, @Body() body: { email: string, password: string, firstName: string, lastName: string, company: string, phone: string, title: string, companyAddress: string, city: string, state: string, zipcode: string, role: string }, @Request() req) {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') throw new UnauthorizedException('Unauthorized');
    return this.authService.updateUser(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('users/updateProjectTerms/:id')
  async updateProjectTerms(@Param('id') id: string, @Body() body: { projectTerms: any }, @Request() req) {
    return this.authService.updateProjectTerms(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('users/delete/:id')
  async delete(@Param('id') id: string, @Request() req) {
    // Check if the requesting user is an admin or superAdmin
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      throw new UnauthorizedException('Only admins or superAdmins can delete users');
    }

    // Fetch the target user's details to check their role
    const targetUser = await this.authService.getUserById(id);
    if (!targetUser) {
      throw new UnauthorizedException('User not found');
    }

    // Only superAdmin can delete an admin
    if (targetUser.role === 'admin' && req.user.role !== 'superAdmin') {
      throw new UnauthorizedException('Only superAdmins can delete admin users');
    }

    // Allow deletion if the target is a user, or if the requester is a superAdmin
    return this.authService.deleteUser(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/subprojects/:id')
  async getAllSubprojects(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') throw new UnauthorizedException('Unauthorized');
    return this.authService.getUsersForSubproject(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('users/subprojects/:userId/:projectId/:id')
  async deleteSubProjectForUser(@Param('userId') userId: string, @Param('projectId') projectId: string, @Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') throw new UnauthorizedException('Unauthorized');
    return this.authService.deleteSubProjectForUser(userId, projectId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/export-excel')
  async exportUsersToExcel(@Request() req, @Res() res: Response) {
    if (req.user.role !== 'superAdmin') {
      throw new UnauthorizedException('Only super admins can export users data');
    }
    const buffer = await this.authService.exportUsersToExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=users_data.xlsx',
    });
    res.send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/filter')
  async filterUsers(@Body() filter: any, @Request() req) {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      throw new UnauthorizedException('Only admins or super admins can filter users');
    }
    return this.authService.filterUsers(filter);
  }

  @Post('users/shareSubProject')
  async share(@Body() body: {
    emails: string[], link: string, subject: string,
    message: string
  }) {
    await this.authService.shareLink(body.emails, body.link, body.subject, body.message);
    return { message: 'Emails sent successfully' };
  }
}