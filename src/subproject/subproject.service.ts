import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlobSASPermissions, BlobServiceClient, SASProtocol, StorageSharedKeyCredential, generateBlobSASQueryParameters } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '../schemas/project.schema';
import { SubProject } from '../schemas/subproject.schema';
import { User } from '../schemas/user.schema';
import * as archiver from 'archiver';
import * as JSZip from 'jszip';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubProjectService {
  private blobServiceClient: any;
  private containerClient : any;

  constructor(
    @InjectModel('SubProject') private subProjectModel: Model<SubProject>,
    @InjectModel('Project') private projectModel: Model<Project>,
    @InjectModel('User') private userModel: Model<User>,
    private configService: ConfigService
  ) {
      const connString : any = this.configService.get<string>('BLOB_CONNECTION_STRING');
      const containerName: any = this.configService.get<string>('BLOB_CONTAINER');
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        connString
      );
      this.containerClient = this.blobServiceClient.getContainerClient(containerName);
   }

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
    if (user.role === 'admin' || user.role === 'superAdmin') {
      return this.subProjectModel.find({ project: projectId }).exec();
    }
    return this.subProjectModel.find({ $and: [{ project: projectId }, { $or: [{ isPublic: true }, { _id: { $in: user.subProjects } }] }] }).exec();
  }

  async findById(subProjectId: string): Promise<SubProject> {
    const subProject = await this.subProjectModel.findById(subProjectId).exec();
    if (!subProject) throw new Error('SubProject not found');
    return subProject;
  }

  async findAll(user: any): Promise<SubProject[]> {
    if (user.role === 'admin' || user.role === 'superAdmin') {
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
    if (user.role === 'admin' || user.role === 'superAdmin') return true;
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

  async listSubprojects(): Promise<string[]> {
    const subprojects: string[] = [];
    const iter = this.containerClient.listBlobsByHierarchy('/', { prefix: '' });
    for await (const item of iter) {
      if (item.kind === 'prefix') {
        subprojects.push(item.name.replace('/', '')); // e.g., "subproject1/"
      }
    }
    return subprojects;
  }

  async createSubproject(name: string): Promise<void> {
    const blobName = `${name}/`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload('', 0); // Zero-length blob for virtual folder
  }

  async listItems(subproject: string, folder: string = ''): Promise<{ type: 'folder' | 'file'; name: string }[]> {
    const prefix = `${subproject}/${folder}`;
    const items: { type: 'folder' | 'file'; name: string }[] = [];
    const iter = this.containerClient.listBlobsByHierarchy('/', { prefix });
    for await (const item of iter) {
      if (item.kind === 'prefix') {
        items.push({ type: 'folder', name: item.name.replace(prefix, '').replace('/', '') });
      } else {
        items.push({ type: 'file', name: item.name.replace(prefix, '') });
      }
    }
    return items;
  }

  async createFolder(folderPath: string): Promise<void> {
    const blobName = `${folderPath}/`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload('', 0);
  }

  async delete(folderPath: string): Promise<void> {
    const blobName = `${folderPath}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      // List all blobs with the given folder prefix
      const blobItems = this.containerClient.listBlobsFlat({ prefix: folderPath });
      // Delete each blob
      for await (const blobItem of blobItems) {
        const blobClient = this.containerClient.getBlobClient(blobItem.name);
        await blobClient.deleteIfExists();
        console.log(`Deleted blob: ${blobItem.name}`);
      }
      console.log(`All blobs in folder ${folderPath} deleted successfully.`);
    } catch (error: any) {
      console.error(`Error deleting folder ${folderPath}:`, error);
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  }

  async uploadFile(path: string, file: Express.Multer.File): Promise<void> {
    const blobName = `${path}/${file.originalname}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(file.buffer);
  }

  async makeSubProjectPublic(subProjectId: any, isChecked: any, projectId: any) {
    if (isChecked == 'true') {
      await this.userModel.updateMany(
        { role: 'user'},
        { $addToSet: { projects: projectId, subProjects: subProjectId }} 
      )
    } else {
      await this.userModel.updateMany(
        { role: 'user'},
        { $pull: { subProjects: subProjectId }} 
      )
    }
    const subProject = await this.subProjectModel.findById(subProjectId);
    if (!subProject) throw new Error('SubProject not found');
    subProject.isPublic = isChecked;
    return subProject.save();
  }

  async generateUploadSas(containerName: string, blobName: string): Promise<string> {
    const accountName = this.configService.get('AZURE_STORAGE_ACCOUNT_NAME');
    const accountKey = this.configService.get('AZURE_STORAGE_ACCOUNT_KEY');
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    console.log(accountName);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential,
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 30); // 30 min expiry

    const sasOptions = {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('w'), // Write permission
      startsOn: new Date(),
      expiresOn: expiryTime,
      protocol: SASProtocol.Https,
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    return `${blobClient.url}?${sasToken}`;
  }

  async generateDownloadSas(containerName: string, blobPath: string): Promise<string> {
    if (!blobPath) {
      throw new Error('blobPath cannot be undefined or empty');
    }

    const accountName = this.configService.get('AZURE_STORAGE_ACCOUNT_NAME');
    const accountKey = this.configService.get('AZURE_STORAGE_ACCOUNT_KEY');
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential,
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobPath);

    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 30); // 30 min expiry

    const sasOptions = {
      containerName,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse('r'), // Read permission
      startsOn: new Date(),
      expiresOn: expiryTime,
      protocol: SASProtocol.Https,
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
    return `${blobClient.url}?${sasToken}`;
  }

  async generateDownloadSasForFolder(containerName: string, folderPath: string): Promise<{ blobPath: string; sasUrl: string }[]> {
    if (!folderPath) {
      throw new Error('folderPath cannot be undefined or empty');
    }

    const accountName = this.configService.get('AZURE_STORAGE_ACCOUNT_NAME');
    const accountKey = this.configService.get('AZURE_STORAGE_ACCOUNT_KEY');

    if (!accountName || !accountKey) {
      throw new Error('Azure storage credentials are missing');
    }

    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      sharedKeyCredential,
    );

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const sasUrls: { blobPath: string; sasUrl: string }[] = [];

    // Ensure folderPath ends with '/' for prefix matching
    const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

    // List all blobs with the given prefix
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      const blobClient = containerClient.getBlobClient(blob.name);
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 30);

      const sasOptions = {
        containerName,
        blobName: blob.name,
        permissions: BlobSASPermissions.parse('r'), // Read permission
        startsOn: new Date(),
        expiresOn: expiryTime,
        protocol: SASProtocol.Https,
      };

      const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
      sasUrls.push({
        blobPath: blob.name,
        sasUrl: `${blobClient.url}?${sasToken}`,
      });
    }

    if (sasUrls.length === 0) {
      throw new Error(`No blobs found under folder: ${prefix}`);
    }
    return sasUrls;
  }
}

