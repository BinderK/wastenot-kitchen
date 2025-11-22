import { FoodItem, Recipe, MealPlanSet, MealType, MealPlanResponse, InventoryUsage } from "../types";
import { LOCAL_RECIPES } from "../constants";
import { convertAmount, normalizeUnit } from "../utils";

const API_URL = "http://localhost:5111/solve";

// Helper to determine base unit type for normalization
const getBaseUnit = (unit: string): string => {
  const u = normalizeUnit(unit);
  const weightUnits = ['g', 'kg', 'oz', 'lbs'];
  const volUnits = ['ml', 'l', 'cup', 'tbsp', 'tsp'];
  
  if (weightUnits.includes(u)) return 'g';
  if (volUnits.includes(u)) return 'ml';
  return 'pcs';
};

export const generateOptimalMealPlan = async (
  inventory: FoodItem[],
  includedMeals: MealType[],
  duration: number | 'dynamic'
): Promise<MealPlanSet> => {
  
  // 1. PRE-PROCESSING: Normalize Inventory
  // Convert everything to grams, ml, or pcs to ensure the solver compares apples to apples.
  const normalizedInventory: Record<string, { qty: number; expiry_weight: number }> = {};
  const inventoryMap = new Map<string, FoodItem>(); // Keep reference to original items for reconstruction

  const today = new Date();
  
  inventory.forEach(item => {
    const baseUnit = getBaseUnit(item.unit);
    const normalizedQty = convertAmount(item.quantity, item.unit, baseUnit);
    const key = item.name.toLowerCase().trim();
    
    // Calculate Expiry Weight
    // High weight = Expiring soon = Solver should prioritize usage
    const expDate = new Date(item.expiryDate);
    const diffDays = (expDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
    // Weight formula: 1 / (days + 1). Expired/Today = 1.0, 10 days = 0.1
    const safeDiff = Math.max(0.1, diffDays); 
    const weight = 10 / safeDiff; 

    if (normalizedInventory[key]) {
      normalizedInventory[key].qty += normalizedQty;
      // Keep the higher urgency weight if merging
      normalizedInventory[key].expiry_weight = Math.max(normalizedInventory[key].expiry_weight, weight);
      // Keep the earliest expiry (smallest days_until_expiry) if merging
      normalizedInventory[key].days_until_expiry = Math.min(normalizedInventory[key].days_until_expiry || diffDays, diffDays);
    } else {
      normalizedInventory[key] = {
        qty: Number(normalizedQty.toFixed(2)),
        expiry_weight: Number(weight.toFixed(2)),
        days_until_expiry: Math.ceil(diffDays) // Round up to be safe (e.g., 1.5 days = 2 days)
      };
    }
    
    // Store reference for recipe matching later
    inventoryMap.set(key, item);
  });

  // 2. PRE-PROCESSING: Normalize Recipes
  // Create a simplified list of recipes with ingredient requirements in base units
  const simplifiedRecipes = LOCAL_RECIPES.map((recipe, index) => {
    const ingredientsDict: Record<string, number> = {};
    
    recipe.ingredients.forEach(ing => {
      const parts = ing.amount.trim().split(' ');
      const amount = parseFloat(parts[0]);
      const unit = parts.length > 1 ? parts[1] : 'pcs';
      
      if (!isNaN(amount)) {
        // Attempt to find matching inventory key
        const invKey = Object.keys(normalizedInventory).find(k => k.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(k));
        
        if (invKey) {
            // Convert recipe requirement to the SAME base unit as the inventory item
            // We need to know the inventory item's original unit type to pick the target base unit
            // But here we normalized inventory to 'g', 'ml', 'pcs'.
            // We can infer the target base unit from the inventory normalization logic.
            
            // Find the original item to check its unit type roughly? 
            // Actually, we just need to normalize the ingredient unit to the same standard base units.
            const targetBase = getBaseUnit(unit);
            
            // Note: If recipe asks for "pcs" but inventory is "g", conversion might fail or be 1:1. 
            // The solver assumes units match.
            const normalizedAmount = convertAmount(amount, unit, targetBase);
            ingredientsDict[invKey] = Number(normalizedAmount.toFixed(2));
        }
      }
    });

    return {
      id: index, // Simple integer ID for the solver
      title: recipe.title,
      ingredients: ingredientsDict
    };
  }).filter(r => Object.keys(r.ingredients).length > 0); // Remove recipes where we have 0 ingredients matching

  // 3. CALL PYTHON SOLVER
  const payload = {
    inventory: normalizedInventory,
    recipes: simplifiedRecipes,
    days: duration === 'dynamic' ? 7 : duration,
    meals: includedMeals
  };

  let solverResponse;
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      // Try to read error message from response body
      let errorMessage = `Server Error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.status || errorMessage;
      } catch (e) {
        // If response isn't JSON, use statusText
      }
      throw new Error(errorMessage);
    }
    solverResponse = await response.json();
  } catch (error: any) {
    console.error("Solver failed:", error);
    if (error.message && error.message.includes("Server Error")) {
      throw error; // Re-throw server errors with their message
    }
    throw new Error("Failed to connect to Python Solver. Ensure server.py is running on port 5111.");
  }

  if (solverResponse.status !== 'Optimal' && solverResponse.status !== 'Feasible') {
    throw new Error(solverResponse.message || "Solver could not find a valid plan.");
  }

  // 4. RECONSTRUCT PLAN FROM SOLVER OUTPUT
  const finalSchedule = solverResponse.schedule.map((day: any) => {
    const meals = day.meals.map((m: any) => {
      const originalRecipe = LOCAL_RECIPES[m.recipeId];
      
      // Re-calculate usage for the frontend display
      // We reuse the logic from localPlanService slightly, or just static calculation
      const usage: InventoryUsage[] = originalRecipe.ingredients.map(ing => {
         const parts = ing.amount.trim().split(' ');
         return {
           itemName: ing.name, // Use recipe name for display, deduction logic in App will match fuzzily
           amountUsed: parseFloat(parts[0]),
           unit: parts.length > 1 ? parts[1] : 'pcs'
         };
      });

      return {
        type: m.type,
        recipe: { ...originalRecipe, inventoryUsage: usage },
        isEaten: false
      };
    });

    return {
      day: day.day,
      meals: meals
    };
  });

  return {
    options: [{
      planName: "Mathematically Optimal",
      summary: `A ${finalSchedule.length}-day plan generated using Integer Linear Programming to maximize inventory usage and expiry freshness.`,
      schedule: finalSchedule
    }]
  };
};
