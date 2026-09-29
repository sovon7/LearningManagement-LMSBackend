import mongoose, { Schema, model, type Document } from 'mongoose';

export interface ICourse extends Document {
  courseId: string;
  title: string;
  thumbnailImage: string;
  shortDescription: string;
  modules: ICourseModule[];
  publishStatus: 'draft' | 'published';
}

export interface ICourseCodeSnippet {
  language: string;
  code: string;
}

export interface ICourseTopic {
  title: string;
  content: string;
  codeSnippets: ICourseCodeSnippet[];
}

export interface ICourseModule {
  title: string;
  topics: ICourseTopic[];
}

export const normalizeCourseShortDescription = (value: string) => value.replace(/\r\n?/g, '\n');

const codeSnippetSchema = new Schema<ICourseCodeSnippet>(
  {
    language: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const topicSchema = new Schema<ICourseTopic>({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  codeSnippets: { type: [codeSnippetSchema], default: [] }
}, { _id: false });

const moduleSchema = new Schema<ICourseModule>({
  title: { type: String, required: true, trim: true },
  topics: {
    type: [topicSchema],
    required: true,
    validate: {
      validator: (topics: ICourseTopic[]) => Array.isArray(topics) && topics.length >= 1,
      message: 'Each course module must contain at least one topic.'
    }
  }
}, { _id: false });

const courseSchema = new Schema<ICourse>(
  {
    courseId: {
      type: String,
      required: true
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
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      set: normalizeCourseShortDescription,
      validate: {
        validator: (value: string) => normalizeCourseShortDescription(value).length <= 1000,
        message: 'Course short description must not exceed 1000 characters.'
      }
    },
    modules: {
      type: [moduleSchema],
      required: true,
      validate: {
        validator: (modules: ICourseModule[]) => Array.isArray(modules) && modules.length >= 1,
        message: 'A course must contain at least one module.'
      }
    },
    publishStatus: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published'
    },
  },
  {
    timestamps: false,
    versionKey: false,
    id: false,
    toJSON: {
      transform: (_document, result: Record<string, unknown>) => {
        delete result._id;
        delete result.__v;
        return result;
      }
    },
    toObject: {
      transform: (_document, result: Record<string, unknown>) => {
        delete result._id;
        delete result.__v;
        return result;
      }
    }
  },
);

export const Course = mongoose.models.Course || model<ICourse>('Course', courseSchema);
