export const PASSWORD_MIN_LENGTH = 10;
const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export const PASSWORD_POLICY_DESCRIPTION =
  `Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con al menos una mayúscula, una minúscula, un número y un carácter especial.`;

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`);
  }
  if (!/[A-Z]/.test(password || '')) errors.push('Debe incluir al menos una letra mayúscula');
  if (!/[a-z]/.test(password || '')) errors.push('Debe incluir al menos una letra minúscula');
  if (!/[0-9]/.test(password || '')) errors.push('Debe incluir al menos un número');
  if (!SPECIAL_CHARS_REGEX.test(password || '')) errors.push('Debe incluir al menos un carácter especial (!@#$%...)');

  return { valid: errors.length === 0, errors };
}
