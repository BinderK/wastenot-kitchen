import { GoogleGenerativeAI } from "@google/generative-ai";
import { FoodItem, MealPlanSet, MealType, Recipe } from "../../../shared/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL_ID = "gemini-2.0-flash-exp";

interface GenerateRecipeInput {
  inventory: FoodItem[];
  cuisine?: string;
  dietary?: string[];
  maxTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Generate meal plans using Gemini AI
 * Ported from frontend services/geminiService.ts
 */
export const generateMealPlans = async (
  inventory: FoodItem[],
  includedMeals: MealType[],
  duration: number | 'dynamic',
  people: number = 1
): Promise<MealPlanSet> => {
  // Prepare inventory string
  const inventoryList = inventory.map(item =>
    `- ${item.name}: ${item.quantity} ${item.unit} (Expires: ${item.expiryDate})`
  ).join('\n');

  const mealsString = includedMeals.join(", ");

  let durationInstruction = "";
  if (duration === 'dynamic') {
    durationInstruction = "Analyze the inventory quantity and expiry dates. Determine the OPTIMAL plan duration (between 1 and 7 days). If the user has limited food, create a shorter plan (e.g. 2-3 days) rather than stretching ingredients too thin. Do not exceed 7 days.";
  } else {
    durationInstruction = `Generate a meal plan for EXACTLY ${duration} days. If there is not enough food for ${duration} days, create the best possible partial plan or use pantry staples, but explicitly warn in the notes.`;
  }

  const prompt = `
    I have the following food inventory at home:
    ${inventoryList}

    Please generate 1 SINGLE OPTIMAL meal plan for ${people} ${people === 1 ? 'person' : 'people'}.

    Configuration:
    - ONLY generate meals for these times of day: ${mealsString}.
    - ${durationInstruction}

    STRICT CONSTRAINTS:
    1. INVENTORY USAGE: You MUST NOT schedule recipes that require more ingredients than I have.
       - Track the cumulative usage of each item across all days.
       - If I have 6 eggs, and Day 1 Breakfast uses 3, Day 2 Breakfast uses 3, you CANNOT schedule eggs for Day 3.
       - Usage > 100% is a critical failure.
       - Scale recipes appropriately for ${people} ${people === 1 ? 'person' : 'people'}.

    2. VARIETY:
       - Do NOT schedule the exact same meal recipe twice in the same day.
       - Do NOT schedule the exact same meal recipe on the immediate next day (e.g. if we have Chicken Rice on Monday, do not have it Tuesday).
       - Exception: You can use leftovers for lunch if explicitly stated as "Leftover [Meal Name]".

    3. WASTE MINIMIZATION:
       - Prioritize using items that expire soonest.

    CRITICAL INSTRUCTION FOR DATA:
    For every recipe, you MUST calculate exactly how much of my specific inventory items are used.
    - Use the EXACT name from my list.
    - Use the EXACT unit from my list.
    - Provide the amount as a number.

    If I am missing minor basic ingredients (oil, spices, salt), assume I have them.
  `;

  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          options: {
            type: "array",
            description: "A list containing exactly one optimal meal plan.",
            items: {
              type: "object",
              properties: {
                planName: { type: "string", description: "E.g., 'Inventory Hero' or 'Quick & Fresh'" },
                summary: { type: "string", description: "Description of the strategy used, including the duration chosen." },
                schedule: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      day: { type: "string", description: "Day 1, Day 2, etc." },
                      meals: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            type: { type: "string", enum: ["Breakfast", "Lunch", "Dinner"] },
                            recipe: {
                              type: "object",
                              properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                                ingredients: {
                                  type: "array",
                                  items: {
                                    type: "object",
                                    properties: {
                                      name: { type: "string" },
                                      amount: { type: "string" }
                                    }
                                  }
                                },
                                instructions: { type: "array", items: { type: "string" } },
                                cookingTimeMinutes: { type: "number" },
                                inventoryUsage: {
                                  type: "array",
                                  description: "List of specific inventory items consumed by this recipe.",
                                  items: {
                                    type: "object",
                                    properties: {
                                      itemName: { type: "string", description: "Exact name of the item from the inventory list." },
                                      amountUsed: { type: "number", description: "The numeric amount used." },
                                      unit: { type: "string", description: "The unit matching the inventory list." }
                                    }
                                  }
                                },
                                wasteReductionNote: { type: "string", description: "Explanation of why this recipe helps reduce waste." }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    systemInstruction: "You are a sustainable chef assistant. Your goal is to create delicious meals that strictly minimize food waste based on available inventory."
  });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as MealPlanSet;
  } catch (error) {
    console.error("Error generating meal plans:", error);
    throw error;
  }
};

/**
 * Identify inventory items from receipt image using OCR
 * Ported from frontend services/geminiService.ts
 */
export const identifyInventoryFromImage = async (base64Image: string): Promise<Omit<FoodItem, 'id'>[]> => {
  const prompt = `
    Analyze this image. It is likely a grocery receipt or a photo of food items.

    YOUR GOAL: Create a clean, standardized inventory list from this image.

    1. **Identify & Translate Item Names (CRITICAL PRIORITY)**:
       - Receipt text is often notoriously abbreviated and cryptic (e.g., "SFT CR CHS", "ORG BAN", "HNY NUT", "AVOCADO HASS 4046", "CHKN BRST", "GRND BF").
       - You MUST translate these abbreviations into full, standard, human-readable ingredient names.
       - EXAMPLES:
         - "SFT CR CHS" -> "Cream Cheese"
         - "ORG BAN" -> "Bananas"
         - "LRG EGGS DOZ" -> "Eggs"
         - "HL WH MILK" -> "Whole Milk"
       - Do NOT return the raw abbreviation. The user needs to read this.
       - Remove specific brand names unless essential (e.g., convert "Heinz Ketchup" to "Ketchup").
       - Remove product codes, SKUs, or weights from the name.

    2. **Extract Quantity & Unit**:
       - Look for quantity indicators (e.g., "2 @", "2x"). Default to 1 if not specified.
       - Extract units (kg, g, lb, oz, L, ml).
       - If the item implies a unit (e.g., a "bag" of chips, a "carton" of milk, a "box" of cereal), use that.
       - Default to 'pcs' if unsure.

    3. **Filter**: Ignore non-food items like "Subtotal", "Tax", "Bags", "Discounts", "Soap", "Paper Towels", "Bottle Deposit".

    4. **Categorize**: Assign one of: "Produce", "Dairy & Eggs", "Meat & Poultry", "Seafood", "Grains & Bread", "Canned Goods", "Frozen", "Pantry & Spices", "Beverages", "Other".

    5. **Estimate Expiry Date**: Estimate based on food type relative to today (${new Date().toISOString().split('T')[0]}).
       - Highly Perishable (Ground Meat, Fresh Fish): 2-3 days
       - Perishable (Leafy Greens, Berries): 4-5 days
       - Moderate (Milk, Yogurt, Soft Cheese): 7-10 days
       - Stable (Eggs, Hard Cheese, Root Veg, Apples): 14+ days
       - Shelf Stable (Frozen, Canned, Pantry): 6+ months

    Return a JSON array of items.
  `;

  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string" },
            expiryDate: { type: "string", description: "YYYY-MM-DD" },
            category: { type: "string" }
          }
        }
      }
    }
  });

  try {
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text();

    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as Omit<FoodItem, 'id'>[];
  } catch (error) {
    console.error("Error identifying items:", error);
    throw error;
  }
};

