import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FileController } from './file.controller';
import { Project, ProjectSchema } from '../schemas/project.schema';
import { SubProject, SubProjectSchema } from '../schemas/subproject.schema';
import { SubProjectModule } from '../subproject/subproject.module';
import { FileService } from './file.service';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: SubProject.name, schema: SubProjectSchema },
    ]),
    forwardRef(() => SubProjectModule),
    AuthModule
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}