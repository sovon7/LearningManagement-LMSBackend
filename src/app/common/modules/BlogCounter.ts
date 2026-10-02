import mongoose, { Schema, model } from 'mongoose';

interface IBlogCounter {
  _id: string;
  sequence: number;
}

const blogCounterSchema = new Schema<IBlogCounter>(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0 }
  },
  { versionKey: false }
);

export const BlogCounter = mongoose.models.BlogCounter || model<IBlogCounter>('BlogCounter', blogCounterSchema);
