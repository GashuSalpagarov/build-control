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
  selectedContractorId: string;
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
}

// Step 4: Users
export interface WizardUsersData {
  selectedUserIds: string[];
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
    selectedContractorId: '',
  },
  stages: [],
  users: {
    selectedUserIds: [],
  },
  isSubmitting: false,
  submitProgress: {
    current: '',
    completed: [],
    failed: null,
    createdObjectId: null,
  },
};
