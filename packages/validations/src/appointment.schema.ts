import { z } from 'zod';

export const appointmentSchema = z
  .object({
    title: z
      .string({ required_error: 'El título es requerido' })
      .min(2, 'Mínimo 2 caracteres')
      .max(120, 'Máximo 120 caracteres')
      .trim(),
    description: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
    appointment_type: z.enum(['in_person', 'virtual'], {
      required_error: 'Seleccione el tipo de cita',
    }),
    start_time: z
      .string({ required_error: 'La fecha de inicio es requerida' })
      .refine(v => !isNaN(Date.parse(v)), 'Fecha de inicio inválida'),
    end_time: z
      .string({ required_error: 'La fecha de fin es requerida' })
      .refine(v => !isNaN(Date.parse(v)), 'Fecha de fin inválida'),
    location: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
    meeting_url: z
      .string()
      .url('Ingrese una URL válida')
      .optional()
      .or(z.literal('')),
    notes: z.string().max(1000, 'Máximo 1000 caracteres').optional().or(z.literal('')),
    client_id: z.string().uuid('Cliente inválido'),
    coach_id: z.string().uuid('Coach inválido').optional().or(z.literal('')),
    status: z
      .enum(['scheduled', 'confirmed', 'pending_confirmation'])
      .default('scheduled'),
  })
  .refine(
    data => {
      if (!data.start_time || !data.end_time) return true;
      return new Date(data.end_time) > new Date(data.start_time);
    },
    { message: 'La hora de fin debe ser posterior a la de inicio', path: ['end_time'] },
  )
  .refine(
    data => {
      if (data.appointment_type === 'virtual' && data.meeting_url) return true;
      if (data.appointment_type === 'virtual' && !data.meeting_url) return false;
      return true;
    },
    { message: 'Ingrese el enlace de la videollamada', path: ['meeting_url'] },
  );

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

export const requestAppointmentSchema = z.object({
  title: z
    .string({ required_error: 'El título es requerido' })
    .min(2, 'Mínimo 2 caracteres')
    .max(120, 'Máximo 120 caracteres')
    .trim(),
  appointment_type: z.enum(['in_person', 'virtual']).default('in_person'),
  preferred_date: z
    .string({ required_error: 'Seleccione una fecha' })
    .refine(v => !isNaN(Date.parse(v)), 'Fecha inválida'),
  preferred_time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (HH:MM)'),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
});

export type RequestAppointmentFormValues = z.infer<typeof requestAppointmentSchema>;
