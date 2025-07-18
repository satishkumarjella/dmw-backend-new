import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { ChatMessage, ChatMessageSchema } from 'src/schemas/chat.schema';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ChatMessage.name, schema: ChatMessageSchema }]),
    AuthModule
  ],
  providers: [ChatGateway, ChatService],
  controllers: [ChatController]
})
export class ChatModule {}