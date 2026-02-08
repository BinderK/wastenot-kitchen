import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, AuthProvider } from '@prisma/client';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// JWT secret keys from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate an access token (15 minute expiry)
 */
export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate a refresh token (7 day expiry) and store in database
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const token = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

  // Store in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify a refresh token and return the user ID
 */
export async function verifyRefreshToken(token: string): Promise<string | null> {
  try {
    // Check if token exists in database and is not revoked
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      return null;
    }

    // Verify JWT signature
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(token: string): Promise<boolean> {
  try {
    await prisma.refreshToken.update({
      where: { token },
      data: { revoked: true },
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Find or create a user from OAuth provider data
 */
export async function findOrCreateOAuthUser(
  provider: AuthProvider,
  providerAccountId: string,
  profile: {
    email?: string;
    displayName?: string;
    avatarUrl?: string;
  }
) {
  // First, try to find existing account
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    include: {
      user: true,
    },
  });

  if (existingAccount) {
    return existingAccount.user;
  }

  // If no account exists, check if user exists by email
  let user;
  if (profile.email) {
    user = await prisma.user.findUnique({
      where: { email: profile.email },
    });
  }

  // If no user exists, create one
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email || `${provider.toLowerCase()}_${providerAccountId}@oauth.local`,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      },
    });
  }

  // Link the OAuth account to the user
  await prisma.account.create({
    data: {
      userId: user.id,
      provider,
      providerAccountId,
    },
  });

  return user;
}

/**
 * Verify an access token and return the user ID
 */
export function verifyAccessToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    return null;
  }
}
