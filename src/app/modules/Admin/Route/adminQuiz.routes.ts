import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../../../common/middleware/auth.middleware';
import {
  createQuiz,
  deleteQuiz,
  getQuizzes,
  updateQuiz
} from '../Controller/adminQuiz.controller';

const router = Router();

const requireWriteAccess = (req: Request, res: Response, next: () => void) => {
  const role = req.user?.userRole;

  if (role === 'ADMIN') {
    return next();
  }

  return res.status(403).json({
    message: 'Quiz write access is restricted to ADMIN.'
  });
};

router.get('/', authenticate, requireRole('ADMIN'), getQuizzes);
router.post('/', authenticate, requireRole('ADMIN'), (req, res, next) => requireWriteAccess(req, res, next), createQuiz);
router.put('/:quizId', authenticate, requireRole('ADMIN'), (req, res, next) => requireWriteAccess(req, res, next), updateQuiz);
router.delete('/:quizId', authenticate, requireRole('ADMIN'), (req, res, next) => requireWriteAccess(req, res, next), deleteQuiz);

export default router;
