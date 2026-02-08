import { z } from 'zod';

// Schema for creating a single food item
export const CreateFoodItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(50),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  category: z.string().min(1, 'Category is required').max(100),
});

// Schema for updating a food item
export const UpdateFoodItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).max(50).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().min(1).max(100).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Schema for bulk create
export const CreateBulkFoodItemsSchema = z.object({
  items: z.array(CreateFoodItemSchema).min(1, 'At least one item is required'),
});

// Schema for deducting inventory with FIFO logic
export const DeductInventorySchema = z.object({
  usageList: z.array(z.object({
    itemName: z.string().min(1, 'Item name is required'),
    amountUsed: z.number().positive('Amount must be positive'),
    unit: z.string().min(1, 'Unit is required'),
  })).min(1, 'At least one usage item is required'),
});

export type CreateFoodItemInput = z.infer<typeof CreateFoodItemSchema>;
export type UpdateFoodItemInput = z.infer<typeof UpdateFoodItemSchema>;
export type CreateBulkFoodItemsInput = z.infer<typeof CreateBulkFoodItemsSchema>;
export type DeductInventoryInput = z.infer<typeof DeductInventorySchema>;
