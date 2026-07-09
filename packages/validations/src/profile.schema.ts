import { z } from 'zod';

export const profileSchema = z.object({
  full_name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Ingrese un teléfono válido')
    .optional()
    .or(z.literal('')),
  date_of_birth: z
    .string()
    .refine(v => !v || !isNaN(Date.parse(v)), 'Fecha de nacimiento inválida')
    .optional()
    .or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', '']).optional(),
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced', '']).optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const newClientSchema = z.object({
  full_name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  email: z
    .string({ required_error: 'El correo es requerido' })
    .email('Ingrese un correo válido')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(8, 'Mínimo 8 caracteres'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
  client_level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  branch_id: z.string().uuid('Sucursal inválida').optional().or(z.literal('')),
});

export type NewClientFormValues = z.infer<typeof newClientSchema>;

export const newCoachSchema = z.object({
  full_name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  email: z
    .string({ required_error: 'El correo es requerido' })
    .email('Ingrese un correo válido')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(8, 'Mínimo 8 caracteres'),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
  branch_id: z.string().uuid('Sucursal inválida').optional().or(z.literal('')),
});

export type NewCoachFormValues = z.infer<typeof newCoachSchema>;
