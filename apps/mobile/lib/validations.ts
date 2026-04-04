import { z } from 'zod';

export const signInSchema = z.object({
  email: z
    .string({ required_error: 'El correo es requerido' })
    .email('Ingrese un correo válido')
    .trim(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

export const registerSchema = z
  .object({
    full_name: z
      .string({ required_error: 'El nombre es requerido' })
      .min(2, 'Mínimo 2 caracteres')
      .trim(),
    email: z
      .string({ required_error: 'El correo es requerido' })
      .email('Ingrese un correo válido')
      .trim(),
    password: z
      .string({ required_error: 'La contraseña es requerida' })
      .min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string({ required_error: 'Confirme su contraseña' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'El correo es requerido' })
    .email('Ingrese un correo válido')
    .trim(),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
