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
import { stagesApi, equipmentTypesApi, plannedEquipmentApi } from '@/lib/api';
import { Stage, EquipmentType, PlannedEquipment } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';

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
}

export function StageFormDialog({
  open,
  onOpenChange,
  objectId,
  stage,
  onSuccess,
}: StageFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [equipment, setEquipment] = useState<EquipmentEntry[]>([]);

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
      const payload = {
        objectId,
        name: data.name,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        budget: data.budget ? parseFloat(data.budget) : undefined,
        plannedPeople: data.plannedPeople ? parseInt(data.plannedPeople) : undefined,
      };

      let stageId = stage?.id;

      if (isEditing && stage) {
        await stagesApi.update(stage.id, payload);
      } else {
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
            {isEditing ? 'Редактировать этап' : 'Добавить этап'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
