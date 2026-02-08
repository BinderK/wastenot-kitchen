import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { CreateRecipeSchema, UpdateRecipeSchema, RecipeQuerySchema } from '../schemas/recipe.schema';
import {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  RecipeFilters,
} from '../services/recipeService';
import { ZodError } from 'zod';
import { RecipeSource } from '@prisma/client';

const router = Router();

/**
 * GET /api/recipes
 * List with filters: ?source=X&authorId=Y&search=Z&isPublic=true
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const validatedQuery = RecipeQuerySchema.parse(req.query);

    const filters: RecipeFilters = {};

    if (validatedQuery.source) {
      filters.source = validatedQuery.source;
    }

    if (validatedQuery.authorId) {
      filters.authorId = validatedQuery.authorId;
    }

    if (validatedQuery.search) {
      filters.search = validatedQuery.search;
    }

    if (validatedQuery.isPublic) {
      filters.isPublic = validatedQuery.isPublic === 'true';
    }

    const recipes = await getRecipes(filters);
    res.json(recipes);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      return;
    }
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/recipes/:id
 * Get single recipe with ingredients
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const recipeId = req.params.id;
    const recipe = await getRecipeById(recipeId);

    if (!recipe) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/recipes
 * Create recipe (protected, validate with Zod)
 * Default isPublic: true for user recipes (user can override)
 * AI-generated recipes: source: AI_GENERATED, authorId: currentUser
 */
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const validatedData = CreateRecipeSchema.parse(req.body);

    const recipe = await createRecipe(userId, validatedData);
    res.status(201).json(recipe);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/recipes/:id
 * Update recipe (protected, owner only, no SYSTEM edits)
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const recipeId = req.params.id;
    const validatedData = UpdateRecipeSchema.parse(req.body);

    const recipe = await updateRecipe(recipeId, userId, validatedData);
    res.json(recipe);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error) {
      if (error.message === 'Cannot edit SYSTEM recipes') {
        res.status(403).json({ error: error.message });
        return;
      }
      if (error.message.startsWith('Forbidden:')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/recipes/:id
 * Delete recipe (protected, owner only, no SYSTEM deletes)
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const recipeId = req.params.id;

    const success = await deleteRecipe(recipeId, userId);
    if (!success) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Cannot delete SYSTEM recipes') {
        res.status(403).json({ error: error.message });
        return;
      }
      if (error.message.startsWith('Forbidden:')) {
        res.status(403).json({ error: error.message });
        return;
      }
    }
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
