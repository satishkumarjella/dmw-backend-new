import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request, UnauthorizedException, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProjectService } from './project.service';
import { Project } from '../schemas/project.schema';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('projects')
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() body: { name: string }): Promise<Project> {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admins only');
    return this.projectService.create(body.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req): Promise<Project[]> {
    return this.projectService.findAll(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post(':id')
  async update(@Request() req, @Param('id') id: string, @Body() body: any, @UploadedFile() file: Express.Multer.File,): Promise<Project> {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admins only');
    return this.projectService.update(id, file, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string): Promise<void> {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admins only');
    return this.projectService.delete(id);
  }

  @Get('downloadTerms/:id')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const project = await this.projectService.findById(id);
    const document = project.termsFile;
    if (!project.termsFile) {
      throw new Error('File not found')
    }
    res.set({
      'Content-Type': document.contentType,
      'Content-Disposition': `attachment; filename="${document.filename}"`,
    });
    res.send(document.fileData);
  }
}