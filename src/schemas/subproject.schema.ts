import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema()
export class SubProject extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  project: string;

  @Prop({ required: true })
  blobFolder: string; // e.g., projects/projectId/subprojectId

  @Prop()
  isPublic: boolean; // e.g., projects/projectId/subprojectId

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Question' }] })
  questions: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Feedback' }] })
  feedback: string[];
}

export const SubProjectSchema = SchemaFactory.createForClass(SubProject);