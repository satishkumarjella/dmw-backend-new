import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionService } from './question.service';
import { Question, QuestionSchema } from '../schemas/question.schema';
import { SubProject, SubProjectSchema } from '../schemas/subproject.schema';
import { QuestionController } from './question.controller';
import { SubProjectModule } from '../subproject/subproject.module';
import { AuthModule } from '../auth/auth.module';
import { Project, ProjectSchema } from 'src/schemas/project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: SubProject.name, schema: SubProjectSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: 'Bulletin', schema: QuestionSchema },
    ]),
    AuthModule,
    forwardRef(() => SubProjectModule), // Use forwardRef to break circular dependency
  ],
  controllers: [QuestionController],
  providers: [QuestionService],
})
export class QuestionModule {}