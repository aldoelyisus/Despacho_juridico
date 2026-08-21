import { registerDecorator, ValidationOptions } from 'class-validator';
import { evaluatePasswordPolicy, PASSWORD_POLICY_DESCRIPTION } from './password-policy';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: {
        message: PASSWORD_POLICY_DESCRIPTION,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && evaluatePasswordPolicy(value).valid;
        },
      },
    });
  };
}
