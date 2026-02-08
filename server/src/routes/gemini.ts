import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth';
import {
  generateMealPlans,
  identifyInventoryFromImage,
  generateRecipe,
} from '../services/geminiService';
import {
  GenerateMealPlansSchema,
  ScanReceiptSchema,
  GenerateRecipeSchema,
} from '../schemas/mealPlanSchemas';
import { z } from 'zod';

const router = Router();

/**
 * POST /api/gemini/meal-plans
 * Generate meal plan options using Gemini AI
 */
router.post('/meal-plans', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validatedData = GenerateMealPlansSchema.parse(req.body);

    const { inventory, days, people, includedMeals } = validatedData;

    // Generate meal plans
    const result = await generateMealPlans(
      inventory,
      includedMeals,
      days,
      people
    );

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    console.error('Error generating meal plans:', error);

    // Check if it's a Gemini API error
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
      }
    }

    res.status(500).json({ error: 'Failed to generate meal plans' });
  }
});

/**
 * POST /api/gemini/scan-receipt
 * OCR receipt image to extract food items
 */
router.post('/scan-receipt', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validatedData = ScanReceiptSchema.parse(req.body);

    const { imageBase64 } = validatedData;

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Identify items from image
    const items = await identifyInventoryFromImage(base64Data);

    res.json(items);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    console.error('Error scanning receipt:', error);

    // Check if it's a Gemini API error
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
      }
    }

    res.status(500).json({ error: 'Failed to scan receipt' });
  }
});

/**
 * POST /api/gemini/generate-recipe
 * Generate a custom recipe using AI based on inventory and preferences
 */
router.post('/generate-recipe', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validatedData = GenerateRecipeSchema.parse(req.body);

    const { inventory, cuisine, dietary, maxTime, difficulty } = validatedData;

    // Generate recipe
    const recipe = await generateRecipe({
      inventory,
      cuisine,
      dietary,
      maxTime,
      difficulty,
    });

    res.json(recipe);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    console.error('Error generating recipe:', error);

    // Check if it's a Gemini API error
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
      }
    }

    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

export default router;
