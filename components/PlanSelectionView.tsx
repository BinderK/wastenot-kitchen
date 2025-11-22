import React, { useState, useMemo } from 'react';
import { MealPlanResponse, FoodItem } from '../types';
import { MealPlanView } from './MealPlanView';
import { ArrowLeft, Check, AlertCircle, TrendingDown } from 'lucide-react';
import { convertAmount, normalizeUnit } from '../utils';

interface PlanSelectionViewProps {
  options: MealPlanResponse[];
  currentInventory: FoodItem[];
  onSelectPlan: (plan: MealPlanResponse) => void;
  onBack: () => void;
}

export const PlanSelectionView: React.FC<PlanSelectionViewProps> = ({ 
  options, 
  currentInventory, 
  onSelectPlan, 
  onBack 
}) => {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  // Guard against empty options array
  const selectedPlan = options.length > 0 ? options[selectedOptionIndex] : null;

  // Calculate leftovers based on the selected plan
  const impactData = useMemo(() => {
    if (!selectedPlan) return [];

    // 1. Aggregate Inventory by Name
    // We store the Total Quantity in the unit of the FIRST item found for that name.
    const inventoryMap = new Map<string, {
      name: string;
      totalQuantity: number;
      unit: string; // The "Display Unit" for this group
      earliestExpiry: string;
      ids: string[];
    }>();

    currentInventory.forEach(item => {
      const key = item.name.toLowerCase();
      const existing = inventoryMap.get(key);
      
      if (existing) {
        // Convert current item quantity to the existing group unit
        const addedQuantity = convertAmount(item.quantity, item.unit, existing.unit);
        
        inventoryMap.set(key, {
          ...existing,
          totalQuantity: existing.totalQuantity + addedQuantity,
          earliestExpiry: existing.earliestExpiry < item.expiryDate ? existing.earliestExpiry : item.expiryDate,
          ids: [...existing.ids, item.id]
        });
      } else {
        inventoryMap.set(key, {
          name: item.name,
          totalQuantity: item.quantity,
          unit: item.unit, // This becomes the base unit for this group
          earliestExpiry: item.expiryDate,
          ids: [item.id]
        });
      }
    });

    // 2. Calculate Total Usage per item from the Plan
    const usageMap = new Map<string, number>();
    
    selectedPlan.schedule.forEach(day => {
      day.meals.forEach(meal => {
        meal.recipe.inventoryUsage.forEach(usage => {
          const key = usage.itemName.toLowerCase();
          const currentUsage = usageMap.get(key) || 0;
          
          // Check if we have this item in inventory to know which unit to target
          const inventoryItem = inventoryMap.get(key);
          
          let amountToAdd = Number(usage.amountUsed);
          
          // If we have this item, convert usage to match the inventory display unit
          if (inventoryItem) {
             amountToAdd = convertAmount(amountToAdd, usage.unit, inventoryItem.unit);
          }
          
          usageMap.set(key, currentUsage + amountToAdd);
        });
      });
    });

    // 3. Generate Result List
    const results = Array.from(inventoryMap.values()).map(item => {
      const key = item.name.toLowerCase();
      const usedAmount = usageMap.get(key) || 0;
      const remaining = Math.max(0, item.totalQuantity - usedAmount);
      
      // Calculate percent. Handle divide by zero.
      const percentUsed = item.totalQuantity > 0 ? (usedAmount / item.totalQuantity) * 100 : 0;
      
      return {
        ...item,
        usedAmount,
        remaining: Number(remaining.toFixed(2)),
        percentUsed
      };
    });

    // Sort by most used percentage
    return results.sort((a, b) => b.percentUsed - a.percentUsed);
  }, [selectedPlan, currentInventory]);

  if (!selectedPlan) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>No valid meal plan could be generated with the current inventory.</p>
        <button onClick={onBack} className="mt-4 text-emerald-600 hover:underline">Back to Inventory</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex items-center justify-between">
         <button 
            onClick={onBack}
            className="flex items-center text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" /> 
            Back to Inventory
          </button>
          <h2 className="text-2xl font-bold text-slate-800">Review Your Plan</h2>
          <div className="w-24"></div> {/* Spacer for alignment */}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Plan Tabs & Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Selector Tabs - Only show if multiple options exist */}
            {options.length > 1 && (
              <div className="flex space-x-4 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                {options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOptionIndex(idx)}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all ${
                      selectedOptionIndex === idx 
                        ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500 ring-offset-1' 
                        : 'bg-transparent text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span>Option {idx + 1}</span>
                      <span className="text-xs font-normal opacity-75">{option.planName}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Plan Preview */}
            <div className="bg-white rounded-xl border border-slate-200 p-1">
              <MealPlanView 
                plan={selectedPlan} 
                isActive={false} 
                onBack={onBack}
                showBackBtn={false}
              />
            </div>
          </div>

          {/* Right Column: Impact Analysis */}
          <div className="space-y-6">
            
            {/* Action Box */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-emerald-100 sticky top-24">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Plan Impact</h3>
              
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Pantry Forecast</h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {impactData.filter(item => item.percentUsed > 0).map(item => (
                    <div key={item.name} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-slate-700 text-sm">{item.name}</span>
                        <span className={`text-xs font-bold ${item.percentUsed > 100.1 ? 'text-red-600' : 'text-emerald-600'}`}>
                          Uses {Math.round(item.percentUsed)}%
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                        <div 
                          className={`${item.percentUsed > 100.1 ? 'bg-red-500' : 'bg-emerald-500'} h-1.5 rounded-full`} 
                          style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                         <span className="text-slate-500">
                           Remains: <strong className="text-slate-700">{item.remaining} {item.unit}</strong>
                         </span>
                         <span className={`${new Date(item.earliestExpiry) < new Date(new Date().setDate(new Date().getDate() + 3)) ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                           Exp: {item.earliestExpiry}
                         </span>
                      </div>
                    </div>
                  ))}
                  {impactData.filter(item => item.percentUsed === 0).length > 0 && (
                    <p className="text-xs text-slate-400 italic mt-2 text-center">
                      + {impactData.filter(item => item.percentUsed === 0).length} items unused
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => onSelectPlan(selectedPlan)}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700 hover:shadow-lg hover:scale-[1.02] transition-all flex justify-center items-center"
              >
                <Check size={20} className="mr-2" />
                Select This Plan
              </button>
            </div>
          </div>
       </div>
    </div>
  );
};