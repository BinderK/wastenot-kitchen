import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from WasteNot Kitchen API!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
