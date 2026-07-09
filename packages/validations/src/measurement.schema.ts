import { z } from 'zod';

const optionalPositiveNumber = (max: number, unit: string) =>
  z
    .number()
    .positive(`El valor debe ser positivo`)
    .max(max, `Máximo ${max}${unit}`)
    .optional()
    .or(z.nan().transform(() => undefined));

export const bodyMeasurementSchema = z.object({
  measured_at: z
    .string()
    .refine(v => !v || !isNaN(Date.parse(v)), 'Fecha inválida')
    .optional(),
  weight_kg:     optionalPositiveNumber(500, 'kg'),
  height_cm:     optionalPositiveNumber(300, 'cm'),
  body_fat_pct:  z.number().min(0).max(100, 'Máximo 100%').optional(),
  muscle_mass_kg: optionalPositiveNumber(200, 'kg'),
  waist_cm:      optionalPositiveNumber(300, 'cm'),
  hip_cm:        optionalPositiveNumber(300, 'cm'),
  chest_cm:      optionalPositiveNumber(300, 'cm'),
  shoulder_cm:   optionalPositiveNumber(300, 'cm'),
  arm_cm:        optionalPositiveNumber(100, 'cm'),
  thigh_cm:      optionalPositiveNumber(200, 'cm'),
  calf_cm:       optionalPositiveNumber(150, 'cm'),
  neck_cm:       optionalPositiveNumber(100, 'cm'),
  abdomen_cm:    optionalPositiveNumber(300, 'cm'),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
}).refine(
  data => Object.entries(data).some(([k, v]) => k !== 'measured_at' && k !== 'notes' && v !== undefined),
  { message: 'Ingrese al menos una medida' },
);

export type BodyMeasurementFormValues = z.infer<typeof bodyMeasurementSchema>;
