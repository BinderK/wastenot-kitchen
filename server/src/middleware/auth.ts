import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Auth middleware - placeholder for now
 * TODO: Implement proper JWT authentication when auth routes are ready (Issue #3)
 *
 * For now, this middleware extracts a userId from the header for testing
 */
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Temporary: Extract userId from header for testing
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - No user ID provided' });
  }

  // Attach user to request
  req.user = {
    id: userId,
    email: 'test@example.com', // Placeholder
  };

  next();
};
