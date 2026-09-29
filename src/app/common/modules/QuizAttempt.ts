import mongoose, { Schema, model, type Document } from 'mongoose';

export type QuizAttemptResult = 'PASS' | 'FAIL';

export interface IQuizAttempt extends Document {
  candidateId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  selectedAnswers: number[];
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
  result: QuizAttemptResult;
  submittedAt: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    selectedAnswers: { type: [Number], required: true },
    correctCount: { type: Number, required: true, min: 0 },
    totalQuestions: { type: Number, required: true, min: 1 },
    scorePercentage: { type: Number, required: true, min: 0, max: 100 },
    result: { type: String, enum: ['PASS', 'FAIL'], required: true },
    submittedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

quizAttemptSchema.index({ candidateId: 1, quizId: 1 }, { unique: true });

export const QuizAttempt = mongoose.models.QuizAttempt || model<IQuizAttempt>('QuizAttempt', quizAttemptSchema);
