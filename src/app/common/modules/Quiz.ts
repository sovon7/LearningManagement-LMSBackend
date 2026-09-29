import mongoose, { Schema, model, type Document } from 'mongoose';

export interface IQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface IQuiz extends Document {
  quizId: string;
  title: string;
  questions: IQuizQuestion[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const quizQuestionSchema = new Schema<IQuizQuestion>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => value.trim().length > 0,
        message: 'Each question must contain a valid question text.'
      }
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) =>
          Array.isArray(value) && value.length === 3 && value.every((option) => typeof option === 'string' && option.trim().length > 0),
        message: 'Each question must contain exactly 3 non-empty options.'
      }
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => typeof value === 'string' && value.trim().length > 0,
        message: 'correctAnswer is required and must be a non-empty string.'
      }
    }
  },
  { _id: false }
);

const quizSchema = new Schema<IQuiz>(
  {
    quizId: {
      type: String,
      required: true,
      unique: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    questions: {
      type: [quizQuestionSchema],
      default: [],
      validate: {
        validator: (value: IQuizQuestion[]) => Array.isArray(value) && value.length >= 1 && value.length <= 10,
        message: 'A quiz must contain at least 1 question and no more than 10 questions.'
      }
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_document, result: Record<string, unknown>) => {
        delete result._id;
        delete result.__v;
        delete result.createdBy;
        return result;
      }
    }
  }
);

export const Quiz = mongoose.models.Quiz || model<IQuiz>('Quiz', quizSchema);
