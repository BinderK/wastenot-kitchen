import { z } from 'zod';

// Ingredient schema
const IngredientSchema = z.object({
  name: z.string(),
  amount: z.string(),
});

// Inventory usage schema
const InventoryUsageSchema = z.object({
  itemName: z.string(),
  amountUsed: z.number(),
  unit: z.string(),
});

// Recipe schema
const RecipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  ingredients: z.array(IngredientSchema),
  instructions: z.array(z.string()),
  cookingTimeMinutes: z.number(),
  inventoryUsage: z.array(InventoryUsageSchema),
  wasteReductionNote: z.string(),
});

// Meal schema
const MealSchema = z.object({
  type: z.enum(['Breakfast', 'Lunch', 'Dinner']),
  recipe: RecipeSchema,
});

// Day schema
const DaySchema = z.object({
  day: z.string(),
  meals: z.array(MealSchema),
});

// Meal plan response schema
const MealPlanResponseSchema = z.object({
  planName: z.string(),
  summary: z.string(),
  schedule: z.array(DaySchema),
});

// Create meal plan schema
export const CreateMealPlanSchema = z.object({
  planData: MealPlanResponseSchema,
});

// Mark meal eaten schema
export const MarkMealEatenSchema = z.object({
  mealId: z.string(),
});

// Activate plan schema
export const ActivatePlanSchema = z.object({
  planId: z.string(),
});

// Food item schema
export const FoodItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  expiryDate: z.string(), // ISO Date string YYYY-MM-DD
  category: z.string(),
});

// Generate meal plans input schema
export const GenerateMealPlansSchema = z.object({
  inventory: z.array(FoodItemSchema),
  days: z.union([z.number(), z.literal('dynamic')]),
  people: z.number().optional().default(1),
  includedMeals: z.array(z.enum(['Breakfast', 'Lunch', 'Dinner'])),
});

// Scan receipt input schema
export const ScanReceiptSchema = z.object({
  imageBase64: z.string(),
});

// Generate recipe input schema
export const GenerateRecipeSchema = z.object({
  inventory: z.array(FoodItemSchema),
  cuisine: z.string().optional(),
  dietary: z.array(z.string()).optional(),
  maxTime: z.number().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});
