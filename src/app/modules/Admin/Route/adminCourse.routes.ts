import { Router } from 'express';
import { authenticate, requireRole } from '../../../common/middleware/auth.middleware';
import { uploadCourseThumbnail } from '../../../common/middleware/upload.middleware';
import {
  createCourse,
  deleteCourse,
  getCourseById,
  getCourseTopic,
  getCourses,
  updateCourse
} from '../Controller/adminCourse.controller';

const router = Router();

router.get('/', authenticate, getCourses);
router.get('/:courseId/topics/:topicIndex', authenticate, getCourseTopic);
router.get('/:courseId', authenticate, getCourseById);
router.post('/', authenticate, requireRole('ADMIN'), uploadCourseThumbnail, createCourse);
router.put('/:courseId', authenticate, requireRole('ADMIN'), uploadCourseThumbnail, updateCourse);
router.delete('/:courseId', authenticate, requireRole('ADMIN'), deleteCourse);

export default router;
