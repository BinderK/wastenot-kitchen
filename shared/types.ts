export interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string; // ISO Date string YYYY-MM-DD
  category: string;
}

export interface Ingredient {
  name: string;
  amount: string;
}

export interface InventoryUsage {
  itemName: string; // Must match the exact name in inventory
  amountUsed: number;
  unit: string;
}

export interface Recipe {
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  cookingTimeMinutes: number;
  // Structured data for logic
  inventoryUsage: InventoryUsage[];
  wasteReductionNote: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
}

export interface MealPlanMeal {
  type: 'Breakfast' | 'Lunch' | 'Dinner';
  recipe: Recipe;
  isEaten?: boolean; // New field to track status
}

export interface MealPlanDay {
  day: string;
  meals: MealPlanMeal[];
}

export interface MealPlanResponse {
  planName: string;
  summary: string;
  schedule: MealPlanDay[];
}

export interface MealPlanSet {
  options: MealPlanResponse[];
}

export enum ViewState {
  INVENTORY = 'INVENTORY',
  PLAN_SELECTION = 'PLAN_SELECTION',
  ACTIVE_PLAN = 'ACTIVE_PLAN',
  RECIPE_BOOK = 'RECIPE_BOOK'
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

export interface MealPreferences {
  includedMeals: MealType[];
}

// New types for server architecture
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
