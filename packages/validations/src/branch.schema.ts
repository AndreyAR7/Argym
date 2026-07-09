import { z } from 'zod';

export const branchSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  address: z
    .string()
    .max(300, 'Máximo 300 caracteres')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Correo inválido')
    .optional()
    .or(z.literal('')),
  is_active: z.boolean().default(true),
});

export type BranchFormValues = z.infer<typeof branchSchema>;
