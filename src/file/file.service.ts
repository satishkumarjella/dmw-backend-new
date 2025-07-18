import { Injectable } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import * as JSZip from 'jszip';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubProject } from '../schemas/subproject.schema';
import { Project } from '../schemas/project.schema';

@Injectable()
export class FileService {
    private blobServiceClient = BlobServiceClient.fromConnectionString(
        'AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;',
    );
    private containerClient = this.blobServiceClient.getContainerClient('project-management');


    constructor(
        @InjectModel('SubProject') private subProjectModel: Model<SubProject>,
        @InjectModel('Project') private projectModel: Model<Project>,
    ) { }

    async uploadFile(file: Express.Multer.File, subProjectId: string): Promise<{ message: any }> {
        const subProject = await this.subProjectModel.findById(subProjectId);
        if (!subProject) throw new Error('SubProject not found');
        const blobName = `${subProject.blobFolder}/files/${uuidv4()}-${file.originalname}`;
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(file.buffer, file.size);
        return { message: `File ${subProjectId} uploaded` };
    }

    async listFiles(subProjectId: string): Promise<{ name: string; url: string }[]> {
        const subProject = await this.subProjectModel.findById(subProjectId);
        if (!subProject) throw new Error('SubProject not found');
        const files: { name: any; url: string, size: number, lastModified: Date }[] = [];
        for await (const blob of this.containerClient.listBlobsFlat({ prefix: `${subProject.blobFolder}/files/` })) {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blob.name);
            const blobClient = this.containerClient.getBlobClient(blob.name);
            const properties = await blobClient.getProperties();
            files.push({ name: blob.name.split('/').pop(), url: blob.name, size: properties.contentLength || 0, lastModified: properties.lastModified || new Date() });
        }
        return files;
    }

    async getFolderSize(prefix: string): Promise<number> {
        let totalSize = 0;
        for await (const blob of this.containerClient.listBlobsFlat({ prefix })) {
            const blobClient = this.containerClient.getBlobClient(blob.name);
            try {
                const properties = await blobClient.getProperties();
                totalSize += properties.contentLength || 0;
            } catch {
                continue; // Skip blobs that can't be accessed
            }
        }
        return totalSize;
    }

    async downloadSubProjectAsZip(subProjectId: string): Promise<Buffer> {
        const subProject = await this.subProjectModel.findById(subProjectId);
        if (!subProject) throw new Error('SubProject not found');
        const zip = new JSZip();
        for await (const blob of this.containerClient.listBlobsFlat({ prefix: `${subProject.blobFolder}/files/` })) {
            const blockBlobClient = this.containerClient.getBlockBlobClient(blob.name);
            const downloadResponse: any = await blockBlobClient.download();
            const buffer = await this.streamToBuffer(downloadResponse.readableStreamBody);
            const temp: any = blob;
            zip.file(temp.name.split('/').pop(), buffer);
        }
        return zip.generateAsync({ type: 'nodebuffer' });
    }

    async downloadProjectAsZip(projectId: string): Promise<Buffer> {
        const project = await this.projectModel.findById(projectId);
        if (!project) throw new Error('Project not found');
        const zip = new JSZip();
        const subProjects = await this.subProjectModel.find({ project: projectId });
        for (const subProject of subProjects) {
            for await (const blob of this.containerClient.listBlobsFlat({ prefix: `${subProject.blobFolder}/files/` })) {
                const blockBlobClient = this.containerClient.getBlockBlobClient(blob.name);
                const downloadResponse: any = await blockBlobClient.download();
                const buffer = await this.streamToBuffer(downloadResponse.readableStreamBody);
                zip.file(`${subProject.name}/${blob.name.split('/').pop()}`, buffer);
            }
        }
        return zip.generateAsync({ type: 'nodebuffer' });
    }

    private async streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            readableStream.on('data', (chunk) => chunks.push(chunk));
            readableStream.on('end', () => resolve(Buffer.concat(chunks)));
            readableStream.on('error', reject);
        });
    }

    async deleteFile(subProjectId: string, id: string) {
        const subProject = await this.subProjectModel.findById(subProjectId);
        if (!subProject) throw new Error('SubProject not found');
        const blobName = `${subProject.blobFolder}/files/${id}`;
        const blobClient = this.containerClient.getBlockBlobClient(blobName);
        await blobClient.delete();
        return { message: `File ${id} deleted` };
    }

    async downloadFile(blobPath: string): Promise<Buffer> {
        const blobClient = this.containerClient.getBlobClient(blobPath);
        const downloadResponse: any = await blobClient.download();
        const downloaded = await this.streamToBuffer(downloadResponse.readableStreamBody);
        return downloaded;
    }
}