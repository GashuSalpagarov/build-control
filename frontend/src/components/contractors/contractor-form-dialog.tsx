'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contractorsApi } from '@/lib/api';
import { Contractor } from '@/lib/types';

const contractorSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  inn: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Некорректный email').optional().or(z.literal('')),
});

type ContractorFormData = z.infer<typeof contractorSchema>;

interface ContractorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor?: Contractor | null;
  onSuccess: () => void;
  onCreated?: (contractor: Contractor) => void;
}

export function ContractorFormDialog({
  open,
  onOpenChange,
  contractor,
  onSuccess,
  onCreated,
}: ContractorFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!contractor;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      name: contractor?.name || '',
      inn: contractor?.inn || '',
      phone: contractor?.phone || '',
      email: contractor?.email || '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: contractor?.name || '',
        inn: contractor?.inn || '',
        phone: contractor?.phone || '',
        email: contractor?.email || '',
      });
    }
  }, [open, contractor, reset]);

  const onSubmit = async (data: ContractorFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        name: data.name,
        inn: data.inn || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
      };

      if (isEditing && contractor) {
        await contractorsApi.update(contractor.id, payload);
      } else {
        const created = await contractorsApi.create(payload);
        onCreated?.(created);
      }

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать подрядчика' : 'Добавить подрядчика'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="ООО Строитель"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inn">ИНН</Label>
            <Input
              id="inn"
              {...register('inn')}
              placeholder="1234567890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="contractor@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
