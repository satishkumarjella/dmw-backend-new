import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectSchema } from '../schemas/project.schema';
import { SubProjectModule } from '../subproject/subproject.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Project', schema: ProjectSchema }]),
  forwardRef(() => SubProjectModule),
  AuthModule], // Use forwardRef to avoid circular dependency],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}