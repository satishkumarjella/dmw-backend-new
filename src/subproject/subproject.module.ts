import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../schemas/project.schema';
import { SubProject, SubProjectSchema } from '../schemas/subproject.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { SubProjectController } from './subproject.controller';
import { SubProjectService } from './subproject.service';
import { FileModule } from '../file/file.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubProject.name, schema: SubProjectSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => FileModule)
  ],
  controllers: [SubProjectController],
  providers: [SubProjectService],
exports: [SubProjectService], // Export SubProjectService for FileModule
})
export class SubProjectModule {}