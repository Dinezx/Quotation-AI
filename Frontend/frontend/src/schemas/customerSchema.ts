import { z } from 'zod';

export const customerFormSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  contact_person: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  billing_address: z.string().optional(),
  shipping_address: z.string().optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid Indian GSTIN format')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean().default(true),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
