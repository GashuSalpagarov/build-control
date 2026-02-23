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
import { usersApi } from '@/lib/api';
import { UserWithAssignments, Role, roleLabels } from '@/lib/types';

const userSchema = z.object({
  name: z.string().min(1, 'Имя обязательно'),
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Минимум 6 символов').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().min(1, 'Роль обязательна'),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserWithAssignments | null;
  onSuccess: () => void;
  onCreated?: (user: UserWithAssignments) => void;
}

const roles: Role[] = ['MINISTER', 'TECHNADZOR', 'ACCOUNTANT', 'INSPECTOR', 'CONTRACTOR', 'GOVERNMENT'];

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
  onCreated,
}: UserFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      phone: user?.phone || '',
      role: user?.role || 'INSPECTOR',
    },
  });

  const selectedRole = watch('role');

  useEffect(() => {
    if (open) {
      reset({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        phone: user?.phone || '',
        role: user?.role || 'INSPECTOR',
      });
    }
  }, [open, user, reset]);

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    setError('');

    try {
      if (isEditing && user) {
        const updateData: Record<string, unknown> = {
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          role: data.role,
        };
        if (data.password) {
          updateData.password = data.password;
        }
        await usersApi.update(user.id, updateData);
      } else {
        if (!data.password) {
          setError('Пароль обязателен для нового пользователя');
          setIsLoading(false);
          return;
        }
        const created = await usersApi.create({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone || undefined,
          role: data.role,
        });
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
            {isEditing ? 'Редактировать пользователя' : 'Добавить пользователя'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Иванов Иван Иванович"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEditing ? 'Новый пароль (оставьте пустым)' : 'Пароль *'}
            </Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="******"
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
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
            <Label htmlFor="role">Роль *</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
