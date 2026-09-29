import mongoose, { Schema, model } from 'mongoose';

interface IQuizCounter {
  _id: string;
  sequence: number;
}

const quizCounterSchema = new Schema<IQuizCounter>(
  {
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0 }
  },
  { versionKey: false }
);

export const QuizCounter = mongoose.models.QuizCounter || model<IQuizCounter>('QuizCounter', quizCounterSchema);
