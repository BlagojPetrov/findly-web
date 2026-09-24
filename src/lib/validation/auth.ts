import { z } from "zod";
import { msg } from "./messages";

// FormData values are strings or null; null (missing field) is "required".
const text = () => z.string({ error: msg("required") }).trim();

export const emailSchema = text()
  .toLowerCase()
  .min(1, msg("required"))
  .max(254, msg("emailInvalid"))
  .pipe(z.email({ error: msg("emailInvalid") }));

// bcrypt (used by Supabase Auth) ignores everything after 72 bytes.
export const newPasswordSchema = z
  .string({ error: msg("required") })
  .min(1, msg("required"))
  .min(8, msg("passwordTooShort"))
  .max(72, msg("passwordTooLong"));

export const displayNameSchema = text()
  .min(1, msg("required"))
  .min(2, msg("displayNameTooShort"))
  .max(50, msg("displayNameTooLong"));

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string({ error: msg("required") }).min(1, msg("required")),
});

export const resendSchema = z.object({ email: emailSchema });

export const forgotPasswordSchema = z.object({ email: emailSchema });

const confirmPasswordSchema = z
  .string({ error: msg("required") })
  .min(1, msg("required"));

function passwordsMatch(data: { password: string; confirmPassword: string }) {
  return data.password === data.confirmPassword;
}

const passwordsDontMatch = {
  path: ["confirmPassword"],
  error: msg("passwordsDontMatch"),
};

export const resetPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(passwordsMatch, passwordsDontMatch);

export const signUpSchema = z
  .object({
    displayName: displayNameSchema,
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: confirmPasswordSchema,
  })
  .refine(passwordsMatch, passwordsDontMatch);
