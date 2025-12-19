# WasteNot Kitchen

A smart meal planning application that helps you reduce food waste by generating personalized meal plans based on your current inventory and expiry dates.

## Features

- **Inventory Management**: Track your food items with quantities, units, and expiry dates
- **Smart Meal Planning**: Generate meal plans using three different engines:
  - **AI Mode**: Creative meal plans powered by Gemini AI
  - **Local Mode**: Fast, browser-based heuristic generation using standard recipes
  - **Solver Mode**: Mathematically optimal plans using linear programming (requires Python backend)
- **Waste Reduction**: Prioritizes items expiring soonest to minimize food waste
- **Recipe Book**: Browse and cook from a collection of recipes
- **Inventory Tracking**: Automatically deducts ingredients when you mark meals as eaten
- **Expiry Alerts**: Visual indicators for expired items and items expiring soon

## Prerequisites

- Node.js (for frontend)
- Python 3.x (optional, for Solver mode backend)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env.local`
   - Add your `GEMINI_API_KEY` if you want to use AI mode:
     ```bash
     cp .env.example .env.local
     # Edit .env.local and add your API key
     ```
     Get your API key from: https://aistudio.google.com/apikey

3. (Optional) Set up Python backend for Solver mode:
   ```bash
   cd backend
   pip install -r requirements.txt
   python server.py
   ```

## Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in your terminal).

## Usage

1. **Add Items to Inventory**: Use the inventory form to add food items with quantities, units, and expiry dates
2. **Configure Meal Plan**: Select which meals to include (Breakfast, Lunch, Dinner) and choose a plan duration
3. **Generate Plan**: Choose your preferred generation engine and click "Generate Plan"
4. **Select a Plan**: Review the generated options and select the one that works best for you
5. **Track Meals**: Mark meals as eaten to automatically update your inventory

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.
