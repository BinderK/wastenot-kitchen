import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  CreateFoodItemSchema,
  UpdateFoodItemSchema,
  CreateBulkFoodItemsSchema,
  DeductInventorySchema,
} from '../schemas/inventory.schema';
import {
  getUserInventory,
  getItemById,
  createItem,
  createBulkItems,
  updateItem,
  deleteItem,
  deductIngredients,
} from '../services/inventoryService';
import { ZodError } from 'zod';

const router = Router();

/**
 * GET /api/inventory
 * List all items for current user (protected)
 */
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const items = await getUserInventory(userId);
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/inventory/:id
 * Get single item (protected, owner only)
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const itemId = req.params.id;

    const item = await getItemById(itemId, userId);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/inventory
 * Create item with Zod validation (protected)
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const validatedData = CreateFoodItemSchema.parse(req.body);
    const item = await createItem(userId, validatedData);
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/inventory/bulk
 * Create multiple items (for receipt scan)
 */
router.post('/bulk', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const validatedData = CreateBulkFoodItemsSchema.parse(req.body);
    const items = await createBulkItems(userId, validatedData.items);
    res.status(201).json(items);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error creating bulk items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/inventory/:id
 * Update item (protected, owner only)
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const itemId = req.params.id;
    const validatedData = UpdateFoodItemSchema.parse(req.body);

    const item = await updateItem(itemId, userId, validatedData);
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/inventory/:id
 * Delete item (protected, owner only)
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const itemId = req.params.id;

    const success = await deleteItem(itemId, userId);
    if (!success) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/inventory/deduct
 * Deduct ingredients with FIFO logic
 */
router.post('/deduct', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const validatedData = DeductInventorySchema.parse(req.body);

    const updatedInventory = await deductIngredients(userId, validatedData.usageList);
    res.json(updatedInventory);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error deducting inventory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
