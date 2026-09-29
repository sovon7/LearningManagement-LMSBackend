import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { User } from '../modules/User';

export type AuthenticatedUser = {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: 'ADMIN' | 'CANDIDATE';
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const verifyToken = (token: string) => {
  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET || 'lms-dev-secret';
    return jwt.verify(token, secret) as {
      userId: string;
      userName: string;
      userEmail: string;
      userRole: 'ADMIN' | 'CANDIDATE';
    };
  } catch {
    return null;
  }
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = {
      userId: String(user._id),
      userName: user.name,
      userEmail: user.email,
      userRole: (user.role || 'CANDIDATE').toUpperCase() as 'ADMIN' | 'CANDIDATE'
    };

    return next();
  } catch (error) {
    return res.status(500).json({
      message: 'Authentication failed.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentRole = (req.user?.userRole || '').toUpperCase();
    const validRoles = allowedRoles.map((role) => role.toUpperCase());

    if (!currentRole || !validRoles.includes(currentRole)) {
      return res.status(403).json({
        message: 'You do not have permission to access this resource.'
      });
    }

    return next();
  };
};