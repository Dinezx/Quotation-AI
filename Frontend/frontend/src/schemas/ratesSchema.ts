import { z } from 'zod';

export const materialRateSchema = z.object({
  name: z.string().min(1, 'Material name is required'),
  grade: z.string().min(1, 'Grade is required'),
  density: z.number().positive().optional(),
  unit: z.string().default('kg'),
  base_rate: z.number().positive('Base rate must be positive'),
  scrap_credit_rate: z.number().nonnegative().default(0),
  is_active: z.boolean().default(true),
});

export const processRateSchema = z.object({
  name: z.string().min(1, 'Process name is required'),
  unit: z.string().default('hr'),
  hourly_rate: z.number().nonnegative('Hourly rate must be non-negative'),
  setup_cost: z.number().nonnegative().default(0),
  is_active: z.boolean().default(true),
});

export type MaterialRateFormValues = z.infer<typeof materialRateSchema>;
export type ProcessRateFormValues = z.infer<typeof processRateSchema>;
