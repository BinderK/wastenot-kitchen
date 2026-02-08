import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// @ts-ignore - passport-github2 may not have types
import { Strategy as GitHubStrategy } from 'passport-github2';
import { PrismaClient, AuthProvider } from '@prisma/client';
import { verifyPassword, findOrCreateOAuthUser } from '../services/authService.js';

const prisma = new PrismaClient();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

/**
 * Configure Passport authentication strategies
 */
export function configurePassport() {
  // Local Strategy (Email/Password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          // Check if user has a password (not OAuth-only)
          if (!user.passwordHash) {
            return done(null, false, { message: 'Please use OAuth to sign in' });
          }

          // Verify password
          const isValid = await verifyPassword(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google OAuth Strategy
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await findOrCreateOAuthUser(
              AuthProvider.GOOGLE,
              profile.id,
              {
                email: profile.emails?.[0]?.value,
                displayName: profile.displayName,
                avatarUrl: profile.photos?.[0]?.value,
              }
            );
            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }

  // GitHub OAuth Strategy
  if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: GITHUB_CLIENT_ID,
          clientSecret: GITHUB_CLIENT_SECRET,
          callbackURL: `${BACKEND_URL}/api/auth/github/callback`,
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const user = await findOrCreateOAuthUser(
              AuthProvider.GITHUB,
              profile.id,
              {
                email: profile.emails?.[0]?.value,
                displayName: profile.displayName || profile.username,
                avatarUrl: profile.photos?.[0]?.value,
              }
            );
            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }

  // Serialize user for session (not used for JWT auth, but required by passport)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}
