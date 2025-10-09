import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class UnreadCount extends Document {
  @Prop({ required: true })
  conversationId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ default: 0 })
  count: number;
}

export const UnreadCountSchema = SchemaFactory.createForClass(UnreadCount);