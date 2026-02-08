'use client';

import { forwardRef, useImperativeHandle, useState, useEffect, Dispatch } from 'react';
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
import { Card } from '@/components/ui/card';
import { equipmentTypesApi } from '@/lib/api';
import { EquipmentType } from '@/lib/types';
import { WizardStageData, WizardObjectData } from './wizard-types';
import { Plus, Trash2, Pencil, Wrench, Check, X } from 'lucide-react';

const CREATE_NEW_VALUE = '__create_new__';

function EquipmentSection({
  equipment,
  equipmentTypes,
  onAdd,
  onRemove,
  onUpdate,
  onCreateType,
}: {
  equipment: { equipmentTypeId: string; quantity: number }[];
  equipmentTypes: EquipmentType[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: any) => void;
  onCreateType: (name: string) => Promise<EquipmentType>;
}) {
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectChange = (index: number, value: string) => {
    if (value === CREATE_NEW_VALUE) {
      setCreatingIndex(index);
      setNewTypeName('');
    } else {
      onUpdate(index, 'equipmentTypeId', value);
    }
  };

  const handleCreateType = async (index: number) => {
    if (!newTypeName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const created = await onCreateType(newTypeName.trim());
      onUpdate(index, 'equipmentTypeId', created.id);
      setCreatingIndex(null);
      setNewTypeName('');
    } catch {
      // keep the input open on error
    } finally {
      setIsSaving(false);
    }
  };

  const cancelCreate = () => {
    setCreatingIndex(null);
    setNewTypeName('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Техника</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} className="h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" />
          Добавить
        </Button>
      </div>
      {equipment.length === 0 ? (
        <p className="text-xs text-muted-foreground">Техника не добавлена</p>
      ) : (
        <div className="space-y-2">
          {equipment.map((entry, index) => (
            <div key={index} className="flex gap-2 items-center">
              {creatingIndex === index ? (
                <div className="flex-1 flex gap-1.5 items-center">
                  <Input
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="Название техники..."
                    className="text-sm h-8 flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateType(index);
                      }
                      if (e.key === 'Escape') cancelCreate();
                    }}
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleCreateType(index)}
                    disabled={!newTypeName.trim() || isSaving}
                  >
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={cancelCreate}
                    disabled={isSaving}
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <Select
                  value={entry.equipmentTypeId}
                  onValueChange={(value) => handleSelectChange(index, value)}
                >
                  <SelectTrigger className="flex-1 text-sm h-8">
                    <SelectValue placeholder="Тип техники" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={CREATE_NEW_VALUE} className="text-primary font-medium">
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" />
                        Создать новый тип
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Input
                type="number"
                min="1"
                value={entry.quantity}
                onChange={(e) => onUpdate(index, 'quantity', e.target.value)}
                className="w-16 text-sm h-8"
                placeholder="Кол"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  if (creatingIndex === index) cancelCreate();
                  onRemove(index);
                }}
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface WizardStepStagesRef {
  validate: () => Promise<boolean>;
}

interface WizardStepStagesProps {
  stages: WizardStageData[];
  objectData: WizardObjectData;
  dispatch: Dispatch<any>;
}

function StageCard({
  stage,
  objectData,
  equipmentTypes,
  onUpdate,
  onRemove,
  onCreateEquipmentType,
}: {
  stage: WizardStageData;
  objectData: WizardObjectData;
  equipmentTypes: EquipmentType[];
  onUpdate: (data: Partial<WizardStageData>) => void;
  onRemove: () => void;
  onCreateEquipmentType: (name: string) => Promise<EquipmentType>;
}) {
  const [localData, setLocalData] = useState({
    name: stage.name,
    startDate: stage.startDate,
    endDate: stage.endDate,
    budget: stage.budget,
    plannedPeople: stage.plannedPeople,
    equipment: stage.equipment,
  });

  const updateLocal = (field: string, value: any) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
  };

  const addEquipment = () => {
    setLocalData((prev) => ({
      ...prev,
      equipment: [...prev.equipment, { equipmentTypeId: '', quantity: 1 }],
    }));
  };

  const removeEquipment = (index: number) => {
    setLocalData((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((_, i) => i !== index),
    }));
  };

  const updateEquipment = (index: number, field: string, value: any) => {
    setLocalData((prev) => ({
      ...prev,
      equipment: prev.equipment.map((e, i) =>
        i === index ? { ...e, [field]: field === 'quantity' ? (parseInt(value) || 1) : value } : e
      ),
    }));
  };

  const saveStage = () => {
    if (!localData.name.trim()) return;
    onUpdate({
      ...localData,
      isEditing: false,
    });
  };

  const cancelEdit = () => {
    if (!stage.name) {
      // New stage that was never saved — remove it
      onRemove();
    } else {
      // Restore from saved data
      setLocalData({
        name: stage.name,
        startDate: stage.startDate,
        endDate: stage.endDate,
        budget: stage.budget,
        plannedPeople: stage.plannedPeople,
        equipment: stage.equipment,
      });
      onUpdate({ isEditing: false });
    }
  };

  if (!stage.isEditing) {
    // Collapsed view
    return (
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{stage.name}</div>
            <div className="text-xs text-gray-500 flex gap-3 mt-1">
              {stage.startDate && (
                <span>{stage.startDate} — {stage.endDate || '...'}</span>
              )}
              {stage.budget && <span>{Number(stage.budget).toLocaleString('ru-RU')} руб.</span>}
              {stage.equipment.length > 0 && (
                <span className="flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  {stage.equipment.length}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onUpdate({ isEditing: true })}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Expanded editing view
  return (
    <Card className="p-4 border-primary/30 bg-primary/5">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Название *</Label>
          <Input
            value={localData.name}
            onChange={(e) => updateLocal('name', e.target.value)}
            placeholder="Например: Подготовительные работы"
            className="text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Дата начала</Label>
            <Input
              type="date"
              value={localData.startDate}
              onChange={(e) => updateLocal('startDate', e.target.value)}
              min={objectData.startDate || undefined}
              max={objectData.endDate || undefined}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Дата окончания</Label>
            <Input
              type="date"
              value={localData.endDate}
              onChange={(e) => updateLocal('endDate', e.target.value)}
              min={objectData.startDate || undefined}
              max={objectData.endDate || undefined}
              className="text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Бюджет (руб.)</Label>
            <Input
              type="number"
              value={localData.budget}
              onChange={(e) => updateLocal('budget', e.target.value)}
              placeholder="0"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">План. людей</Label>
            <Input
              type="number"
              value={localData.plannedPeople}
              onChange={(e) => updateLocal('plannedPeople', e.target.value)}
              placeholder="0"
              className="text-sm"
            />
          </div>
        </div>

        {/* Equipment section */}
        <EquipmentSection
          equipment={localData.equipment}
          equipmentTypes={equipmentTypes}
          onAdd={addEquipment}
          onRemove={removeEquipment}
          onUpdate={updateEquipment}
          onCreateType={onCreateEquipmentType}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
            Отмена
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={saveStage}
            disabled={!localData.name.trim()}
          >
            Сохранить
          </Button>
        </div>
      </div>
    </Card>
  );
}

export const WizardStepStages = forwardRef<WizardStepStagesRef, WizardStepStagesProps>(
  function WizardStepStages({ stages, objectData, dispatch }, ref) {
    const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
    const [error, setError] = useState('');

    const loadEquipmentTypes = () => {
      equipmentTypesApi.getAll().then(setEquipmentTypes).catch(console.error);
    };

    useEffect(() => {
      loadEquipmentTypes();
    }, []);

    const handleCreateEquipmentType = async (name: string): Promise<EquipmentType> => {
      const created = await equipmentTypesApi.create(name);
      setEquipmentTypes((prev) => [...prev, created]);
      return created;
    };

    useImperativeHandle(ref, () => ({
      validate: async () => {
        setError('');
        if (stages.length === 0) {
          setError('Добавьте хотя бы один этап');
          return false;
        }
        const hasUnsaved = stages.some((s) => s.isEditing);
        if (hasUnsaved) {
          setError('Сохраните все этапы перед продолжением');
          return false;
        }
        return true;
      },
    }));

    const addStage = () => {
      dispatch({
        type: 'ADD_STAGE',
        stage: {
          tempId: crypto.randomUUID(),
          name: '',
          startDate: objectData.startDate || '',
          endDate: objectData.endDate || '',
          budget: '',
          plannedPeople: '',
          equipment: [],
          isEditing: true,
        },
      });
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {stages.length === 0
              ? 'Добавьте этапы работ для объекта'
              : `Этапов: ${stages.length}`}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addStage}>
            <Plus className="w-4 h-4 mr-1" />
            Добавить этап
          </Button>
        </div>

        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {stages.map((stage) => (
            <StageCard
              key={stage.tempId}
              stage={stage}
              objectData={objectData}
              equipmentTypes={equipmentTypes}
              onUpdate={(data) =>
                dispatch({ type: 'UPDATE_STAGE', tempId: stage.tempId, data })
              }
              onRemove={() =>
                dispatch({ type: 'REMOVE_STAGE', tempId: stage.tempId })
              }
              onCreateEquipmentType={handleCreateEquipmentType}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}
      </div>
    );
  }
);
