import {
  objectsApi,
  contractorsApi,
  stagesApi,
  usersApi,
} from '@/lib/api';
import { WizardState, SubmitProgress } from './wizard-types';

type ProgressCallback = (progress: Partial<SubmitProgress>) => void;

export async function wizardSubmit(
  state: WizardState,
  onProgress: ProgressCallback
): Promise<string> {
  let contractorId: string | undefined;
  let objectId: string;
  const createdUserIds: string[] = [];

  try {
    // 1. Create contractor if needed
    if (state.contractor.mode === 'create' && state.contractor.newContractor.name.trim()) {
      onProgress({ current: 'Создание подрядчика...' });
      const contractor = await contractorsApi.create({
        name: state.contractor.newContractor.name,
        inn: state.contractor.newContractor.inn || undefined,
        phone: state.contractor.newContractor.phone || undefined,
        email: state.contractor.newContractor.email || undefined,
      });
      contractorId = contractor.id;
      onProgress({ completed: ['contractor'] });
    } else if (state.contractor.mode === 'select' && state.contractor.selectedContractorId) {
      contractorId = state.contractor.selectedContractorId;
    }

    // 2. Create object
    onProgress({ current: 'Создание объекта...' });
    const obj = await objectsApi.create({
      name: state.object.name,
      address: state.object.address || undefined,
      contractorId: contractorId || undefined,
      startDate: state.object.startDate || undefined,
      endDate: state.object.endDate || undefined,
      budget: state.object.budget ? parseFloat(state.object.budget) : undefined,
      status: state.object.status || undefined,
    });
    objectId = obj.id;
    onProgress({
      completed: [...(contractorId && state.contractor.mode === 'create' ? ['contractor'] : []), 'object'],
      createdObjectId: objectId,
    });

    // 3. Create stages sequentially
    for (let i = 0; i < state.stages.length; i++) {
      const stage = state.stages[i];
      onProgress({ current: `Создание этапа: ${stage.name}...` });

      const validEquipment = stage.equipment.filter(
        (e) => e.equipmentTypeId && e.quantity > 0
      );

      await stagesApi.create({
        objectId,
        name: stage.name,
        startDate: stage.startDate || undefined,
        endDate: stage.endDate || undefined,
        budget: stage.budget ? parseFloat(stage.budget) : undefined,
        plannedPeople: stage.plannedPeople ? parseInt(stage.plannedPeople) : undefined,
        sortOrder: i,
        plannedEquipment: validEquipment.length > 0 ? validEquipment : undefined,
      });

      // Progress tracking for stages is included in the overall flow
    }

    // 4. Create new users
    for (const newUser of state.users.newUsers) {
      onProgress({ current: `Создание пользователя: ${newUser.name}...` });
      const created = await usersApi.create({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        phone: newUser.phone || undefined,
        role: newUser.role,
      });
      createdUserIds.push(created.id);
    }

    // 5. Assign users (existing + newly created)
    const allUserIds = [...state.users.selectedUserIds, ...createdUserIds];
    for (const userId of allUserIds) {
      onProgress({ current: 'Назначение пользователей...' });
      try {
        // Get existing assignments to avoid overwriting them
        const existingObjects = await usersApi.getAssignedObjects(userId);
        const existingIds = existingObjects.map((o) => o.id);
        if (!existingIds.includes(objectId)) {
          await usersApi.assignObjects(userId, [...existingIds, objectId]);
        }
      } catch {
        // Non-critical: user can be assigned later manually
        console.error(`Failed to assign user ${userId}`);
      }
    }

    onProgress({ current: 'Готово!', completed: ['users'] });
    return objectId;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ошибка создания';
    onProgress({ failed: message });
    throw err;
  }
}
