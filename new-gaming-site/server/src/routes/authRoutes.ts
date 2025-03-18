import { Router } from 'express';
import type { RequestHandler } from 'express';
import { login, signup, getUser, getUserCount } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/signup', signup as RequestHandler);
router.post('/login', login as RequestHandler);
router.get('/user', authenticateToken, getUser as RequestHandler);
router.get('/count', getUserCount as RequestHandler);

export default router; 