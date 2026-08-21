import { evaluatePasswordPolicy, PASSWORD_MIN_LENGTH } from './password-policy';
import { generateStrongPassword } from '../utils/password-generator';

describe('evaluatePasswordPolicy', () => {
  it('rejects passwords shorter than the minimum length', () => {
    const result = evaluatePasswordPolicy('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes(`${PASSWORD_MIN_LENGTH} caracteres`))).toBe(true);
  });

  it('rejects passwords missing an uppercase letter', () => {
    const result = evaluatePasswordPolicy('abcdefgh1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('mayúscula'))).toBe(true);
  });

  it('rejects passwords missing a lowercase letter', () => {
    const result = evaluatePasswordPolicy('ABCDEFGH1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('minúscula'))).toBe(true);
  });

  it('rejects passwords missing a digit', () => {
    const result = evaluatePasswordPolicy('Abcdefgh!!');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('número'))).toBe(true);
  });

  it('rejects passwords missing a special character', () => {
    const result = evaluatePasswordPolicy('Abcdefgh12');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('especial'))).toBe(true);
  });

  it('accepts a password meeting every rule', () => {
    const result = evaluatePasswordPolicy('Str0ng!Passw0rd');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects empty or undefined input without throwing', () => {
    expect(evaluatePasswordPolicy('').valid).toBe(false);
    expect(evaluatePasswordPolicy(undefined as any).valid).toBe(false);
  });
});

describe('generateStrongPassword', () => {
  it('always produces a password that satisfies the policy', () => {
    for (let i = 0; i < 25; i++) {
      const pw = generateStrongPassword();
      expect(evaluatePasswordPolicy(pw).valid).toBe(true);
    }
  });

  it('never repeats two consecutive generated passwords', () => {
    const a = generateStrongPassword();
    const b = generateStrongPassword();
    expect(a).not.toBe(b);
  });

  it('respects a custom length above the policy minimum', () => {
    const pw = generateStrongPassword(20);
    expect(pw.length).toBe(20);
  });
});
