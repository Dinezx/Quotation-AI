import { z } from 'zod';

export const poItemSchema = z.object({
  id: z.string().optional(),
  item_number: z.number().int().positive(),
  part_number: z.string().optional(),
  part_name: z.string().min(1, 'Part name is required'),
  description: z.string().optional(),
  specification: z.string().optional(),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().default('Nos'),
  material_grade: z.string().optional(),
  gross_weight_kg: z.number().nonnegative().default(0),
  net_weight_kg: z.number().nonnegative().default(0),
  scrap_weight_kg: z.number().nonnegative().default(0),
  process_name: z.string().optional(),
  machining_hours: z.number().nonnegative().default(0),
  setup_hours: z.number().nonnegative().default(0),
  confidence: z.number().min(0).max(100).default(100),
});

export const purchaseOrderSchema = z.object({
  po_number: z.string().min(1, 'PO number is required'),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  po_date: z.string().optional(),
  delivery_date: z.string().optional(),
  items: z.array(poItemSchema).min(1, 'At least one item is required'),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;
