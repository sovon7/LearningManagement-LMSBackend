import { Types } from 'mongoose';
import { Quiz } from './Quiz';
import { QuizCounter } from './QuizCounter';

const counterId = 'quiz';
const quizIdPattern = /^LMS-QUZ-(\d+)$/;

const formatQuizId = (sequence: number) => `LMS-QUZ-${String(sequence).padStart(5, '0')}`;

export const nextQuizId = async () => {
  const counter = await QuizCounter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (!counter) {
    throw new Error('Unable to generate a quiz ID.');
  }

  return formatQuizId(counter.sequence);
};

export const initializeQuizIds = async () => {
  const existingQuizzes = await Quiz.find({ quizId: quizIdPattern }).select('quizId').lean();
  const highestSequence = existingQuizzes.reduce((highest, quiz) => {
    const match = quiz.quizId?.match(quizIdPattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  await QuizCounter.updateOne(
    { _id: counterId },
    { $max: { sequence: highestSequence } },
    { upsert: true }
  );

  const legacyQuizzes = await Quiz.collection
    .find({ $or: [{ quizId: { $exists: false } }, { quizId: null }, { quizId: '' }] })
    .project<{ _id: Types.ObjectId }>({ _id: 1 })
    .sort({ _id: 1 })
    .toArray();

  for (const quiz of legacyQuizzes) {
    const counter = await QuizCounter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { sequence: 1 } },
      { new: true }
    );

    if (!counter) {
      throw new Error('Unable to assign a quiz ID to existing quiz data.');
    }

    await Quiz.collection.updateOne(
      { _id: quiz._id },
      { $set: { quizId: formatQuizId(counter.sequence) }, $unset: { courseId: '' } }
    );
  }

  await Quiz.collection.updateMany({}, { $unset: { courseId: '' } });
  await Quiz.collection.createIndex({ quizId: 1 }, { unique: true });
};
