import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '../schemas/project.schema';
import { SubProject } from '../schemas/subproject.schema';
import { User } from '../schemas/user.schema';
import * as archiver from 'archiver';
import JSZip from 'jszip';

@Injectable()
export class SubProjectService {
  private blobServiceClient = BlobServiceClient.fromConnectionString(
    'AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;',
  );
  private containerClient = this.blobServiceClient.getContainerClient('project-management');

  constructor(
    @InjectModel('SubProject') private subProjectModel: Model<SubProject>,
    @InjectModel('Project') private projectModel: Model<Project>,
    @InjectModel('User') private userModel: Model<User>,
  ) { }

  async create(name: string, projectId: string): Promise<SubProject> {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new Error('Project not found');
    const subProjectId = uuidv4();
    const blobFolder = `${project.blobFolder}/${subProjectId}`;
    await this.containerClient.createIfNotExists();
    const subProject: any = new this.subProjectModel({ name, project: projectId, blobFolder, questions: [], feedback: [] });
    await subProject.save();
    project.subProjects.push(subProject._id);
    await project.save();
    return subProject;
  }

  async findByProject(projectId: string, user: any): Promise<SubProject[]> {
    if (user.role === 'admin') {
      return this.subProjectModel.find({ project: projectId }).exec();
    }
    return this.subProjectModel.find({ project: projectId, _id: { $in: user.subProjects } }).exec();
  }

  async findById(subProjectId: string): Promise<SubProject> {
    const subProject = await this.subProjectModel.findById(subProjectId).exec();
    if (!subProject) throw new Error('SubProject not found');
    return subProject;
  }

  async findAll(user: any): Promise<SubProject[]> {
    if (user.role === 'admin') {
      return this.subProjectModel.find().exec();
    }
    return this.subProjectModel.find({ _id: { $in: user.subProjects } }).exec();
  }

  async updateSubProject(subProjectId: string, name: string): Promise<SubProject> {
    const subProject = await this.subProjectModel.findById(subProjectId);
    if (!subProject) throw new Error('SubProject not found');
    subProject.name = name;
    return subProject.save();
  }

  async deleteSubProject(subProjectId: string): Promise<void> {
    const subProject = await this.subProjectModel.findById(subProjectId);
    if (!subProject) throw new Error('SubProject not found');
    for await (const blob of this.containerClient.listBlobsFlat({ prefix: subProject.blobFolder })) {
      await this.containerClient.getBlockBlobClient(blob.name).delete();
    }
    await this.projectModel.updateOne(
      { subProjects: subProjectId },
      { $pull: { subProjects: subProjectId } },
    );
    await this.userModel.updateMany(
      { subProjects: subProjectId },
      { $pull: { subProjects: subProjectId } },
    );
    await subProject.deleteOne();
  }

  async assignUser(subProjectId: string, userId: string, projectId: string): Promise<void> {
    const subProject = await this.subProjectModel.findById(subProjectId);
    if (!subProject) throw new Error('SubProject not found');
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new Error('Project not found');
    const user = await this.userModel.findById(userId);
    if (!user) throw new Error('User not found');
    if (!user.subProjects.includes(subProjectId)) {
      user.subProjects.push(subProjectId);
    }
    if (!user.projects.includes(projectId)) {
      user.projects.push(projectId);
    }
    await user.save();
  }

  async hasAccess(subProjectId: string, user: any): Promise<boolean> {
    if (user.role === 'admin') return true;
    return user.subProjects.some((id: string) => id.toString() === subProjectId);
  }

  async removeUserFromSubProjects(userId: string): Promise<void> {
    await this.userModel.updateMany(
      { subProjects: { $exists: true } },
      { $pull: { subProjects: { $in: (await this.userModel.findById(userId))?.subProjects } } },
    );
  }

  async downloadFolderAsZip(folderPath: string): Promise<any> {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const buffers: Buffer[] = [];

    archive.on('data', (data) => buffers.push(data));
    archive.on('error', (err) => { throw err; });
    const subProject = await this.subProjectModel.findById(folderPath);
    if (!subProject) throw new Error('SubProject not found');
    const prefix = `${subProject.blobFolder}/files/`;
    for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
      const blobClient = this.containerClient.getBlockBlobClient(blob.name);
      const downloadResponse = await blobClient.download();
      const stream = downloadResponse.readableStreamBody;
      if (stream) {
        const relativePath = blob.name.slice(prefix.length);
        archive.append(stream, { name: relativePath });
      }
    }
    archive.finalize();
    return new Promise((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', reject);
    });
  }


  // async downloadFolderAsZip(subProjectId: string): Promise<Buffer> {
  //   const subProject = await this.subProjectModel.findById(subProjectId);
  //   if (!subProject) throw new Error('SubProject not found');
  //   const zip = new JSZip();
  //   for await (const blob of this.containerClient.listBlobsFlat({ prefix: `${subProject.blobFolder}/files/` })) {
  //     const blockBlobClient = this.containerClient.getBlockBlobClient(blob.name);
  //     const downloadResponse: any = await blockBlobClient.download();
  //     const buffer = await this.streamToBuffer(downloadResponse.readableStreamBody);
  //     const temp: any = blob;
  //     zip.file(temp.name.split('/').pop(), buffer);
  //   }
  //   return zip.generateAsync({ type: 'nodebuffer' });
  // }

  // private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
  //   return new Promise((resolve, reject) => {
  //     const chunks: Buffer[] = [];
  //     readableStream.on('data', (chunk) => chunks.push(chunk));
  //     readableStream.on('end', () => resolve(Buffer.concat(chunks)));
  //     readableStream.on('error', reject);
  //   });
  // }
}

