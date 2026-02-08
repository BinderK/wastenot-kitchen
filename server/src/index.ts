import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mealPlansRouter from './routes/mealPlans';
import geminiRouter from './routes/gemini';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from WasteNot Kitchen API!' });
});

app.use('/api/meal-plans', mealPlansRouter);
app.use('/api/gemini', geminiRouter);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
