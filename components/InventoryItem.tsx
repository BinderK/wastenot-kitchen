import React from 'react';
import { FoodItem } from '@shared/types';
import { Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface InventoryItemProps {
  item: FoodItem;
  onDelete: (id: string) => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, onDelete }) => {
  // Calculate days until expiry
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(item.expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let statusColor = "text-green-700";
  let statusText = `${daysUntilExpiry} days left`;

  if (daysUntilExpiry < 0) {
    statusColor = "text-red-700";
    statusText = "Expired";
  } else if (daysUntilExpiry <= 2) {
    statusColor = "text-red-600";
    statusText = daysUntilExpiry === 0 ? "Expires Today" : `${daysUntilExpiry} days`;
  } else if (daysUntilExpiry <= 5) {
    statusColor = "text-amber-600";
    statusText = `${daysUntilExpiry} days`;
  }

  // Format quantity display
  const formatQuantity = () => {
    if (item.unit === 'pcs' || item.unit === 'box' || item.unit === 'bag' || item.unit === 'can') {
      const qty = Math.floor(item.quantity);
      return `${qty} ${qty === 1 ? item.unit.slice(0, -1) : item.unit}`;
    }
    return `${item.quantity} ${item.unit}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-visible hover:shadow-md transition-shadow duration-200 flex flex-col relative">
      {/* Floating Delete Button - Overlapping the edge */}
      <button 
        onClick={() => onDelete(item.id)}
        className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-slate-700 hover:bg-red-600 text-white flex items-center justify-center transition-colors duration-200 shadow-lg z-10"
        aria-label="Delete item"
      >
        <Trash2 size={18} />
      </button>

      {/* Image Placeholder */}
      <div className="w-full h-28 bg-white flex items-center justify-center relative overflow-hidden rounded-t-xl">
        <div className="text-6xl opacity-80">
          {item.category === 'Produce' && '🥬'}
          {item.category === 'Dairy & Eggs' && '🥛'}
          {item.category === 'Meat & Poultry' && '🍗'}
          {item.category === 'Seafood' && '🐟'}
          {item.category === 'Grains & Bread' && '🍞'}
          {item.category === 'Canned Goods' && '🥫'}
          {item.category === 'Frozen' && '🧊'}
          {item.category === 'Pantry & Spices' && '🧂'}
          {item.category === 'Beverages' && '🥤'}
          {!['Produce', 'Dairy & Eggs', 'Meat & Poultry', 'Seafood', 'Grains & Bread', 'Canned Goods', 'Frozen', 'Pantry & Spices', 'Beverages'].includes(item.category) && '📦'}
        </div>
      </div>

      {/* Content - Two Column Layout */}
      <div className="p-3 flex-1 flex flex-col">
        {/* Row 1: Title */}
        <h3 className="font-semibold text-slate-800 text-sm mb-2 line-clamp-2">{item.name}</h3>
        
        {/* Row 2: Amount (left) and Expiration (right) */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <div className="text-xs text-slate-600 font-medium">
            {formatQuantity()}
          </div>
          
          <div className={`text-xs font-medium text-right ${statusColor}`}>
            {statusText}
          </div>
        </div>
      </div>
    </div>
  );
};