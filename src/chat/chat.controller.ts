import { Controller, Get, Post, Body, Request, UseGuards, Param } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/auth/jwt/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async getUsers(@Request() req) {
    return this.chatService.getUsers(req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('messages/:recipientId')
  async getMessages(@Request() req, @Param('recipientId') recipientId: string,) {
    return this.chatService.getMessages(req.user._id, recipientId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send')
  async sendMessage(@Request() req, @Body() body: { recipientId: string; content: string }) {
    console.log(req.user);
    const message = await this.chatService.saveMessage(req.user._id, body.recipientId, body.content);
    return message;
  }
}