'use client';

import { forwardRef, useImperativeHandle, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WizardObjectData } from './wizard-types';

const objectSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  address: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  status: z.string().optional(),
});

export interface WizardStepObjectRef {
  validate: () => Promise<boolean>;
}

interface WizardStepObjectProps {
  data: WizardObjectData;
  onChange: (data: Partial<WizardObjectData>) => void;
}

export const WizardStepObject = forwardRef<WizardStepObjectRef, WizardStepObjectProps>(
  function WizardStepObject({ data, onChange }, ref) {
    const {
      register,
      handleSubmit,
      setValue,
      trigger,
      formState: { errors },
    } = useForm({
      resolver: zodResolver(objectSchema),
      defaultValues: {
        name: data.name,
        address: data.address,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: data.budget,
        status: data.status || 'PLANNED',
      },
    });

    const handleFieldChange = useCallback(
      (field: keyof WizardObjectData, value: string) => {
        onChange({ [field]: value });
      },
      [onChange]
    );

    useImperativeHandle(ref, () => ({
      validate: async () => {
        let isValid = false;
        await handleSubmit(
          () => { isValid = true; },
          () => { isValid = false; }
        )();
        return isValid;
      },
    }));

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wiz-name">Название *</Label>
          <Input
            id="wiz-name"
            {...register('name', {
              onChange: (e) => handleFieldChange('name', e.target.value),
            })}
            placeholder="Название объекта"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="wiz-address">Адрес</Label>
          <Input
            id="wiz-address"
            {...register('address', {
              onChange: (e) => handleFieldChange('address', e.target.value),
            })}
            placeholder="Адрес объекта"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wiz-startDate">Дата начала</Label>
            <Input
              id="wiz-startDate"
              type="date"
              {...register('startDate', {
                onChange: (e) => handleFieldChange('startDate', e.target.value),
              })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-endDate">Дата окончания</Label>
            <Input
              id="wiz-endDate"
              type="date"
              {...register('endDate', {
                onChange: (e) => handleFieldChange('endDate', e.target.value),
              })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wiz-budget">Бюджет (руб.)</Label>
            <Input
              id="wiz-budget"
              type="number"
              {...register('budget', {
                onChange: (e) => handleFieldChange('budget', e.target.value),
              })}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-status">Статус</Label>
            <Select
              defaultValue={data.status || 'PLANNED'}
              onValueChange={(value) => {
                setValue('status', value);
                handleFieldChange('status', value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLANNED">Запланировано</SelectItem>
                <SelectItem value="IN_PROGRESS">В работе</SelectItem>
                <SelectItem value="COMPLETED">Завершён</SelectItem>
                <SelectItem value="SUSPENDED">Приостановлен</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }
);
