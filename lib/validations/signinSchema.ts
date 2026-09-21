import { z } from "zod";

export const signinSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Username or email is required")
    .toLowerCase()
    .refine((value) => value.includes("@") || /^[a-z0-9._-]{3,64}$/.test(value), "Enter your username or email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
}).superRefine((data, context) => {
  if (!data.email.includes('@') && (data.password.length < 12 || data.password.length > 300 || new TextEncoder().encode(data.password).byteLength > 1200)) {
    context.addIssue({ code: 'custom', path: ['password'], message: 'Workspace passwords must be 12–300 characters' });
  }
});

export type SigninFormData = z.infer<typeof signinSchema>;
