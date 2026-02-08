# WasteNot Kitchen - Backend API

This directory contains the backend API server for WasteNot Kitchen, including the Prisma-based database layer, meal planning API, and Gemini AI proxy.

## Prerequisites

- PostgreSQL 14+ installed and running
- Node.js 18+ installed

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and update:
   - `DATABASE_URL` with your PostgreSQL credentials
   - `GEMINI_API_KEY` with your Gemini API key (get it from https://aistudio.google.com/apikey)

3. **Create the database:**
   ```bash
   # Using psql
   createdb wastenot_kitchen

   # Or using SQL
   psql -U postgres -c "CREATE DATABASE wastenot_kitchen;"
   ```

4. **Run migrations:**
   ```bash
   npm run migrate
   ```

5. **Seed the database:**
   ```bash
   npm run seed
   ```

6. **Generate Prisma Client:**
   ```bash
   npm run generate
   ```

7. **Start the development server:**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3001`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript project
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data (28 curated recipes)
- `npm run db:generate` - Generate Prisma Client
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Database Schema

### Users & Authentication
- **users** - User accounts
- **accounts** - OAuth provider accounts
- **refresh_tokens** - JWT refresh tokens

### Food Inventory
- **food_items** - User's food inventory with expiry tracking

### Recipes
- **recipes** - Recipe collection (system, user-created, AI-generated)
- **recipe_ingredients** - Recipe ingredients with amounts

### Meal Planning
- **meal_plans** - User meal plans
- **meal_plan_days** - Days within a meal plan
- **meal_plan_meals** - Individual meals (breakfast/lunch/dinner)

## Seed Data

The seed script populates the database with 28 curated recipes:
- 8 Breakfast recipes
- 9 Lunch recipes
- 11 Dinner recipes

All seed recipes have:
- `source: SYSTEM`
- `isPublic: true`
- No `authorId` (available to all users)

## Docker Setup (Optional)

To run PostgreSQL in Docker:

```bash
docker run -d \
  --name wastenot-postgres \
  -e POSTGRES_USER=wastenot \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=wastenot_kitchen \
  -p 5432:5432 \
  postgres:16-alpine
```

## API Endpoints

### Meal Plans API

- `GET /api/meal-plans` - List all meal plans for user
- `GET /api/meal-plans/active` - Get currently active plan
- `GET /api/meal-plans/:id` - Get specific plan with details
- `POST /api/meal-plans` - Create meal plan from generation result
- `PUT /api/meal-plans/:id/activate` - Set plan as active
- `PUT /api/meal-plans/:id/deactivate` - Deactivate plan
- `PUT /api/meal-plans/:id/meals/:mealId/eaten` - Mark meal eaten (deducts inventory)
- `DELETE /api/meal-plans/:id` - Delete meal plan

### Gemini AI Proxy API

- `POST /api/gemini/meal-plans` - Generate meal plan options
  - Input: `{ inventory, days, people, includedMeals }`
  - Returns 2-3 plan options
- `POST /api/gemini/scan-receipt` - OCR receipt image
  - Input: `{ imageBase64 }`
  - Returns `FoodItem[]`
- `POST /api/gemini/generate-recipe` - Generate custom recipe
  - Input: `{ inventory, cuisine, dietary, maxTime, difficulty }`
  - Returns `Recipe` object

### Authentication

All endpoints require authentication. For testing, include `x-user-id` header with a user ID.

**Note:** Full JWT authentication will be implemented in Issue #3.

## Troubleshooting

### Migration fails
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct
- Verify database exists

### Seed fails
- Run migrations first: `npm run db:migrate`
- Check for existing data conflicts
- Verify Prisma Client is generated: `npm run db:generate`

### Gemini API errors
- Verify GEMINI_API_KEY is set in `.env`
- Check API key is valid at https://aistudio.google.com/apikey
- Ensure you have sufficient API quota
