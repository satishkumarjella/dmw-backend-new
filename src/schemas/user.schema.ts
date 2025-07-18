import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: ['superAdmin', 'admin', 'user'] })
  role: string;

  @Prop({ required: true })
  company: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  companyAddress: string;

  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  zipcode: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'SubProject' }] })
  subProjects: string[];

  @Prop()
  resetToken?: string;

  @Prop()
  resetTokenExpiry?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);