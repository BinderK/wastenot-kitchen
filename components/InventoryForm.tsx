
import React, { useState } from 'react';
import { FoodItem } from '@shared/types';
import { FOOD_CATEGORIES, UNITS } from '@shared/constants';
import { Plus, Camera } from 'lucide-react';
import { ScanModal } from './ScanModal';

interface InventoryFormProps {
  onAdd: (item: FoodItem) => void;
}

export const InventoryForm: React.FC<InventoryFormProps> = ({ onAdd }) => {
  // Manual Form State
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [category, setCategory] = useState(FOOD_CATEGORIES[0]);

  // Modal State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !expiryDate) return;

    const newItem: FoodItem = {
      id: Date.now().toString(),
      name,
      quantity: parseFloat(quantity),
      unit,
      expiryDate,
      category
    };

    onAdd(newItem);
    
    // Reset form
    setName('');
    setQuantity('');
    setExpiryDate('');
  };

  const handleBulkAdd = (items: Omit<FoodItem, 'id'>[]) => {
    items.forEach((item, index) => {
      onAdd({
        ...item,
        id: Date.now().toString() + index // Simple unique ID generation
      });
    });
    setIsScanModalOpen(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
      
      {/* Header with Scan Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center">
          <Plus className="mr-2 text-emerald-600" size={20} />
          Add New Item
        </h2>
        
        <button 
          onClick={() => setIsScanModalOpen(true)}
          className="flex items-center px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium transition-colors border border-emerald-200"
        >
          <Camera size={16} className="mr-2" />
          Scan Receipt / Food
        </button>
      </div>

      {/* Scan Modal */}
      <ScanModal 
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onConfirm={handleBulkAdd}
      />
      
      {/* Manual Entry Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Item Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Bananas"
              className="w-full rounded-lg border-slate-200 focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 transition-all px-3 py-2.5 border text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Quantity</label>
            <div className="flex">
              <input
                type="number"
                required
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="flex-1 rounded-l-lg border-slate-200 focus:border-emerald-500 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 px-3 py-2.5 border text-sm"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="rounded-r-lg border-l-0 border-slate-200 bg-slate-50 focus:border-emerald-500 focus:ring focus:ring-emerald-200 px-2 py-2.5 border text-sm min-w-[90px]"
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border-slate-200 focus:border-emerald-500 focus:ring focus:ring-emerald-200 px-3 py-2.5 border text-sm"
            >
              {FOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Expiry Date</label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-lg border-slate-200 focus:border-emerald-500 focus:ring focus:ring-emerald-200 px-3 py-2.5 border text-sm text-slate-600"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 px-6 rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center text-sm"
          >
            Add Manually
          </button>
        </div>
      </form>
    </div>
  );
};
