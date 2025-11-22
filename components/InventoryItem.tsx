import React from 'react';
import { FoodItem } from '../types';
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

  let statusColor = "bg-green-100 text-green-800 border-green-200";
  let icon = <CheckCircle size={16} className="mr-1" />;
  let statusText = `${daysUntilExpiry} days left`;

  if (daysUntilExpiry < 0) {
    statusColor = "bg-red-100 text-red-800 border-red-200";
    icon = <AlertCircle size={16} className="mr-1" />;
    statusText = "Expired";
  } else if (daysUntilExpiry <= 2) {
    statusColor = "bg-red-50 text-red-700 border-red-200";
    icon = <AlertCircle size={16} className="mr-1" />;
    statusText = daysUntilExpiry === 0 ? "Expires Today" : `Expires in ${daysUntilExpiry} days`;
  } else if (daysUntilExpiry <= 5) {
    statusColor = "bg-amber-50 text-amber-700 border-amber-200";
    icon = <Clock size={16} className="mr-1" />;
    statusText = `${daysUntilExpiry} days left`;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex-1">
        <div className="flex items-center mb-1">
          <h3 className="font-semibold text-slate-800 text-lg mr-3">{item.name}</h3>
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border flex items-center ${statusColor}`}>
            {icon}
            {statusText}
          </span>
        </div>
        <div className="text-sm text-slate-500 flex space-x-4">
          <span>Qty: <span className="font-medium text-slate-700">{item.quantity} {item.unit}</span></span>
          <span className="text-slate-300">|</span>
          <span>{item.category}</span>
        </div>
      </div>
      <button 
        onClick={() => onDelete(item.id)}
        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
        aria-label="Delete item"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
};