# Authentication System Setup

This document describes the authentication system implementation for WasteNot Kitchen backend.

## Features Implemented

- ✅ Email/password authentication with bcrypt hashing
- ✅ Google OAuth 2.0 integration
- ✅ GitHub OAuth integration
- ✅ JWT-based authentication (15-minute access tokens, 7-day refresh tokens)
- ✅ Token refresh mechanism
- ✅ Protected routes middleware
- ✅ User registration and login
- ✅ Password validation (minimum 8 characters)

## Files Created

- `server/src/config/passport.ts` - Passport strategies configuration
- `server/src/middleware/auth.ts` - JWT authentication middleware
- `server/src/routes/auth.ts` - Authentication endpoints
- `server/src/services/authService.ts` - Authentication utilities

## Installation

### 1. Install Missing Dependencies

The following packages need to be installed:

```bash
cd server
npm install passport-github2 zod helmet express-rate-limit @types/passport-github2
```

### 2. Environment Variables

Update your `server/.env` file with the following variables (see `server/.env.example` for reference):

```env
# JWT Secrets (generate secure random strings)
JWT_SECRET=<your-secret-key>
JWT_REFRESH_SECRET=<your-refresh-secret-key>

# OAuth Credentials
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

### 3. OAuth Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

#### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Set Homepage URL: `http://localhost:3000`
4. Set Authorization callback URL: `http://localhost:3001/api/auth/github/callback`
5. Copy Client ID and Client Secret to your `.env` file

### 4. Database Setup

Run Prisma migrations to create the necessary database tables:

```bash
cd server
npm run db:generate
npm run db:push  # or npm run db:migrate for production
```

## API Endpoints

### Authentication Endpoints

#### `POST /api/auth/register`
Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "John Doe" // optional
}
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": null
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

#### `POST /api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": null
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

#### `POST /api/auth/refresh`
Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "..."
}
```

**Response:**
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

#### `POST /api/auth/logout`
Revoke refresh token.

**Request Body:**
```json
{
  "refreshToken": "..."
}
```

#### `GET /api/auth/google`
Initiate Google OAuth flow. Redirects to Google consent screen.

#### `GET /api/auth/google/callback`
Google OAuth callback. Redirects to frontend with tokens.

#### `GET /api/auth/github`
Initiate GitHub OAuth flow. Redirects to GitHub authorization.

#### `GET /api/auth/github/callback`
GitHub OAuth callback. Redirects to frontend with tokens.

#### `GET /api/auth/me`
Get current authenticated user (protected route).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": null,
    "createdAt": "2026-02-08T00:00:00.000Z"
  }
}
```

## Testing

### Manual Testing with curl

1. **Register a new user:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "displayName": "Test User"
  }'
```

2. **Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

3. **Get current user (replace TOKEN with your access token):**
```bash
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

4. **Refresh token:**
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

5. **Test OAuth (in browser):**
- Navigate to: `http://localhost:3001/api/auth/google`
- Navigate to: `http://localhost:3001/api/auth/github`

## Security Features

### Implemented
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT token expiry (15 minutes for access, 7 days for refresh)
- ✅ Refresh token revocation
- ✅ Input validation with express-validator
- ✅ CORS configuration

### To Enable (after installing dependencies)
- Rate limiting on login/register endpoints (10 requests per 15 minutes)
- Helmet for security headers

Uncomment the rate limiting and helmet code in `server/src/index.ts` after installing the packages.

## Using the Middleware

### Protect a route (require authentication):
```typescript
import { authenticateJWT } from './middleware/auth.js';

router.get('/protected', authenticateJWT, (req, res) => {
  // req.user is available here
  res.json({ user: req.user });
});
```

### Optional authentication:
```typescript
import { optionalAuth } from './middleware/auth.js';

router.get('/public', optionalAuth, (req, res) => {
  // req.user is available if token was provided
  if (req.user) {
    res.json({ message: 'Hello ' + req.user.displayName });
  } else {
    res.json({ message: 'Hello guest' });
  }
});
```

## Token Structure

### Access Token Payload
```json
{
  "userId": "...",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### Refresh Token Payload
```json
{
  "userId": "...",
  "iat": 1234567890,
  "exp": 1235172690
}
```

## Error Responses

All error responses follow this format:
```json
{
  "error": "Error message"
}
```

Or with validation errors:
```json
{
  "errors": [
    {
      "msg": "Valid email is required",
      "param": "email",
      "location": "body"
    }
  ]
}
```

## Next Steps

1. Install the missing dependencies
2. Set up OAuth credentials
3. Test all endpoints
4. Enable rate limiting and helmet
5. Add unit tests
6. Add integration tests
7. Set up proper logging
8. Add email verification (optional)
9. Add password reset flow (optional)
