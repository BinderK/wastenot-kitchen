import React, { useState, useMemo } from 'react';
import { Recipe, FoodItem } from '../types';
import { getRecipeMatchStatus, RecipeMatchStatus } from '../utils';
import { BookOpen, Clock, CheckCircle, XCircle, Filter, ChefHat, ArrowLeft, AlertCircle } from 'lucide-react';

interface RecipeBookViewProps {
  recipes: Recipe[];
  inventory: FoodItem[];
  onCook: (recipe: Recipe, usage: any[]) => void;
  onBack: () => void;
}

export const RecipeBookView: React.FC<RecipeBookViewProps> = ({ 
  recipes, 
  inventory, 
  onCook,
  onBack
}) => {
  const [selectedRecipeStatus, setSelectedRecipeStatus] = useState<RecipeMatchStatus | null>(null);
  const [showOnlyCookable, setShowOnlyCookable] = useState(false);

  // Analyze all recipes against inventory
  const analyzedRecipes = useMemo(() => {
    return recipes.map(recipe => getRecipeMatchStatus(recipe, inventory))
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [recipes, inventory]);

  const filteredRecipes = showOnlyCookable 
    ? analyzedRecipes.filter(r => r.matchPercentage === 100)
    : analyzedRecipes;

  const handleCookClick = () => {
    if (selectedRecipeStatus) {
      onCook(selectedRecipeStatus.recipe, selectedRecipeStatus.calculatedInventoryUsage);
      setSelectedRecipeStatus(null); // Close modal/view
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="mr-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
             <h2 className="text-2xl font-bold text-slate-800 flex items-center">
              <BookOpen className="mr-2 text-emerald-600" size={24} />
              Recipe Book
            </h2>
            <p className="text-slate-500 text-sm">Cook from our collection of standard recipes</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowOnlyCookable(!showOnlyCookable)}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
            showOnlyCookable 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter size={16} className="mr-2" />
          {showOnlyCookable ? 'Showing Cookable Only' : 'Show All Recipes'}
        </button>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((status, idx) => (
          <div 
            key={idx}
            onClick={() => setSelectedRecipeStatus(status)}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-slate-800 group-hover:text-emerald-600 transition-colors">
                  {status.recipe.title}
                </h3>
                <div className={`px-2 py-1 rounded text-xs font-bold ${
                  status.matchPercentage === 100 
                    ? 'bg-green-100 text-green-700' 
                    : status.matchPercentage > 50 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-slate-100 text-slate-500'
                }`}>
                  {status.matchPercentage === 100 ? 'Ready' : `${status.matchPercentage}% Match`}
                </div>
              </div>
              
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">{status.recipe.description}</p>
              
              <div className="flex items-center text-slate-400 text-xs mb-4">
                <Clock size={14} className="mr-1" />
                {status.recipe.cookingTimeMinutes} mins
              </div>

              {/* Match Bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    status.matchPercentage === 100 ? 'bg-emerald-500' : 'bg-amber-400'
                  }`} 
                  style={{ width: `${status.matchPercentage}%` }}
                ></div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-center text-sm font-medium text-slate-600 group-hover:text-emerald-700 group-hover:bg-emerald-50/50 transition-colors">
              View Recipe
            </div>
          </div>
        ))}
      </div>
      
      {filteredRecipes.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <ChefHat className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500 font-medium">No recipes match your filter.</p>
          <button 
            onClick={() => setShowOnlyCookable(false)}
            className="mt-2 text-emerald-600 hover:underline text-sm"
          >
            Show all recipes
          </button>
        </div>
      )}

      {/* Recipe Detail Modal Overlay */}
      {selectedRecipeStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedRecipeStatus.recipe.title}</h2>
                 <div className="flex items-center space-x-4 text-sm text-slate-500">
                   <span className="flex items-center"><Clock size={16} className="mr-1" /> {selectedRecipeStatus.recipe.cookingTimeMinutes} mins</span>
                   <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedRecipeStatus.matchPercentage === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                     {selectedRecipeStatus.matchPercentage}% Ingredients Available
                   </span>
                 </div>
              </div>
              <button 
                onClick={() => setSelectedRecipeStatus(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <p className="text-slate-600">{selectedRecipeStatus.recipe.description}</p>

              {/* Ingredients Analysis */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center">
                  Ingredients
                </h3>
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedRecipeStatus.ingredientStatuses.map((ing, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        {ing.hasEnough ? (
                          <CheckCircle size={16} className="text-emerald-500 mr-2 flex-shrink-0" />
                        ) : (
                          <AlertCircle size={16} className="text-amber-500 mr-2 flex-shrink-0" />
                        )}
                        <span className={`${ing.hasEnough ? 'text-slate-700' : 'text-slate-400'}`}>
                          {ing.ingredientName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{ing.requiredAmount} {ing.requiredUnit}</span>
                        {!ing.hasEnough && (
                          <span className="text-xs text-amber-600 block">
                            (Have {ing.availableAmount} {ing.requiredUnit})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3">Instructions</h3>
                <ol className="space-y-3 list-decimal list-inside text-slate-600 text-sm">
                  {selectedRecipeStatus.recipe.instructions.map((step, i) => (
                    <li key={i} className="pl-2 marker:text-emerald-600 marker:font-bold">{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50">
               {selectedRecipeStatus.matchPercentage < 100 && (
                 <div className="mb-4 flex items-start text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">
                   <AlertCircle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                   <p>You are missing some ingredients. Cooking this will still deduct available items from your inventory.</p>
                 </div>
               )}
               
               <div className="flex gap-3">
                 <button 
                   onClick={() => setSelectedRecipeStatus(null)}
                   className="flex-1 py-3 px-4 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleCookClick}
                   className="flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl shadow hover:bg-emerald-700 transition-all flex justify-center items-center"
                 >
                   <ChefHat size={18} className="mr-2" />
                   Cook & Track
                 </button>
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};