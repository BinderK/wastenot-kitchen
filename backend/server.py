from flask import Flask, request, jsonify
from flask_cors import CORS
from pulp import LpMaximize, LpProblem, LpVariable, lpSum, LpStatus, value

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

@app.route('/solve', methods=['POST'])
def solve_meal_plan():
    """
    Solves the meal planning optimization problem using Integer Linear Programming.
    
    Expected request body:
    {
        "inventory": {
            "item_name": {"qty": 100.0, "expiry_weight": 5.0},
            ...
        },
        "recipes": [
            {"id": 0, "title": "Recipe Name", "ingredients": {"item_name": 50.0}},
            ...
        ],
        "days": 7,
        "meals": ["Breakfast", "Lunch", "Dinner"]
    }
    
    Returns:
    {
        "status": "Optimal" | "Feasible" | "Infeasible" | "Error",
        "message": "Optional error message",
        "schedule": [
            {
                "day": "Day 1",
                "meals": [
                    {"type": "Breakfast", "recipeId": 0},
                    ...
                ]
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "status": "Error",
                "message": "No JSON data provided"
            }), 400
        
        inventory = data.get('inventory', {})
        recipes = data.get('recipes', [])
        days = data.get('days', 7)
        meals = data.get('meals', [])
        
        # Better validation with detailed error messages
        if inventory is None or (isinstance(inventory, dict) and len(inventory) == 0):
            return jsonify({
                "status": "Error",
                "message": f"Invalid or empty inventory. Received: {type(inventory).__name__}, length: {len(inventory) if hasattr(inventory, '__len__') else 'N/A'}"
            }), 400
        
        if recipes is None or (isinstance(recipes, list) and len(recipes) == 0):
            return jsonify({
                "status": "Error",
                "message": f"Invalid or empty recipes list. Received: {type(recipes).__name__}, length: {len(recipes) if hasattr(recipes, '__len__') else 'N/A'}"
            }), 400
        
        if meals is None or (isinstance(meals, list) and len(meals) == 0):
            return jsonify({
                "status": "Error",
                "message": f"Invalid or empty meals list. Received: {type(meals).__name__}, length: {len(meals) if hasattr(meals, '__len__') else 'N/A'}"
            }), 400
        
        # Validate days
        if not isinstance(days, int) or days < 1 or days > 7:
            return jsonify({
                "status": "Error",
                "message": f"Days must be an integer between 1 and 7. Received: {days} (type: {type(days).__name__})"
            }), 400
        
        # Debug logging (remove in production)
        print(f"Received request: days={days}, meals={meals}, inventory_keys={list(inventory.keys())[:5]}, recipes_count={len(recipes)}")
        
        # Create the optimization problem
        prob = LpProblem("MealPlanOptimization", LpMaximize)
        
        # Decision variables: x[d][m][r] = 1 if recipe r is used for meal m on day d, else 0
        x = {}
        for d in range(days):
            for m in meals:
                for r in recipes:
                    x[(d, m, r['id'])] = LpVariable(f"x_{d}_{m}_{r['id']}", cat='Binary')
        
        # Objective: Maximize weighted inventory usage + bonus for filling meal slots
        # Higher expiry_weight items should be prioritized (they're expiring soon)
        objective_terms = []
        # Large bonus for filling any meal slot (encourages complete plans)
        # Use day priority: earlier days get much higher multiplier to ensure they're filled first
        base_slot_fill_bonus = 10000.0
        
        for d in range(days):
            for m in meals:
                for r in recipes:
                    # Calculate the "value" of using this recipe
                    # Sum of (expiry_weight * ingredient_amount) for all ingredients in this recipe
                    recipe_value = 0.0
                    for item_name, amount_needed in r.get('ingredients', {}).items():
                        if item_name in inventory:
                            item_data = inventory[item_name]
                            # Handle both dict format and direct access
                            if isinstance(item_data, dict):
                                expiry_weight = item_data.get('expiry_weight', 1.0)
                            else:
                                expiry_weight = 1.0
                            recipe_value += expiry_weight * amount_needed
                    
                    # Scale recipe_value to make expiry priority competitive with day priority
                    # Multiply by a factor to ensure expiry-weighted recipes are preferred
                    recipe_value_scaled = recipe_value * 100.0  # Scale up expiry effect
                    
                    # Add recipe value plus bonus for filling the slot
                    # Earlier days get exponentially higher priority: Day 1 gets (days+1)^2, Day 2 gets days^2, etc.
                    # This strongly encourages filling earlier days completely before later days
                    day_priority_multiplier = (days - d + 1) ** 2  # Day 1: (7+1)^2=64, Day 2: 36, etc.
                    slot_bonus = base_slot_fill_bonus * day_priority_multiplier
                    objective_terms.append((recipe_value_scaled + slot_bonus) * x[(d, m, r['id'])])
        
        prob += lpSum(objective_terms), "Maximize_Weighted_Inventory_Usage"
        
        # Constraint 1: Each meal slot can have at most one recipe (allows empty slots if inventory runs out)
        # The large slot_fill_bonus in the objective will encourage filling all slots when possible
        for d in range(days):
            for m in meals:
                prob += lpSum([x[(d, m, r['id'])] for r in recipes]) <= 1, f"AtMostOneRecipePerMeal_{d}_{m}"
        
        # Constraint 1b: No duplicate recipes on the same day (different meal types can't use same recipe)
        for d in range(days):
            for r in recipes:
                # At most one meal per day can use this recipe
                prob += lpSum([x[(d, m, r['id'])] for m in meals]) <= 1, f"NoDuplicateRecipe_{d}_{r['id']}"
        
        # Constraint 2: Inventory constraints - don't exceed available inventory
        for item_name, item_data in inventory.items():
            # Handle both dict format and direct access
            if isinstance(item_data, dict):
                available_qty = item_data.get('qty', 0.0)
            else:
                available_qty = float(item_data) if isinstance(item_data, (int, float)) else 0.0
            
            # Sum of all usage of this item across all days and meals
            total_usage = lpSum([
                r.get('ingredients', {}).get(item_name, 0.0) * x[(d, m, r['id'])]
                for d in range(days)
                for m in meals
                for r in recipes
            ])
            
            prob += total_usage <= available_qty, f"InventoryLimit_{item_name}"
            
            # Constraint 2b: Don't use items after they expire
            # If days_until_expiry is provided, prevent usage on days >= days_until_expiry
            # (days are 0-indexed, so if item expires in 2 days, it can be used on day 0 and 1, but not day 2+)
            if isinstance(item_data, dict) and 'days_until_expiry' in item_data:
                try:
                    days_until_expiry_raw = item_data.get('days_until_expiry', days + 1)
                    # Handle float or int, and ensure it's a valid integer
                    days_until_expiry = int(round(float(days_until_expiry_raw)))
                    # If item is already expired (days_until_expiry <= 0), prevent all usage
                    if days_until_expiry <= 0:
                        # Item is already expired, prevent all usage
                        for d in range(days):
                            for m in meals:
                                for r in recipes:
                                    if item_name in r.get('ingredients', {}):
                                        prob += x[(d, m, r['id'])] == 0, f"ExpiredItem_{item_name}_Day{d}_Meal{m}_Recipe{r['id']}"
                    # If item expires during the plan period, prevent usage after expiry
                    elif days_until_expiry < days:
                        for d in range(days_until_expiry, days):
                            for m in meals:
                                for r in recipes:
                                    # Only prevent if this recipe actually uses this item
                                    if item_name in r.get('ingredients', {}):
                                        prob += x[(d, m, r['id'])] == 0, f"ExpiredItem_{item_name}_Day{d}_Meal{m}_Recipe{r['id']}"
                except (ValueError, TypeError) as e:
                    # If days_until_expiry is invalid, log but don't crash
                    print(f"Warning: Invalid days_until_expiry for {item_name}: {item_data.get('days_until_expiry')}, error: {e}")
                    # Continue without expiry constraint for this item
        
        # Constraint 3: Avoid same recipe on consecutive days (for same meal type)
        # This constraint can make the problem infeasible with limited recipes, so we'll try with and without it
        for d in range(days - 1):  # Don't check last day
            for m in meals:
                for r in recipes:
                    # If recipe r is used on day d, it shouldn't be used on day d+1 for the same meal
                    prob += x[(d, m, r['id'])] + x[(d + 1, m, r['id'])] <= 1, f"NoConsecutive_{d}_{m}_{r['id']}"
        
        # Solve the problem
        prob.solve()
        
        # Check solution status
        status_code = LpStatus[prob.status]
        
        # If infeasible, try without consecutive constraints (but keep no-duplicate and exactly-one constraints)
        if status_code not in ['Optimal', 'Feasible']:
            print(f"Initial solve failed with status {status_code}. Trying without consecutive day constraints...")
            # Rebuild problem without consecutive constraints
            prob2 = LpProblem("MealPlanOptimization_Relaxed", LpMaximize)
            prob2 += lpSum(objective_terms), "Maximize_Weighted_Inventory_Usage"
            
            # Add constraints 1 and 1b again (at most one recipe per meal, no duplicates on same day)
            for d in range(days):
                for m in meals:
                    prob2 += lpSum([x[(d, m, r['id'])] for r in recipes]) <= 1, f"AtMostOneRecipePerMeal_{d}_{m}"
            
            for d in range(days):
                for r in recipes:
                    prob2 += lpSum([x[(d, m, r['id'])] for m in meals]) <= 1, f"NoDuplicateRecipe_{d}_{r['id']}"
            
            # Add inventory constraints and expiry constraints
            for item_name, item_data in inventory.items():
                if isinstance(item_data, dict):
                    available_qty = item_data.get('qty', 0.0)
                else:
                    available_qty = float(item_data) if isinstance(item_data, (int, float)) else 0.0
                
                total_usage = lpSum([
                    r.get('ingredients', {}).get(item_name, 0.0) * x[(d, m, r['id'])]
                    for d in range(days)
                    for m in meals
                    for r in recipes
                ])
                prob2 += total_usage <= available_qty, f"InventoryLimit_{item_name}"
                
                # Add expiry constraint
                if isinstance(item_data, dict) and 'days_until_expiry' in item_data:
                    try:
                        days_until_expiry_raw = item_data.get('days_until_expiry', days + 1)
                        days_until_expiry = int(round(float(days_until_expiry_raw)))
                        if days_until_expiry <= 0:
                            # Item is already expired, prevent all usage
                            for d in range(days):
                                for m in meals:
                                    for r in recipes:
                                        if item_name in r.get('ingredients', {}):
                                            prob2 += x[(d, m, r['id'])] == 0, f"ExpiredItem2_{item_name}_Day{d}_Meal{m}_Recipe{r['id']}"
                        elif days_until_expiry < days:
                            for d in range(days_until_expiry, days):
                                for m in meals:
                                    for r in recipes:
                                        if item_name in r.get('ingredients', {}):
                                            prob2 += x[(d, m, r['id'])] == 0, f"ExpiredItem2_{item_name}_Day{d}_Meal{m}_Recipe{r['id']}"
                    except (ValueError, TypeError) as e:
                        print(f"Warning: Invalid days_until_expiry for {item_name}: {item_data.get('days_until_expiry')}, error: {e}")
            
            # Solve without consecutive constraints
            prob2.solve()
            status_code = LpStatus[prob2.status]
            prob = prob2  # Use the relaxed problem
            print(f"Relaxed solve status: {status_code}")
            
            # If still infeasible, try with fewer days
            if status_code not in ['Optimal', 'Feasible']:
                print(f"Still infeasible. Trying with fewer days...")
                # Try reducing days progressively
                for reduced_days in range(days - 1, 0, -1):
                    prob3 = LpProblem(f"MealPlanOptimization_{reduced_days}days", LpMaximize)
                    # Recalculate objective for reduced days
                    reduced_objective_terms = []
                    for d in range(reduced_days):
                        for m in meals:
                            for r in recipes:
                                recipe_value = 0.0
                                for item_name, amount_needed in r.get('ingredients', {}).items():
                                    if item_name in inventory:
                                        item_data = inventory[item_name]
                                        if isinstance(item_data, dict):
                                            expiry_weight = item_data.get('expiry_weight', 1.0)
                                        else:
                                            expiry_weight = 1.0
                                        recipe_value += expiry_weight * amount_needed
                                
                                recipe_value_scaled = recipe_value * 100.0
                                day_priority_multiplier = (reduced_days - d + 1) ** 2
                                slot_bonus = base_slot_fill_bonus * day_priority_multiplier
                                reduced_objective_terms.append((recipe_value_scaled + slot_bonus) * x[(d, m, r['id'])])
                    
                    prob3 += lpSum(reduced_objective_terms), "Maximize_Weighted_Inventory_Usage"
                    
                    # Add constraints for reduced days
                    for d in range(reduced_days):
                        for m in meals:
                            prob3 += lpSum([x[(d, m, r['id'])] for r in recipes]) <= 1, f"AtMostOneRecipePerMeal_{d}_{m}"
                    
                    for d in range(reduced_days):
                        for r in recipes:
                            prob3 += lpSum([x[(d, m, r['id'])] for m in meals]) <= 1, f"NoDuplicateRecipe_{d}_{r['id']}"
                    
                    for item_name, item_data in inventory.items():
                        if isinstance(item_data, dict):
                            available_qty = item_data.get('qty', 0.0)
                        else:
                            available_qty = float(item_data) if isinstance(item_data, (int, float)) else 0.0
                        
                        total_usage = lpSum([
                            r.get('ingredients', {}).get(item_name, 0.0) * x[(d, m, r['id'])]
                            for d in range(reduced_days)
                            for m in meals
                            for r in recipes
                        ])
                        prob3 += total_usage <= available_qty, f"InventoryLimit_{item_name}"
                        
                        # Add expiry constraint
                        if isinstance(item_data, dict) and 'days_until_expiry' in item_data:
                            try:
                                days_until_expiry_raw = item_data.get('days_until_expiry', reduced_days + 1)
                                days_until_expiry = int(round(float(days_until_expiry_raw)))
                                if days_until_expiry <= 0:
                                    # Item is already expired, prevent all usage
                                    for d in range(reduced_days):
                                        for m in meals:
                                            for r in recipes:
                                                if item_name in r.get('ingredients', {}):
                                                    prob3 += x[(d, m, r['id'])] == 0, f"ExpiredItem3_{item_name}_Day{d}_Meal{m}_Recipe{r['id']}"
                                elif days_until_expiry < reduced_days:
                                    for d in range(days_until_expiry, reduced_days):
                                        for m in meals:
                                            for r in recipes:
                                                if item_name in r.get('ingredients', {}):
                                                    prob3 += x[(d, m, r['id'])] == 0, f"ExpiredItem3_{item_name}_Day{d}_Meal{m}_Recipe{r['id']}"
                            except (ValueError, TypeError) as e:
                                print(f"Warning: Invalid days_until_expiry for {item_name}: {item_data.get('days_until_expiry')}, error: {e}")
                    
                    prob3.solve()
                    test_status = LpStatus[prob3.status]
                    if test_status in ['Optimal', 'Feasible']:
                        prob = prob3
                        status_code = test_status
                        days = reduced_days  # Update days for solution extraction
                        print(f"Found feasible solution with {reduced_days} days")
                        break
        
        if status_code == 'Optimal' or status_code == 'Feasible':
            # Extract the solution
            schedule = []
            for d in range(days):
                day_meals = []
                for m in meals:
                    # Find which recipe was selected for this meal
                    for r in recipes:
                        if value(x[(d, m, r['id'])]) == 1:
                            day_meals.append({
                                "type": m,
                                "recipeId": r['id']
                            })
                            break
                
                # Only add days that have at least one meal (filter out empty days)
                if len(day_meals) > 0:
                    schedule.append({
                        "day": f"Day {d + 1}",
                        "meals": day_meals
                    })
            
            return jsonify({
                "status": status_code,
                "schedule": schedule
            })
        else:
            return jsonify({
                "status": status_code,
                "message": f"Solver status: {status_code}. No feasible solution found."
            }), 400
            
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in solve_meal_plan: {str(e)}")
        print(f"Traceback: {error_trace}")
        return jsonify({
            "status": "Error",
            "message": f"Server error: {str(e)}"
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Solver server is running"})

if __name__ == '__main__':
    print("Starting WasteNot Kitchen Solver Server on http://localhost:5000")
    print("Health check: http://localhost:5000/health")
    app.run(host='0.0.0.0', port=5111, debug=True)

