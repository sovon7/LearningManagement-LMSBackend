import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../../../common/middleware/auth.middleware';
import {
  createVideo,
  deleteVideo,
  getVideos,
  updateVideo
} from '../Controller/adminVideo.controller';

const router = Router();

const requireWriteAccess = (req: Request, res: Response, next: () => void) => {
  const role = req.user?.userRole;

  if (role === 'ADMIN') {
    return next();
  }

  return res.status(403).json({
    message: 'Video write access is restricted to ADMIN.'
  });
};

router.get('/', authenticate, getVideos);
router.post('/', authenticate, requireRole('ADMIN'), (req, res, next) => requireWriteAccess(req, res, next), createVideo);
router.put('/:id', authenticate, requireRole('ADMIN'), (req, res, next) => requireWriteAccess(req, res, next), updateVideo);
router.delete('/:id', authenticate, requireRole('ADMIN'), (req, res, next) => requireWriteAccess(req, res, next), deleteVideo);

export default router;
