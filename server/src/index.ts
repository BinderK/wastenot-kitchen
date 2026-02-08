import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import passport from 'passport';
// Note: helmet and express-rate-limit need to be installed
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
import { configurePassport } from './config/passport.js';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware (uncomment after installing helmet)
// app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
configurePassport();
app.use(passport.initialize());

// Rate limiting for auth routes (uncomment after installing express-rate-limit)
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // Limit each IP to 10 requests per windowMs
//   message: 'Too many authentication attempts, please try again later',
// });
// app.use('/api/auth/login', authLimiter);
// app.use('/api/auth/register', authLimiter);

// Routes
app.use('/api/auth', authRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from WasteNot Kitchen API!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
