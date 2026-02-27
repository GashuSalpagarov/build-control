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
import { MoneyInput } from '@/components/ui/money-input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { objectsApi, contractorsApi, usersApi } from '@/lib/api';
import { ConstructionObject, ObjectStatus, Contractor, UserWithAssignments, Role, roleLabels } from '@/lib/types';

const objectSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  address: z.string().optional(),
  contractorId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  status: z.string().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate > data.startDate;
    }
    return true;
  },
  {
    message: 'Дата окончания должна быть позже даты начала',
    path: ['endDate'],
  }
);

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
  const [selectedContractorId, setSelectedContractorId] = useState<string>('__none__');
  const [allUsers, setAllUsers] = useState<UserWithAssignments[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const isEditing = !!object;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ObjectFormData>({
    resolver: zodResolver(objectSchema),
    mode: 'onChange',
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

  const assignableRoles: { role: Role; label: string }[] = [
    { role: 'ACCOUNTANT', label: 'Бухгалтер' },
    { role: 'TECHNADZOR', label: 'Технадзор' },
    { role: 'INSPECTOR', label: 'Проверяющий' },
    { role: 'CONTRACTOR', label: 'Подрядчик' },
  ];

  useEffect(() => {
    if (open) {
      contractorsApi.getAll().then(setContractors).catch(console.error);
      setSelectedContractorId(object?.contractorId || '__none__');
      reset({
        name: object?.name || '',
        address: object?.address || '',
        contractorId: object?.contractorId || '',
        startDate: object?.startDate?.split('T')[0] || '',
        endDate: object?.endDate?.split('T')[0] || '',
        budget: object?.budget?.toString() || '',
        status: object?.status || 'PLANNED',
      });

      if (isEditing) {
        usersApi.getAll().then(setAllUsers).catch(console.error);
        const assignedIds = new Set(
          (object?.userAssignments || []).map((a) => a.userId)
        );
        setSelectedUserIds(assignedIds);
      }
    }
  }, [open, object, reset, isEditing]);

  const onSubmit = async (data: ObjectFormData) => {
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        name: data.name,
        address: data.address || undefined,
        contractorId: selectedContractorId && selectedContractorId !== '__none__' ? selectedContractorId : undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        budget: data.budget ? parseFloat(data.budget) : undefined,
        status: (data.status as ObjectStatus) || undefined,
      };

      if (isEditing && object) {
        await objectsApi.update(object.id, payload);
        try {
          await objectsApi.assignUsers(object.id, Array.from(selectedUserIds));
        } catch {
          // Ошибки назначения пользователей не блокируют сохранение
        }
      } else {
        await objectsApi.create(payload);
      }

      reset();
      setSelectedContractorId('__none__');
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                <SelectItem value="__none__">Не выбран</SelectItem>
                {contractors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
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
            {errors.endDate && (
              <p className="text-sm text-red-500">{errors.endDate.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Бюджет (руб.)</Label>
              <MoneyInput
                id="budget"
                value={watch('budget') || ''}
                onChange={(v) => setValue('budget', v)}
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

          {isEditing && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Назначенные пользователи</Label>
              {assignableRoles.map(({ role, label }) => {
                const usersForRole = allUsers.filter(
                  (u) => u.role === role && u.isActive
                );
                if (usersForRole.length === 0) return null;
                return (
                  <div key={role} className="space-y-1.5">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <div className="space-y-1 pl-1">
                      {usersForRole.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedUserIds.has(user.id)}
                            onCheckedChange={(checked) => {
                              setSelectedUserIds((prev) => {
                                const next = new Set(prev);
                                if (checked) {
                                  next.add(user.id);
                                } else {
                                  next.delete(user.id);
                                }
                                return next;
                              });
                            }}
                          />
                          <span className="text-sm">{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {allUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">Загрузка пользователей...</p>
              )}
            </div>
          )}

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
