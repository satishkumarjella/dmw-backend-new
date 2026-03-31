import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Question } from '../schemas/question.schema';
import { SubProject } from '../schemas/subproject.schema';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class QuestionService {

  private blobServiceClient: any;
  private containerClient: any;
  constructor(
    @InjectModel('Question') private questionModel: Model<Question>,
    @InjectModel('Bulletin') private bulletinModel: Model<Question>,
    @InjectModel('SubProject') private subProjectModel: Model<SubProject>,
    private configService: ConfigService,
    private authService: AuthService
  ) { 
      const containerName: any = this.configService.get<string>('BLOB_CONTAINER');
      const connString : any = this.configService.get<string>('BLOB_CONNECTION_STRING')
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        connString
      );
      this.containerClient = this.blobServiceClient.getContainerClient(containerName);
  }

  async create(userId: string, text: string, subProjectId: string, projectId: string, file: Express.Multer.File): Promise<Question> {
    const subProject = await this.subProjectModel.findById(subProjectId);
    if (!subProject) throw new Error('SubProject not found');
    let fileName = '';
    if (file) {
      fileName = await this.uploadQuestionFile(file, subProjectId);
    }

    const question: any = new this.questionModel({ text, user: userId, subProject: subProjectId, project: projectId, blobFolder: fileName });
    await question.save();
    subProject.questions.push(question._id);
    await subProject.save();
    return question;
  }

  async createBulletin(userId: string, id: string): Promise<any> {
    const question = await this.questionModel.findById(id);
    return await this.bulletinModel.insertMany(question);
  }

  async getAllBulletins(subProjectId): Promise<Question[]> {
    return this.bulletinModel.find({ subProject: subProjectId }).exec();
  }

  async findBySubProject(subProjectId: string, user: any): Promise<Question[]> {
    if (user.role === 'admin' || user.role === 'superAdmin') {
      return this.questionModel.find({ subProject: subProjectId }).populate('user', 'email company firstName lastName').exec();
    }
    return this.questionModel.find({ subProject: subProjectId, user: user._id }).populate('user', 'email company firstName lastName').exec();
  }

  async answer(id: string, answer: any, link: any): Promise<Question> {
    const question = await this.questionModel.findByIdAndUpdate(id, { answer }, { new: true }).populate('user').exec();
    if (!question) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }
    if (question.user) {
      const user: any = question.user;
      await this.authService.sendQuestionAnsweredEmail(user, question.text, link);
    }
    return question;
  }

  async findAdminAlerts(): Promise<Question[]> {
    return this.questionModel.find({ answer: null, isRead: { $ne: true } }).populate('user', 'email company').populate('subProject', 'name').populate('project').exec();
  }

  async markAsRead(id: string): Promise<Question> {
    const question = await this.questionModel.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true },
    ).exec();
    if (!question) {
      throw new NotFoundException(`Question with ID "${id}" not found`);
    }
    return question;
  }

  async uploadQuestionFile(file: Express.Multer.File, subProjectId: string): Promise<string> {
    const subProject = await this.subProjectModel.findById(subProjectId);
    if (!subProject) throw new Error('SubProject not found');
    const blobName = `${subProject.blobFolder}/files/${uuidv4()}-${file.originalname}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(file.buffer, file.size);
    return blobName;
  }

  async deletebulletin(bulletinId: string): Promise<void> {
    const bulletin = await this.bulletinModel.findById(bulletinId);
    await bulletin?.deleteOne();
  }

  async deleteQuestion(subProjectId: string, questionId: string): Promise<void> {
    const bulletin = await this.questionModel.findById(questionId);
    await bulletin?.deleteOne();
    const subProject = await this.subProjectModel.findById(subProjectId);
    if (!subProject) throw new Error('SubProject not found');
    subProject.questions.filter(item => item !== questionId);
    await subProject.save();
  }
}