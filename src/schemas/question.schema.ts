import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document, Date } from 'mongoose';


@Schema()
export class Answer {
  @Prop()
  answeredBy: string;

  @Prop({ default: Date.now, type: Date })
  answeredAt: Date;

  @Prop()
  text: string;
}
export const AnswerSchema = SchemaFactory.createForClass(Answer);

@Schema()
export class Question extends Document {
  @Prop({ required: true })
  text: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: string;

  @Prop({ type: Types.ObjectId, ref: 'SubProject' })
  subProject: string;

  @Prop()
  blobFolder: string;

  @Prop({ type: AnswerSchema })
  answer: Answer

  @Prop({ default: Date.now, type: Date })
  createdAt: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);