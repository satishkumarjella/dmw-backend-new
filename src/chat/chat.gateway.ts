import { WebSocketGateway, SubscribeMessage, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: true })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private chatService: ChatService, private jwtService: JwtService) {}


  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth.token;
      const payload = this.jwtService.verify(token);
      socket.data.user = payload;
      socket.join(payload.sub);
    } catch (error) {
      socket.emit('error', { message: 'Authentication failed' });
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    console.log(`User disconnected: ${socket.id}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(socket: Socket, data: { recipientId: string; content: string }) {
    console.log(`Received sendMessage event from ${socket.data.user.username}:`, data);
    try {
      const senderId = socket.data.user.sub;
      const message = {senderId, recipientId: data.recipientId, content: data.content};
      this.server.to(senderId).emit('newMessage', message);
      this.server.to(data.recipientId).emit('newMessage', message);
      return message;
    } catch (error) {
      console.error(`Message send failed: ${error}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }
}