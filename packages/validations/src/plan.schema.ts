import { z } from 'zod';

export const planSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  price: z
    .number({ required_error: 'El precio es requerido', invalid_type_error: 'Ingrese un precio válido' })
    .min(0, 'El precio no puede ser negativo')
    .max(9_999_999, 'Precio fuera de rango'),
  billing_cycle: z.enum(['monthly', 'yearly', 'one_time'], {
    required_error: 'Seleccione el ciclo de facturación',
  }),
  currency: z.string().length(3, 'Código de moneda inválido (ej: CRC, USD)').default('CRC'),
  is_active: z.boolean().default(true),
  features: z.array(z.string().min(1)).default([]),
  plan_tier: z.enum(['basic', 'medium', 'premium']).optional(),
  branch_id: z.string().uuid().optional().or(z.literal('')),
});

export type PlanFormValues = z.infer<typeof planSchema>;

export const promotionSchema = z
  .object({
    title: z
      .string({ required_error: 'El título es requerido' })
      .min(2, 'Mínimo 2 caracteres')
      .max(120, 'Máximo 120 caracteres')
      .trim(),
    description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
    type: z.enum(['discount', 'announcement', 'bundle'], {
      required_error: 'Seleccione el tipo de promoción',
    }),
    discount_percentage: z
      .number()
      .min(1, 'Mínimo 1%')
      .max(100, 'Máximo 100%')
      .optional(),
    discount_amount: z
      .number()
      .min(1, 'Mínimo 1')
      .optional(),
    start_date: z
      .string({ required_error: 'La fecha de inicio es requerida' })
      .refine(v => !isNaN(Date.parse(v)), 'Fecha inválida'),
    end_date: z
      .string()
      .refine(v => !v || !isNaN(Date.parse(v)), 'Fecha inválida')
      .optional()
      .or(z.literal('')),
    target_level: z.enum(['all', 'beginner', 'intermediate', 'advanced']).default('all'),
    is_active: z.boolean().default(true),
  })
  .refine(
    data => {
      if (data.type === 'discount') {
        return !!data.discount_percentage || !!data.discount_amount;
      }
      return true;
    },
    { message: 'Ingrese el porcentaje o monto de descuento', path: ['discount_percentage'] },
  )
  .refine(
    data => {
      if (!data.start_date || !data.end_date) return true;
      return new Date(data.end_date) > new Date(data.start_date);
    },
    { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['end_date'] },
  );

export type PromotionFormValues = z.infer<typeof promotionSchema>;
