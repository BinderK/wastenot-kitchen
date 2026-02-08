# WasteNot Kitchen - Database Layer

This directory contains the Prisma-based database layer for WasteNot Kitchen.

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
   Then edit `.env` and update the `DATABASE_URL` with your PostgreSQL credentials.

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

## Available Scripts

- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with initial data (28 curated recipes)
- `npm run generate` - Generate Prisma Client
- `npm run studio` - Open Prisma Studio (database GUI)

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

## Troubleshooting

### Migration fails
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct
- Verify database exists

### Seed fails
- Run migrations first: `npm run migrate`
- Check for existing data conflicts
- Verify Prisma Client is generated: `npm run generate`
