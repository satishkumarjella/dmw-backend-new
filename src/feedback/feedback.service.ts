import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feedback } from '../schemas/feedback.schema';
import { SubProject } from '../schemas/subproject.schema';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel('Feedback') private feedbackModel: Model<Feedback>,
    @InjectModel('SubProject') private subProjectModel: Model<SubProject>,
  ) {}

  async create(userId: string, subProjectId: string, rating: 'like' | 'dislike', comment: string): Promise<Feedback> {
    const feedback = new this.feedbackModel({
      user: userId,
      subProject: subProjectId,
      rating,
      comment,
      status: 'pending',
    });
    const subProject: any = await this.subProjectModel.findById(subProjectId);
    subProject.feedback.push(feedback._id);
    await subProject.save();
    return feedback.save();
  }

  async findBySubProject(subProjectId: string, user: any): Promise<Feedback[]> {
    if (user.role === 'admin') {
      return this.feedbackModel.find({ subProject: subProjectId }).populate('user').exec();
    }
    return this.feedbackModel.find({ subProject: subProjectId, user: user._id }).populate('user').exec();
  }

  async updateStatus(id: string, status: 'approved' | 'rejected'): Promise<any> {
    return this.feedbackModel.findByIdAndUpdate(id, { status }, { new: true }).exec();
  }

  async getProjectFeedback(projectId: string): Promise<any> {
    const subProjects = await this.subProjectModel.find({ project: projectId }).exec();
    const feedback = await this.feedbackModel
      .find({ subProject: { $in: subProjects.map((sp) => sp._id) } })
      .populate('user')
      .exec();
    const stats: any = {};
    feedback.forEach((fb: any) => {
      const company = fb.user.company;
      if (!stats[company]) {
        stats[company] = { likes: 0, dislikes: 0, approved: 0, rejected: 0 };
      }
      stats[company][fb.rating]++;
      if (fb.status === 'approved') stats[company].approved++;
      if (fb.status === 'rejected') stats[company].rejected++;
    });
    return Object.entries(stats).map(([company, data]: [string, any]) => ({
      company,
      ...data,
      approvalRate: data.approved / (data.approved + data.rejected || 1),
      rejectionRate: data.rejected / (data.approved + data.rejected || 1),
    }));
  }
}