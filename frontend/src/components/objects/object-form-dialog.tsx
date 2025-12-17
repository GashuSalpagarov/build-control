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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { objectsApi, contractorsApi } from '@/lib/api';
import { ConstructionObject, ObjectStatus, Contractor } from '@/lib/types';

const objectSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  address: z.string().optional(),
  contractorId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  status: z.string().optional(),
});

type ObjectFormData = z.infer<typeof objectSchema>;

interface ObjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  object?: ConstructionObject | null;
  onSuccess: () => void;
}

export function ObjectFormDialog({
  open,
  onOpenChange,
  object,
  onSuccess,
}: ObjectFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [selectedContractorId, setSelectedContractorId] = useState<string>('');

  const isEditing = !!object;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ObjectFormData>({
    resolver: zodResolver(objectSchema),
    defaultValues: {
      name: object?.name || '',
      address: object?.address || '',
      contractorId: object?.contractorId || '',
      startDate: object?.startDate?.split('T')[0] || '',
      endDate: object?.endDate?.split('T')[0] || '',
      budget: object?.budget?.toString() || '',
      status: object?.status || 'PLANNED',
    },
  });

  useEffect(() => {
    if (open) {
      contractorsApi.getAll().then(setContractors).catch(console.error);
      setSelectedContractorId(object?.contractorId || '');
      reset({
        name: object?.name || '',
        address: object?.address || '',
        contractorId: object?.contractorId || '',
        startDate: object?.startDate?.split('T')[0] || '',
        endDate: object?.endDate?.split('T')[0] || '',
        budget: object?.budget?.toString() || '',
        status: object?.status || 'PLANNED',
      });
    }
  }, [open, object, reset]);

  const onSubmit = async (data: ObjectFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        name: data.name,
        address: data.address || undefined,
        contractorId: selectedContractorId || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        budget: data.budget ? parseFloat(data.budget) : undefined,
        status: (data.status as ObjectStatus) || undefined,
      };

      if (isEditing && object) {
        await objectsApi.update(object.id, payload);
      } else {
        await objectsApi.create(payload);
      }

      reset();
      setSelectedContractorId('');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать объект' : 'Добавить объект'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Название объекта"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Адрес объекта"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractor">Подрядчик</Label>
            <Select
              value={selectedContractorId}
              onValueChange={setSelectedContractorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите подрядчика" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Не выбран</SelectItem>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Дата начала</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Дата окончания</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Бюджет (руб.)</Label>
              <Input
                id="budget"
                type="number"
                {...register('budget')}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select
                defaultValue={object?.status || 'PLANNED'}
                onValueChange={(value) => setValue('status', value)}
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
