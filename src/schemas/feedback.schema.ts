import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema()
export class Feedback extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: string;

  @Prop({ type: Types.ObjectId, ref: 'SubProject' })
  subProject: string;

  @Prop({ required: true })
  rating: 'like' | 'dislike';

  @Prop()
  comment: string;

  @Prop({ required: true })
  status: 'pending' | 'approved' | 'rejected';

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);