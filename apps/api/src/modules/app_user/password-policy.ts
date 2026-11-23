import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt ignores everything after 72 bytes, so a longer password would be silently truncated.
export const PASSWORD_MAX_BYTES = 72;

export const PASSWORD_ERROR = {
  TOO_SHORT: 'PASSWORD_TOO_SHORT',
  TOO_LONG: 'PASSWORD_TOO_LONG',
  NEEDS_LETTER_AND_DIGIT: 'PASSWORD_NEEDS_LETTER_AND_DIGIT',
  SAME_AS_EMAIL: 'PASSWORD_SAME_AS_EMAIL',
} as const;

export type PasswordErrorCode =
  (typeof PASSWORD_ERROR)[keyof typeof PASSWORD_ERROR];

export function passwordViolation(
  password: string,
  email?: string,
): PasswordErrorCode | null {
  if (Array.from(password).length < PASSWORD_MIN_LENGTH)
    return PASSWORD_ERROR.TOO_SHORT;
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES)
    return PASSWORD_ERROR.TOO_LONG;
  if (!/\p{L}/u.test(password) || !/\p{N}/u.test(password)) {
    return PASSWORD_ERROR.NEEDS_LETTER_AND_DIGIT;
  }
  if (email && password.trim().toLowerCase() === email.trim().toLowerCase()) {
    return PASSWORD_ERROR.SAME_AS_EMAIL;
  }
  return null;
}

// Policy as a zod field. The e-mail rule needs the account's address, so setPassword checks it.
export const newPasswordField = z.string().superRefine((value, ctx) => {
  const code = passwordViolation(value);
  if (code) ctx.addIssue({ code: z.ZodIssueCode.custom, message: code });
});
