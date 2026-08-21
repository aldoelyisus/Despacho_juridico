export const PASSWORD_MIN_LENGTH = 10;
const SPECIAL_CHARS_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export const PASSWORD_POLICY_DESCRIPTION =
  `Mínimo ${PASSWORD_MIN_LENGTH} caracteres, con al menos una mayúscula, una minúscula, un número y un carácter especial.`;

export interface PasswordRule {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { key: 'upper', label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { key: 'digit', label: 'Un número', test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'Un carácter especial (!@#$%...)', test: (p) => SPECIAL_CHARS_REGEX.test(p) },
];

export function evaluatePasswordPolicy(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password || ''));
}

const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SPECIAL = '!@#$%^&*-_+=';
const ALL = LOWERCASE + UPPERCASE + DIGITS + SPECIAL;

function secureRandomIndex(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function pick(chars: string): string {
  return chars[secureRandomIndex(chars.length)];
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

/** Genera una contraseña aleatoria (Web Crypto API) que cumple la política de seguridad */
export function generateStrongPassword(length = 14): string {
  const len = Math.max(length, PASSWORD_MIN_LENGTH);
  let password: string;
  do {
    const required = [pick(LOWERCASE), pick(UPPERCASE), pick(DIGITS), pick(SPECIAL)];
    const rest = Array.from({ length: len - required.length }, () => pick(ALL));
    password = shuffle([...required, ...rest]).join('');
  } while (!evaluatePasswordPolicy(password));
  return password;
}
