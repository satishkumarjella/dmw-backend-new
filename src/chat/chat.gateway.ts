import { WebSocketGateway, SubscribeMessage, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ChatMessage } from 'src/schemas/chat.schema';
import { UnreadCount } from 'src/schemas/unread.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
    @InjectModel(ChatMessage.name) private messageModel: Model<ChatMessage>,
    @InjectModel(UnreadCount.name) private unreadCountModel: Model<UnreadCount>,
  ) {}

  async handleConnection(@ConnectedSocket() socket: Socket) {
    try {
      const token = socket.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      socket.data.user = payload;
      socket.join(payload.sub); // Join user's own ID for direct notifications
      console.log(`User connected: ${socket.id} (${payload.username})`);
    } catch (error) {
      console.error(`Authentication failed for socket ${socket.id}: ${error.message}`);
      socket.emit('error', { message: 'Authentication failed' });
      socket.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    console.log(`User disconnected: ${socket.id}`);
  }

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @MessageBody() data: { recipientId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const senderId = socket.data.user.sub;
      const conversationId = this.chatService.getConversationId(senderId, data.recipientId);
      socket.join(conversationId);
      await this.chatService.resetUnreadCount(conversationId, senderId);
      const count = await this.chatService.getUnreadCount(conversationId, senderId);
      socket.emit('unreadCount', { conversationId, count });
      console.log(`User ${senderId} joined conversation ${conversationId}`);
    } catch (error) {
      console.error(`Join conversation failed: ${error.message}`);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  }

  @SubscribeMessage('leaveConversation')
  handleLeaveConversation(
    @MessageBody() data: { recipientId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const senderId = socket.data.user.sub;
      const conversationId = this.chatService.getConversationId(senderId, data.recipientId);
      socket.leave(conversationId);
      console.log(`User ${senderId} left conversation ${conversationId}`);
    } catch (error) {
      console.error(`Leave conversation failed: ${error.message}`);
      socket.emit('error', { message: 'Failed to leave conversation' });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() data: { recipientId: string; content: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const senderId = socket.data.user.sub;
      const conversationId = this.chatService.getConversationId(senderId, data.recipientId);

      const message = {senderId, recipientId: data.recipientId, content: data.content, timestamp: new Date()};

      // Emit to conversation room (includes sender and recipient if they joined)
      this.server.to(conversationId).emit('newMessage', message);

      // Check if recipient is in the conversation room
      const clientsInConversation = this.server.sockets.adapter.rooms.get(conversationId) || new Set();
      const recipientInConversation = Array.from(clientsInConversation).some(
        (clientId) => this.server.sockets.sockets.get(clientId)?.data.user.sub === data.recipientId,
      );

      // Emit to recipient's userId only if they are not in the conversation room
      if (!recipientInConversation) {
        this.server.to(data.recipientId).emit('newMessage', message);
        await this.chatService.incrementUnreadCount(conversationId, data.recipientId);
        const count = await this.chatService.getUnreadCount(conversationId, data.recipientId);
        this.server.to(data.recipientId).emit('unreadNotification', {
          conversationId,
          senderId,
          count,
          messagePreview: data.content.substring(0, 50) + '...',
        });
      }

      console.log(`Message sent in conversation ${conversationId} by ${senderId}: ${data.content}`);
      return message;
    } catch (error) {
      console.error(`Message send failed: ${error.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('getUnreadCount')
  async handleGetUnread(
    @MessageBody() data: { recipientId: string },
    @ConnectedSocket() socket: Socket,
  ) {
    try {
      const userId = socket.data.user.sub;
      const conversationId = this.chatService.getConversationId(userId, data.recipientId);
      const count = await this.chatService.getUnreadCount(conversationId, userId);
      socket.emit('unreadCount', { conversationId, count });
    } catch (error) {
      console.error(`Get unread count failed: ${error.message}`);
      socket.emit('error', { message: 'Failed to get unread count' });
    }
  }
}