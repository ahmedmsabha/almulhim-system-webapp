import { z } from "zod"

export const RegisterSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export const VerifyOtpSchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^\d{6}$/),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean(),
})
