import {
  objectsApi,
  stagesApi,
  usersApi,
} from '@/lib/api';
import { WizardState, SubmitProgress } from './wizard-types';

type ProgressCallback = (progress: Partial<SubmitProgress>) => void;

export async function wizardSubmit(
  state: WizardState,
  onProgress: ProgressCallback
): Promise<string> {
  let objectId: string;

  try {
    // 1. Create object
    onProgress({ current: 'Создание объекта...' });
    const obj = await objectsApi.create({
      name: state.object.name,
      address: state.object.address || undefined,
      contractorId: state.contractor.selectedContractorId || undefined,
      startDate: state.object.startDate || undefined,
      endDate: state.object.endDate || undefined,
      budget: state.object.budget ? parseFloat(state.object.budget) : undefined,
      status: state.object.status || undefined,
    });
    objectId = obj.id;
    onProgress({
      completed: ['object'],
      createdObjectId: objectId,
    });

    // 2. Create stages sequentially
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
    }

    // 3. Assign selected users
    for (const userId of state.users.selectedUserIds) {
      onProgress({ current: 'Назначение пользователей...' });
      try {
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
