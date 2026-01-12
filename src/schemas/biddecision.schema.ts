import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Embedded BidDecision document - add this to your subproject schema file
export class BidDecision extends Document {
  @Prop({ 
    type: Types.ObjectId,  // ✅ Remove the nested object
    ref: 'User', 
    required: true, 
    index: true 
  })
  userId: Types.ObjectId;  // ✅ Simple ObjectId

  @Prop({
    enum: ['bid', 'noBid'],
    required: true,
    index: true
  })
  decision: 'bid' | 'noBid';

  @Prop({ required: false })
  reason: string; // Required for 'noBid', optional for 'bid'

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt?: Date;
}

export const BidDecisionSchema = SchemaFactory.createForClass(BidDecision);
