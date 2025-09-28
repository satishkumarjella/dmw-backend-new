import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

@Schema()
export class DocumentFile {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  contentType: string;

  @Prop({ type: Buffer, required: true })
  fileData: Buffer;

  @Prop({ default: Date.now })
  uploadDate: Date;

  @Prop([String]) // Array field for $pull operations
  tags: string[];

  @Prop(String)
  terms: string;
}
export type DocumentFileDocument = DocumentFile & Document;
export const DocumentFileSchema = SchemaFactory.createForClass(DocumentFile);

@Schema()
export class Project extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'SubProject' }] })
  subProjects: string[];

  @Prop({ required: true })
  blobFolder: string; // e.g., projects/projectId

  @Prop()
  projectTerms: string; 

  @Prop({ type: DocumentFileSchema })
  termsFile: DocumentFile;
}
export const ProjectSchema = SchemaFactory.createForClass(Project);