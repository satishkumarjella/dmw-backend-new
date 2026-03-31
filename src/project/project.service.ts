import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { DocumentFile, Project } from '../schemas/project.schema';
import { ConfigService } from '@nestjs/config';
import { SubProjectService } from '../subproject/subproject.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ProjectService {
  private blobServiceClient: any;
  private containerClient: any;

  constructor(@InjectModel('Project') private projectModel: Model<Project>, private subProjectService: SubProjectService, private configService: ConfigService, private authService: AuthService) {
    const connString: any = this.configService.get<string>('BLOB_CONNECTION_STRING');
    const containerName: any = this.configService.get<string>('BLOB_CONTAINER');
    this.blobServiceClient = BlobServiceClient.fromConnectionString(
      connString
    );
    this.containerClient = this.blobServiceClient.getContainerClient(containerName);
  }

  async create(name: string): Promise<Project> {
    const projectId = uuidv4();
    const blobFolder = `projects/${projectId}`;
    // Create project folder in Azure Blob Storage
    await this.containerClient.createIfNotExists();
    const project = new this.projectModel({ name, subProjects: [], blobFolder, projectTerms: '' });
    return project.save();
  }

  async findAll(user: any): Promise<Project[]> {
    if (user.role === 'admin' || user.role === 'superAdmin') {
      return this.projectModel.find().exec();
    }
    return this.projectModel.find({ _id: { $in: user.projects } }).exec();
  }

  async findById(projectId: string): Promise<Project> {
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new Error('Project not found');
    return project;
  }

  async update(projectId: string, file: Express.Multer.File, body: any): Promise<Project> {
    const project = await this.projectModel.findById(projectId);
    const document = new DocumentFile();
    document.filename = file.originalname;
    document.contentType = file.mimetype;
    document.fileData = file.buffer
    document.uploadDate = new Date();
    if (!project) throw new Error('Project not found');
    project.termsFile = document;
    project.projectTerms = body.terms;
    return project.save();
  }

  async delete(projectId: string): Promise<void> {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new Error('Project not found');
    if (project.subProjects && project.subProjects.length > 0) {
      // Assuming you have access to SubProjectService or handle it here
      for (const subProjectId of project.subProjects) {
        // This ensures files for subprojects are deleted
        await this.subProjectService.deleteSubProject(subProjectId);
      }
    }
    // Delete associated Azure Blob Storage folder
    for await (const blob of this.containerClient.listBlobsFlat({ prefix: project.blobFolder })) {
      await this.containerClient.getBlockBlobClient(blob.name).delete();
    }
    await this.authService.removeProjectFromUsers(projectId, project.subProjects.map(s => s.toString()));
    await project.deleteOne();
  }


}