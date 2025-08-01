import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Question } from '../schemas/question.schema';
import { SubProject } from '../schemas/subproject.schema';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QuestionService {

  private blobServiceClient = BlobServiceClient.fromConnectionString(
    'AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;',
  );
  private containerClient = this.blobServiceClient.getContainerClient('project-management');
  constructor(
    @InjectModel('Question') private questionModel: Model<Question>,
    @InjectModel('Bulletin') private bulletinModel: Model<Question>,
    @InjectModel('SubProject') private subProjectModel: Model<SubProject>,
  ) { }

  async create(userId: string, text: string, subProjectId: string, file: Express.Multer.File): Promise<Question> {
    const subProject = await this.subProjectModel.findById(subProjectId);
    if (!subProject) throw new Error('SubProject not found');
    let fileName = '';
    if (file) {
      fileName = await this.uploadQuestionFile(file, subProjectId);
    }
    const question: any = new this.questionModel({ text, user: userId, subProject: subProjectId, blobFolder: fileName });
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
    if (user.role === 'admin') {
      return this.questionModel.find({ subProject: subProjectId }).populate('user', 'email company').exec();
    }
    return this.questionModel.find({ subProject: subProjectId, user: user._id }).populate('user', 'email company').exec();
  }

  async answer(id: string, answer: any): Promise<any> {
    return this.questionModel.findByIdAndUpdate(id, { answer }, { new: true }).exec();
  }

  async findAdminAlerts(): Promise<Question[]> {
    return this.questionModel.find({ answer: null }).populate('user', 'email company').populate('subProject', 'name').exec();
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