import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { NoticeBoardService } from './notice-board.service';

@Controller('notice-board/:subProjectId')
export class NoticeBoardController {
  constructor(private readonly noticeBoardService: NoticeBoardService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll(@Param('subProjectId') subProjectId: string) {
    return this.noticeBoardService.getNoticesBySubProject(subProjectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@Param('subProjectId') subProjectId: string, @Param('id') id: string) {
    return this.noticeBoardService.getNoticeById(id, subProjectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Param('subProjectId') subProjectId: string, @Body() body: { title: string; description?: string; filePath: string; recipients?: string[]; visibleToUsers?: boolean, subProjectId: string }, @Request() req) {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      throw new UnauthorizedException('Only admins can create notice board items');
    }
    return this.noticeBoardService.createNotice({
      ...body,
      subProjectId: subProjectId,
      createdBy: req.user.sub,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('subProjectId') subProjectId: string, @Param('id') id: string, @Body() body: { title?: string; description?: string; filePath?: string; recipients?: string[]; visibleToUsers?: boolean }, @Request() req) {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      throw new UnauthorizedException('Only admins can update notice board items');
    }
    return this.noticeBoardService.updateNotice(id, subProjectId, {
      ...body,
      updatedBy: req.user.sub,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('subProjectId') subProjectId: string, @Param('id') id: string, @Request() req) {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      throw new UnauthorizedException('Only admins can delete notice board items');
    }
    return this.noticeBoardService.deleteNotice(id, subProjectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/file-preview')
  async getFilePreview(@Param('subProjectId') subProjectId: string, @Param('id') id: string) {
    return this.noticeBoardService.getFilePreview(id, subProjectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/notify')
  async sendEmail(
    @Param('subProjectId') subProjectId: string,
    @Param('id') id: string,
    @Body() body: { userIds?: string[]; emails?: string[]; subject?: string; message?: string },
    @Request() req,
  ) {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      throw new UnauthorizedException('Only admins can send notice board emails');
    }
    return this.noticeBoardService.sendNoticeEmail(id, subProjectId, body);
  }
}
