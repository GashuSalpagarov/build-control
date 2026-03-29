'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { stagesApi, resourceChecksApi } from '@/lib/api';
import { ConstructionObject, Stage, ResourceCheck } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

const resourceCheckSchema = z.object({
  actualPeople: z.string().min(1, 'Укажите количество рабочих'),
  comment: z.string().optional(),
});

type ResourceCheckFormData = z.infer<typeof resourceCheckSchema>;

interface EquipmentEntry {
  equipmentTypeId: string;
  equipmentTypeName: string;
  quantity: number;
  plannedQuantity: number;
}

interface ResourceCheckFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objects: ConstructionObject[];
  existingCheck?: ResourceCheck | null;
  onSuccess: () => void;
}

export function ResourceCheckFormDialog(props: ResourceCheckFormDialogProps) {
  const {
    open,
    onOpenChange,
    objects,
    existingCheck,
    onSuccess,
  } = props;
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [objectId, setObjectId] = useState<string>('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [stageId, setStageId] = useState<string>('');
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([]);

  const isEditing = !!existingCheck;

  // Дата всегда текущая
  const today = new Date().toISOString().split('T')[0];
  const date = isEditing ? existingCheck.date.split('T')[0] : today;

  // Живое время для новой проверки
  const [currentTime, setCurrentTime] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open && !isEditing) {
      setCurrentTime(new Date());
      intervalRef.current = setInterval(() => setCurrentTime(new Date()), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, isEditing]);

  // Можно редактировать только сегодняшнюю проверку и только свою
  const isOwnCheck = !existingCheck || existingCheck.userId === currentUser?.id;
  const canEdit = date === today && isOwnCheck;

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

  // Загрузка этапов при смене объекта
  const loadStages = useCallback(async (objId: string) => {
    if (!objId) {
      setStages([]);
      return;
    }
    setStagesLoading(true);
    try {
      const data = await stagesApi.getByObject(objId);
      setStages(data);
    } catch (err) {
      console.error('Error loading stages:', err);
      setStages([]);
    } finally {
      setStagesLoading(false);
    }
  }, []);

  // При открытии диалога — инициализация
  useEffect(() => {
    if (open) {
      if (isEditing && existingCheck) {
        const editObjectId = existingCheck.stage.objectId || '';
        setObjectId(editObjectId);
        setStageId(existingCheck.stageId);
        if (editObjectId) {
          loadStages(editObjectId);
        }
      } else {
        setObjectId('');
        setStages([]);
        setStageId('');
        setEquipment([]);
      }
      reset({
        actualPeople: existingCheck?.actualPeople?.toString() || '',
        comment: existingCheck?.comment || '',
      });
      setError('');
    }
  }, [open, existingCheck, isEditing, reset, loadStages]);

  // При смене объекта (не при редактировании)
  const handleObjectChange = (newObjectId: string) => {
    setObjectId(newObjectId);
    setStageId('');
    setEquipment([]);
    loadStages(newObjectId);
  };

  // Загружаем плановую технику при смене этапа
  useEffect(() => {
    if (stageId && open) {
      const stage = stages.find((s) => s.id === stageId);
      if (stage?.plannedEquipment) {
        const equipmentList = stage.plannedEquipment.map((pe) => ({
          equipmentTypeId: pe.equipmentTypeId,
          equipmentTypeName: pe.equipmentType.name,
          quantity: 0,
          plannedQuantity: pe.quantity,
        }));

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

  const updateEquipmentQuantity = (index: number, quantity: number) => {
    const updated = [...equipment];
    updated[index].quantity = quantity;
    setEquipment(updated);
  };

  const onSubmit = async (data: ResourceCheckFormData) => {
    if (!objectId) {
      setError('Выберите объект');
      return;
    }
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

  const selectedStage = stages.find((s) => s.id === stageId);

  // Фильтруем этапы по дате
  const availableStages = stages.filter((stage) => {
    if (!stage.startDate || !stage.endDate) return true;
    const stageStart = new Date(stage.startDate);
    const stageEnd = new Date(stage.endDate);
    const checkDate = new Date(date);
    return checkDate >= stageStart && checkDate <= stageEnd;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Редактировать проверку' : 'Ежедневная проверка'}
          </DialogTitle>
        </DialogHeader>

        {isEditing && !canEdit && (
          <p className="text-sm text-amber-600">
            {!isOwnCheck
              ? 'Можно редактировать только свои проверки'
              : 'Можно редактировать только сегодняшнюю проверку'}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 gap-4">
          <div className="overflow-y-auto space-y-4 px-1">
          {/* Дата и время */}
          <div className="space-y-2">
            <Label>Дата и время проверки</Label>
            <div className="text-sm px-3 py-2 border rounded-md bg-muted">
              {isEditing && existingCheck.checkedAt
                ? new Date(existingCheck.checkedAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : currentTime.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
            </div>
          </div>

          {/* Объект */}
          <div className="space-y-2">
            <Label htmlFor="object">Объект *</Label>
            {isEditing ? (
              <div className="text-sm px-3 py-2 border rounded-md bg-muted">
                {existingCheck.stage.object?.name || '—'}
              </div>
            ) : (
              <Select
                value={objectId}
                onValueChange={handleObjectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите объект" />
                </SelectTrigger>
                <SelectContent>
                  {objects.map((obj) => (
                    <SelectItem key={obj.id} value={obj.id}>
                      {obj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Этап */}
          {objectId && (
            <div className="space-y-2">
              <Label htmlFor="stage">Этап *</Label>
              {isEditing ? (
                <div className="text-sm px-3 py-2 border rounded-md bg-muted">
                  {existingCheck.stage.name}
                </div>
              ) : (
                <Select
                  value={stageId}
                  onValueChange={setStageId}
                  disabled={stagesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={stagesLoading ? 'Загрузка...' : 'Выберите этап'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Ресурсы: люди + техника */}
          {stageId && (
            <div className="space-y-4">
              {/* Люди */}
              <div className="space-y-2">
                <Label>
                  Люди
                  {selectedStage?.plannedPeople != null && (
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (план: {selectedStage.plannedPeople})
                    </span>
                  )}
                </Label>
                {isEditing && !canEdit ? (
                  <div className="text-sm px-3 py-2 border rounded-md bg-muted">
                    {existingCheck.actualPeople ?? 0} чел.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        id="actualPeople"
                        type="number"
                        min="0"
                        {...register('actualPeople')}
                        placeholder="0"
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">чел.</span>
                    </div>
                    {errors.actualPeople && (
                      <p className="text-sm text-red-500">{errors.actualPeople.message}</p>
                    )}
                  </>
                )}
              </div>

              {/* Техника */}
              {equipment.map((entry, index) => (
                <div key={entry.equipmentTypeId} className="space-y-2">
                  <Label>
                    {entry.equipmentTypeName}
                    {entry.plannedQuantity > 0 && (
                      <span className="text-xs text-muted-foreground font-normal ml-1">
                        (план: {entry.plannedQuantity})
                      </span>
                    )}
                  </Label>
                  {isEditing && !canEdit ? (
                    <div className="text-sm px-3 py-2 border rounded-md bg-muted">
                      {entry.quantity} шт.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={entry.quantity}
                        onChange={(e) =>
                          updateEquipmentQuantity(index, parseInt(e.target.value) || 0)
                        }
                        className="w-24"
                        placeholder="0"
                      />
                      <span className="text-sm text-muted-foreground">шт.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Комментарий */}
          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            {isEditing && !canEdit ? (
              <div className="text-sm px-3 py-2 border rounded-md bg-muted min-h-[60px]">
                {existingCheck.comment || '—'}
              </div>
            ) : (
              <Textarea
                id="comment"
                {...register('comment')}
                placeholder="Дополнительная информация..."
                rows={3}
              />
            )}
          </div>

          </div>

          {error && (
            <div className="text-sm text-red-500 text-center">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
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
