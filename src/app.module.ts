import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SubProjectModule } from './subproject/subproject.module';
import { FileModule } from './file/file.module';
import { QuestionModule } from './question/question.module';
import { ProjectModule } from './project/project.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot('mongodb://localhost:27017/dmw'),
    JwtModule.register({
      secret: 'your-secret-key',
      signOptions: { expiresIn: '1h' },
      global: true
    }),
    AuthModule,
    ProjectModule,
    SubProjectModule,
    FileModule,
    QuestionModule,
    FeedbackModule,
    ChatModule
  ],
})
export class AppModule {}