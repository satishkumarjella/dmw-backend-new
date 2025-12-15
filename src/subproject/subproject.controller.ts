import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
  Delete,
  StreamableFile,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Patch,
} from '@nestjs/common';
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
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Request() req,
    @Body() body: { name: string; projectId: string },
  ): Promise<SubProject> {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin')
      throw new UnauthorizedException('Admins only');
    return this.subProjectService.create(body.name, body.projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':projectId')
  async findByProject(
    @Request() req,
    @Param('projectId') projectId: string,
  ): Promise<SubProject[]> {
    return this.subProjectService.findByProject(projectId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/assign')
  async assignUser(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { userId: string; projectId: string },
  ): Promise<void> {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin')
      throw new UnauthorizedException('Admins only');
    return this.subProjectService.assignUser(id, body.userId, body.projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/download')
  async downloadZip(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
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
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin')
      throw new UnauthorizedException('Admins only');
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
  async getItems(
    @Param('subproject') subproject: string,
    @Query('folder') folder: string = '',
  ) {
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
  @Get('subproject/makePublic/:subProjectId/:isChecked/:projectId')
  async makeSubProjectPublic(
    @Param('subProjectId') subProjectId: string,
    @Param('isChecked') isChecked: boolean,
    @Param('projectId') projectId: string,
  ) {
    await this.subProjectService.makeSubProjectPublic(
      subProjectId,
      isChecked,
      projectId,
    );
    return { message: 'successfully updated' };
  }

  @Post('subproject/generatesas')
  async generate(@Body() body: { containerName: string; blobPath: string }) {
    const { containerName, blobPath } = body;

    // Validate inputs
    if (!containerName) {
      throw new BadRequestException('containerName is required');
    }
    if (!blobPath) {
      throw new BadRequestException('blobPath is required and cannot be empty');
    }

    const sasUrl = await this.subProjectService.generateUploadSas(
      containerName,
      blobPath,
    );
    return { sasUrl };
  }

  @Post('subproject/downloadsas')
  async generateDownload(
    @Body() body: { containerName: string; blobPath: string },
  ) {
    const { containerName, blobPath } = body;

    if (!containerName) {
      throw new BadRequestException('containerName is required');
    }
    if (!blobPath) {
      throw new BadRequestException('blobPath is required and cannot be empty');
    }

    const sasUrl = await this.subProjectService.generateDownloadSas(
      containerName,
      blobPath,
    );
    console.log(sasUrl);
    return { sasUrl };
  }

  @Post('subproject/downloadzipsas')
  async generateFolderDownload(
    @Body() body: { containerName: string; folderPath: string },
  ) {
    const { containerName, folderPath } = body;

    if (!containerName) {
      throw new BadRequestException('containerName is required');
    }
    if (!folderPath) {
      throw new BadRequestException(
        'folderPath is required and cannot be empty',
      );
    }
    const sasUrls = await this.subProjectService.generateDownloadSasForFolder(
      containerName,
      folderPath,
    );
    return { sasUrls };
  }

  // User submits bid
  @UseGuards(JwtAuthGuard)
  @Post(':id/bid')
  async submitBid(
    @Request() req,
    @Param('id') subProjectId: string,
    @Body() body: { bidMessage: string; amount?: number },
  ): Promise<{ message: string; bidId: string }> {
    if (req.user.role !== 'user') {
      throw new UnauthorizedException('Only users can submit bids');
    }
    return this.subProjectService.submitBid(
      subProjectId,
      req.user._id.toString(),
      body,
    );
  }

  // Admin updates bid status
  @UseGuards(JwtAuthGuard)
  @Patch(':id/bid/:bidId')
  async updateBidStatus(
    @Request() req,
    @Param('id') subProjectId: string,
    @Param('bidId') bidId: string,
    @Body() body: { status: 'accepted' | 'rejected'; adminNote?: string },
  ): Promise<{ message: string }> {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      throw new UnauthorizedException('Admins only');
    }
    return this.subProjectService.updateBidStatus(subProjectId, bidId, body);
  }

  // Get all bids for subproject
  @UseGuards(JwtAuthGuard)
  @Get(':id/bids')
  async getSubprojectBids(
    @Param('id') subProjectId: string,
    @Request() req,
  ): Promise<any[]> {
    return this.subProjectService.getSubprojectBids(subProjectId, req.user);
  }

  // Admin dashboard: All bids across all subprojects
  @UseGuards(JwtAuthGuard)
  @Get('bids')
  async getAllBids(
    @Request() req,
    @Query('status') status?: string,
  ): Promise<any[]> {
    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      throw new UnauthorizedException('Admins only');
    }
    return this.subProjectService.getAllBids(status);
  }
}
