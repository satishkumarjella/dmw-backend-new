import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NoticeBoard } from '../schemas/notice-board.schema';
import { FileService } from '../file/file.service';
import { MailerService } from '@nestjs-modules/mailer';
import { User } from '../schemas/user.schema';
import { SubProject } from '../schemas/subproject.schema';
import { Project } from '../schemas/project.schema';

@Injectable()
export class NoticeBoardService {
  constructor(
    @InjectModel(NoticeBoard.name) private noticeBoardModel: Model<NoticeBoard>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(SubProject.name) private subProjectModel: Model<SubProject>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    private fileService: FileService,
    private mailerService: MailerService,
  ) {}

  async createNotice(data: {
    title: string;
    description?: string;
    filePath: string;
    recipients?: string[];
    visibleToUsers?: boolean;
    subProjectId: string;
    createdBy: string;
  }) {
    if (!data.title || !data.filePath || !data.subProjectId) {
      throw new BadRequestException('title, filePath, and subProject are required');
    }
    const notice = new this.noticeBoardModel({
      title: data.title,
      description: data.description || '',
      filePath: data.filePath,
      recipients: data.recipients || [],
      visibleToUsers: data.visibleToUsers !== false,
      subProjectId: new Types.ObjectId(data.subProjectId),
      createdBy: new Types.ObjectId(data.createdBy),
      updatedBy: new Types.ObjectId(data.createdBy),
    });
    return notice.save();
  }

  async updateNotice(id: string, subProjectId: string, data: Partial<{ title: string; description: string; filePath: string; recipients: string[]; visibleToUsers: boolean; updatedBy: string; }>) {
    const notice = await this.noticeBoardModel.findOne({ _id: id, subProjectId: new Types.ObjectId(subProjectId) });
    if (!notice) {
      throw new NotFoundException('Notice board item not found');
    }
    if (data.title !== undefined) notice.title = data.title;
    if (data.description !== undefined) notice.description = data.description;
    if (data.filePath !== undefined) notice.filePath = data.filePath;
    if (data.recipients !== undefined) notice.recipients = data.recipients;
    if (data.visibleToUsers !== undefined) notice.visibleToUsers = data.visibleToUsers;
    if (data.updatedBy !== undefined) notice.updatedBy = new Types.ObjectId(data.updatedBy);
    return notice.save();
  }

  async deleteNotice(id: string, subProjectId: string) {
    const item = await this.noticeBoardModel.findOneAndDelete({ _id: id, subProjectId: new Types.ObjectId(subProjectId) });
    if (!item) {
      throw new NotFoundException('Notice board item not found');
    }
    return item;
  }

  async getNoticeById(id: string, subProjectId: string) {
    const item = await this.noticeBoardModel.findOne({ _id: id, subProjectId: new Types.ObjectId(subProjectId) }).exec();
    if (!item) {
      throw new NotFoundException('Notice board item not found');
    }
    return item;
  }

  async getNoticesBySubProject(subProjectId: string) {
    return this.noticeBoardModel.find({ subProjectId: new Types.ObjectId(subProjectId) }).sort({ createdAt: -1 }).exec();
  }

  async getFilePreview(id: string, subProjectId: string) {
    const item = await this.getNoticeById(id, subProjectId);
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      filePath: item.filePath,
      content: await this.fileService.readFileAsText(item.filePath),
    };
  }

  async sendNoticeEmail(id: string, subProjectId: string, payload: { userIds?: string[]; emails?: string[]; subject?: string; message?: string }) {
    const notice = await this.getNoticeById(id, subProjectId);
    
    let emails: string[] = [];
    if (payload.userIds && payload.userIds.length > 0) {
      const users = await this.userModel.find({ _id: { $in: payload.userIds } }).select('email').exec();
      emails = users.map((u) => u.email);
    } else if (payload.emails && payload.emails.length > 0) {
      emails = payload.emails;
    } else {
      emails = (await this.userModel.find({ role: 'user' }).select('email').exec()).map((u) => u.email);
    }

    if (!emails.length) {
      throw new BadRequestException('No recipients found to send email');
    }

    const subProject = await this.subProjectModel.findById(subProjectId).exec();
    const projectId = subProject ? subProject.project : '';
    const project: any = projectId ? await this.projectModel.findById(projectId).exec() : null;
    
    const fileName = notice.filePath ? notice.filePath.split('/').pop() : '';
    const projectLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/layout/dashboard/${projectId}/${subProjectId}`;
    const projectName = project ? project.name || project.title : 'Unknown Project';
    const subProjectName = subProject ? (subProject as any).name : 'Unknown SubProject';

    const htmlContent = `
      <p>${payload.message || 'A notice has been posted.'}</p>
      <h3>${notice.title}</h3>
      <p>${notice.description}</p>
      <p><strong>Customer:</strong> ${projectName}</p>
      <p><strong>Project:</strong> ${subProjectName}</p>
      <p><strong>File Path:</strong> ${notice.filePath}</p>
      ${fileName ? `<p><strong>File:</strong> ${fileName}</p>` : ''}
      <br/>
      <p><a href="${projectLink}" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px;">Open Project</a></p>
      <br/>
      <p>The notice board item is available in the system and links to the referenced file.</p>
    `;

    await this.mailerService.sendMail({
      to: emails,
      subject: payload.subject || `Notice Board Update: ${notice.title}`,
      html: htmlContent,
    });

    return { message: 'Email sent successfully', recipients: emails.length };
  }
}
