import React from 'react';
import { MealPlanResponse, Recipe, MealPlanMeal } from '../types';
import { ChefHat, Clock, ArrowRight, Leaf, ArrowLeft, Check, Utensils, Play } from 'lucide-react';

interface MealPlanViewProps {
  plan: MealPlanResponse;
  isActive: boolean;
  onBack: () => void;
  onActivatePlan?: () => void;
  onMealEaten?: (dayIndex: number, mealIndex: number, recipe: Recipe) => void;
  showBackBtn?: boolean;
}

const RecipeCard: React.FC<{ 
  meal: MealPlanMeal; 
  isActive: boolean;
  onEat: () => void;
}> = ({ meal, isActive, onEat }) => {
  const { recipe, type, isEaten } = meal;
  const isEatenState = isEaten || false;

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all duration-300 flex flex-col h-full ${isEatenState ? 'border-slate-100 opacity-60 grayscale-[0.5]' : 'border-slate-200 hover:shadow-lg'}`}>
      <div className={`p-4 border-b flex justify-between items-center ${isEatenState ? 'bg-slate-100 border-slate-100' : 'bg-slate-50 border-slate-100'}`}>
        <span className={`text-xs font-bold tracking-wider uppercase ${isEatenState ? 'text-slate-400' : 'text-emerald-600'}`}>{type}</span>
        <div className="flex items-center text-slate-500 text-xs">
          <Clock size={14} className="mr-1" />
          {recipe.cookingTimeMinutes} min
        </div>
      </div>
      
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-2">
           <h3 className={`font-bold text-lg ${isEatenState ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{recipe.title}</h3>
           {isEatenState && <Check className="text-emerald-600 ml-2 flex-shrink-0" size={20} />}
        </div>
        
        <p className="text-slate-600 text-sm mb-4 line-clamp-2">{recipe.description}</p>
        
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Inventory Usage</h4>
          <div className="space-y-1">
            {recipe.inventoryUsage.map((ing, idx) => (
              <div key={idx} className="flex justify-between text-xs items-center bg-slate-50 p-1.5 rounded border border-slate-100">
                 <span className="text-slate-700 font-medium">{ing.itemName}</span>
                 <span className="text-emerald-600 font-bold">-{ing.amountUsed} {ing.unit}</span>
              </div>
            ))}
          </div>
        </div>

        {!isEatenState && (
          <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
            <div className="flex items-start">
              <Leaf size={16} className="text-orange-500 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-xs text-orange-800 italic">{recipe.wasteReductionNote}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 gap-2 flex flex-col">
        {isActive ? (
           <button 
             onClick={onEat}
             disabled={isEatenState}
             className={`w-full py-2.5 text-sm font-bold rounded-lg flex justify-center items-center transition-all ${
               isEatenState 
                 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                 : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow'
             }`}
           >
             {isEatenState ? (
               <>Consumed</>
             ) : (
               <>
                 <Utensils size={16} className="mr-2" />
                 Mark as Eaten
               </>
             )}
           </button>
        ) : (
          <button className="w-full py-2 text-sm text-slate-600 font-medium hover:text-emerald-600 flex justify-center items-center group">
            View Full Recipe
            <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

export const MealPlanView: React.FC<MealPlanViewProps> = ({ 
  plan, 
  isActive, 
  onBack, 
  onActivatePlan, 
  onMealEaten,
  showBackBtn = true
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800 rounded-full opacity-50 -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500 rounded-full opacity-20 -ml-10 -mb-10 blur-2xl"></div>
        
        <div className="relative z-10 flex-1">
          {showBackBtn && (
            <button 
              onClick={onBack}
              className="mb-4 flex items-center text-emerald-200 hover:text-white transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} className="mr-1" /> 
              {isActive ? "Back to Inventory" : "Discard & Back"}
            </button>
          )}
          <h2 className="text-3xl font-bold mb-2 flex items-center">
            <ChefHat className="mr-3" size={32} />
            {plan.planName}
          </h2>
          <p className="text-emerald-100 max-w-2xl text-lg leading-relaxed">{plan.summary}</p>
        </div>

        {!isActive && onActivatePlan && (
          <div className="relative z-10 md:self-end">
             <button 
              onClick={onActivatePlan}
              className="bg-white text-emerald-900 px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-emerald-50 hover:scale-105 transition-all flex items-center"
             >
               <Play size={20} className="mr-2 fill-current" />
               Start This Plan
             </button>
          </div>
        )}
      </div>

      <div className="space-y-10">
        {plan.schedule.map((day, dayIndex) => (
          <div key={dayIndex}>
            <div className="flex items-center mb-6">
              <div className="bg-emerald-600 w-1 h-8 rounded-full mr-4"></div>
              <h3 className="text-2xl font-bold text-slate-800">{day.day}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {day.meals.map((meal, mealIndex) => (
                <RecipeCard 
                  key={mealIndex} 
                  meal={meal} 
                  isActive={isActive}
                  onEat={() => isActive && onMealEaten && onMealEaten(dayIndex, mealIndex, meal.recipe)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};