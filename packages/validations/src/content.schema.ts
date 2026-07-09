import { z } from 'zod';

// ── Routine ────────────────────────────────────────────────────────

export const routineSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  level: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: 'Seleccione el nivel',
  }),
  is_active: z.boolean().default(true),
  is_template: z.boolean().default(false),
});

export type RoutineFormValues = z.infer<typeof routineSchema>;

export const exerciseSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  muscle: z.enum([
    'Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps',
    'Piernas', 'Glúteos', 'Core', 'Cardio', 'General',
  ], { required_error: 'Seleccione el músculo' }),
  sets: z.number().int().min(1, 'Mínimo 1 serie').max(20, 'Máximo 20 series').default(3),
  reps: z.number().int().min(1, 'Mínimo 1 rep').max(200, 'Máximo 200 reps').default(12),
  rest_seconds: z.number().int().min(0).max(600, 'Máximo 600 segundos').default(60),
  notes: z.string().max(300, 'Máximo 300 caracteres').optional().or(z.literal('')),
  sort_order: z.number().int().min(0).default(0),
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;

// ── Video ──────────────────────────────────────────────────────────

export const videoSchema = z.object({
  title: z
    .string({ required_error: 'El título es requerido' })
    .min(2, 'Mínimo 2 caracteres')
    .max(150, 'Máximo 150 caracteres')
    .trim(),
  description: z.string().max(1000, 'Máximo 1000 caracteres').optional().or(z.literal('')),
  level: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: 'Seleccione el nivel',
  }),
  category: z.string().min(1, 'Seleccione una categoría').default('general'),
  is_featured: z.boolean().default(false),
  is_free: z.boolean().default(false),
  duration_seconds: z
    .number()
    .int()
    .min(1, 'Duración inválida')
    .max(86400, 'Máximo 24 horas')
    .optional(),
  thumbnail_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color hexadecimal inválido')
    .default('#6366f1'),
});

export type VideoFormValues = z.infer<typeof videoSchema>;

// ── Nutrition Plan ─────────────────────────────────────────────────

export const nutritionPlanSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es requerido' })
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .trim(),
  description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  goal: z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'performance', '']).optional(),
  calories_target: z
    .number()
    .int()
    .min(500, 'Mínimo 500 kcal')
    .max(10000, 'Máximo 10,000 kcal')
    .optional(),
  protein_g: z.number().min(0).max(500, 'Máximo 500g').optional(),
  carbs_g: z.number().min(0).max(1000, 'Máximo 1000g').optional(),
  fat_g: z.number().min(0).max(300, 'Máximo 300g').optional(),
  is_template: z.boolean().default(false),
});

export type NutritionPlanFormValues = z.infer<typeof nutritionPlanSchema>;
