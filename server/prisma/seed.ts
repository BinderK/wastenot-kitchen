import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing seed data (system recipes only)
  await prisma.recipeIngredient.deleteMany({
    where: {
      recipe: {
        source: 'SYSTEM'
      }
    }
  });
  await prisma.recipe.deleteMany({
    where: {
      source: 'SYSTEM'
    }
  });

  console.log('📚 Creating curated recipes...');

  // ============================================================================
  // BREAKFAST RECIPES (8 recipes)
  // ============================================================================

  await prisma.recipe.create({
    data: {
      title: 'Garden Omelette',
      description: 'A quick, protein-rich breakfast using fresh vegetables and eggs.',
      cookingTimeMinutes: 15,
      wasteReductionNote: 'Great for using up small amounts of leftover veggies.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Eggs', amount: '2 pcs', order: 0 },
          { name: 'Spinach', amount: '0.2 bag', order: 1 },
          { name: 'Tomatoes', amount: '1 pcs', order: 2 },
          { name: 'Cheddar Cheese', amount: '30 g', order: 3 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Scrambled Eggs & Toast',
      description: 'The classic breakfast standard.',
      cookingTimeMinutes: 10,
      wasteReductionNote: 'Minimal ingredients, fast execution.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Eggs', amount: '2 pcs', order: 0 },
          { name: 'Milk', amount: '20 ml', order: 1 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Avocado Toast with Poached Egg',
      description: 'Modern breakfast classic with healthy fats and protein.',
      cookingTimeMinutes: 12,
      wasteReductionNote: 'Use ripe avocados before they spoil.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Avocado', amount: '1 pcs', order: 0 },
          { name: 'Eggs', amount: '2 pcs', order: 1 },
          { name: 'Bread', amount: '2 slices', order: 2 },
          { name: 'Lemon', amount: '0.5 pcs', order: 3 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Greek Yogurt Parfait',
      description: 'Layered breakfast with yogurt, fruit, and granola.',
      cookingTimeMinutes: 5,
      wasteReductionNote: 'Perfect for using up yogurt and berries nearing expiry.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Greek Yogurt', amount: '200 g', order: 0 },
          { name: 'Mixed Berries', amount: '100 g', order: 1 },
          { name: 'Granola', amount: '50 g', order: 2 },
          { name: 'Honey', amount: '1 tbsp', order: 3 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Banana Pancakes',
      description: 'Fluffy pancakes with natural sweetness from bananas.',
      cookingTimeMinutes: 20,
      wasteReductionNote: 'Excellent way to use overripe bananas.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Bananas', amount: '2 pcs', order: 0 },
          { name: 'Eggs', amount: '2 pcs', order: 1 },
          { name: 'Flour', amount: '150 g', order: 2 },
          { name: 'Milk', amount: '100 ml', order: 3 },
          { name: 'Baking Powder', amount: '1 tsp', order: 4 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Spanish Tortilla',
      description: 'Traditional Spanish potato and egg dish, perfect for breakfast or brunch.',
      cookingTimeMinutes: 25,
      wasteReductionNote: 'Uses potatoes and eggs that are pantry staples.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Potatoes', amount: '400 g', order: 0 },
          { name: 'Eggs', amount: '6 pcs', order: 1 },
          { name: 'Onion', amount: '1 pcs', order: 2 },
          { name: 'Olive Oil', amount: '3 tbsp', order: 3 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Overnight Oats',
      description: 'No-cook breakfast prepared the night before.',
      cookingTimeMinutes: 5,
      wasteReductionNote: 'Great for using up milk and fruit before expiry.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Rolled Oats', amount: '80 g', order: 0 },
          { name: 'Milk', amount: '200 ml', order: 1 },
          { name: 'Chia Seeds', amount: '1 tbsp', order: 2 },
          { name: 'Honey', amount: '1 tbsp', order: 3 },
          { name: 'Berries', amount: '50 g', order: 4 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Breakfast Burrito',
      description: 'Hearty wrapped breakfast with eggs, beans, and cheese.',
      cookingTimeMinutes: 15,
      wasteReductionNote: 'Flexible recipe that works with various leftover ingredients.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Eggs', amount: '3 pcs', order: 0 },
          { name: 'Black Beans', amount: '100 g', order: 1 },
          { name: 'Cheddar Cheese', amount: '50 g', order: 2 },
          { name: 'Tortillas', amount: '2 pcs', order: 3 },
          { name: 'Bell Pepper', amount: '0.5 pcs', order: 4 }
        ]
      }
    }
  });

  // ============================================================================
  // LUNCH RECIPES (9 recipes)
  // ============================================================================

  await prisma.recipe.create({
    data: {
      title: 'Chicken & Rice Bowl',
      description: 'Simple, nutritious staple meal that\'s easy to scale.',
      cookingTimeMinutes: 25,
      wasteReductionNote: 'Efficiently uses standard pantry staples.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Chicken Breast', amount: '200 g', order: 0 },
          { name: 'Rice', amount: '100 g', order: 1 },
          { name: 'Spinach', amount: '0.3 bag', order: 2 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Vegetable Stir Fry',
      description: 'Fast, healthy, and uses whatever vegetables you have on hand.',
      cookingTimeMinutes: 15,
      wasteReductionNote: 'Flexible vegetable usage.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Rice', amount: '150 g', order: 0 },
          { name: 'Spinach', amount: '0.5 bag', order: 1 },
          { name: 'Tomatoes', amount: '2 pcs', order: 2 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Caesar Salad with Grilled Chicken',
      description: 'Classic salad with protein-rich chicken.',
      cookingTimeMinutes: 20,
      wasteReductionNote: 'Uses lettuce before it wilts.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Romaine Lettuce', amount: '1 head', order: 0 },
          { name: 'Chicken Breast', amount: '150 g', order: 1 },
          { name: 'Parmesan Cheese', amount: '30 g', order: 2 },
          { name: 'Croutons', amount: '50 g', order: 3 },
          { name: 'Caesar Dressing', amount: '3 tbsp', order: 4 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Quinoa Buddha Bowl',
      description: 'Nutritious grain bowl with roasted vegetables.',
      cookingTimeMinutes: 30,
      wasteReductionNote: 'Great way to use up various vegetables.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Quinoa', amount: '100 g', order: 0 },
          { name: 'Sweet Potato', amount: '200 g', order: 1 },
          { name: 'Chickpeas', amount: '150 g', order: 2 },
          { name: 'Kale', amount: '100 g', order: 3 },
          { name: 'Tahini', amount: '2 tbsp', order: 4 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Tuna Salad Sandwich',
      description: 'Quick protein-packed lunch.',
      cookingTimeMinutes: 10,
      wasteReductionNote: 'Uses canned goods and fresh vegetables.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Canned Tuna', amount: '1 can', order: 0 },
          { name: 'Mayonnaise', amount: '2 tbsp', order: 1 },
          { name: 'Celery', amount: '1 stalk', order: 2 },
          { name: 'Bread', amount: '2 slices', order: 3 },
          { name: 'Lettuce', amount: '2 leaves', order: 4 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Tomato Basil Soup',
      description: 'Comforting soup made from fresh or canned tomatoes.',
      cookingTimeMinutes: 25,
      wasteReductionNote: 'Perfect for using tomatoes that are getting soft.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Tomatoes', amount: '800 g', order: 0 },
          { name: 'Onion', amount: '1 pcs', order: 1 },
          { name: 'Garlic', amount: '3 cloves', order: 2 },
          { name: 'Basil', amount: '1 bunch', order: 3 },
          { name: 'Cream', amount: '100 ml', order: 4 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Chicken Quesadilla',
      description: 'Cheesy Mexican-inspired lunch.',
      cookingTimeMinutes: 15,
      wasteReductionNote: 'Great for using leftover chicken.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Chicken Breast', amount: '150 g', order: 0 },
          { name: 'Tortillas', amount: '2 pcs', order: 1 },
          { name: 'Cheddar Cheese', amount: '100 g', order: 2 },
          { name: 'Bell Pepper', amount: '1 pcs', order: 3 },
          { name: 'Sour Cream', amount: '2 tbsp', order: 4 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Asian Noodle Salad',
      description: 'Fresh and tangy cold noodle dish.',
      cookingTimeMinutes: 20,
      wasteReductionNote: 'Uses up vegetables and herbs before they wilt.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Rice Noodles', amount: '200 g', order: 0 },
          { name: 'Cucumber', amount: '1 pcs', order: 1 },
          { name: 'Carrots', amount: '2 pcs', order: 2 },
          { name: 'Cilantro', amount: '0.5 bunch', order: 3 },
          { name: 'Peanuts', amount: '50 g', order: 4 },
          { name: 'Soy Sauce', amount: '2 tbsp', order: 5 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Lentil Curry',
      description: 'Hearty vegetarian curry with protein-rich lentils.',
      cookingTimeMinutes: 35,
      wasteReductionNote: 'Uses pantry staples and any vegetables on hand.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Red Lentils', amount: '200 g', order: 0 },
          { name: 'Coconut Milk', amount: '400 ml', order: 1 },
          { name: 'Tomatoes', amount: '2 pcs', order: 2 },
          { name: 'Onion', amount: '1 pcs', order: 3 },
          { name: 'Curry Powder', amount: '2 tbsp', order: 4 },
          { name: 'Spinach', amount: '100 g', order: 5 }
        ]
      }
    }
  });

  // ============================================================================
  // DINNER RECIPES (11 recipes)
  // ============================================================================

  await prisma.recipe.create({
    data: {
      title: 'Creamy Tomato Pasta',
      description: 'Comfort food made with basic pantry and fridge items.',
      cookingTimeMinutes: 20,
      wasteReductionNote: 'Uses dairy before it expires.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Tomatoes', amount: '2 pcs', order: 0 },
          { name: 'Milk', amount: '100 ml', order: 1 },
          { name: 'Cheddar Cheese', amount: '50 g', order: 2 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Cheesy Tomato Rice',
      description: 'A simple risotto-style dish using basic staples.',
      cookingTimeMinutes: 20,
      wasteReductionNote: 'Uses multiple perishable items.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Rice', amount: '150 g', order: 0 },
          { name: 'Tomatoes', amount: '2 pcs', order: 1 },
          { name: 'Cheddar Cheese', amount: '50 g', order: 2 },
          { name: 'Milk', amount: '50 ml', order: 3 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Baked Salmon with Vegetables',
      description: 'Healthy one-pan dinner with omega-3 rich fish.',
      cookingTimeMinutes: 30,
      wasteReductionNote: 'Uses fish before it spoils and any vegetables on hand.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Salmon Fillet', amount: '200 g', order: 0 },
          { name: 'Broccoli', amount: '200 g', order: 1 },
          { name: 'Bell Pepper', amount: '1 pcs', order: 2 },
          { name: 'Lemon', amount: '1 pcs', order: 3 },
          { name: 'Olive Oil', amount: '2 tbsp', order: 4 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Beef Tacos',
      description: 'Family-friendly Mexican dinner.',
      cookingTimeMinutes: 25,
      wasteReductionNote: 'Flexible toppings based on what needs to be used.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Ground Beef', amount: '300 g', order: 0 },
          { name: 'Taco Shells', amount: '8 pcs', order: 1 },
          { name: 'Lettuce', amount: '100 g', order: 2 },
          { name: 'Tomatoes', amount: '2 pcs', order: 3 },
          { name: 'Cheddar Cheese', amount: '100 g', order: 4 },
          { name: 'Sour Cream', amount: '4 tbsp', order: 5 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Mushroom Risotto',
      description: 'Creamy Italian rice dish with earthy mushrooms.',
      cookingTimeMinutes: 40,
      wasteReductionNote: 'Uses mushrooms before they spoil and pantry staples.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Arborio Rice', amount: '200 g', order: 0 },
          { name: 'Mushrooms', amount: '250 g', order: 1 },
          { name: 'Parmesan Cheese', amount: '50 g', order: 2 },
          { name: 'White Wine', amount: '100 ml', order: 3 },
          { name: 'Onion', amount: '1 pcs', order: 4 },
          { name: 'Butter', amount: '30 g', order: 5 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Thai Green Curry',
      description: 'Fragrant and spicy coconut curry.',
      cookingTimeMinutes: 30,
      wasteReductionNote: 'Works with various vegetables and proteins.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Chicken Breast', amount: '300 g', order: 0 },
          { name: 'Coconut Milk', amount: '400 ml', order: 1 },
          { name: 'Green Curry Paste', amount: '3 tbsp', order: 2 },
          { name: 'Bell Pepper', amount: '2 pcs', order: 3 },
          { name: 'Bamboo Shoots', amount: '100 g', order: 4 },
          { name: 'Basil', amount: '1 bunch', order: 5 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Spaghetti Carbonara',
      description: 'Classic Roman pasta with eggs and bacon.',
      cookingTimeMinutes: 20,
      wasteReductionNote: 'Simple recipe that uses eggs before they expire.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Spaghetti', amount: '200 g', order: 0 },
          { name: 'Eggs', amount: '3 pcs', order: 1 },
          { name: 'Bacon', amount: '150 g', order: 2 },
          { name: 'Parmesan Cheese', amount: '60 g', order: 3 },
          { name: 'Black Pepper', amount: '1 tsp', order: 4 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Stuffed Bell Peppers',
      description: 'Baked peppers filled with rice, meat, and vegetables.',
      cookingTimeMinutes: 45,
      wasteReductionNote: 'Great for using peppers and leftover rice.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Bell Peppers', amount: '4 pcs', order: 0 },
          { name: 'Ground Beef', amount: '250 g', order: 1 },
          { name: 'Rice', amount: '100 g', order: 2 },
          { name: 'Tomatoes', amount: '2 pcs', order: 3 },
          { name: 'Onion', amount: '1 pcs', order: 4 },
          { name: 'Mozzarella Cheese', amount: '100 g', order: 5 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Vegetable Lasagna',
      description: 'Layered pasta bake with vegetables and cheese.',
      cookingTimeMinutes: 60,
      wasteReductionNote: 'Excellent for using up various vegetables and cheeses.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Lasagna Noodles', amount: '12 sheets', order: 0 },
          { name: 'Ricotta Cheese', amount: '400 g', order: 1 },
          { name: 'Mozzarella Cheese', amount: '200 g', order: 2 },
          { name: 'Spinach', amount: '300 g', order: 3 },
          { name: 'Zucchini', amount: '2 pcs', order: 4 },
          { name: 'Tomato Sauce', amount: '500 ml', order: 5 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Chicken Fajitas',
      description: 'Sizzling Tex-Mex dinner with peppers and onions.',
      cookingTimeMinutes: 25,
      wasteReductionNote: 'Uses up bell peppers and chicken efficiently.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Chicken Breast', amount: '400 g', order: 0 },
          { name: 'Bell Peppers', amount: '3 pcs', order: 1 },
          { name: 'Onion', amount: '2 pcs', order: 2 },
          { name: 'Tortillas', amount: '8 pcs', order: 3 },
          { name: 'Lime', amount: '2 pcs', order: 4 },
          { name: 'Fajita Seasoning', amount: '2 tbsp', order: 5 }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: 'Moroccan Chickpea Stew',
      description: 'Warming spiced stew with chickpeas and vegetables.',
      cookingTimeMinutes: 35,
      wasteReductionNote: 'Uses canned goods and vegetables nearing expiry.',
      source: 'SYSTEM',
      isPublic: true,
      ingredients: {
        create: [
          { name: 'Chickpeas', amount: '2 cans', order: 0 },
          { name: 'Sweet Potato', amount: '300 g', order: 1 },
          { name: 'Tomatoes', amount: '400 g', order: 2 },
          { name: 'Onion', amount: '1 pcs', order: 3 },
          { name: 'Cumin', amount: '2 tsp', order: 4 },
          { name: 'Cinnamon', amount: '1 tsp', order: 5 }
        ]
      }
    }
  });

  const recipeCount = await prisma.recipe.count({
    where: { source: 'SYSTEM' }
  });

  console.log(`✅ Seed completed! Created ${recipeCount} system recipes.`);
  console.log('   - Breakfast: 8 recipes');
  console.log('   - Lunch: 9 recipes');
  console.log('   - Dinner: 11 recipes');
  console.log('   - Total: 28 recipes');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
