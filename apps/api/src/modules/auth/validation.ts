import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Valid work email is required"),
  password: z.string().min(12, "Password must be at least 12 characters"),
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  country: z.string().default("IN"),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the Terms of Service and Privacy Policy",
  }),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(32, "Invitation token is required"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  password: z.string().min(12, "Password must be at least 12 characters"),
});
