import { Request, Response } from 'express';
import { prisma } from '../../prisma/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

interface SignupRequest {
  username: string;
  password: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

export const signup = async (
  req: Request<{}, {}, SignupRequest>,
  res: Response
): Promise<void> => {
  try {
    const { username, password } = req.body;
    console.log('Signup attempt for:', { username });

    // Check if username already exists
    const existingUser = await prisma.user.findFirst({
      where: { username }
    });

    if (existingUser) {
      console.log('Username already exists:', { username });
      res.status(400).json({ message: 'Username already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword
      }
    });
    console.log('User created successfully:', { id: user.id });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

export const login = async (
  req: Request<{}, {}, LoginRequest>,
  res: Response
): Promise<void> => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for:', { username });

    if (!username || !password) {
      console.log('Missing credentials:', { username: !!username, password: !!password });
      res.status(400).json({ message: 'Username and password are required' });
      return;
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username }
    });

    console.log('User found:', user ? { id: user.id, username: user.username } : 'No user found');

    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check password
    console.log('Comparing passwords...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', { id: user.id, username: user.username });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true
      }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
};

export const getUserCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await prisma.user.count();
    res.json({ count });
  } catch (error) {
    console.error('Get user count error:', error);
    res.status(500).json({ message: 'Error fetching user count' });
  }
}; 