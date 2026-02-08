import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem, MealPlanSet, MealType } from "@shared/types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_ID = "gemini-2.5-flash";

export const generateMealPlans = async (
  inventory: FoodItem[], 
  includedMeals: MealType[],
  duration: number | 'dynamic'
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

    Please generate 1 SINGLE OPTIMAL meal plan.
    
    Configuration:
    - ONLY generate meals for these times of day: ${mealsString}.
    - ${durationInstruction}
    
    STRICT CONSTRAINTS:
    1. INVENTORY USAGE: You MUST NOT schedule recipes that require more ingredients than I have. 
       - Track the cumulative usage of each item across all days. 
       - If I have 6 eggs, and Day 1 Breakfast uses 3, Day 2 Breakfast uses 3, you CANNOT schedule eggs for Day 3.
       - Usage > 100% is a critical failure.
    
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

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      options: {
        type: Type.ARRAY,
        description: "A list containing exactly one optimal meal plan.",
        items: {
          type: Type.OBJECT,
          properties: {
            planName: { type: Type.STRING, description: "E.g., 'Inventory Hero' or 'Quick & Fresh'" },
            summary: { type: Type.STRING, description: "Description of the strategy used, including the duration chosen." },
            schedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING, description: "Day 1, Day 2, etc." },
                  meals: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING, enum: ["Breakfast", "Lunch", "Dinner"] },
                        recipe: {
                          type: Type.OBJECT,
                          properties: {
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            ingredients: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  name: { type: Type.STRING },
                                  amount: { type: Type.STRING }
                                }
                              }
                            },
                            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            cookingTimeMinutes: { type: Type.NUMBER },
                            inventoryUsage: {
                              type: Type.ARRAY,
                              description: "List of specific inventory items consumed by this recipe.",
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  itemName: { type: Type.STRING, description: "Exact name of the item from the inventory list." },
                                  amountUsed: { type: Type.NUMBER, description: "The numeric amount used." },
                                  unit: { type: Type.STRING, description: "The unit matching the inventory list." }
                                }
                              }
                            },
                            wasteReductionNote: { type: Type.STRING, description: "Explanation of why this recipe helps reduce waste." }
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
  };

  try {
    const result = await ai.models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are a sustainable chef assistant. Your goal is to create delicious meals that strictly minimize food waste based on available inventory."
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from Gemini");
    
    return JSON.parse(text) as MealPlanSet;
  } catch (error) {
    console.error("Error generating meal plans:", error);
    throw error;
  }
};

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

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: "image/jpeg",
    },
  };

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        quantity: { type: Type.NUMBER },
        unit: { type: Type.STRING },
        expiryDate: { type: Type.STRING, description: "YYYY-MM-DD" },
        category: { type: Type.STRING }
      }
    }
  };

  try {
    const result = await ai.models.generateContent({
      model: MODEL_ID,
      contents: {
        parts: [imagePart, { text: prompt }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as Omit<FoodItem, 'id'>[];
  } catch (error) {
    console.error("Error identifying items:", error);
    throw error;
  }
};