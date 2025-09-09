import { Controller, Post, Body, Get, Param, UseGuards, Request, Res, UnauthorizedException, Delete, StreamableFile, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Response } from 'express';
import { SubProjectService } from './subproject.service';
import { SubProject } from '../schemas/subproject.schema';
import { FileService } from '../file/file.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Get()
  async getSubprojects() {
    return this.subProjectService.listSubprojects();
  }

  @Post(':subproject')
  async createSubproject(@Param('subproject') subproject: string) {
    await this.subProjectService.createSubproject(subproject);
    return { message: `Subproject ${subproject} created` };
  }

  @Get(':subproject')
  async getItems(@Param('subproject') subproject: string, @Query('folder') folder: string = '') {
    return this.subProjectService.listItems(subproject, folder);
  }

  @Post('subproject/folders')
  async createFolder(@Body('folderPath') folderPath: string) {
    await this.subProjectService.createFolder(folderPath);
    return { message: `Folder created in ${folderPath}` };
  }

  @Post('subproject/delete')
  async deleteFilePath(@Body('filePath') filePath: string) {
    await this.subProjectService.delete(filePath);
    return { message: `Folder created in ${filePath}` };
  }

  @Post('subproject/deleteFolder')
  async deleteFolderPath(@Body('folderPath') folderPath: string) {
    await this.subProjectService.deleteFolder(folderPath);
    return { message: `Folder created in ${folderPath}` };
  }

  @Post('subproject/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Query('path') path: string = '',
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.subProjectService.uploadFile(path, file);
    return { message: `File uploaded to ${path}` };
  }

  @UseGuards(JwtAuthGuard)
  @Get('subproject/makePublic/:subProjectId/:isChecked')
  async makeSubProjectPublic(@Param('subProjectId') subProjectId: string, @Param('isChecked') isChecked: boolean) {
    await this.subProjectService.makeSubProjectPublic(subProjectId, isChecked);
    return {message: 'successfully updated'}
  }
}