import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ChatMessage } from 'src/schemas/chat.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name) private messageModel: Model<ChatMessage>,
    private authService: AuthService
  ) {}

  async getUsers(currentUserId: string) {
    return this.authService.userModel.find({ _id: { $ne: currentUserId } }).select('username role firstName lastName email');
  }

  async getMessages(senderId: string, recipientId: string) {
    return this.messageModel.find({
      $or: [
        { recipientId },
        { senderId: recipientId, recipientId: senderId }
      ]
    }).sort('timestamp');
  }

  async saveMessage(senderId: string, recipientId: string, content: string) {
    const message = new this.messageModel({ senderId, recipientId, content });
    return message.save();
  }
}