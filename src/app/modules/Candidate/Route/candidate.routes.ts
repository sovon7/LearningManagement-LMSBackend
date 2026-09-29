import { Router } from 'express';
import { authenticate, requireRole } from '../../../common/middleware/auth.middleware';
import {
	getCandidateQuiz,
	getCandidateQuizzes,
	submitCandidateQuiz
} from '../Controller/candidateQuiz.controller';

const router = Router();

router.use(authenticate, requireRole('CANDIDATE'));
router.get('/quizzes', getCandidateQuizzes);
router.get('/quizzes/:quizId', getCandidateQuiz);
router.post('/quizzes/:quizId/submit', submitCandidateQuiz);

export default router;
