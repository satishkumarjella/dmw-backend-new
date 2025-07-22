import { Controller, Post, Body, Get, Param, UseGuards, Request, Res, UnauthorizedException, Delete, StreamableFile, Query } from '@nestjs/common';
import { Response } from 'express';
import { SubProjectService } from './subproject.service';
import { SubProject } from '../schemas/subproject.schema';
import { FileService } from '../file/file.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { Logger } from '@nestjs/common';

@Controller('subprojects')
export class SubProjectController {
  constructor(
    private subProjectService: SubProjectService,
    private fileService: FileService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() body: { name: string; projectId: string }): Promise<SubProject> {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admins only');
    return this.subProjectService.create(body.name, body.projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':projectId')
  async findByProject(@Request() req, @Param('projectId') projectId: string): Promise<SubProject[]> {
    return this.subProjectService.findByProject(projectId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/assign')
  async assignUser(@Request() req, @Param('id') id: string, @Body() body: { userId: string, projectId: string }): Promise<void> {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admins only');
    return this.subProjectService.assignUser(id, body.userId, body.projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/download')
  async downloadZip(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const zipBuffer = await this.fileService.downloadSubProjectAsZip(id);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=subproject-${id}.zip`,
    });
    res.send(zipBuffer);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string): Promise<void> {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admins only');
    return this.subProjectService.deleteSubProject(id);
  }
}