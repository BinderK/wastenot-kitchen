import { Router, Request, Response } from 'express';
import passport from 'passport';
import { PrismaClient, User } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from '../services/authService.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('displayName').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, displayName } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName: displayName || null,
        },
      });

      // Create credentials account entry
      await prisma.account.create({
        data: {
          userId: user.id,
          provider: 'CREDENTIALS',
          providerAccountId: user.id,
        },
      });

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = await generateRefreshToken(user.id);

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Authenticate using passport local strategy
      passport.authenticate('local', async (err: any, user: User | false, info: any) => {
        if (err) {
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user) {
          return res.status(401).json({ error: info?.message || 'Invalid credentials' });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = await generateRefreshToken(user.id);

        return res.json({
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          },
          accessToken,
          refreshToken,
        });
      })(req, res);
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Rotate refresh token and get new access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const userId = await verifyRefreshToken(refreshToken);

    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Revoke old refresh token
    await revokeRefreshToken(refreshToken);

    // Generate new tokens
    const newAccessToken = generateAccessToken(userId);
    const newRefreshToken = await generateRefreshToken(userId);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Revoke refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as User;

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = await generateRefreshToken(user.id);

      // Redirect to frontend with tokens
      const redirectUrl = `${FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

/**
 * GET /api/auth/github
 * Initiate GitHub OAuth flow
 */
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
  })
);

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as User;

      // Generate tokens
      const accessToken = generateAccessToken(user.id);
      const refreshToken = await generateRefreshToken(user.id);

      // Redirect to frontend with tokens
      const redirectUrl = `${FRONTEND_URL}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      return res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch full user details
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
