'use client';

import { forwardRef, useImperativeHandle, useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { contractorsApi } from '@/lib/api';
import { Contractor } from '@/lib/types';
import { WizardContractorData } from './wizard-types';
import { ContractorFormDialog } from '@/components/contractors/contractor-form-dialog';
import { Plus } from 'lucide-react';

export interface WizardStepContractorRef {
  validate: () => Promise<boolean>;
}

interface WizardStepContractorProps {
  data: WizardContractorData;
  onChange: (data: Partial<WizardContractorData>) => void;
}

export const WizardStepContractor = forwardRef<WizardStepContractorRef, WizardStepContractorProps>(
  function WizardStepContractor({ data, onChange }, ref) {
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);

    const loadContractors = useCallback(() => {
      contractorsApi.getAll().then(setContractors).catch(console.error);
    }, []);

    useEffect(() => {
      loadContractors();
    }, [loadContractors]);

    useImperativeHandle(ref, () => ({
      validate: async () => true, // contractor is optional
    }));

    const handleCreated = (created: Contractor) => {
      setContractors((prev) => [...prev, created]);
      onChange({ selectedContractorId: created.id });
    };

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Подрядчик</Label>
          <Select
            value={data.selectedContractorId || '__none__'}
            onValueChange={(value) =>
              onChange({ selectedContractorId: value === '__none__' ? '' : value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите подрядчика" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Не выбран</SelectItem>
              {contractors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.inn ? ` (ИНН: ${c.inn})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Можно пропустить и назначить позже
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Создать нового подрядчика
        </Button>

        <ContractorFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={loadContractors}
          onCreated={handleCreated}
        />
      </div>
    );
  }
);
