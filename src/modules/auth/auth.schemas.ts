import { z } from "zod";

export const registerSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  role: z.enum(["guest", "host", "admin"]).default("guest"),
});

export const registerResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.enum(["guest", "host"]),
    phone: z.string().nullable(),
    avatarUrl: z.url().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
  token: z.string(),
});

export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  avatarUrl: z.url().optional(),
});

export const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
    role: z.enum(["guest", "host", "admin"]),
    phone: z.string().nullable(),
    avatarUrl: z.url().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
  token: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
