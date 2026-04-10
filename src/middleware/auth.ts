import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../../generated/prisma/client.js';
import { AppError } from './errorHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface JwtPayload {
  userId: string;
  username: string;
  role: Role;
  activated: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload as any, JWT_SECRET, { expiresIn: '24h' as any });
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload as any, JWT_SECRET, { expiresIn: '7d' as any });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Middleware: Extract and verify JWT from Authorization header
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Access token required.');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    throw new AppError(401, 'TOKEN_INVALID', 'Invalid or expired access token.');
  }
}

/**
 * Middleware: Require specific roles
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource.');
    }
    next();
  };
}

/**
 * Middleware: Require activated account (password changed from default)
 */
export function requireActivated(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
  }
  if (!req.user.activated) {
    throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Please change your default password first.');
  }
  next();
}
