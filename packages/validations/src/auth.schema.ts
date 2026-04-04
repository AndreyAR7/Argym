import { z } from 'zod';

export const signInSchema = z.object({
  email: z
    .string({ required_error: 'El correo es requerido' })
    .email('Ingrese un correo válido')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'La contraseña es requerida' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

export const registerSchema = z
  .object({
    full_name: z
      .string({ required_error: 'El nombre es requerido' })
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres')
      .trim(),
    email: z
      .string({ required_error: 'El correo es requerido' })
      .email('Ingrese un correo válido')
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: 'La contraseña es requerida' })
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
      ),
    confirmPassword: z.string({ required_error: 'Confirme su contraseña' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'El correo es requerido' })
    .email('Ingrese un correo válido')
    .toLowerCase()
    .trim(),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