/**
 * Generate a custom recipe using AI based on inventory and preferences
 * NEW function for AI recipe generation
 */
export const generateRecipe = async ({
  inventory,
  cuisine,
  dietary,
  maxTime,
  difficulty
}: GenerateRecipeInput): Promise<Recipe> => {
  const inventoryList = inventory.map(item =>
    `- ${item.name}: ${item.quantity} ${item.unit} (Expires: ${item.expiryDate})`
  ).join('\n');

  const dietaryInfo = dietary && dietary.length > 0
    ? `Dietary restrictions: ${dietary.join(', ')}`
    : 'No dietary restrictions';

  const cuisineInfo = cuisine ? `Cuisine preference: ${cuisine}` : 'Any cuisine';
  const timeInfo = maxTime ? `Maximum cooking time: ${maxTime} minutes` : 'No time limit';
  const difficultyInfo = difficulty ? `Difficulty level: ${difficulty}` : 'Any difficulty';

  const prompt = `
    I have the following food inventory at home:
    ${inventoryList}

    Please generate ONE creative recipe based on these preferences:
    - ${cuisineInfo}
    - ${dietaryInfo}
    - ${timeInfo}
    - ${difficultyInfo}

    CONSTRAINTS:
    1. Use ONLY ingredients from my inventory list (except for basic pantry staples like oil, salt, spices)
    2. Do NOT exceed the available quantities
    3. The recipe should help reduce food waste by using items expiring soonest
    4. Be creative and delicious!

    CRITICAL INSTRUCTION FOR DATA:
    For every recipe, you MUST calculate exactly how much of my specific inventory items are used.
    - Use the EXACT name from my list
    - Use the EXACT unit from my list
    - Provide the amount as a number
  `;

  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          ingredients: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                amount: { type: "string" }
              }
            }
          },
          instructions: { type: "array", items: { type: "string" } },
          cookingTimeMinutes: { type: "number" },
          inventoryUsage: {
            type: "array",
            description: "List of specific inventory items consumed by this recipe.",
            items: {
              type: "object",
              properties: {
                itemName: { type: "string", description: "Exact name of the item from the inventory list." },
                amountUsed: { type: "number", description: "The numeric amount used." },
                unit: { type: "string", description: "The unit matching the inventory list." }
              }
            }
          },
          wasteReductionNote: { type: "string", description: "Explanation of why this recipe helps reduce waste." }
        }
      }
    },
    systemInstruction: "You are a creative chef assistant focused on sustainable cooking and waste reduction."
  });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as Recipe;
  } catch (error) {
    console.error("Error generating recipe:", error);
    throw error;
  }
};
