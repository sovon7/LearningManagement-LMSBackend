import { Router } from 'express';
import { authenticate, requireRole } from '../../../common/middleware/auth.middleware';
import { uploadBlogThumbnail } from '../../../common/middleware/upload.middleware';
import {
  createBlog,
  deleteBlog,
  getBlogs,
  updateBlog
} from '../Controller/adminBlog.controller';

const router = Router();

router.get('/', authenticate, getBlogs);
router.post('/', authenticate, requireRole('CANDIDATE'), uploadBlogThumbnail, createBlog);
router.put('/:id', authenticate, requireRole('CANDIDATE'), uploadBlogThumbnail, updateBlog);
router.delete('/:id', authenticate, requireRole('CANDIDATE'), deleteBlog);

export default router;
