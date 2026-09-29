import type { Request, Response } from 'express';
import { Quiz, type IQuizQuestion } from '../../../common/modules/Quiz';
import { QuizAttempt } from '../../../common/modules/QuizAttempt';

export const getCandidateQuizzes = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const [quizzes, attempts] = await Promise.all([
      Quiz.find().select('quizId title questions createdAt').sort({ createdAt: -1 }).lean(),
      QuizAttempt.find({ candidateId: req.user.userId }).select('quizId correctCount totalQuestions scorePercentage result submittedAt').lean()
    ]);
    const attemptsByQuiz = new Map(attempts.map((attempt) => [String(attempt.quizId), attempt]));

    const data = quizzes.map((quiz) => {
      const attempt = attemptsByQuiz.get(String(quiz._id));
      return {
        quizId: quiz.quizId,
        title: quiz.title,
        questionCount: quiz.questions.length,
        attempt: attempt
          ? {
              correctCount: attempt.correctCount,
              totalQuestions: attempt.totalQuestions,
              scorePercentage: attempt.scorePercentage,
              result: attempt.result,
              submittedAt: attempt.submittedAt
            }
          : null
      };
    });

    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({ message: 'Quiz list fetch failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const getCandidateQuiz = async (req: Request, res: Response) => {
  try {
    const quiz = await Quiz.findOne({ quizId: req.params.quizId }).select('quizId title questions.question questions.options');
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    const previousAttempt = await QuizAttempt.exists({ quizId: quiz._id, candidateId: req.user?.userId });
    if (previousAttempt) {
      return res.status(409).json({ message: 'You have already submitted this quiz.' });
    }

    return res.status(200).json({
      data: {
        quizId: quiz.quizId,
        title: quiz.title,
        questions: quiz.questions.map((question: IQuizQuestion) => ({
          question: question.question,
          options: question.options
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Quiz fetch failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const submitCandidateQuiz = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    const quiz = await Quiz.findOne({ quizId: req.params.quizId });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    const existingAttempt = await QuizAttempt.exists({ quizId: quiz._id, candidateId: req.user.userId });
    if (existingAttempt) {
      return res.status(409).json({ message: 'You have already submitted this quiz.' });
    }

    const answers = req.body?.answers;
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({ message: 'Provide one selected option for every question.' });
    }

    const answersAreValid = answers.every((answer: unknown) =>
      Number.isInteger(answer) && Number(answer) >= 0 && Number(answer) < 3
    );
    if (!answersAreValid) {
      return res.status(400).json({ message: 'Each answer must be a valid option index.' });
    }

    const correctCount = quiz.questions.reduce((total: number, question: IQuizQuestion, index: number) => {
      const selectedOption = question.options[answers[index] as number];
      return total + (selectedOption.trim() === question.correctAnswer.trim() ? 1 : 0);
    }, 0);
    const totalQuestions = quiz.questions.length;
    const scorePercentage = Number(((correctCount / totalQuestions) * 100).toFixed(2));
    const result = scorePercentage > 60 ? 'PASS' : 'FAIL';

    const attempt = await QuizAttempt.create({
      candidateId: req.user.userId,
      quizId: quiz._id,
      selectedAnswers: answers,
      correctCount,
      totalQuestions,
      scorePercentage,
      result
    });

    return res.status(201).json({
      message: 'Quiz submitted successfully.',
      data: {
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        scorePercentage: attempt.scorePercentage,
        result: attempt.result,
        submittedAt: attempt.submittedAt
      }
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return res.status(409).json({ message: 'You have already submitted this quiz.' });
    }

    return res.status(500).json({ message: 'Quiz submission failed.', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
