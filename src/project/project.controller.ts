import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { Project } from '../schemas/project.schema';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

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
  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() body: { name: string }): Promise<Project> {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admins only');
    return this.projectService.update(id, body.name);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Request() req, @Param('id') id: string): Promise<void> {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admins only');
    return this.projectService.delete(id);
  }
}