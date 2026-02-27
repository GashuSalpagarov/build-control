'use client';

import { forwardRef, useImperativeHandle, useRef, useState, useEffect, Dispatch, MutableRefObject } from 'react';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { EquipmentTypeFormDialog } from '@/components/equipment-types/equipment-type-form-dialog';
import { formatCurrency } from '@/lib/format';
import { Plus, Trash2, Pencil, Wrench } from 'lucide-react';

const CREATE_NEW_VALUE = '__create_new__';

function calcDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} дня`;
  return `${n} дней`;
}

function EquipmentSection({
  equipment,
  equipmentTypes,
  onAdd,
  onRemove,
  onUpdate,
  onOpenCreateDialog,
}: {
  equipment: { equipmentTypeId: string; quantity: number }[];
  equipmentTypes: EquipmentType[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: string, value: any) => void;
  onOpenCreateDialog: (index: number) => void;
}) {
  const handleSelectChange = (index: number, value: string) => {
    if (value === CREATE_NEW_VALUE) {
      onOpenCreateDialog(index);
    } else {
      onUpdate(index, 'equipmentTypeId', value);
    }
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
                onClick={() => onRemove(index)}
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

/* ── Stage Dialog (create / edit) ─────────────────────────── */

function WizardStageDialog({
  open,
  onOpenChange,
  stage,
  objectData,
  equipmentTypes,
  onSave,
  onOpenCreateEqDialog,
  assignRef,
  allocatedBudget,
  totalBudget,
  defaultStartDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: WizardStageData | null;
  objectData: WizardObjectData;
  equipmentTypes: EquipmentType[];
  onSave: (data: WizardStageData) => void;
  onOpenCreateEqDialog: (equipmentIndex: number) => void;
  assignRef: MutableRefObject<((index: number, typeId: string) => void) | null>;
  allocatedBudget: number;
  totalBudget: number;
  defaultStartDate: string;
}) {
  const [localData, setLocalData] = useState({
    name: '',
    startDate: objectData.startDate || '',
    endDate: objectData.endDate || '',
    budget: '',
    plannedPeople: '',
    equipment: [] as { equipmentTypeId: string; quantity: number }[],
  });
  const [dateError, setDateError] = useState('');

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setDateError('');
      if (stage) {
        setLocalData({
          name: stage.name,
          startDate: stage.startDate,
          endDate: stage.endDate,
          budget: stage.budget,
          plannedPeople: stage.plannedPeople,
          equipment: stage.equipment.map((e) => ({ ...e })),
        });
      } else {
        setLocalData({
          name: '',
          startDate: defaultStartDate,
          endDate: objectData.endDate || '',
          budget: '',
          plannedPeople: '',
          equipment: [],
        });
      }
    }
  }, [open, stage, defaultStartDate, objectData.endDate]);

  const updateLocal = (field: string, value: any) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
    if (field === 'startDate' || field === 'endDate') {
      setDateError('');
    }
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

  // Called from parent after an equipment type is created
  const assignEquipmentType = (equipmentIndex: number, typeId: string) => {
    setLocalData((prev) => ({
      ...prev,
      equipment: prev.equipment.map((e, i) =>
        i === equipmentIndex ? { ...e, equipmentTypeId: typeId } : e
      ),
    }));
  };

  const currentStageBudget = Number(localData.budget) || 0;
  const remaining = totalBudget - allocatedBudget - currentStageBudget;
  const budgetExceeded = totalBudget > 0 && remaining < 0;

  const handleSave = () => {
    if (!localData.name.trim()) return;
    if (budgetExceeded) return;
    if (localData.startDate && localData.endDate && localData.endDate <= localData.startDate) {
      setDateError('Дата окончания должна быть позже даты начала');
      return;
    }
    setDateError('');
    onSave({
      tempId: stage?.tempId ?? crypto.randomUUID(),
      ...localData,
    });
    onOpenChange(false);
  };

  // Expose assignEquipmentType so parent can call it after equipment type creation
  assignRef.current = assignEquipmentType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stage ? 'Редактирование этапа' : 'Новый этап'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <Label className="text-xs">Название *</Label>
            <Input
              value={localData.name}
              onChange={(e) => updateLocal('name', e.target.value)}
              placeholder="Например: Подготовительные работы"
              className="text-sm"
              autoFocus
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
          {dateError && (
            <p className="text-xs text-red-500">{dateError}</p>
          )}
          {calcDays(localData.startDate, localData.endDate) !== null && (
            <p className="text-xs text-muted-foreground">
              Длительность: {pluralDays(calcDays(localData.startDate, localData.endDate)!)}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Бюджет (руб.)</Label>
              <MoneyInput
                value={localData.budget}
                onChange={(v) => updateLocal('budget', v)}
                placeholder="0"
                className="text-sm"
              />
              {totalBudget > 0 && (
                budgetExceeded ? (
                  <p className="text-xs text-red-500">
                    Превышает остаток на {formatCurrency(Math.abs(remaining))}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Доступно: {formatCurrency(remaining)}
                  </p>
                )
              )}
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

          <EquipmentSection
            equipment={localData.equipment}
            equipmentTypes={equipmentTypes}
            onAdd={addEquipment}
            onRemove={removeEquipment}
            onUpdate={updateEquipment}
            onOpenCreateDialog={onOpenCreateEqDialog}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!localData.name.trim() || budgetExceeded}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Stage Card (collapsed view only) ─────────────────────── */

function StageCard({
  stage,
  onEdit,
  onRemove,
}: {
  stage: WizardStageData;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{stage.name}</div>
          <div className="text-xs text-gray-500 flex gap-3 mt-1">
            {stage.startDate && (
              <span>
                {stage.startDate} — {stage.endDate || '...'}
                {calcDays(stage.startDate, stage.endDate) !== null && ` (${pluralDays(calcDays(stage.startDate, stage.endDate)!)})`}
              </span>
            )}
            {stage.budget && <span>{formatCurrency(Number(stage.budget))}</span>}
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
            onClick={onEdit}
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

function hasOverlappingStages(stages: WizardStageData[]): boolean {
  const dated = stages.filter((s) => s.startDate && s.endDate);
  for (let i = 0; i < dated.length; i++) {
    for (let j = i + 1; j < dated.length; j++) {
      if (dated[i].startDate < dated[j].endDate && dated[j].startDate < dated[i].endDate) {
        return true;
      }
    }
  }
  return false;
}

/* ── Main step component ──────────────────────────────────── */

export interface WizardStepStagesRef {
  validate: () => Promise<boolean>;
}

interface WizardStepStagesProps {
  stages: WizardStageData[];
  objectData: WizardObjectData;
  dispatch: Dispatch<any>;
}

export const WizardStepStages = forwardRef<WizardStepStagesRef, WizardStepStagesProps>(
  function WizardStepStages({ stages, objectData, dispatch }, ref) {
    const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
    const [error, setError] = useState('');

    // Stage dialog state
    const [stageDialogOpen, setStageDialogOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<WizardStageData | null>(null);

    // Equipment type creation dialog state
    const [eqDialogOpen, setEqDialogOpen] = useState(false);
    const [pendingEquipmentIndex, setPendingEquipmentIndex] = useState<number | null>(null);
    const assignEqRef = useRef<((index: number, typeId: string) => void) | null>(null);

    const loadEquipmentTypes = () => {
      equipmentTypesApi.getAll().then(setEquipmentTypes).catch(console.error);
    };

    useEffect(() => {
      loadEquipmentTypes();
    }, []);

    const handleOpenCreateEqDialog = (equipmentIndex: number) => {
      setPendingEquipmentIndex(equipmentIndex);
      setEqDialogOpen(true);
    };

    const handleEquipmentTypeCreated = (created: EquipmentType) => {
      setEquipmentTypes((prev) => [...prev, created]);
      if (pendingEquipmentIndex !== null) {
        assignEqRef.current?.(pendingEquipmentIndex, created.id);
        setPendingEquipmentIndex(null);
      }
    };

    useImperativeHandle(ref, () => ({
      validate: async () => {
        setError('');
        if (stages.length === 0) {
          setError('Добавьте хотя бы один этап');
          return false;
        }
        return true;
      },
    }));

    const addStage = () => {
      setEditingStage(null);
      setStageDialogOpen(true);
    };

    const editStage = (stage: WizardStageData) => {
      setEditingStage(stage);
      setStageDialogOpen(true);
    };

    const handleStageSave = (savedData: WizardStageData) => {
      if (editingStage === null) {
        dispatch({ type: 'ADD_STAGE', stage: savedData });
      } else {
        dispatch({ type: 'UPDATE_STAGE', tempId: savedData.tempId, data: savedData });
      }
    };

    const lastStageEnd = stages.length > 0 ? stages[stages.length - 1].endDate : '';
    const defaultStartDate = lastStageEnd || objectData.startDate || '';

    const totalBudget = Number(objectData.budget) || 0;
    const allocatedBudget = stages.reduce((sum, s) => sum + (Number(s.budget) || 0), 0);
    const budgetRemaining = totalBudget - allocatedBudget;
    const dialogAllocated = stages
      .filter((s) => s.tempId !== editingStage?.tempId)
      .reduce((sum, s) => sum + (Number(s.budget) || 0), 0);

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

        {totalBudget > 0 && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>Общий бюджет: {formatCurrency(totalBudget)}</div>
            <div>Распределено: {formatCurrency(allocatedBudget)}</div>
            <div className={budgetRemaining < 0 ? 'text-red-500' : ''}>
              Остаток: {formatCurrency(budgetRemaining)}
            </div>
          </div>
        )}

        {stages.length >= 2 && hasOverlappingStages(stages) && (
          <p className="text-xs text-amber-600">Обнаружено пересечение этапов</p>
        )}

        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {stages.map((stage) => (
            <StageCard
              key={stage.tempId}
              stage={stage}
              onEdit={() => editStage(stage)}
              onRemove={() =>
                dispatch({ type: 'REMOVE_STAGE', tempId: stage.tempId })
              }
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <WizardStageDialog
          open={stageDialogOpen}
          onOpenChange={setStageDialogOpen}
          stage={editingStage}
          objectData={objectData}
          equipmentTypes={equipmentTypes}
          onSave={handleStageSave}
          onOpenCreateEqDialog={handleOpenCreateEqDialog}
          assignRef={assignEqRef}
          allocatedBudget={dialogAllocated}
          totalBudget={totalBudget}
          defaultStartDate={defaultStartDate}
        />

        <EquipmentTypeFormDialog
          open={eqDialogOpen}
          onOpenChange={setEqDialogOpen}
          onCreated={handleEquipmentTypeCreated}
        />
      </div>
    );
  }
);
