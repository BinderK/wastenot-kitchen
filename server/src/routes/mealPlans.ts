import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import {
  getUserMealPlans,
  getActiveMealPlan,
  createMealPlan,
  activatePlan,
  deactivatePlan,
  markMealEaten,
  calculatePlanProgress,
  deleteMealPlan,
  getMealPlanById,
} from '../services/mealPlanService';
import {
  CreateMealPlanSchema,
  MarkMealEatenSchema,
} from '../schemas/mealPlanSchemas';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/meal-plans
 * List all meal plans for the authenticated user
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const plans = await getUserMealPlans(userId);

    // Add progress to each plan
    const plansWithProgress = plans.map(plan => ({
      ...plan,
      progress: calculatePlanProgress(plan),
    }));

    res.json(plansWithProgress);
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

/**
 * GET /api/meal-plans/active
 * Get the currently active meal plan for the authenticated user
 */
router.get('/active', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const plan = await getActiveMealPlan(userId);

    if (!plan) {
      return res.status(404).json({ error: 'No active meal plan found' });
    }

    const planWithProgress = {
      ...plan,
      progress: calculatePlanProgress(plan),
    };

    res.json(planWithProgress);
  } catch (error) {
    console.error('Error fetching active meal plan:', error);
    res.status(500).json({ error: 'Failed to fetch active meal plan' });
  }
});

/**
 * GET /api/meal-plans/:id
 * Get a specific meal plan by ID (owner only)
 */
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const planId = req.params.id;

    const plan = await getMealPlanById(planId, userId);

    if (!plan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const planWithProgress = {
      ...plan,
      progress: calculatePlanProgress(plan),
    };

    res.json(planWithProgress);
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    res.status(500).json({ error: 'Failed to fetch meal plan' });
  }
});

/**
 * POST /api/meal-plans
 * Create a new meal plan from generation result
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const validatedData = CreateMealPlanSchema.parse(req.body);

    // Create the meal plan
    const plan = await createMealPlan({
      userId,
      planData: validatedData.planData,
    });

    const planWithProgress = {
      ...plan,
      progress: calculatePlanProgress(plan),
    };

    res.status(201).json(planWithProgress);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error creating meal plan:', error);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
});

/**
 * PUT /api/meal-plans/:id/activate
 * Set a meal plan as active (deactivates other plans)
 */
router.put('/:id/activate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const planId = req.params.id;

    const plan = await activatePlan(planId, userId);

    const planWithProgress = {
      ...plan,
      progress: calculatePlanProgress(plan),
    };

    res.json(planWithProgress);
  } catch (error: any) {
    console.error('Error activating meal plan:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.status(500).json({ error: 'Failed to activate meal plan' });
  }
});

/**
 * PUT /api/meal-plans/:id/deactivate
 * Remove active status from a meal plan
 */
router.put('/:id/deactivate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const planId = req.params.id;

    const plan = await deactivatePlan(planId, userId);

    const planWithProgress = {
      ...plan,
      progress: calculatePlanProgress(plan),
    };

    res.json(planWithProgress);
  } catch (error: any) {
    console.error('Error deactivating meal plan:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.status(500).json({ error: 'Failed to deactivate meal plan' });
  }
});

/**
 * PUT /api/meal-plans/:id/meals/:mealId/eaten
 * Mark a meal as eaten and deduct from inventory
 */
router.put('/:id/meals/:mealId/eaten', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { mealId } = req.params;

    // Validate that mealId exists
    if (!mealId) {
      return res.status(400).json({ error: 'Meal ID is required' });
    }

    const meal = await markMealEaten({ mealId, userId });

    res.json(meal);
  } catch (error: any) {
    console.error('Error marking meal as eaten:', error);

    if (error.message === 'Meal not found') {
      return res.status(404).json({ error: 'Meal not found' });
    }

    if (error.message === 'Unauthorized') {
      return res.status(403).json({ error: 'Unauthorized to modify this meal' });
    }

    res.status(500).json({ error: 'Failed to mark meal as eaten' });
  }
});

/**
 * DELETE /api/meal-plans/:id
 * Delete a meal plan (owner only)
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const planId = req.params.id;

    await deleteMealPlan(planId, userId);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting meal plan:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});

export default router;
