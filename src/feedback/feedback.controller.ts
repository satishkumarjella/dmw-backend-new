import { Controller, Post, Body, Get, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { Feedback } from '../schemas/feedback.schema';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

@Controller('feedback')
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() body: { subProjectId: string; rating: 'like' | 'dislike'; comment: string }): Promise<Feedback> {
    return this.feedbackService.create(req.user._id, body.subProjectId, body.rating, body.comment);
  }

  @UseGuards(JwtAuthGuard)
  @Get('subproject/:subProjectId')
  async findBySubProject(@Request() req, @Param('subProjectId') subProjectId: string): Promise<Feedback[]> {
    return this.feedbackService.findBySubProject(subProjectId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/status')
  async updateStatus(@Request() req, @Param('id') id: string, @Body() body: { status: 'approved' | 'rejected' }): Promise<Feedback> {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') throw new UnauthorizedException('Admins only');
    return this.feedbackService.updateStatus(id, body.status);
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId')
  async getProjectFeedback(@Request() req, @Param('projectId') projectId: string): Promise<any> {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') throw new UnauthorizedException('Admins only');
    return this.feedbackService.getProjectFeedback(projectId);
  }
}