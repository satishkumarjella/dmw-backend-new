import { Controller, Post, Get, Param, UseGuards, Request, Res, UploadedFile, UseInterceptors, UnauthorizedException, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileService } from './file.service';
import { SubProjectService } from '../subproject/subproject.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

@Controller('files')
export class FileController {
  constructor(
    private fileService: FileService,
    private subProjectService: SubProjectService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post(':subProjectId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Request() req,
    @Param('subProjectId') subProjectId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ message: string }> {
    if (req.user.role !== 'admin') {
      throw new UnauthorizedException('Admins only');
    }
    // Verify user has access to subproject
    const subProjects = await this.subProjectService.findByProject(
      (await this.subProjectService.findById(subProjectId)).project.toString(),
      req.user,
    );
    if (!subProjects.some((sp: any) => sp._id.toString() === subProjectId)) {
      throw new UnauthorizedException('Access denied to subproject');
    }
    return this.fileService.uploadFile(file, subProjectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':subProjectId')
  async listFiles(@Request() req, @Param('subProjectId') subProjectId: string): Promise<{ name: string; url: string }[]> {
    // Verify user has access to subproject
    const subProjects = await this.subProjectService.findByProject(
      (await this.subProjectService.findById(subProjectId)).project.toString(),
      req.user,
    );
    if (!subProjects.some((sp: any) => sp._id.toString() === subProjectId)) {
      throw new UnauthorizedException('Access denied to subproject');
    }
    return this.fileService.listFiles(subProjectId);
  }


  @UseGuards(JwtAuthGuard)
  @Get(':subProjectId/:path')
  async listFilesFromPath(@Request() req, @Param('subProjectId') subProjectId: string, @Param('path') path: string): Promise<{ name: string; url: string }[]> {
    // Verify user has access to subproject
    console.log(subProjectId, path)
    const subProjects = await this.subProjectService.findByProject(
      (await this.subProjectService.findById(subProjectId)).project.toString(),
      req.user,
    );
    if (!subProjects.some((sp: any) => sp._id.toString() === subProjectId)) {
      throw new UnauthorizedException('Access denied to subproject');
    }
    return this.fileService.listFiles(subProjectId, path);
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId/download')
  async downloadProjectZip(@Request() req, @Param('projectId') projectId: string, @Res() res: Response): Promise<void> {
    // Verify user has access to at least one subproject in the project
    const subProjects = await this.subProjectService.findByProject(projectId, req.user);
    if (subProjects.length === 0) {
      throw new UnauthorizedException('Access denied to project');
    }
    const zipBuffer = await this.fileService.downloadProjectAsZip(projectId);
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=project-${projectId}.zip`,
    });
    res.send(zipBuffer);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':subProjectId/:id')
  async delete(@Request() req, @Param('subProjectId') subProjectId: string, @Param('id') id: string): Promise<{ message: string }> {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admins only');
    return this.fileService.deleteFile(subProjectId, id);
  }

  @Get('download/:blobPath')
  async downloadFile(@Param('blobPath') blobPath: string, @Res() res: Response) {
    try {
      const buffer = await this.fileService.downloadFile(blobPath);
      const fileName = blobPath.split('/').pop();

      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      res.send(buffer);
    } catch (error) {
      res.status(500).send('Error downloading file');
    }
  }
}