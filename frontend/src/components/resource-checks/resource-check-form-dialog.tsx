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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { resourceChecksApi } from '@/lib/api';
import { Stage, ResourceCheck } from '@/lib/types';

const resourceCheckSchema = z.object({
  actualPeople: z.string().min(1, 'Укажите количество рабочих'),
  comment: z.string().optional(),
});

type ResourceCheckFormData = z.infer<typeof resourceCheckSchema>;

interface EquipmentEntry {
  equipmentTypeId: string;
  equipmentTypeName: string;
  quantity: number;
}

interface ResourceCheckFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  stages: Stage[];
  selectedStageId?: string;
  selectedDate?: string;
  existingCheck?: ResourceCheck | null;
  onSuccess: () => void;
}

export function ResourceCheckFormDialog(props: ResourceCheckFormDialogProps) {
  const {
    open,
    onOpenChange,
    stages,
    selectedStageId,
    selectedDate,
    existingCheck,
    onSuccess,
  } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [stageId, setStageId] = useState<string>(selectedStageId || '');
  const [date, setDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([]);

  const isEditing = !!existingCheck;

  // Проверяем, можно ли редактировать (только сегодня)
  const today = new Date().toISOString().split('T')[0];
  const canEdit = date === today;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResourceCheckFormData>({
    resolver: zodResolver(resourceCheckSchema),
    defaultValues: {
      actualPeople: existingCheck?.actualPeople?.toString() || '',
      comment: existingCheck?.comment || '',
    },
  });

  // Загружаем плановую технику при смене этапа
  useEffect(() => {
    if (stageId && open) {
      const stage = stages.find((s) => s.id === stageId);
      if (stage?.plannedEquipment) {
        // Инициализируем список техники из плана этапа
        // ВАЖНО: не показываем плановое количество!
        const equipmentList = stage.plannedEquipment.map((pe) => ({
          equipmentTypeId: pe.equipmentTypeId,
          equipmentTypeName: pe.equipmentType.name,
          quantity: 0, // Факт по умолчанию 0
        }));

        // Если редактируем, заполняем фактические значения
        if (existingCheck?.equipmentChecks) {
          equipmentList.forEach((eq) => {
            const existing = existingCheck.equipmentChecks.find(
              (ec) => ec.equipmentTypeId === eq.equipmentTypeId
            );
            if (existing) {
              eq.quantity = existing.quantity;
            }
          });
        }

        setEquipment(equipmentList);
      } else {
        setEquipment([]);
      }
    }
  }, [stageId, stages, existingCheck, open]);

  useEffect(() => {
    if (open) {
      setStageId(selectedStageId || existingCheck?.stageId || '');
      setDate(selectedDate || existingCheck?.date?.split('T')[0] || today);
      reset({
        actualPeople: existingCheck?.actualPeople?.toString() || '',
        comment: existingCheck?.comment || '',
      });
    }
  }, [open, selectedStageId, selectedDate, existingCheck, reset, today]);

  const updateEquipmentQuantity = (index: number, quantity: number) => {
    const updated = [...equipment];
    updated[index].quantity = quantity;
    setEquipment(updated);
  };

  const onSubmit = async (data: ResourceCheckFormData) => {
    if (!stageId) {
      setError('Выберите этап');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload = {
        stageId,
        date,
        actualPeople: parseInt(data.actualPeople),
        comment: data.comment || undefined,
        equipmentChecks: equipment
          .filter((e) => e.quantity > 0)
          .map((e) => ({
            equipmentTypeId: e.equipmentTypeId,
            quantity: e.quantity,
          })),
      };

      if (isEditing && existingCheck) {
        await resourceChecksApi.update(existingCheck.id, {
          actualPeople: payload.actualPeople,
          comment: payload.comment,
          equipmentChecks: payload.equipmentChecks,
        });
      } else {
        await resourceChecksApi.create(payload);
      }

      reset();
      setEquipment([]);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setIsLoading(false);
    }
  };

  // Фильтруем этапы по дате (только те, у которых startDate <= date <= endDate)
  const availableStages = stages.filter((stage) => {
    if (!stage.startDate || !stage.endDate) return true;
    const stageStart = new Date(stage.startDate);
    const stageEnd = new Date(stage.endDate);
    const checkDate = new Date(date);
    return checkDate >= stageStart && checkDate <= stageEnd;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать проверку' : 'Ежедневная проверка'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Дата */}
          <div className="space-y-2">
            <Label htmlFor="date">Дата проверки</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
              disabled={isEditing}
            />
            {!canEdit && isEditing && (
              <p className="text-sm text-amber-600">
                Можно редактировать только сегодняшнюю проверку
              </p>
            )}
          </div>

          {/* Этап */}
          <div className="space-y-2">
            <Label htmlFor="stage">Этап *</Label>
            <Select
              value={stageId}
              onValueChange={setStageId}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите этап" />
              </SelectTrigger>
              <SelectContent>
                {availableStages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Количество рабочих */}
          <div className="space-y-2">
            <Label htmlFor="actualPeople">Количество рабочих *</Label>
            <Input
              id="actualPeople"
              type="number"
              min="0"
              {...register('actualPeople')}
              placeholder="0"
              disabled={!canEdit && isEditing}
            />
            {errors.actualPeople && (
              <p className="text-sm text-red-500">{errors.actualPeople.message}</p>
            )}
          </div>

          {/* Техника */}
          {equipment.length > 0 && (
            <div className="space-y-2">
              <Label>Техника на объекте</Label>
              <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                {equipment.map((entry, index) => (
                  <div key={entry.equipmentTypeId} className="flex items-center gap-3">
                    <span className="flex-1 text-sm">{entry.equipmentTypeName}</span>
                    <Input
                      type="number"
                      min="0"
                      value={entry.quantity}
                      onChange={(e) =>
                        updateEquipmentQuantity(index, parseInt(e.target.value) || 0)
                      }
                      className="w-20"
                      placeholder="0"
                      disabled={!canEdit && isEditing}
                    />
                    <span className="text-sm text-gray-500">шт.</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Укажите фактическое количество техники на объекте
              </p>
            </div>
          )}

          {/* Комментарий */}
          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              {...register('comment')}
              placeholder="Дополнительная информация..."
              rows={3}
              disabled={!canEdit && isEditing}
            />
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
            <Button
              type="submit"
              disabled={isLoading || (!canEdit && isEditing)}
            >
              {isLoading ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
