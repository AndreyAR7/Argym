import { z } from 'zod';

export const challengeSchema = z.object({
  title: z
    .string({ required_error: 'El título es requerido' })
    .min(3, 'Mínimo 3 caracteres')
    .max(120, 'Máximo 120 caracteres')
    .trim(),
  description: z
    .string()
    .max(400, 'Máximo 400 caracteres')
    .optional()
    .or(z.literal('')),
  challenge_type: z.enum(['global', '1v1', 'group'], {
    required_error: 'Seleccione el tipo de reto',
  }),
  xp_reward: z
    .number({ required_error: 'La recompensa es requerida', invalid_type_error: 'Ingrese un número válido' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 XP')
    .max(9999, 'Máximo 9,999 XP'),
  expires_in: z.enum(['1w', '2w', '1m']).nullable().default('1w'),
  max_participants: z
    .number()
    .int()
    .min(2, 'Mínimo 2 participantes')
    .max(1000, 'Máximo 1,000 participantes')
    .optional(),
});

export type ChallengeFormValues = z.infer<typeof challengeSchema>;
