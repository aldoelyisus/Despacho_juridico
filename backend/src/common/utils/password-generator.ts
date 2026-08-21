import { randomInt } from 'crypto';
import { evaluatePasswordPolicy, PASSWORD_MIN_LENGTH } from '../validators/password-policy';

const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SPECIAL = '!@#$%^&*-_+=';
const ALL = LOWERCASE + UPPERCASE + DIGITS + SPECIAL;

function pickRandom(chars: string): string {
  return chars[randomInt(0, chars.length)];
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

/** Genera una contraseña aleatoria (crypto.randomInt) que cumple la política de seguridad */
export function generateStrongPassword(length = 14): string {
  const len = Math.max(length, PASSWORD_MIN_LENGTH);
  let password: string;
  do {
    const required = [pickRandom(LOWERCASE), pickRandom(UPPERCASE), pickRandom(DIGITS), pickRandom(SPECIAL)];
    const rest = Array.from({ length: len - required.length }, () => pickRandom(ALL));
    password = shuffle([...required, ...rest]).join('');
  } while (!evaluatePasswordPolicy(password).valid);
  return password;
}
