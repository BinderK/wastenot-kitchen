import { FoodItem, Recipe } from "./types";

export const FOOD_CATEGORIES = [
  "Produce",
  "Dairy & Eggs",
  "Meat & Poultry",
  "Seafood",
  "Grains & Bread",
  "Canned Goods",
  "Frozen",
  "Pantry & Spices",
  "Beverages",
  "Other"
];

export const UNITS = [
  "pcs",
  "kg",
  "g",
  "lbs",
  "oz",
  "L",
  "ml",
  "box",
  "bag",
  "can",
  "cup",
  "tbsp"
];

export enum RecipeSource {
  LOCAL = 'LOCAL',
  AI_GENERATED = 'AI_GENERATED',
  USER_CREATED = 'USER_CREATED'
}

// Helper to get a date N days from now
const getFutureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

export const INITIAL_INVENTORY: FoodItem[] = [
  { id: '1', name: 'Spinach', quantity: 1, unit: 'bag', expiryDate: getFutureDate(2), category: 'Produce' },
  { id: '2', name: 'Milk', quantity: 0.5, unit: 'L', expiryDate: getFutureDate(3), category: 'Dairy & Eggs' },
  { id: '3', name: 'Chicken Breast', quantity: 500, unit: 'g', expiryDate: getFutureDate(1), category: 'Meat & Poultry' },
  { id: '4', name: 'Eggs', quantity: 6, unit: 'pcs', expiryDate: getFutureDate(10), category: 'Dairy & Eggs' },
  { id: '5', name: 'Rice', quantity: 2, unit: 'kg', expiryDate: getFutureDate(300), category: 'Grains & Bread' },
  { id: '6', name: 'Tomatoes', quantity: 4, unit: 'pcs', expiryDate: getFutureDate(4), category: 'Produce' },
  { id: '7', name: 'Cheddar Cheese', quantity: 200, unit: 'g', expiryDate: getFutureDate(14), category: 'Dairy & Eggs' },
];

export const LOCAL_RECIPES: Recipe[] = [
  {
    title: "Garden Omelette",
    description: "A quick, protein-rich breakfast using fresh vegetables and eggs.",
    cookingTimeMinutes: 15,
    ingredients: [
      { name: "Eggs", amount: "2 pcs" },
      { name: "Spinach", amount: "0.2 bag" },
      { name: "Tomatoes", amount: "1 pcs" },
      { name: "Cheddar Cheese", amount: "30 g" }
    ],
    instructions: [
      "Whisk eggs in a bowl with a pinch of salt.",
      "Chop tomatoes and spinach.",
      "Heat pan and pour in eggs.",
      "Add vegetables and cheese before folding.",
      "Cook until set."
    ],
    inventoryUsage: [], // Calculated dynamically
    wasteReductionNote: "Great for using up small amounts of leftover veggies."
  },
  {
    title: "Chicken & Rice Bowl",
    description: "Simple, nutritious staple meal that's easy to scale.",
    cookingTimeMinutes: 25,
    ingredients: [
      { name: "Chicken Breast", amount: "200 g" },
      { name: "Rice", amount: "100 g" },
      { name: "Spinach", amount: "0.3 bag" }
    ],
    instructions: [
      "Cook rice according to package instructions.",
      "Cut chicken into bite-sized pieces and sauté until cooked through.",
      "Add spinach to the pan in the last minute to wilt.",
      "Serve chicken over rice."
    ],
    inventoryUsage: [],
    wasteReductionNote: "Efficiently uses standard pantry staples."
  },
  {
    title: "Creamy Tomato Pasta",
    description: "Comfort food made with basic pantry and fridge items.",
    cookingTimeMinutes: 20,
    ingredients: [
      { name: "Tomatoes", amount: "2 pcs" },
      { name: "Milk", amount: "100 ml" },
      { name: "Cheddar Cheese", amount: "50 g" }
    ],
    instructions: [
      "Note: Requires pasta (assumed pantry staple).",
      "Sauté chopped tomatoes until soft.",
      "Add milk and simmer to thicken.",
      "Stir in cheese until melted.",
      "Toss with cooked pasta."
    ],
    inventoryUsage: [],
    wasteReductionNote: "Uses dairy before it expires."
  },
  {
    title: "Scrambled Eggs & Toast",
    description: "The classic breakfast standard.",
    cookingTimeMinutes: 10,
    ingredients: [
      { name: "Eggs", amount: "2 pcs" },
      { name: "Milk", amount: "20 ml" }
    ],
    instructions: [
      "Whisk eggs with milk.",
      "Cook in a non-stick pan over medium heat.",
      "Stir gently until curds form.",
      "Serve immediately."
    ],
    inventoryUsage: [],
    wasteReductionNote: "Minimal ingredients, fast execution."
  },
  {
    title: "Vegetable Stir Fry",
    description: "Fast, healthy, and uses whatever vegetables you have on hand.",
    cookingTimeMinutes: 15,
    ingredients: [
      { name: "Rice", amount: "150 g" },
      { name: "Spinach", amount: "0.5 bag" },
      { name: "Tomatoes", amount: "2 pcs" }
    ],
    instructions: [
      "Cook rice according to package instructions.",
      "Chop vegetables coarsely.",
      "Stir fry vegetables in hot pan with a splash of oil.",
      "Serve vegetables over bed of rice."
    ],
    inventoryUsage: [],
    wasteReductionNote: "Flexible vegetable usage."
  },
  {
    title: "Cheesy Tomato Rice",
    description: "A simple risotto-style dish using basic staples.",
    cookingTimeMinutes: 20,
    ingredients: [
      { name: "Rice", amount: "150 g" },
      { name: "Tomatoes", amount: "2 pcs" },
      { name: "Cheddar Cheese", amount: "50 g" },
      { name: "Milk", amount: "50 ml" }
    ],
    instructions: [
      "Cook rice until tender.",
      "Dice tomatoes and stir into hot rice.",
      "Stir in milk and cheese until creamy.",
      "Season with salt and pepper."
    ],
    inventoryUsage: [],
    wasteReductionNote: "Uses multiple perishable items."
  },
  {
    title: "Test Recipe",
    description: "TEST",
    cookingTimeMinutes: 20,
    ingredients: [
      { name: "Chicken Breast", amount: "100 g" },
      { name: "Eggs", amount: "2 pcs" }
    ],
    instructions: [
      "Do Something"
    ],
    inventoryUsage: [],
    wasteReductionNote: "Uses multiple perishable items."
  },
  {
    title: "Test Recipe 2",
    description: "TEST2",
    cookingTimeMinutes: 20,
    ingredients: [
      { name: "Spinach", amount: "0.3 bag" },
      { name: "Rice", amount: "300 g" }
    ],
    instructions: [
      "Do Something"
    ],
    inventoryUsage: [],
    wasteReductionNote: "Uses multiple perishable items."
  },
  {
    title: "Test Recipe 3",
    description: "TEST3",
    cookingTimeMinutes: 20,
    ingredients: [
      { name: "Milk", amount: "0.1 L" }
    ],
    instructions: [
      "Do Something"
    ],
    inventoryUsage: [],
    wasteReductionNote: "Uses multiple perishable items."
  }
];
