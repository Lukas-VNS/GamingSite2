import { Router } from 'express';
import type { RequestHandler } from 'express';
import { login, signup, getUser } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/Auth';

const router = Router();

router.post('/signup', signup as RequestHandler);
router.post('/login', login as RequestHandler);
router.get('/user', authenticateToken, getUser as RequestHandler);

export default router; 