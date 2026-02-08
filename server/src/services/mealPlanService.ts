import { PrismaClient, MealPlan, MealPlanDay, MealPlanMeal } from '@prisma/client';
import { MealPlanResponse, MealType } from '../../../shared/types';

const prisma = new PrismaClient();

interface CreateMealPlanInput {
  userId: string;
  planData: MealPlanResponse;
}

interface MealPlanWithDetails extends MealPlan {
  days: (MealPlanDay & {
    meals: MealPlanMeal[];
  })[];
}

interface MarkMealEatenInput {
  mealId: string;
  userId: string;
}

/**
 * Get all meal plans for a user
 */
export const getUserMealPlans = async (userId: string): Promise<MealPlanWithDetails[]> => {
  return await prisma.mealPlan.findMany({
    where: { userId },
    include: {
      days: {
        include: {
          meals: true,
        },
        orderBy: { dayOrder: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Get the currently active meal plan for a user
 */
export const getActiveMealPlan = async (userId: string): Promise<MealPlanWithDetails | null> => {
  return await prisma.mealPlan.findFirst({
    where: {
      userId,
      isActive: true,
    },
    include: {
      days: {
        include: {
          meals: true,
        },
        orderBy: { dayOrder: 'asc' },
      },
    },
  });
};

/**
 * Create a new meal plan from generation result
 */
export const createMealPlan = async ({ userId, planData }: CreateMealPlanInput): Promise<MealPlanWithDetails> => {
  return await prisma.$transaction(async (tx) => {
    // Create the meal plan
    const mealPlan = await tx.mealPlan.create({
      data: {
        userId,
        planName: planData.planName,
        summary: planData.summary,
        isActive: false,
        days: {
          create: planData.schedule.map((dayData, dayIndex) => ({
            dayLabel: dayData.day,
            dayOrder: dayIndex,
            meals: {
              create: dayData.meals.map((mealData) => {
                // Convert meal type to match Prisma enum
                const mealType = mealData.type.toUpperCase() as 'BREAKFAST' | 'LUNCH' | 'DINNER';

                return {
                  mealType,
                  recipeJson: JSON.stringify(mealData.recipe),
                  isEaten: false,
                };
              }),
            },
          })),
        },
      },
      include: {
        days: {
          include: {
            meals: true,
          },
          orderBy: { dayOrder: 'asc' },
        },
      },
    });

    return mealPlan;
  });
};

/**
 * Activate a meal plan (deactivates all other plans for the user)
 */
export const activatePlan = async (planId: string, userId: string): Promise<MealPlanWithDetails> => {
  return await prisma.$transaction(async (tx) => {
    // Deactivate all other plans for this user
    await tx.mealPlan.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Activate the selected plan
    const plan = await tx.mealPlan.update({
      where: {
        id: planId,
        userId, // Ensure user owns this plan
      },
      data: {
        isActive: true,
      },
      include: {
        days: {
          include: {
            meals: true,
          },
          orderBy: { dayOrder: 'asc' },
        },
      },
    });

    return plan;
  });
};

/**
 * Deactivate a meal plan
 */
export const deactivatePlan = async (planId: string, userId: string): Promise<MealPlanWithDetails> => {
  return await prisma.mealPlan.update({
    where: {
      id: planId,
      userId,
    },
    data: {
      isActive: false,
    },
    include: {
      days: {
        include: {
          meals: true,
        },
        orderBy: { dayOrder: 'asc' },
      },
    },
  });
};

/**
 * Mark a meal as eaten and deduct inventory
 */
export const markMealEaten = async ({ mealId, userId }: MarkMealEatenInput): Promise<MealPlanMeal> => {
  return await prisma.$transaction(async (tx) => {
    // Get the meal with its plan
    const meal = await tx.mealPlanMeal.findUnique({
      where: { id: mealId },
      include: {
        day: {
          include: {
            mealPlan: true,
          },
        },
      },
    });

    if (!meal) {
      throw new Error('Meal not found');
    }

    // Check ownership
    if (meal.day.mealPlan.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Mark as eaten
    const updatedMeal = await tx.mealPlanMeal.update({
      where: { id: mealId },
      data: { isEaten: true },
    });

    // Deduct inventory if recipe has inventoryUsage
    if (meal.recipeJson) {
      const recipe = JSON.parse(meal.recipeJson);
      if (recipe.inventoryUsage && Array.isArray(recipe.inventoryUsage)) {
        for (const usage of recipe.inventoryUsage) {
          // Find the matching inventory item
          const foodItem = await tx.foodItem.findFirst({
            where: {
              userId,
              name: usage.itemName,
            },
          });

          if (foodItem) {
            const newQuantity = foodItem.quantity - usage.amountUsed;

            if (newQuantity <= 0) {
              // Delete the item if quantity reaches 0 or below
              await tx.foodItem.delete({
                where: { id: foodItem.id },
              });
            } else {
              // Update the quantity
              await tx.foodItem.update({
                where: { id: foodItem.id },
                data: { quantity: newQuantity },
              });
            }
          }
        }
      }
    }

    return updatedMeal;
  });
};

/**
 * Calculate progress percentage for a meal plan
 */
export const calculatePlanProgress = (plan: MealPlanWithDetails): number => {
  let totalMeals = 0;
  let eatenMeals = 0;

  for (const day of plan.days) {
    for (const meal of day.meals) {
      totalMeals++;
      if (meal.isEaten) {
        eatenMeals++;
      }
    }
  }

  if (totalMeals === 0) return 0;
  return Math.round((eatenMeals / totalMeals) * 100);
};

/**
 * Delete a meal plan
 */
export const deleteMealPlan = async (planId: string, userId: string): Promise<void> => {
  await prisma.mealPlan.delete({
    where: {
      id: planId,
      userId,
    },
  });
};

/**
 * Get a specific meal plan by ID
 */
export const getMealPlanById = async (planId: string, userId: string): Promise<MealPlanWithDetails | null> => {
  return await prisma.mealPlan.findFirst({
    where: {
      id: planId,
      userId,
    },
    include: {
      days: {
        include: {
          meals: true,
        },
        orderBy: { dayOrder: 'asc' },
      },
    },
  });
};
