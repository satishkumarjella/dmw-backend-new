import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NoticeBoardController } from './notice-board.controller';
import { NoticeBoardService } from './notice-board.service';
import { NoticeBoard, NoticeBoardSchema } from '../schemas/notice-board.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { FileModule } from '../file/file.module';
import { MailModule } from '../mail.module';
import { SubProject, SubProjectSchema } from '../schemas/subproject.schema';
import { Project, ProjectSchema } from '../schemas/project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NoticeBoard.name, schema: NoticeBoardSchema },
      { name: User.name, schema: UserSchema },
      { name: SubProject.name, schema: SubProjectSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    forwardRef(() => FileModule),
    MailModule,
  ],
  controllers: [NoticeBoardController],
  providers: [NoticeBoardService],
  exports: [NoticeBoardService],
})
export class NoticeBoardModule {}
