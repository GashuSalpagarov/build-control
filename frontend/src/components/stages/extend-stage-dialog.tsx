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
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { stagesApi } from '@/lib/api';
import { Stage } from '@/lib/types';
import { AlertTriangle, Calendar } from 'lucide-react';

const extendSchema = z.object({
  newStartDate: z.string().optional(),
  newEndDate: z.string().min(1, 'Новая дата окончания обязательна'),
  reason: z.string().min(10, 'Причина должна содержать минимум 10 символов'),
});

type ExtendFormData = z.infer<typeof extendSchema>;

interface ExtendStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: Stage | null;
  onSuccess: () => void;
  objectEndDate?: string;
}

export function ExtendStageDialog({
  open,
  onOpenChange,
  stage,
  onSuccess,
  objectEndDate,
}: ExtendStageDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ExtendFormData>({
    resolver: zodResolver(extendSchema),
    defaultValues: {
      newStartDate: '',
      newEndDate: '',
      reason: '',
    },
  });

  const newEndDate = watch('newEndDate');

  useEffect(() => {
    if (open && stage) {
      reset({
        newStartDate: stage.startDate?.split('T')[0] || '',
        newEndDate: stage.endDate?.split('T')[0] || '',
        reason: '',
      });
    }
  }, [open, stage, reset]);

  const onSubmit = async (data: ExtendFormData) => {
    if (!stage) return;

    setIsLoading(true);
    setError('');

    try {
      await stagesApi.extendSchedule(stage.id, {
        newStartDate: data.newStartDate || undefined,
        newEndDate: data.newEndDate,
        reason: data.reason,
      });

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'не указана';
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  // Calculate extension days
  const currentEndDate = stage?.endDate ? new Date(stage.endDate) : null;
  const newEnd = newEndDate ? new Date(newEndDate) : null;
  const extensionDays = currentEndDate && newEnd
    ? Math.ceil((newEnd.getTime() - currentEndDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Продление сроков этапа
          </DialogTitle>
          <DialogDescription>
            {stage?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Current dates info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Текущие сроки:</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Начало:</span>{' '}
              <span className="font-medium">{formatDate(stage?.startDate)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Окончание:</span>{' '}
              <span className="font-medium">{formatDate(stage?.endDate)}</span>
            </div>
            {stage?.scheduleChanges && stage.scheduleChanges.length > 0 && (
              <div className="text-xs text-orange-600 mt-2">
                Сроки уже продлевались {stage.scheduleChanges.length} раз(а)
              </div>
            )}
          </div>

          {/* New dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newStartDate">Новая дата начала</Label>
              <Input
                id="newStartDate"
                type="date"
                {...register('newStartDate')}
              />
              <p className="text-xs text-gray-500">Оставьте без изменений, если не нужно менять</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEndDate">Новая дата окончания *</Label>
              <Input
                id="newEndDate"
                type="date"
                {...register('newEndDate')}
                max={objectEndDate?.split('T')[0]}
              />
              {errors.newEndDate && (
                <p className="text-sm text-red-500">{errors.newEndDate.message}</p>
              )}
            </div>
          </div>

          {/* Extension indicator */}
          {extensionDays !== 0 && (
            <div className={`text-sm p-2 rounded ${
              extensionDays > 0
                ? 'bg-orange-50 text-orange-700'
                : 'bg-green-50 text-green-700'
            }`}>
              {extensionDays > 0
                ? `Продление на ${extensionDays} дн.`
                : `Сокращение на ${Math.abs(extensionDays)} дн.`}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Причина изменения сроков *</Label>
            <Textarea
              id="reason"
              {...register('reason')}
              placeholder="Укажите причину изменения сроков (минимум 10 символов)"
              rows={3}
            />
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message}</p>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              Изменение будет записано в историю. Все изменения сроков отслеживаются и доступны для просмотра.
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
              {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
