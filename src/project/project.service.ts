import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '../schemas/project.schema';

@Injectable()
export class ProjectService {
  private blobServiceClient = BlobServiceClient.fromConnectionString(
    'AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;',
  );
  private containerClient = this.blobServiceClient.getContainerClient('project-management');

  constructor(@InjectModel('Project') private projectModel: Model<Project>) {}

  async create(name: string): Promise<Project> {
    const projectId = uuidv4();
    const blobFolder = `projects/${projectId}`;
    // Create project folder in Azure Blob Storage
    await this.containerClient.createIfNotExists();
    const project = new this.projectModel({ name, subProjects: [], blobFolder });
    return project.save();
  }

  async findAll(): Promise<Project[]> {
    return this.projectModel.find().exec();
  }

    async findById(projectId: string): Promise<Project> {
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new Error('Project not found');
    return project;
  }

  async update(projectId: string, name: string): Promise<Project> {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new Error('Project not found');
    project.name = name;
    return project.save();
  }

  async delete(projectId: string): Promise<void> {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new Error('Project not found');
    // Delete associated Azure Blob Storage folder
    for await (const blob of this.containerClient.listBlobsFlat({ prefix: project.blobFolder })) {
      await this.containerClient.getBlockBlobClient(blob.name).delete();
    }
    await project.deleteOne();
  }
}