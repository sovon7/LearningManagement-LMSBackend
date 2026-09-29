import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { User, type UserRole } from '../../../common/modules/User';

const normalizeRole = (input?: string): UserRole => {
  const normalized = (input || 'CANDIDATE').trim().toUpperCase();
  if (normalized === 'ADMIN') return 'ADMIN';
  return 'CANDIDATE';
};

const buildUserResponse = (user: any) => ({
  userId: String(user._id),
  userName: user.name,
  userEmail: user.email,
  userRole: user.role
});

const createToken = (user: any) => {
  const secret = process.env.JWT_SECRET || 'lms-dev-secret';
  return jwt.sign(
    {
      userId: String(user._id),
      userName: user.name,
      userEmail: user.email,
      userRole: user.role
    },
    secret,
    { expiresIn: '7d' }
  );
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const userName = String(req.body?.userName || req.body?.name || '').trim();
    const userEmail = String(req.body?.userEmail || req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const userRole = normalizeRole(req.body?.userRole || req.body?.role);

    if (!userName || userName.length < 2) {
      return res.status(400).json({ message: 'userName is required and must be at least 2 characters long.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return res.status(400).json({ message: 'Please enter a valid userEmail address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findOne({ email: userEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'This userEmail is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: userName,
      email: userEmail,
      password: hashedPassword,
      role: userRole
    });

    return res.status(201).json({
      message: 'User registered successfully.',
      token: createToken(newUser),
      user: buildUserResponse(newUser)
    });
  } catch (error) {
    return res.status(500).json({
      message: 'User registration failed.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const userEmail = String(req.body?.userEmail || req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return res.status(400).json({ message: 'Please provide a valid userEmail.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password is required and must be at least 6 characters long.' });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    return res.status(200).json({
      message: 'Login successful.',
      token: createToken(user),
      user: buildUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Login failed.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: 'No authenticated user found.' });
    }

    const user = await User.findById(currentUser.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      user: buildUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Unable to fetch user details.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};