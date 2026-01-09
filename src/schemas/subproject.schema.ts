import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';
import { BidDecision, BidDecisionSchema } from './biddecision.schema';
// Embedded Bid document
export class Bid extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  bidMessage: string;

  @Prop({ enum: ['pending', 'accepted', 'rejected'], default: 'pending' })
  status: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt?: Date;
}

const BidSchema = SchemaFactory.createForClass(Bid);

@Schema({ autoIndex: false })
export class SubProject extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  project: string;

  @Prop({ required: true })
  blobFolder: string;

  @Prop()
  isPublic: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Question' }] })
  questions: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Feedback' }] })
  feedback: string[];

  @Prop({ type: [BidSchema], default: [] })
  bids: Bid[];

  // NEW: Add this field for Bid/NoBid tracking
  @Prop({ type: [BidDecisionSchema], default: [] })
  bidDecisions: BidDecision[];
}

export const SubProjectSchema = SchemaFactory.createForClass(SubProject);