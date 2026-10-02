import mongoose, { Schema, model, type Document } from 'mongoose';

export interface IBlog extends Document {
  blogId: string;
  title: string;
  thumbnailImage: string;
  summary: string;
  description: string;
  authorId: mongoose.Types.ObjectId;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    blogId: {
      type: String,
      required: true,
      unique: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    thumbnailImage: {
      type: String,
      required: true,
      trim: true
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => value.trim().split(/\s+/).filter(Boolean).length <= 300,
        message: 'Blog summary must not exceed 300 words.'
      }
    },
    description: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => value.trim().split(/\s+/).filter(Boolean).length >= 550,
        message: 'Blog description must contain at least 550 words.'
      }
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    published: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, result: Record<string, unknown>) => {
        delete result._id;
        delete result.__v;
        return result;
      }
    }
  }
);

export const Blog = mongoose.models.Blog || model<IBlog>('Blog', blogSchema);
