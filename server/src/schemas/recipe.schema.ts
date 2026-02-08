import { z } from 'zod';
import { RecipeSource } from '@prisma/client';

// Schema for recipe ingredients
const RecipeIngredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name is required').max(200),
  amount: z.string().min(1, 'Amount is required').max(100),
  order: z.number().int().min(0).optional(),
});

// Schema for creating a recipe
export const CreateRecipeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  cookingTimeMinutes: z.number().int().positive('Cooking time must be positive'),
  wasteReductionNote: z.string().min(1, 'Waste reduction note is required'),
  source: z.nativeEnum(RecipeSource).optional().default(RecipeSource.USER),
  isPublic: z.boolean().optional().default(true),
  ingredients: z.array(RecipeIngredientSchema).min(1, 'At least one ingredient is required'),
});

// Schema for updating a recipe
export const UpdateRecipeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  cookingTimeMinutes: z.number().int().positive().optional(),
  wasteReductionNote: z.string().min(1).optional(),
  isPublic: z.boolean().optional(),
  ingredients: z.array(RecipeIngredientSchema).min(1).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Schema for recipe query filters
export const RecipeQuerySchema = z.object({
  source: z.nativeEnum(RecipeSource).optional(),
  authorId: z.string().optional(),
  search: z.string().optional(),
  isPublic: z.enum(['true', 'false']).optional(),
});

export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof UpdateRecipeSchema>;
export type RecipeQueryInput = z.infer<typeof RecipeQuerySchema>;
export type RecipeIngredientInput = z.infer<typeof RecipeIngredientSchema>;
