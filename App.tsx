import React, { useState, useMemo } from 'react';
import { InventoryItem } from './components/InventoryItem';
import { InventoryForm } from './components/InventoryForm';
import { MealPlanView } from './components/MealPlanView';
import { PlanSelectionView } from './components/PlanSelectionView';
import { RecipeBookView } from './components/RecipeBookView';
import { INITIAL_INVENTORY, LOCAL_RECIPES } from '@shared/constants';
import { FoodItem, MealPlanResponse, ViewState, Recipe, MealType, InventoryUsage, MealPlanSet } from '@shared/types';
import { generateMealPlans } from './services/geminiService';
import { generateLocalMealPlans } from './services/localPlanService';
import { generateOptimalMealPlan } from './services/solverService';
import { Refrigerator, Sparkles, AlertTriangle, Info, Calendar, CheckSquare, Square, BookOpen, Bot, Book, Clock, SlidersHorizontal, Server } from 'lucide-react';
import { convertAmount } from '@shared/utils';

type GenMode = 'AI' | 'LOCAL' | 'SOLVER';

const App: React.FC = () => {
  const [inventory, setInventory] = useState<FoodItem[]>(INITIAL_INVENTORY);
  const [view, setView] = useState<ViewState>(ViewState.INVENTORY);
  
  // Generation State
  const [generatedOptions, setGeneratedOptions] = useState<MealPlanResponse[]>([]);
  const [includedMeals, setIncludedMeals] = useState<MealType[]>(['Breakfast', 'Lunch', 'Dinner']);
  const [genMode, setGenMode] = useState<GenMode>('AI');
  const [planDuration, setPlanDuration] = useState<number | 'dynamic'>('dynamic');
  
  const [activeMealPlan, setActiveMealPlan] = useState<MealPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add new item
  const handleAddItem = (item: FoodItem) => {
    setInventory(prev => [...prev, item]);
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  // Toggle meal preferences
  const toggleMealType = (type: MealType) => {
    setIncludedMeals(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Generate plan options
  const handleGenerateOptions = async () => {
    if (inventory.length === 0) {
      setError("Please add items to your inventory first.");
      return;
    }
    if (includedMeals.length === 0) {
      setError("Please select at least one meal type.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let options: MealPlanSet;
      
      if (genMode === 'AI') {
        options = await generateMealPlans(inventory, includedMeals, planDuration);
      } else if (genMode === 'SOLVER') {
        options = await generateOptimalMealPlan(inventory, includedMeals, planDuration);
      } else {
        // Local Heuristic
        await new Promise(resolve => setTimeout(resolve, 600));
        options = generateLocalMealPlans(inventory, includedMeals, planDuration);
      }
      
      setGeneratedOptions(options.options);
      setView(ViewState.PLAN_SELECTION);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate meal plans.");
    } finally {
      setIsLoading(false);
    }
  };

  // Activate a specific Plan
  const handleActivatePlan = (plan: MealPlanResponse) => {
    setActiveMealPlan(plan);
    setGeneratedOptions([]);
    setView(ViewState.ACTIVE_PLAN);
  };

  // Core Inventory Deduction Logic
  const deductInventory = (currentInventory: FoodItem[], usageList: InventoryUsage[]): FoodItem[] => {
    const updatedInventory = [...currentInventory];
    
    usageList.forEach(usage => {
      // We need to deduct 'amountUsed' (which is in 'usage.unit')
      let amountRemainingToDeduct = Number(usage.amountUsed);
      const usageUnit = usage.unit;
      const itemName = usage.itemName.toLowerCase();

      // Find all matching items, sorted by expiry (oldest first)
      const matchingItems = updatedInventory
        .map((item, index) => ({ ...item, originalIndex: index }))
        .filter(item => item.name.toLowerCase() === itemName)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      // Distribute deduction
      for (const match of matchingItems) {
        if (amountRemainingToDeduct <= 0.001) break; // close enough to zero

        const currentIndex = match.originalIndex;
        const currentItem = updatedInventory[currentIndex];
        
        // Calculate how much of this item is available, CONVERTED to the recipe's unit
        const itemQuantityInUsageUnit = convertAmount(currentItem.quantity, currentItem.unit, usageUnit);
        
        // We can deduct at most what is available or what is needed
        const deductionInUsageUnit = Math.min(itemQuantityInUsageUnit, amountRemainingToDeduct);
        
        // Convert BACK to Item's unit to subtract
        const deductionInItemUnit = convertAmount(deductionInUsageUnit, usageUnit, currentItem.unit);

        // Update the item
        updatedInventory[currentIndex] = {
          ...currentItem,
          quantity: Number(Math.max(0, currentItem.quantity - deductionInItemUnit).toFixed(3))
        };

        amountRemainingToDeduct -= deductionInUsageUnit;
      }
    });
    
    return updatedInventory;
  };

  // Mark Meal Eaten (from Plan)
  const handleMealEaten = (dayIndex: number, mealIndex: number, recipe: Recipe) => {
    if (!activeMealPlan) return;

    // 1. Update Active Plan UI state
    const updatedPlan = { ...activeMealPlan };
    if (updatedPlan.schedule[dayIndex].meals[mealIndex].isEaten) return; // Already eaten
    updatedPlan.schedule[dayIndex].meals[mealIndex].isEaten = true;
    setActiveMealPlan(updatedPlan);

    // 2. Update Inventory
    const newInventory = deductInventory(inventory, recipe.inventoryUsage);
    setInventory(newInventory);
  };

  // Handle cooking from Recipe Book
  const handleCookLocalRecipe = (recipe: Recipe, usage: InventoryUsage[]) => {
    // Deduct inventory based on the calculated usage
    const newInventory = deductInventory(inventory, usage);
    setInventory(newInventory);
    
    // Provide feedback (basic for now)
    setView(ViewState.INVENTORY);
  };

  // Calculate inventory stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    let expired = 0;
    let expiringSoon = 0;
    
    inventory.forEach(item => {
      const exp = new Date(item.expiryDate);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 0) expired++;
      else if (diff <= 3) expiringSoon++;
    });
    return { expired, expiringSoon, total: inventory.length };
  }, [inventory]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setView(ViewState.INVENTORY)}>
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Refrigerator className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">WasteNot <span className="text-emerald-600">Kitchen</span></h1>
          </div>
          
          <div className="flex space-x-4">
            {activeMealPlan && view !== ViewState.ACTIVE_PLAN && (
              <button
                onClick={() => setView(ViewState.ACTIVE_PLAN)}
                className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md text-sm font-medium border border-emerald-100 hover:bg-emerald-100"
              >
                <Calendar size={16} className="mr-2" />
                Active Plan
              </button>
            )}
            {view !== ViewState.INVENTORY && (
               <button 
                onClick={() => setView(ViewState.INVENTORY)}
                className="text-sm font-medium text-slate-600 hover:text-emerald-600"
               >
                 Manage Inventory
               </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start animate-in fade-in">
            <AlertTriangle className="text-red-500 mr-3 flex-shrink-0" size={20} />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {view === ViewState.INVENTORY ? (
          <>
             {/* Dashboard Stats */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center">
                 <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
                   <Info size={24} />
                 </div>
                 <div>
                   <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Total Items</p>
                   <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                 </div>
               </div>
               
               <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center">
                 <div className="p-3 rounded-full bg-amber-50 text-amber-600 mr-4">
                   <Sparkles size={24} />
                 </div>
                 <div>
                   <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Expiring Soon</p>
                   <p className="text-2xl font-bold text-slate-800">{stats.expiringSoon}</p>
                 </div>
               </div>

               <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center">
                 <div className="p-3 rounded-full bg-red-50 text-red-600 mr-4">
                   <AlertTriangle size={24} />
                 </div>
                 <div>
                   <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Expired</p>
                   <p className="text-2xl font-bold text-slate-800">{stats.expired}</p>
                 </div>
               </div>
             </div>

             {/* Main Content Area */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Left: Grid */}
               <div className="lg:col-span-2 space-y-6">
                 <div className="flex justify-between items-center">
                   <h2 className="text-xl font-bold text-slate-800">Your Inventory</h2>
                   <span className="text-sm text-slate-500">Sorted by Expiry</span>
                 </div>

                 {inventory.length === 0 ? (
                   <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                     <Refrigerator className="mx-auto text-slate-300 mb-3" size={48} />
                     <p className="text-slate-500 font-medium">Your pantry is empty</p>
                     <p className="text-slate-400 text-sm">Add items to generate a meal plan</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                     {[...inventory]
                      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                      .map(item => (
                        <InventoryItem 
                          key={item.id} 
                          item={item} 
                          onDelete={handleDeleteItem} 
                        />
                      ))}
                   </div>
                 )}
               </div>

               {/* Right: Actions & Form */}
               <div className="lg:col-span-1 space-y-6">
                  <InventoryForm onAdd={handleAddItem} />

                  <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                      <h3 className="text-lg font-bold mb-4">Ready to cook?</h3>
                      
                      {/* Configuration Panel */}
                      <div className="mb-4 bg-white/10 p-4 rounded-lg backdrop-blur-sm space-y-4">
                         
                         {/* Meal Types */}
                         <div>
                           <p className="text-[10px] font-bold uppercase text-emerald-200 mb-2 tracking-wider">Meals Included</p>
                           <div className="flex flex-wrap gap-2">
                             {(['Breakfast', 'Lunch', 'Dinner'] as MealType[]).map(type => (
                               <button
                                 key={type}
                                 onClick={() => toggleMealType(type)}
                                 className={`flex items-center px-2 py-1 rounded text-xs font-bold transition-all ${
                                   includedMeals.includes(type)
                                     ? 'bg-white text-emerald-900 shadow-sm'
                                     : 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-700'
                                 }`}
                               >
                                 {includedMeals.includes(type) ? (
                                   <CheckSquare size={12} className="mr-1" />
                                 ) : (
                                   <Square size={12} className="mr-1" />
                                 )}
                                 {type}
                               </button>
                             ))}
                           </div>
                         </div>

                         {/* Duration Selector */}
                         <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-bold uppercase text-emerald-200 tracking-wider">Plan Duration</p>
                              <span className="text-[10px] text-emerald-300 bg-emerald-900/50 px-1.5 py-0.5 rounded">
                                {planDuration === 'dynamic' ? 'Smart' : 'Fixed'}
                              </span>
                            </div>
                            <div className="relative">
                              <select 
                                value={planDuration}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPlanDuration(val === 'dynamic' ? 'dynamic' : parseInt(val, 10));
                                }}
                                className="w-full appearance-none bg-emerald-900/50 border border-emerald-700 text-emerald-100 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 outline-none cursor-pointer hover:bg-emerald-800/50 transition-colors"
                              >
                                <option value="dynamic" className="text-slate-900">Dynamic (Based on Inventory)</option>
                                <option value="1" className="text-slate-900">1 Day</option>
                                <option value="2" className="text-slate-900">2 Days</option>
                                <option value="3" className="text-slate-900">3 Days</option>
                                <option value="4" className="text-slate-900">4 Days</option>
                                <option value="5" className="text-slate-900">5 Days</option>
                                <option value="6" className="text-slate-900">6 Days</option>
                                <option value="7" className="text-slate-900">7 Days</option>
                              </select>
                              <SlidersHorizontal size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-400 pointer-events-none" />
                            </div>
                         </div>

                         {/* Engine Selection */}
                         <div className="flex flex-col pt-3 border-t border-emerald-700/50">
                            <span className="text-xs font-semibold text-emerald-200 mb-2">Generation Engine</span>
                            <div className="flex bg-emerald-900/80 rounded-lg p-1 border border-emerald-700">
                               <button 
                                 onClick={() => setGenMode('LOCAL')}
                                 className={`flex-1 flex justify-center items-center px-2 py-1.5 rounded text-xs font-bold transition-all ${genMode === 'LOCAL' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-300 hover:text-white'}`}
                                 title="Fast, simple recipes"
                               >
                                 <Book size={12} className="mr-1" />
                                 Basic
                               </button>
                               <button 
                                 onClick={() => setGenMode('AI')}
                                 className={`flex-1 flex justify-center items-center px-2 py-1.5 rounded text-xs font-bold transition-all ${genMode === 'AI' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-300 hover:text-white'}`}
                                 title="Creative AI Generation"
                               >
                                 <Bot size={12} className="mr-1" />
                                 AI
                               </button>
                               <button 
                                 onClick={() => setGenMode('SOLVER')}
                                 className={`flex-1 flex justify-center items-center px-2 py-1.5 rounded text-xs font-bold transition-all ${genMode === 'SOLVER' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-300 hover:text-white'}`}
                                 title="Mathematically Optimal (Requires Python Server)"
                               >
                                 <Server size={12} className="mr-1" />
                                 Solver
                               </button>
                            </div>
                         </div>
                      </div>

                      <p className="text-emerald-100 text-xs mb-6 opacity-80 min-h-[2.5em]">
                        {genMode === 'AI' && "Gemini AI will create a creative, custom plan."}
                        {genMode === 'LOCAL' && "Browser-based heuristic generation using standard recipes."}
                        {genMode === 'SOLVER' && "Mathematical optimization to strictly maximize inventory usage (Requires backend)."}
                      </p>
                      
                      <div className="space-y-3">
                        {activeMealPlan ? (
                            <button
                              onClick={() => setView(ViewState.ACTIVE_PLAN)}
                              className="w-full py-3 px-4 bg-emerald-500 text-white font-bold rounded-lg shadow-lg hover:bg-emerald-400 transition-all flex items-center justify-center"
                            >
                              <Calendar size={18} className="mr-2" />
                              View Active Plan
                            </button>
                        ) : (
                           <button
                            onClick={handleGenerateOptions}
                            disabled={isLoading || inventory.length === 0 || includedMeals.length === 0}
                            className="w-full py-3 px-4 bg-white text-emerald-900 font-bold rounded-lg shadow-lg hover:bg-emerald-50 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                          >
                            {isLoading ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-emerald-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {genMode === 'SOLVER' ? 'Solving...' : 'Generating...'}
                              </>
                            ) : (
                              <>
                                <Sparkles size={18} className="mr-2 text-yellow-500" />
                                Generate Plan
                              </>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => setView(ViewState.RECIPE_BOOK)}
                          className="w-full py-3 px-4 bg-emerald-900/50 border border-emerald-700 text-emerald-100 font-bold rounded-lg hover:bg-emerald-800 transition-all flex items-center justify-center text-sm"
                        >
                          <BookOpen size={18} className="mr-2" />
                          Browse Recipe Book
                        </button>
                      </div>
                    </div>
                  </div>
               </div>
             </div>
          </>
        ) : view === ViewState.PLAN_SELECTION ? (
           <PlanSelectionView
             options={generatedOptions}
             currentInventory={inventory}
             onSelectPlan={handleActivatePlan}
             onBack={() => setView(ViewState.INVENTORY)}
           />
        ) : view === ViewState.RECIPE_BOOK ? (
           <RecipeBookView
             recipes={LOCAL_RECIPES}
             inventory={inventory}
             onCook={handleCookLocalRecipe}
             onBack={() => setView(ViewState.INVENTORY)}
           />
        ) : (
          <MealPlanView
            plan={activeMealPlan!}
            isActive={true}
            onBack={() => setView(ViewState.INVENTORY)}
            onMealEaten={handleMealEaten}
            showBackBtn={true}
          />
        )}
      </main>
    </div>
  );
};

export default App;
