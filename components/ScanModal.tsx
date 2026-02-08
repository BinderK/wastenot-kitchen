
import React, { useState, useRef, useEffect } from 'react';
import { FoodItem } from '@shared/types';
import { identifyInventoryFromImage } from '../services/geminiService';
import { X, Camera, Upload, Trash2, Check, Loader2, AlertCircle, Plus } from 'lucide-react';
import { UNITS, FOOD_CATEGORIES } from '@shared/constants';

interface ScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (items: Omit<FoodItem, 'id'>[]) => void;
}

export const ScanModal: React.FC<ScanModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [items, setItems] = useState<Omit<FoodItem, 'id'>[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup stream on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setIsCameraActive(false);
      setItems([]);
      setError(null);
    }
  }, [isOpen]);

  // CRITICAL FIX: Attach stream to video element whenever isCameraActive becomes true and ref is available
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.error("Error playing video stream:", e));
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      // note: we rely on the useEffect above to attach the srcObject once the video element renders
    } catch (err) {
      console.error("Camera access denied or unavailable:", err);
      // Fallback to file input with capture attribute if live camera fails
      fileInputRef.current?.click();
    }
  };

  const processImage = async (base64Data: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const detectedItems = await identifyInventoryFromImage(base64Data);
      setItems(prev => [...prev, ...detectedItems]);
      setIsCameraActive(false);
      stopCamera();
    } catch (err) {
      console.error(err);
      setError("Could not identify items. Please try again or adjust lighting.");
    } finally {
      setIsProcessing(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
        processImage(base64Data);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      processImage(base64Data);
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  const handleUpdateItem = (index: number, field: keyof Omit<FoodItem, 'id'>, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Add from Receipt or Photo</h2>
            <p className="text-xs text-slate-500">Scan multiple items, edit, and save to inventory.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          
          {/* Action Buttons */}
          {!isCameraActive && !isProcessing && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button 
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-emerald-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-400 transition-all group"
              >
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                  <Camera size={24} />
                </div>
                <span className="font-bold text-slate-700">Use Camera</span>
                <span className="text-xs text-slate-400 mt-1">Snap receipts or food</span>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all group"
              >
                <div className="p-3 bg-slate-100 text-slate-600 rounded-full mb-2 group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <span className="font-bold text-slate-700">Upload Image</span>
                <span className="text-xs text-slate-400 mt-1">From gallery or files</span>
              </button>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
            </div>
          )}

          {/* Camera View */}
          {isCameraActive && (
            <div className="relative bg-black rounded-xl overflow-hidden mb-6 shadow-lg">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover opacity-90" />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center space-x-6">
                <button 
                  onClick={() => { setIsCameraActive(false); stopCamera(); }}
                  className="p-3 rounded-full bg-white/20 backdrop-blur text-white hover:bg-white/30"
                >
                  <X size={24} />
                </button>
                <button 
                  onClick={capturePhoto}
                  className="p-4 rounded-full bg-white border-4 border-emerald-500 shadow-lg hover:scale-105 transition-transform"
                >
                  <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                </button>
              </div>
              <div className="absolute top-4 left-0 right-0 text-center">
                 <span className="bg-black/50 text-white px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                   Ensure good lighting
                 </span>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Analyzing image...</p>
              <p className="text-slate-400 text-sm">Identifying food items and dates</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 p-3 rounded-lg flex items-center text-red-700 text-sm">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Scanned Items List */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Detected Items ({items.length})</h3>
                <button onClick={() => setItems([])} className="text-xs text-red-500 hover:underline">Clear All</button>
              </div>
              
              {items.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors grid grid-cols-12 gap-3 items-center">
                  {/* Name */}
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">Item Name</label>
                    <input 
                      type="text" 
                      value={item.name}
                      onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                      className="w-full p-1.5 text-sm border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Qty / Unit */}
                  <div className="col-span-6 md:col-span-3 flex gap-1">
                    <div className="flex-1">
                       <label className="block text-[10px] text-slate-400 uppercase mb-1">Qty</label>
                       <input 
                        type="number" 
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value))}
                        className="w-full p-1.5 text-sm border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="w-16">
                       <label className="block text-[10px] text-slate-400 uppercase mb-1">Unit</label>
                       <select
                        value={item.unit}
                        onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                        className="w-full p-1.5 text-sm border border-slate-200 rounded focus:border-emerald-500 bg-white"
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Expiry */}
                  <div className="col-span-5 md:col-span-4">
                     <label className="block text-[10px] text-slate-400 uppercase mb-1">Expiry Date</label>
                     <input 
                        type="date" 
                        value={item.expiryDate}
                        onChange={(e) => handleUpdateItem(idx, 'expiryDate', e.target.value)}
                        className="w-full p-1.5 text-sm border border-slate-200 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-600"
                      />
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex justify-end mt-4 md:mt-0">
                    <button 
                      onClick={() => handleRemoveItem(idx)}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-center pt-2">
                <button 
                  onClick={() => setItems(prev => [...prev, { name: 'New Item', quantity: 1, unit: 'pcs', expiryDate: new Date().toISOString().split('T')[0], category: 'Other' }])}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center px-4 py-2 bg-emerald-50 rounded-full"
                >
                  <Plus size={16} className="mr-1" /> Add Manual Item
                </button>
              </div>
            </div>
          )}

           {items.length === 0 && !isCameraActive && !isProcessing && (
             <div className="text-center py-12 text-slate-400">
               <p>No items scanned yet.</p>
             </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(items)}
            disabled={items.length === 0 || isProcessing}
            className="px-6 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-lg shadow-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
          >
            <Check size={18} className="mr-2" />
            Save {items.length} Items to Inventory
          </button>
        </div>
      </div>
    </div>
  );
};