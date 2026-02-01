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
import { stagesApi, equipmentTypesApi, plannedEquipmentApi } from '@/lib/api';
import { Stage, EquipmentType } from '@/lib/types';
import { Plus, Trash2, Clock, Lock, History, ArrowRight } from 'lucide-react';

const stageSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.string().optional(),
  plannedPeople: z.string().optional(),
});

type StageFormData = z.infer<typeof stageSchema>;

interface EquipmentEntry {
  equipmentTypeId: string;
  quantity: number;
}

interface StageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectId: string;
  stage?: Stage | null;
  onSuccess: () => void;
  objectStartDate?: string;
  objectEndDate?: string;
}

export function StageFormDialog({
  open,
  onOpenChange,
  objectId,
  stage,
  onSuccess,
  objectStartDate,
  objectEndDate,
}: StageFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([]);
  const [extensionMode, setExtensionMode] = useState(false);
  const [extendToDate, setExtendToDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');

  const isEditing = !!stage;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: stage?.name || '',
      startDate: stage?.startDate?.split('T')[0] || '',
      endDate: stage?.endDate?.split('T')[0] || '',
      budget: stage?.budget?.toString() || '',
      plannedPeople: stage?.plannedPeople?.toString() || '',
    },
  });

  useEffect(() => {
    if (open) {
      equipmentTypesApi.getAll().then(setEquipmentTypes).catch(console.error);

      if (stage?.plannedEquipment) {
        setEquipment(
          stage.plannedEquipment.map((pe) => ({
            equipmentTypeId: pe.equipmentTypeId,
            quantity: pe.quantity,
          }))
        );
      } else {
        setEquipment([]);
      }

      // Reset extension state
      setExtensionMode(false);
      setExtendToDate('');
      setExtensionReason('');

      reset({
        name: stage?.name || '',
        startDate: stage?.startDate?.split('T')[0] || '',
        endDate: stage?.endDate?.split('T')[0] || '',
        budget: stage?.budget?.toString() || '',
        plannedPeople: stage?.plannedPeople?.toString() || '',
      });
    }
  }, [open, stage, reset]);

  const addEquipment = () => {
    if (equipmentTypes.length > 0) {
      setEquipment([...equipment, { equipmentTypeId: '', quantity: 1 }]);
    }
  };

  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const updateEquipment = (index: number, field: keyof EquipmentEntry, value: string | number) => {
    const updated = [...equipment];
    if (field === 'quantity') {
      updated[index].quantity = typeof value === 'string' ? parseInt(value) || 1 : value;
    } else {
      updated[index].equipmentTypeId = value as string;
    }
    setEquipment(updated);
  };

  const onSubmit = async (data: StageFormData) => {
    setIsLoading(true);
    setError('');

    try {
      // Check if extension mode is active
      if (extensionMode) {
        if (!extendToDate) {
          setError('Укажите новую дату окончания');
          setIsLoading(false);
          return;
        }
        // Check that new date is after current end date
        const currentEndDate = stage?.endDate?.split('T')[0];
        if (currentEndDate && extendToDate <= currentEndDate) {
          setError('Новая дата должна быть позже текущей даты окончания');
          setIsLoading(false);
          return;
        }
        // Check that new date doesn't exceed object end date
        const objEndDate = objectEndDate?.split('T')[0];
        if (objEndDate && extendToDate > objEndDate) {
          setError('Новая дата не может быть позже даты окончания объекта');
          setIsLoading(false);
          return;
        }
        if (extensionReason.length < 10) {
          setError('Причина продления должна содержать минимум 10 символов');
          setIsLoading(false);
          return;
        }
      }

      let stageId = stage?.id;

      if (isEditing && stage) {
        if (extensionMode) {
          // Use extend API to track the change (only end date changes)
          await stagesApi.extendSchedule(stage.id, {
            newEndDate: extendToDate,
            reason: extensionReason,
          });

          // Update other fields separately (name, budget, etc.)
          const payload = {
            name: data.name,
            budget: data.budget ? parseFloat(data.budget) : undefined,
            plannedPeople: data.plannedPeople ? parseInt(data.plannedPeople) : undefined,
          };
          await stagesApi.update(stage.id, payload);
        } else {
          // Regular update without tracking
          const payload = {
            objectId,
            name: data.name,
            startDate: data.startDate || undefined,
            endDate: data.endDate || undefined,
            budget: data.budget ? parseFloat(data.budget) : undefined,
            plannedPeople: data.plannedPeople ? parseInt(data.plannedPeople) : undefined,
          };
          await stagesApi.update(stage.id, payload);
        }
      } else {
        const payload = {
          objectId,
          name: data.name,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          budget: data.budget ? parseFloat(data.budget) : undefined,
          plannedPeople: data.plannedPeople ? parseInt(data.plannedPeople) : undefined,
        };
        const created = await stagesApi.create(payload);
        stageId = created.id;
      }

      // Сохраняем плановую технику
      if (stageId) {
        const validEquipment = equipment.filter((e) => e.equipmentTypeId && e.quantity > 0);
        await plannedEquipmentApi.setStageEquipment(stageId, { equipment: validEquipment });
      }

      reset();
      setEquipment([]);
      setExtensionMode(false);
      setExtendToDate('');
      setExtensionReason('');
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isEditing ? 'Редактировать этап' : 'Добавить этап'}
          </DialogTitle>
        </DialogHeader>

        <form id="stage-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-2">
          <div className="space-y-2">
            <Label htmlFor="name">Название этапа *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Например: Подготовительные работы"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="grid grid-cols-2 gap-4 flex-1">
                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    Дата начала {extensionMode && <span className="text-gray-500">(исх.)</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id="startDate"
                      type="date"
                      {...register('startDate')}
                      min={objectStartDate?.split('T')[0]}
                      max={objectEndDate?.split('T')[0]}
                      disabled={extensionMode}
                      className={extensionMode ? 'bg-gray-100 pr-8' : ''}
                    />
                    {extensionMode && (
                      <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">
                    Дата окончания {extensionMode && <span className="text-gray-500">(исх.)</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      id="endDate"
                      type="date"
                      {...register('endDate')}
                      min={objectStartDate?.split('T')[0]}
                      max={objectEndDate?.split('T')[0]}
                      disabled={extensionMode}
                      className={extensionMode ? 'bg-gray-100 pr-8' : ''}
                    />
                    {extensionMode && (
                      <Lock className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              {isEditing && stage?.endDate && (
                <Button
                  type="button"
                  variant={extensionMode ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setExtensionMode(!extensionMode);
                    if (!extensionMode) {
                      setExtendToDate('');
                      setExtensionReason('');
                    }
                  }}
                  className="whitespace-nowrap mb-0.5"
                >
                  <Clock className="w-4 h-4 mr-1" />
                  {extensionMode ? 'Отменить' : 'Продлить'}
                </Button>
              )}
            </div>

            {/* Extension fields */}
            {extensionMode && (
              <div className="border-l-4 border-orange-400 pl-4 space-y-3 bg-orange-50/50 p-3 rounded-r-lg">
                <div className="text-sm font-medium text-orange-700">Продление срока</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-500">От (текущий срок)</Label>
                    <div className="px-3 py-2 bg-gray-100 rounded text-sm font-medium text-gray-700">
                      {stage?.endDate ? new Date(stage.endDate).toLocaleDateString('ru-RU') : '—'}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-orange-400 mt-5" />
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="extendToDate" className="text-xs text-gray-500">До *</Label>
                    <Input
                      id="extendToDate"
                      type="date"
                      value={extendToDate}
                      onChange={(e) => setExtendToDate(e.target.value)}
                      min={(() => {
                        if (!stage?.endDate) return undefined;
                        const nextDay = new Date(stage.endDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        return nextDay.toISOString().split('T')[0];
                      })()}
                      max={objectEndDate?.split('T')[0]}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="extensionReason" className="text-xs text-gray-500">Причина *</Label>
                  <Textarea
                    id="extensionReason"
                    value={extensionReason}
                    onChange={(e) => setExtensionReason(e.target.value)}
                    placeholder="Укажите причину продления (минимум 10 символов)"
                    rows={2}
                    className="text-sm"
                  />
                  {extensionReason.length > 0 && extensionReason.length < 10 && (
                    <p className="text-xs text-red-500">
                      Ещё {10 - extensionReason.length} символов
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Schedule change history */}
            {isEditing && stage?.scheduleChanges && stage.scheduleChanges.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
                  <History className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    История продлений ({stage.scheduleChanges.length})
                  </span>
                </div>
                <div className="max-h-[150px] overflow-y-auto">
                  {stage.scheduleChanges
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((change, index) => {
                      const formatDateStr = (d: string | null) =>
                        d ? new Date(d).toLocaleDateString('ru-RU') : '—';
                      const formatDateTime = (d: string) =>
                        new Date(d).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        });

                      // Calculate days added
                      let daysAdded = 0;
                      if (change.oldEndDate && change.newEndDate) {
                        daysAdded = Math.ceil(
                          (new Date(change.newEndDate).getTime() - new Date(change.oldEndDate).getTime()) / (1000 * 60 * 60 * 24)
                        );
                      }

                      return (
                        <div
                          key={change.id}
                          className={`px-3 py-2 text-xs ${index > 0 ? 'border-t' : ''} hover:bg-gray-50`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">{formatDateTime(change.createdAt)}</span>
                              <span className="text-gray-400">•</span>
                              <span className="font-medium text-gray-700">{change.user?.name || 'Система'}</span>
                            </div>
                            {daysAdded > 0 && (
                              <span className="text-orange-600 font-medium">+{daysAdded} дн.</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <span>{formatDateStr(change.oldEndDate)}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="font-medium text-green-600">{formatDateStr(change.newEndDate)}</span>
                          </div>
                          <div className="mt-1 text-gray-500 truncate" title={change.reason}>
                            {change.reason}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
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
              <Label htmlFor="plannedPeople">План. кол-во людей</Label>
              <Input
                id="plannedPeople"
                type="number"
                {...register('plannedPeople')}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Плановая техника</Label>
              <Button type="button" variant="outline" size="sm" onClick={addEquipment}>
                <Plus className="w-4 h-4 mr-1" />
                Добавить
              </Button>
            </div>
            {equipment.length === 0 ? (
              <p className="text-sm text-gray-500">Техника не добавлена</p>
            ) : (
              <div className="space-y-2">
                {equipment.map((entry, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={entry.equipmentTypeId}
                      onValueChange={(value) => updateEquipment(index, 'equipmentTypeId', value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Выберите тип техники" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={entry.quantity}
                      onChange={(e) => updateEquipment(index, 'quantity', e.target.value)}
                      className="w-20"
                      placeholder="Кол-во"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEquipment(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </form>

        {error && (
          <div className="text-sm text-red-500 text-center flex-shrink-0">{error}</div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={isLoading} form="stage-form">
            {isLoading ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
