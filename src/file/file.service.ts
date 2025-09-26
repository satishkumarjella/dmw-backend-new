import { Injectable } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import JSZip from 'jszip';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubProject } from '../schemas/subproject.schema';
import { Project } from '../schemas/project.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FileService {
    private blobServiceClient: any;
    private containerClient: any;
    constructor(
        @InjectModel('SubProject') private subProjectModel: Model<SubProject>,
        @InjectModel('Project') private projectModel: Model<Project>,
        private configService: ConfigService
    ) {
        const connString : any = this.configService.get<string>('BLOB_CONNECTION_STRING');
        const containerName: any = this.configService.get<string>('BLOB_CONTAINER');
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
        connString
        );
        this.containerClient = this.blobServiceClient.getContainerClient(containerName);
    }

    async uploadFile(file: Express.Multer.File, subProjectId: string): Promise<{ message: any }> {
        const subProject = await this.subProjectModel.findById(subProjectId);
        if (!subProject) throw new Error('SubProject not found');
        const blobName = `${subProject.blobFolder}/files/${file.originalname}`;
        const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.upload(file.buffer, file.size);
        return { message: `File ${subProjectId} uploaded` };
    }

    // async listFiles(subProjectId: string): Promise<{ name: string; url: string }[]> {
    //     const subProject = await this.subProjectModel.findById(subProjectId);
    //     if (!subProject) throw new Error('SubProject not found');
    //     const files: { name: any; url: string, size: number, lastModified: Date }[] = [];
    //     for await (const blob of this.containerClient.listBlobsFlat({ prefix: `${subProject.blobFolder}/` })) {
    //         const blockBlobClient = this.containerClient.getBlockBlobClient(blob.name);
    //         const blobClient = this.containerClient.getBlobClient(blob.name);
    //         const properties = await blobClient.getProperties();
    //         files.push({ name: blob.name.split('/').pop(), url: blob.name, size: properties.contentLength || 0, lastModified: properties.lastModified || new Date() });
    //     }
    //     return files;
    // }

    // async listFiles(subProjectId: string, folder: string = ''): Promise<any[]> {
    //     const subProject = await this.subProjectModel.findById(subProjectId);
    //     if (!subProject) throw new Error('SubProject not found');
    //     console.log(subProject.blobFolder);
    //     const prefix = `${subProject.blobFolder}/files`;
    //     const items: { type: 'folder' | 'file'; name: string }[] = [];
    //     const iter = this.containerClient.listBlobsByHierarchy('/', { prefix });
    //     for await (const item of iter) {
    //         if (item.kind === 'prefix') {
    //             items.push({ type: 'folder', name: item.name.replace(prefix, '').replace('/', '') });
    //         } else {
    //             items.push({ type: 'file', name: item.name.replace(prefix, '') });
    //         }
    //     }
    //     return items;
    // }
    async listFiles(subProjectId: string, folder: string = '') {
        const blobs: any = [];
        const subProject = await this.subProjectModel.findById(subProjectId);
        if (!subProject) throw new Error('SubProject not found');
        let prefix;
        prefix = `${subProject.blobFolder}/files/`;
        if (folder) {
            prefix = folder + '/';
        }
        for await (const item of this.containerClient.listBlobsByHierarchy('/', {
            prefix,
            includeMetadata: true
        })) {
            if (item.kind === 'prefix') {
                const size = await this.getFolderSize(item.name);
                // Handle virtual directory (folder)
                blobs.push({
                    name: item.name,
                    isFolder: true,
                    path: item.name,
                    metadata: item,
                    prefix,
                    size,
                    lastModified: new Date(), // Folders don't have lastModified; use current date
                });
                // }

            } else if (item.kind === 'blob') {
                // Handle blob (file)
                const blobClient = this.containerClient.getBlobClient(item.name);
                try {
                    const properties = await blobClient.getProperties();
                    blobs.push({
                        name: item.name,
                        isFolder: false,
                        path: item.name,
                        prefix,
                        metadata: item.metadata,
                        size: properties.contentLength || 0,
                        lastModified: properties.lastModified || new Date(),
                    });
                } catch {
                    continue; // Skip inaccessible blobs
                }
                // }
            }
        }
        return this.buildTree(blobs, prefix);
    }

    private buildTree(blobs: any[], prefix: string): any {
        const tree: any[] = [];
        const map = new Map();

        blobs.forEach(blob => {
            const relativePath = prefix ? blob.name.substring(prefix.length) : blob.name;
            const parts = relativePath.split('/').filter(p => p);
            let current: any = tree;
            let path = prefix;

            parts.forEach((part, index) => {
                path += (path && !path.endsWith('/') ? '/' : '') + part;
                if (!map.has(path)) {
                    const node = {
                        name: part,
                        path,
                        isFolder: blob.isFolder || index < parts.length - 1,
                        children: blob.isFolder || index < parts.length - 1 ? [] : undefined,
                        metadata: blob.metadata,
                        size: blob.size,
                        prefix,
                        lastModified: blob.lastModified
                    };
                    map.set(path, node);
                    current.push(node);
                    if (node.isFolder) {
                        current = node.children;
                    }
                } else if (map.get(path).isFolder) {
                    current = map.get(path).children;
                }
            });
        });
        return tree;
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

    async deleteFolder(path: string, user: any) {
        if (user.role !== 'admin') {
            throw new Error('Unauthorized');
        }
        for await (const blob of this.containerClient.listBlobsFlat({ prefix: path })) {
            const blobClient = this.containerClient.getBlockBlobClient(blob.name);
            await blobClient.delete();
        }
        return { message: `Folder ${path} deleted` };
    }


    async downloadFile(blobPath: string): Promise<Buffer> {
        const blobClient = this.containerClient.getBlobClient(blobPath);
        const downloadResponse: any = await blobClient.download();
        const downloaded = await this.streamToBuffer(downloadResponse.readableStreamBody);
        return downloaded;
    }
}