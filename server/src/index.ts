import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import inventoryRouter from './routes/inventory';
import recipesRouter from './routes/recipes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from WasteNot Kitchen API!' });
});

// API Routes
app.use('/api/inventory', inventoryRouter);
app.use('/api/recipes', recipesRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
