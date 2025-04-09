import { Router } from 'express';
import { getCurrentGame, joinQueue, makeMove, setPlayerReady, getGameById, getConnect4GameById } from '../controllers/GameController';
import { authenticateToken } from '../middleware/Auth';

const router = Router();

// All game routes require authentication
router.use(authenticateToken);

// Get current game for the authenticated user
router.get('/current', getCurrentGame);

// Get Connect 4 game by ID
router.get('/connect4-games/:gameId', getConnect4GameById);

// Get game by ID
router.get('/:gameId', getGameById);

// Join the game queue
router.post('/join', joinQueue);

// Set player ready status
router.post('/:gameId/ready', setPlayerReady);

// Make a move in a game
router.post('/:gameId/move', makeMove);

export default router; 