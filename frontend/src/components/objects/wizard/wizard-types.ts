export const WIZARD_STEPS = ['object', 'contractor', 'stages', 'users'] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number];
export const STEP_LABELS = ['Объект', 'Подрядчик', 'Этапы', 'Пользователи'];

// Step 1: Object
export interface WizardObjectData {
  name: string;
  address: string;
  startDate: string;
  endDate: string;
  budget: string;
  status: string;
}

// Step 2: Contractor
export interface WizardContractorData {
  mode: 'select' | 'create';
  selectedContractorId: string;
  newContractor: {
    name: string;
    inn: string;
    phone: string;
    email: string;
  };
}

// Step 3: Stage equipment entry
export interface WizardEquipmentEntry {
  equipmentTypeId: string;
  quantity: number;
}

// Step 3: Stage
export interface WizardStageData {
  tempId: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: string;
  plannedPeople: string;
  equipment: WizardEquipmentEntry[];
  isEditing: boolean;
}

// Step 4: New user to create
export interface WizardNewUser {
  tempId: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
}

// Step 4: Users
export interface WizardUsersData {
  selectedUserIds: string[];
  newUsers: WizardNewUser[];
}

// Submit progress
export interface SubmitProgress {
  current: string;
  completed: string[];
  failed: string | null;
  createdObjectId: string | null;
}

// Full wizard state
export interface WizardState {
  currentStep: number;
  object: WizardObjectData;
  contractor: WizardContractorData;
  stages: WizardStageData[];
  users: WizardUsersData;
  isSubmitting: boolean;
  submitProgress: SubmitProgress;
}

export const initialWizardState: WizardState = {
  currentStep: 0,
  object: {
    name: '',
    address: '',
    startDate: '',
    endDate: '',
    budget: '',
    status: 'PLANNED',
  },
  contractor: {
    mode: 'select',
    selectedContractorId: '',
    newContractor: { name: '', inn: '', phone: '', email: '' },
  },
  stages: [],
  users: {
    selectedUserIds: [],
    newUsers: [],
  },
  isSubmitting: false,
  submitProgress: {
    current: '',
    completed: [],
    failed: null,
    createdObjectId: null,
  },
};
