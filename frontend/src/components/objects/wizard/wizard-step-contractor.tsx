'use client';

import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { contractorsApi } from '@/lib/api';
import { Contractor } from '@/lib/types';
import { WizardContractorData } from './wizard-types';
import { cn } from '@/lib/utils';

export interface WizardStepContractorRef {
  validate: () => Promise<boolean>;
}

interface WizardStepContractorProps {
  data: WizardContractorData;
  onChange: (data: Partial<WizardContractorData>) => void;
}

export const WizardStepContractor = forwardRef<WizardStepContractorRef, WizardStepContractorProps>(
  function WizardStepContractor({ data, onChange }, ref) {
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
      contractorsApi.getAll().then(setContractors).catch(console.error);
    }, []);

    useImperativeHandle(ref, () => ({
      validate: async () => {
        setError('');
        if (data.mode === 'create') {
          if (!data.newContractor.name.trim()) {
            setError('Название подрядчика обязательно');
            return false;
          }
          if (data.newContractor.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.newContractor.email)) {
            setError('Некорректный email подрядчика');
            return false;
          }
        }
        // select mode: contractor is optional, so always valid
        return true;
      },
    }));

    const updateNewContractor = (field: string, value: string) => {
      onChange({
        newContractor: { ...data.newContractor, [field]: value },
      });
    };

    return (
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={data.mode === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({ mode: 'select' })}
            className="flex-1"
          >
            Выбрать существующего
          </Button>
          <Button
            type="button"
            variant={data.mode === 'create' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange({ mode: 'create' })}
            className="flex-1"
          >
            Создать нового
          </Button>
        </div>

        {data.mode === 'select' ? (
          <div className="space-y-2">
            <Label>Подрядчик</Label>
            <Select
              value={data.selectedContractorId || '__none__'}
              onValueChange={(value) =>
                onChange({ selectedContractorId: value === '__none__' ? '' : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите подрядчика" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Не выбран</SelectItem>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.inn ? ` (ИНН: ${c.inn})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Можно пропустить и назначить позже
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input
                value={data.newContractor.name}
                onChange={(e) => updateNewContractor('name', e.target.value)}
                placeholder="ООО Строитель"
              />
            </div>

            <div className="space-y-2">
              <Label>ИНН</Label>
              <Input
                value={data.newContractor.inn}
                onChange={(e) => updateNewContractor('inn', e.target.value)}
                placeholder="1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input
                value={data.newContractor.phone}
                onChange={(e) => updateNewContractor('phone', e.target.value)}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={data.newContractor.email}
                onChange={(e) => updateNewContractor('email', e.target.value)}
                placeholder="contractor@example.com"
              />
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}
      </div>
    );
  }
);
