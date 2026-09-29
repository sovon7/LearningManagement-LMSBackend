import { Router } from 'express';
import adminAuthRoutes from './adminAuth.routes';
import adminBlogRoutes from './adminBlog.routes';
import adminCourseRoutes from './adminCourse.routes';
import adminVideoRoutes from './adminVideo.routes';
import adminQuizRoutes from './adminQuiz.routes';

const router = Router();

router.use('/auth', adminAuthRoutes);
router.use('/blogs', adminBlogRoutes);
router.use('/courses', adminCourseRoutes);
router.use('/videos', adminVideoRoutes);
router.use('/quizzes', adminQuizRoutes);

export default router;