import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ name: 'isEndDateAfterStartDate', async: false })
export class IsEndDateAfterStartDateConstraint
  implements ValidatorConstraintInterface
{
  validate(endDate: string, args: ValidationArguments) {
    const startDate = (args.object as any)[args.constraints[0]];
    if (!startDate || !endDate) return true;
    return new Date(endDate) >= new Date(startDate);
  }

  defaultMessage() {
    return 'Дата окончания должна быть не раньше даты начала';
  }
}

export function IsAfterDate(
  startDateField: string,
  options?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [startDateField],
      validator: IsEndDateAfterStartDateConstraint,
    });
  };
}
