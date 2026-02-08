import { PrismaClient, FoodItem } from '@prisma/client';
import { CreateFoodItemInput, UpdateFoodItemInput } from '../schemas/inventory.schema';

const prisma = new PrismaClient();

/**
 * Unit normalization and conversion utilities
 * Ported from utils.ts
 */
export const normalizeUnit = (unit: string): string => {
  if (!unit) return '';
  const u = unit.toLowerCase().trim();
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
  g: 1, kg: 1000, oz: 28.3495, lbs: 453.592,
  ml: 1, l: 1000, cup: 236.588, tbsp: 14.7868, tsp: 4.92892,
  pcs: 1, bag: 1, box: 1, can: 1
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

  const typeFrom = UNIT_TYPES[from];
  const typeTo = UNIT_TYPES[to];

  const isWeightToVolume = (typeFrom === 'weight' && typeTo === 'volume');
  const isVolumeToWeight = (typeFrom === 'volume' && typeTo === 'weight');

  if (typeFrom && typeTo && typeFrom !== typeTo && !isWeightToVolume && !isVolumeToWeight) {
    console.warn(`Cannot convert ${fromUnit} to ${toUnit}`);
    return amount;
  }

  const factorFrom = CONVERSION_RATES[from] || 1;
  const factorTo = CONVERSION_RATES[to] || 1;

  const valueInBase = amount * factorFrom;
  return valueInBase / factorTo;
};

/**
 * Fetch all inventory items for a user, sorted by expiry date (oldest first)
 */
export const getUserInventory = async (userId: string): Promise<FoodItem[]> => {
  return prisma.foodItem.findMany({
    where: { userId },
    orderBy: { expiryDate: 'asc' },
  });
};

/**
 * Get a single food item by ID (with ownership check)
 */
export const getItemById = async (itemId: string, userId: string): Promise<FoodItem | null> => {
  return prisma.foodItem.findFirst({
    where: {
      id: itemId,
      userId,
    },
  });
};

/**
 * Create a single food item
 */
export const createItem = async (userId: string, data: CreateFoodItemInput): Promise<FoodItem> => {
  return prisma.foodItem.create({
    data: {
      userId,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      expiryDate: new Date(data.expiryDate),
      category: data.category,
    },
  });
};

/**
 * Create multiple food items in a transaction
 */
export const createBulkItems = async (
  userId: string,
  items: CreateFoodItemInput[]
): Promise<FoodItem[]> => {
  const createdItems = await prisma.$transaction(
    items.map(item =>
      prisma.foodItem.create({
        data: {
          userId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          expiryDate: new Date(item.expiryDate),
          category: item.category,
        },
      })
    )
  );
  return createdItems;
};

/**
 * Update a food item (with ownership check)
 */
export const updateItem = async (
  itemId: string,
  userId: string,
  data: UpdateFoodItemInput
): Promise<FoodItem | null> => {
  // First check ownership
  const existing = await getItemById(itemId, userId);
  if (!existing) return null;

  // Build update data
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.expiryDate !== undefined) updateData.expiryDate = new Date(data.expiryDate);
  if (data.category !== undefined) updateData.category = data.category;

  return prisma.foodItem.update({
    where: { id: itemId },
    data: updateData,
  });
};

/**
 * Delete a food item (with ownership check)
 */
export const deleteItem = async (itemId: string, userId: string): Promise<boolean> => {
  const existing = await getItemById(itemId, userId);
  if (!existing) return false;

  await prisma.foodItem.delete({
    where: { id: itemId },
  });
  return true;
};

/**
 * FIFO Inventory Deduction Logic
 * Ported from App.tsx deductInventory function
 */
interface InventoryUsage {
  itemName: string;
  amountUsed: number;
  unit: string;
}

export const deductIngredients = async (
  userId: string,
  usageList: InventoryUsage[]
): Promise<FoodItem[]> => {
  return prisma.$transaction(async (tx) => {
    const inventory = await tx.foodItem.findMany({
      where: { userId },
      orderBy: { expiryDate: 'asc' },
    });

    const updatedInventory = [...inventory];

    for (const usage of usageList) {
      let amountRemainingToDeduct = Number(usage.amountUsed);
      const usageUnit = usage.unit;
      const itemName = usage.itemName.toLowerCase();

      // Find all matching items, sorted by expiry (oldest first)
      const matchingItems = updatedInventory
        .map((item, index) => ({ ...item, originalIndex: index }))
        .filter(item => item.name.toLowerCase() === itemName)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      // Distribute deduction across matching items (FIFO)
      for (const match of matchingItems) {
        if (amountRemainingToDeduct <= 0.001) break; // close enough to zero

        const currentIndex = match.originalIndex;
        const currentItem = updatedInventory[currentIndex];

        // Calculate how much of this item is available, converted to the recipe's unit
        const itemQuantityInUsageUnit = convertAmount(
          currentItem.quantity,
          currentItem.unit,
          usageUnit
        );

        // We can deduct at most what is available or what is needed
        const deductionInUsageUnit = Math.min(itemQuantityInUsageUnit, amountRemainingToDeduct);

        // Convert back to item's unit to subtract
        const deductionInItemUnit = convertAmount(deductionInUsageUnit, usageUnit, currentItem.unit);

        // Update the item
        const newQuantity = Number(Math.max(0, currentItem.quantity - deductionInItemUnit).toFixed(3));
        updatedInventory[currentIndex] = {
          ...currentItem,
          quantity: newQuantity,
        };

        amountRemainingToDeduct -= deductionInUsageUnit;
      }
    }

    // Update all items in the database and remove items with 0 quantity
    const updatePromises = updatedInventory.map(async (item) => {
      if (item.quantity <= 0) {
        return tx.foodItem.delete({ where: { id: item.id } });
      } else {
        return tx.foodItem.update({
          where: { id: item.id },
          data: { quantity: item.quantity },
        });
      }
    });

    await Promise.all(updatePromises);

    // Return updated inventory (excluding deleted items)
    return tx.foodItem.findMany({
      where: { userId },
      orderBy: { expiryDate: 'asc' },
    });
  });
};
