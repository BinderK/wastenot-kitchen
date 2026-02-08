import { FoodItem, MealPlanSet, MealType, MealPlanResponse, MealPlanMeal, Recipe, InventoryUsage } from "@shared/types";
import { LOCAL_RECIPES } from "@shared/constants";
import { convertAmount, normalizeUnit } from "@shared/utils";

// Helper to track running inventory state
interface InventoryState {
  [key: string]: {
    quantity: number;
    unit: string;
    originalName: string;
  };
}

export const generateLocalMealPlans = (
  inventory: FoodItem[], 
  includedMeals: MealType[],
  duration: number | 'dynamic'
): MealPlanSet => {
  
  // 1. Initialize Simulated Inventory
  // We use a map for O(1) access by normalized name.
  // This represents the "Running Total" of available food as we schedule meals.
  const simulatedInventory: InventoryState = {};
  
  inventory.forEach(item => {
    const key = item.name.toLowerCase().trim();
    // If duplicates exist (e.g. 2 bags of spinach), we sum them up for the simulation
    if (simulatedInventory[key]) {
      const existing = simulatedInventory[key];
      const convertedQty = convertAmount(item.quantity, item.unit, existing.unit);
      existing.quantity += convertedQty;
    } else {
      simulatedInventory[key] = {
        quantity: item.quantity,
        unit: item.unit,
        originalName: item.name
      };
    }
  });

  const schedule: MealPlanResponse['schedule'] = [];
  
  // If dynamic, we aim for up to 7 days, but stop if we run out of food.
  // If fixed, we aim for 'duration', and stop if we run out of food (producing a partial plan is better than a broken one).
  const targetDays = duration === 'dynamic' ? 7 : duration;
  
  // Track history to avoid repetition
  // Map of "Day Index" -> Set of recipe titles used
  const planHistory = new Map<number, Set<string>>();
  
  // 2. Generation Loop
  for (let day = 1; day <= targetDays; day++) {
    const mealsForDay: MealPlanMeal[] = [];
    const usedRecipesToday = new Set<string>();
    
    // Get recipes used yesterday to prevent back-to-back repetition
    const usedRecipesYesterday = planHistory.get(day - 1) || new Set<string>();

    for (const mealType of includedMeals) {
      // Find recipes that can be cooked with CURRENT simulated inventory
      const cookableRecipes: { recipe: Recipe; usage: InventoryUsage[] }[] = [];

      for (const recipe of LOCAL_RECIPES) {
        // CONSTRAINT: No repeats same day or previous day
        if (usedRecipesToday.has(recipe.title)) continue;
        if (usedRecipesYesterday.has(recipe.title)) continue;

        let possible = true;
        const currentUsage: InventoryUsage[] = [];

        for (const ing of recipe.ingredients) {
          // Parse requirement
          const parts = ing.amount.trim().split(' ');
          const reqAmount = parseFloat(parts[0]);
          const reqUnit = parts.length > 1 ? normalizeUnit(parts[1]) : 'pcs';
          
          if (isNaN(reqAmount)) { possible = false; break; }

          // Check against inventory
          // Simple matching: checks if ingredient name exists in inventory key
          const invKey = Object.keys(simulatedInventory).find(k => 
            k.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(k)
          );

          if (!invKey) {
            // Ingredient missing entirely
            possible = false; 
            break; 
          }

          const invItem = simulatedInventory[invKey];
          const availableInReqUnit = convertAmount(invItem.quantity, invItem.unit, reqUnit);

          // Strict check: Do we have enough?
          if (availableInReqUnit < reqAmount) {
            possible = false;
            break;
          }

          // Record usage for this ingredient
          currentUsage.push({
            itemName: invItem.originalName,
            amountUsed: reqAmount,
            unit: reqUnit
          });
        }

        if (possible) {
          cookableRecipes.push({ recipe, usage: currentUsage });
        }
      }

      // If we have options, pick one
      if (cookableRecipes.length > 0) {
        // Heuristic: Prioritize recipes that use the most ingredients (to clear inventory)
        // Randomize slightly to prevent deterministic boredom if scores are tied
        cookableRecipes.sort((a, b) => {
           const scoreA = a.recipe.ingredients.length + Math.random();
           const scoreB = b.recipe.ingredients.length + Math.random();
           return scoreB - scoreA;
        });
        
        const selected = cookableRecipes[0];
        
        // Deduct from simulated inventory immediately so next meal/day sees reduced stock
        selected.usage.forEach(u => {
          const key = Object.keys(simulatedInventory).find(k => 
            k.includes(u.itemName.toLowerCase())
          );
          if (key) {
            const invItem = simulatedInventory[key];
            // Convert usage back to inventory unit to subtract
            const deductAmount = convertAmount(u.amountUsed, u.unit, invItem.unit);
            invItem.quantity = Math.max(0, invItem.quantity - deductAmount);
          }
        });

        mealsForDay.push({
          type: mealType,
          recipe: { ...selected.recipe, inventoryUsage: selected.usage },
          isEaten: false
        });
        
        usedRecipesToday.add(selected.recipe.title);
      }
    }

    // PLAN VALIDITY LOGIC
    // If we couldn't generate ALL requested meals for this day due to inventory shortage:
    // - If dynamic: Stop the plan here. We are done.
    // - If fixed: Stop the plan here. We can't make more days safely.
    
    if (mealsForDay.length < includedMeals.length) {
        // We ran out of food to make a complete day.
        break;
    }
    
    // Save history
    planHistory.set(day, usedRecipesToday);
    schedule.push({ day: `Day ${day}`, meals: mealsForDay });
  }

  const plan: MealPlanResponse = {
    planName: "Inventory Hero",
    summary: schedule.length > 0 
      ? `A ${schedule.length}-day plan optimized to use your existing stock without needing a grocery run.`
      : "Insufficient inventory to generate a complete meal plan.",
    schedule: schedule
  };

  return {
    options: [plan]
  };
};