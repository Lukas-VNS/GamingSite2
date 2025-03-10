import { Router } from 'express';
import type { RequestHandler } from 'express';
import { login, signup } from '../controllers/authController';

const router = Router();

router.post('/signup', signup as RequestHandler);
router.post('/login', login as RequestHandler);

export default router; 