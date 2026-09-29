import type { Request, Response } from 'express';
import { Quiz } from '../../../common/modules/Quiz';
import { QuizAttempt } from '../../../common/modules/QuizAttempt';
import { nextQuizId } from '../../../common/modules/quizIds';

const validateQuizPayload = (questions: any[]) => {
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 10) {
    return 'A quiz must contain between 1 and 10 questions.';
  }

  for (const [index, question] of questions.entries()) {
    if (!question || typeof question.question !== 'string' || !question.question.trim()) {
      return `Question ${index + 1} is missing a valid question text.`;
    }

    if (!Array.isArray(question.options) || question.options.length !== 3) {
      return `Question ${index + 1} must contain exactly 3 options.`;
    }

    const validOptions = question.options.every((option: unknown) => typeof option === 'string' && option.trim().length > 0);
    if (!validOptions) {
      return `Question ${index + 1} options must be non-empty strings.`;
    }

    if (typeof question.correctAnswer !== 'string' || !question.correctAnswer.trim()) {
      return `Question ${index + 1} must include a correct answer.`;
    }

    const trimmedAnswer = question.correctAnswer.trim();
    const optionValues = question.options.map((option: string) => option.trim());
    if (!optionValues.includes(trimmedAnswer)) {
      return `Question ${index + 1} correctAnswer must match one of the 3 options.`;
    }
  }

  return null;
};

export const getQuizzes = async (_req: Request, res: Response) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    return res.status(200).json({ data: quizzes });
  } catch (error) {
    return res.status(500).json({ message: 'Quiz fetch failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const createQuiz = async (req: Request, res: Response) => {
  try {
    const { title, questions } = req.body || {};

    if (!title || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'title and questions are required for quiz creation.' });
    }

    const validationMessage = validateQuizPayload(questions);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const quiz = await Quiz.create({
      quizId: await nextQuizId(),
      title,
      questions,
      createdBy: req.user?.userId
    });

    return res.status(201).json({ message: 'Quiz created successfully.', data: quiz });
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Quiz validation failed.', error: (error as Error).message });
    }

    return res.status(500).json({ message: 'Quiz creation failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    const incomingData = req.body || {};
    if (incomingData.questions !== undefined && !Array.isArray(incomingData.questions)) {
      return res.status(400).json({ message: 'questions must be an array.' });
    }
    if (Array.isArray(incomingData.questions)) {
      const validationMessage = validateQuizPayload(incomingData.questions);
      if (validationMessage) {
        return res.status(400).json({ message: validationMessage });
      }
    }

    if (incomingData.title !== undefined) {
      quiz.title = String(incomingData.title).trim();
    }
    if (incomingData.questions !== undefined) {
      quiz.questions = incomingData.questions;
    }
    await quiz.save();
    return res.status(200).json({ message: 'Quiz updated successfully.', data: quiz });
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Quiz validation failed.', error: (error as Error).message });
    }

    return res.status(500).json({ message: 'Quiz update failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    await QuizAttempt.deleteMany({ quizId: quiz._id });
    await quiz.deleteOne();
    return res.status(200).json({ message: 'Quiz deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Quiz deletion failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
