export type Role =
  | 'SUPERADMIN'
  | 'GOVERNMENT'
  | 'MINISTER'
  | 'ACCOUNTANT'
  | 'TECHNADZOR'
  | 'INSPECTOR'
  | 'CONTRACTOR';

export type ObjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
}

export interface Contractor {
  id: string;
  tenantId: string;
  name: string;
  inn?: string;
  phone?: string;
  email?: string;
}

export interface EquipmentType {
  id: string;
  tenantId: string;
  name: string;
}

export interface PlannedEquipment {
  id: string;
  stageId: string;
  equipmentTypeId: string;
  quantity: number;
  equipmentType: EquipmentType;
}

export interface VolumeCheck {
  id: string;
  stageId: string;
  userId: string;
  date: string;
  percent: number;
  comment?: string;
}

export interface Stage {
  id: string;
  objectId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  plannedPeople?: number;
  sortOrder: number;
  plannedEquipment?: PlannedEquipment[];
  volumeChecks?: VolumeCheck[];
}

export interface ConstructionObject {
  id: string;
  tenantId: string;
  contractorId?: string;
  name: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status: ObjectStatus;
  contractor?: Contractor;
  stages?: Stage[];
}

// Статусы для отображения
export const statusLabels: Record<ObjectStatus, string> = {
  PLANNED: 'Запланировано',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершён',
  SUSPENDED: 'Приостановлен',
};

export const statusColors: Record<ObjectStatus, string> = {
  PLANNED: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
};
