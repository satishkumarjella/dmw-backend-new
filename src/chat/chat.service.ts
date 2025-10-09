import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ChatMessage } from 'src/schemas/chat.schema';
import { UnreadCount } from 'src/schemas/unread.schema';


@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name) private messageModel: Model<ChatMessage>,
    @InjectModel(UnreadCount.name) private unreadCountModel: Model<UnreadCount>,
    private authService: AuthService,
  ) {}

  // Generate conversationId (sorted user IDs)
  getConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  async getUsers(currentUserId: string) {
    return this.authService.userModel.find({ _id: { $ne: currentUserId } }).select('username role firstName lastName email company');
  }

  async getMessages(senderId: string, recipientId: string) {
    const conversationId = this.getConversationId(senderId, recipientId);
    return this.messageModel.find({
      $or: [
        { senderId, recipientId },
        { senderId: recipientId, recipientId: senderId },
      ],
    }).sort('timestamp');
  }

  async saveMessage(senderId: string, recipientId: string, content: string) {
    const conversationId = this.getConversationId(senderId, recipientId);
    const message = new this.messageModel({ senderId, recipientId, content });
    await message.save();
    return message;
  }

  async incrementUnreadCount(conversationId: string, userId: string) {
    await this.unreadCountModel.updateOne(
      { conversationId, userId },
      { $inc: { count: 1 } },
      { upsert: true },
    );
  }

  async resetUnreadCount(conversationId: string, userId: string) {
    await this.unreadCountModel.updateOne(
      { conversationId, userId },
      { $set: { count: 0 } },
      { upsert: true },
    );
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const unread = await this.unreadCountModel.findOne({ conversationId, userId });
    return unread?.count || 0;
  }
}