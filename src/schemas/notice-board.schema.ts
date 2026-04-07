import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class NoticeBoard extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({ default: true })
  visibleToUsers: boolean;

  @Prop({ type: [String], default: [] })
  recipients: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SubProject', required: true })
  subProjectId: Types.ObjectId;
}

export const NoticeBoardSchema = SchemaFactory.createForClass(NoticeBoard);
