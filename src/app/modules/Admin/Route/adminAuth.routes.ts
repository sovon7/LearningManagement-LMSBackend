import { Router } from 'express';
import { getCurrentUser, loginUser, registerUser } from '../Controller/adminAuth.controller';
import { authenticate } from '../../../common/middleware/auth.middleware';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authenticate, getCurrentUser);

export default router;
