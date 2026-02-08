import { PrismaClient, Recipe, RecipeIngredient, RecipeSource } from '@prisma/client';
import { CreateRecipeInput, UpdateRecipeInput } from '../schemas/recipe.schema';

const prisma = new PrismaClient();

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

export interface RecipeFilters {
  source?: RecipeSource;
  authorId?: string;
  search?: string;
  isPublic?: boolean;
}

/**
 * Get recipes with optional filtering
 */
export const getRecipes = async (filters: RecipeFilters = {}): Promise<RecipeWithIngredients[]> => {
  const where: any = {};

  if (filters.source) {
    where.source = filters.source;
  }

  if (filters.authorId) {
    where.authorId = filters.authorId;
  }

  if (filters.isPublic !== undefined) {
    where.isPublic = filters.isPublic;
  }

  if (filters.search) {
    // Search in title or description
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return prisma.recipe.findMany({
    where,
    include: {
      ingredients: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Get a single recipe by ID with ingredients
 */
export const getRecipeById = async (recipeId: string): Promise<RecipeWithIngredients | null> => {
  return prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        orderBy: { order: 'asc' },
      },
    },
  });
};

/**
 * Create a new recipe with ingredients in a transaction
 * For AI-generated recipes, source should be AI_GENERATED and authorId should be the current user
 */
export const createRecipe = async (
  userId: string,
  data: CreateRecipeInput
): Promise<RecipeWithIngredients> => {
  return prisma.$transaction(async (tx) => {
    // Create the recipe
    const recipe = await tx.recipe.create({
      data: {
        title: data.title,
        description: data.description,
        cookingTimeMinutes: data.cookingTimeMinutes,
        wasteReductionNote: data.wasteReductionNote,
        source: data.source || RecipeSource.USER,
        authorId: userId,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
      },
    });

    // Create ingredients
    const ingredients = await Promise.all(
      data.ingredients.map((ingredient, index) =>
        tx.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            name: ingredient.name,
            amount: ingredient.amount,
            order: ingredient.order !== undefined ? ingredient.order : index,
          },
        })
      )
    );

    return {
      ...recipe,
      ingredients,
    };
  });
};

/**
 * Update a recipe (with ownership and SYSTEM recipe protection)
 */
export const updateRecipe = async (
  recipeId: string,
  userId: string,
  data: UpdateRecipeInput
): Promise<RecipeWithIngredients | null> => {
  // First, check if recipe exists and get ownership info
  const existing = await prisma.recipe.findUnique({
    where: { id: recipeId },
  });

  if (!existing) {
    return null;
  }

  // Prevent editing SYSTEM recipes
  if (existing.source === RecipeSource.SYSTEM) {
    throw new Error('Cannot edit SYSTEM recipes');
  }

  // Check ownership
  if (existing.authorId !== userId) {
    throw new Error('Forbidden: You do not own this recipe');
  }

  return prisma.$transaction(async (tx) => {
    // Build update data for recipe
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.cookingTimeMinutes !== undefined) updateData.cookingTimeMinutes = data.cookingTimeMinutes;
    if (data.wasteReductionNote !== undefined) updateData.wasteReductionNote = data.wasteReductionNote;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    // Update the recipe
    const recipe = await tx.recipe.update({
      where: { id: recipeId },
      data: updateData,
    });

    // If ingredients are provided, replace them
    if (data.ingredients !== undefined) {
      // Delete existing ingredients
      await tx.recipeIngredient.deleteMany({
        where: { recipeId },
      });

      // Create new ingredients
      await Promise.all(
        data.ingredients.map((ingredient, index) =>
          tx.recipeIngredient.create({
            data: {
              recipeId: recipe.id,
              name: ingredient.name,
              amount: ingredient.amount,
              order: ingredient.order !== undefined ? ingredient.order : index,
            },
          })
        )
      );
    }

    // Fetch and return the updated recipe with ingredients
    const updatedRecipe = await tx.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return updatedRecipe;
  });
};

/**
 * Delete a recipe (with ownership and SYSTEM recipe protection)
 */
export const deleteRecipe = async (recipeId: string, userId: string): Promise<boolean> => {
  const existing = await prisma.recipe.findUnique({
    where: { id: recipeId },
  });

  if (!existing) {
    return false;
  }

  // Prevent deleting SYSTEM recipes
  if (existing.source === RecipeSource.SYSTEM) {
    throw new Error('Cannot delete SYSTEM recipes');
  }

  // Check ownership
  if (existing.authorId !== userId) {
    throw new Error('Forbidden: You do not own this recipe');
  }

  await prisma.recipe.delete({
    where: { id: recipeId },
  });

  return true;
};
