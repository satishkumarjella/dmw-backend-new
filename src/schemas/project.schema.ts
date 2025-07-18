import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema()
export class Project extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'SubProject' }] })
  subProjects: string[];

  @Prop({ required: true })
  blobFolder: string; // e.g., projects/projectId
}

export const ProjectSchema = SchemaFactory.createForClass(Project);