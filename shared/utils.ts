import { FoodItem, Recipe, InventoryUsage } from "./types";

export const normalizeUnit = (unit: string): string => {
  if (!unit) return '';
  const u = unit.toLowerCase().trim();
  // Standardize common variations
  if (u === 'kgs' || u === 'kilo') return 'kg';
  if (u === 'lbs' || u === 'pound' || u === 'pounds') return 'lbs';
  if (u === 'liters' || u === 'liter') return 'l';
  if (u === 'milliliters') return 'ml';
  if (u === 'grams' || u === 'gram') return 'g';
  if (u === 'pieces' || u === 'pc' || u === 'piece') return 'pcs';
  if (u === 'tablespoon' || u === 'tbsp.') return 'tbsp';
  if (u === 'teaspoon' || u === 'tsp.') return 'tsp';
  return u;
};

const CONVERSION_RATES: Record<string, number> = {
  // Weight (base: g)
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lbs: 453.592,

  // Volume (base: ml)
  ml: 1,
  l: 1000,
  cup: 236.588,
  tbsp: 14.7868,
  tsp: 4.92892,

  // Count (base: pcs)
  pcs: 1,

  // Fallbacks (assume 1:1 if no other info, but distinct type)
  bag: 1,
  box: 1,
  can: 1
};

const UNIT_TYPES: Record<string, string> = {
  g: 'weight', kg: 'weight', oz: 'weight', lbs: 'weight',
  ml: 'volume', l: 'volume', cup: 'volume', tbsp: 'volume', tsp: 'volume',
  pcs: 'count', bag: 'count', box: 'count', can: 'count'
};

export const convertAmount = (amount: number, fromUnit: string, toUnit: string): number => {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) return amount;

  // Handle case sensitivity or missing keys by defaulting
  const typeFrom = UNIT_TYPES[from];
  const typeTo = UNIT_TYPES[to];

  // If we can't determine type, or types match, we convert.
  // If types mismatch (weight vs volume), we try a 1g = 1ml approx for cooking context
  const isWeightToVolume = (typeFrom === 'weight' && typeTo === 'volume');
  const isVolumeToWeight = (typeFrom === 'volume' && typeTo === 'weight');

  if (typeFrom && typeTo && typeFrom !== typeTo && !isWeightToVolume && !isVolumeToWeight) {
    // Incompatible types (e.g. 'pcs' to 'kg'), return original amount as fallback
    // This prevents crazy math like 500g = 500 bags
    console.warn(`Cannot convert ${fromUnit} to ${toUnit}`);
    return amount;
  }

  const factorFrom = CONVERSION_RATES[from] || 1;
  const factorTo = CONVERSION_RATES[to] || 1;

  // Convert to base then to target
  const valueInBase = amount * factorFrom;
  return valueInBase / factorTo;
};

export interface ParsedIngredient {
  name: string;
  amount: number;
  unit: string;
}

export const parseIngredient = (ingredientString: string): ParsedIngredient | null => {
  const parts = ingredientString.trim().split(' ');
  if (parts.length < 2) return null;

  const amount = parseFloat(parts[0]);
  if (isNaN(amount)) return null;

  const unit = normalizeUnit(parts[1]);
  const name = parts.slice(2).join(' ');

  return { name, amount, unit };
};

export interface RecipeMatchStatus {
  recipe: Recipe;
  matchPercentage: number;
  missingIngredients: { name: string; amount: string }[];
  ingredientStatuses: {
    ingredientName: string;
    requiredAmount: number;
    requiredUnit: string;
    availableAmount: number; // in requiredUnit
    hasEnough: boolean;
  }[];
  // Generated inventory usage for deduction logic
  calculatedInventoryUsage: InventoryUsage[];
}

export const getRecipeMatchStatus = (recipe: Recipe, inventory: FoodItem[]): RecipeMatchStatus => {
  const ingredientStatuses: RecipeMatchStatus['ingredientStatuses'] = [];
  const missingIngredients: RecipeMatchStatus['missingIngredients'] = [];
  const calculatedInventoryUsage: InventoryUsage[] = [];

  let ingredientsMet = 0;
  let totalIngredients = recipe.ingredients.length;

  recipe.ingredients.forEach(ing => {
    // Parse ingredient amount string "200 g" -> 200, "g"
    const parts = ing.amount.trim().split(' ');
    const reqAmount = parseFloat(parts[0]);
    const reqUnit = parts.length > 1 ? normalizeUnit(parts[1]) : 'pcs'; // Default to pcs if no unit

    if (isNaN(reqAmount)) {
      // Fallback for unparseable amounts
      missingIngredients.push({ name: ing.name, amount: ing.amount });
      return;
    }

    // Find matching inventory item(s)
    // Simple string matching for now (case insensitive)
    const matchingItems = inventory.filter(item =>
      item.name.toLowerCase().includes(ing.name.toLowerCase()) ||
      ing.name.toLowerCase().includes(item.name.toLowerCase())
    );

    if (matchingItems.length === 0) {
      missingIngredients.push({ name: ing.name, amount: ing.amount });
      ingredientStatuses.push({
        ingredientName: ing.name,
        requiredAmount: reqAmount,
        requiredUnit: reqUnit,
        availableAmount: 0,
        hasEnough: false
      });
    } else {
      // Calculate total available amount in the REQUIRED unit
      let totalAvailable = 0;

      // We also need to build the InventoryUsage object here IF we have matches.
      // However, InventoryUsage needs to be specific to an item name for the deduction logic.
      // If there are multiple matches (e.g. 2 bags of spinach), we just take the first one's name for the usage record key
      // or we might need to handle the distribution logic here.
      // For simplicity in this match view: check total availability.

      matchingItems.forEach(item => {
        totalAvailable += convertAmount(item.quantity, item.unit, reqUnit);
      });

      const hasEnough = totalAvailable >= reqAmount;
      if (hasEnough) ingredientsMet++;

      ingredientStatuses.push({
        ingredientName: ing.name,
        requiredAmount: reqAmount,
        requiredUnit: reqUnit,
        availableAmount: Number(totalAvailable.toFixed(2)),
        hasEnough
      });

      // For deduction logic: We need to tell the system "Use X amount of Y".
      // The generic system uses item names. We'll use the name of the first matching item
      // to trigger the deduction logic in App.tsx which handles distribution across same-named items.
      if (matchingItems.length > 0) {
        calculatedInventoryUsage.push({
          itemName: matchingItems[0].name, // Use the actual inventory name
          amountUsed: reqAmount,
          unit: reqUnit
        });
      }
    }
  });

  const matchPercentage = totalIngredients > 0 ? Math.round((ingredientsMet / totalIngredients) * 100) : 0;

  return {
    recipe,
    matchPercentage,
    missingIngredients,
    ingredientStatuses,
    calculatedInventoryUsage
  };
};

export const calculateDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};
