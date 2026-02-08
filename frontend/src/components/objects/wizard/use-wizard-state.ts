import { useReducer, useCallback } from 'react';
import {
  WizardState,
  WizardObjectData,
  WizardContractorData,
  WizardUsersData,
  WizardStageData,
  WizardNewUser,
  SubmitProgress,
  initialWizardState,
} from './wizard-types';

type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'UPDATE_OBJECT'; data: Partial<WizardObjectData> }
  | { type: 'UPDATE_CONTRACTOR'; data: Partial<WizardContractorData> }
  | { type: 'UPDATE_USERS'; data: Partial<WizardUsersData> }
  | { type: 'ADD_STAGE'; stage: WizardStageData }
  | { type: 'UPDATE_STAGE'; tempId: string; data: Partial<WizardStageData> }
  | { type: 'REMOVE_STAGE'; tempId: string }
  | { type: 'TOGGLE_SELECTED_USER'; userId: string }
  | { type: 'ADD_NEW_USER'; user: WizardNewUser }
  | { type: 'UPDATE_NEW_USER'; tempId: string; data: Partial<WizardNewUser> }
  | { type: 'REMOVE_NEW_USER'; tempId: string }
  | { type: 'SET_SUBMITTING'; value: boolean }
  | { type: 'SET_SUBMIT_PROGRESS'; progress: Partial<SubmitProgress> }
  | { type: 'RESET' };

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };

    case 'UPDATE_OBJECT':
      return { ...state, object: { ...state.object, ...action.data } };

    case 'UPDATE_CONTRACTOR':
      return { ...state, contractor: { ...state.contractor, ...action.data } };

    case 'UPDATE_USERS':
      return { ...state, users: { ...state.users, ...action.data } };

    case 'ADD_STAGE':
      return { ...state, stages: [...state.stages, action.stage] };

    case 'UPDATE_STAGE':
      return {
        ...state,
        stages: state.stages.map((s) =>
          s.tempId === action.tempId ? { ...s, ...action.data } : s
        ),
      };

    case 'REMOVE_STAGE':
      return {
        ...state,
        stages: state.stages.filter((s) => s.tempId !== action.tempId),
      };

    case 'TOGGLE_SELECTED_USER': {
      const ids = state.users.selectedUserIds;
      const exists = ids.includes(action.userId);
      return {
        ...state,
        users: {
          ...state.users,
          selectedUserIds: exists
            ? ids.filter((id) => id !== action.userId)
            : [...ids, action.userId],
        },
      };
    }

    case 'ADD_NEW_USER':
      return {
        ...state,
        users: {
          ...state.users,
          newUsers: [...state.users.newUsers, action.user],
        },
      };

    case 'UPDATE_NEW_USER':
      return {
        ...state,
        users: {
          ...state.users,
          newUsers: state.users.newUsers.map((u) =>
            u.tempId === action.tempId ? { ...u, ...action.data } : u
          ),
        },
      };

    case 'REMOVE_NEW_USER':
      return {
        ...state,
        users: {
          ...state.users,
          newUsers: state.users.newUsers.filter((u) => u.tempId !== action.tempId),
        },
      };

    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.value };

    case 'SET_SUBMIT_PROGRESS':
      return {
        ...state,
        submitProgress: { ...state.submitProgress, ...action.progress },
      };

    case 'RESET':
      return { ...initialWizardState };

    default:
      return state;
  }
}

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'SET_STEP', step: state.currentStep + 1 });
  }, [state.currentStep]);

  const prevStep = useCallback(() => {
    dispatch({ type: 'SET_STEP', step: Math.max(0, state.currentStep - 1) });
  }, [state.currentStep]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return { state, dispatch, goToStep, nextStep, prevStep, reset };
}
