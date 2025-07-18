import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { SubProjectModule } from '../subproject/subproject.module';
import { Feedback, FeedbackSchema } from '../schemas/feedback.schema';
import { SubProject, SubProjectSchema } from '../schemas/subproject.schema';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Feedback.name, schema: FeedbackSchema },
            { name: SubProject.name, schema: SubProjectSchema },
        ]),
        forwardRef(() => SubProjectModule),
        AuthModule
    ],
    controllers: [FeedbackController],
    providers: [FeedbackService],
})
export class FeedbackModule { }