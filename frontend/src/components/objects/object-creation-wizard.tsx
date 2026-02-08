'use client';

import { useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';

import { WIZARD_STEPS } from './wizard/wizard-types';
import { useWizardState } from './wizard/use-wizard-state';
import { WizardStepper } from './wizard/wizard-stepper';
import { WizardStepObject, WizardStepObjectRef } from './wizard/wizard-step-object';
import { WizardStepContractor, WizardStepContractorRef } from './wizard/wizard-step-contractor';
import { WizardStepStages, WizardStepStagesRef } from './wizard/wizard-step-stages';
import { WizardStepUsers, WizardStepUsersRef } from './wizard/wizard-step-users';
import { wizardSubmit } from './wizard/wizard-submit';

interface ObjectCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

const slideTransition = {
  duration: 0.2,
};

export function ObjectCreationWizard({
  open,
  onOpenChange,
  onSuccess,
}: ObjectCreationWizardProps) {
  const { state, dispatch, nextStep, prevStep, reset } = useWizardState();

  const stepObjectRef = useRef<WizardStepObjectRef>(null);
  const stepContractorRef = useRef<WizardStepContractorRef>(null);
  const stepStagesRef = useRef<WizardStepStagesRef>(null);
  const stepUsersRef = useRef<WizardStepUsersRef>(null);

  // Track direction for animation
  const directionRef = useRef(1);

  const isLastStep = state.currentStep === WIZARD_STEPS.length - 1;

  const getCurrentStepRef = useCallback(() => {
    switch (state.currentStep) {
      case 0: return stepObjectRef;
      case 1: return stepContractorRef;
      case 2: return stepStagesRef;
      case 3: return stepUsersRef;
      default: return null;
    }
  }, [state.currentStep]);

  const handleNext = useCallback(async () => {
    const ref = getCurrentStepRef();
    if (ref?.current) {
      const isValid = await ref.current.validate();
      if (!isValid) return;
    }

    if (isLastStep) {
      handleSubmit();
    } else {
      directionRef.current = 1;
      nextStep();
    }
  }, [getCurrentStepRef, isLastStep, nextStep]);

  const handleBack = useCallback(() => {
    directionRef.current = -1;
    prevStep();
  }, [prevStep]);

  const handleSubmit = useCallback(async () => {
    dispatch({ type: 'SET_SUBMITTING', value: true });
    dispatch({
      type: 'SET_SUBMIT_PROGRESS',
      progress: { current: 'Начинаем...', completed: [], failed: null, createdObjectId: null },
    });

    try {
      const objectId = await wizardSubmit(state, (progress) => {
        dispatch({ type: 'SET_SUBMIT_PROGRESS', progress });
      });

      // Short delay to show success
      dispatch({
        type: 'SET_SUBMIT_PROGRESS',
        progress: { current: 'Объект успешно создан!', createdObjectId: objectId },
      });
      setTimeout(() => {
        dispatch({ type: 'SET_SUBMITTING', value: false });
        reset();
        onOpenChange(false);
        onSuccess();
      }, 1000);
    } catch {
      dispatch({ type: 'SET_SUBMITTING', value: false });
    }
  }, [state, dispatch, reset, onOpenChange, onSuccess]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && state.isSubmitting) return; // Block close during submit
      if (!open) reset();
      onOpenChange(open);
    },
    [state.isSubmitting, reset, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => {
          if (state.isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (state.isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Создание объекта</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex-shrink-0 pb-2">
          <WizardStepper currentStep={state.currentStep} />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto min-h-[300px] p-1">
          <AnimatePresence mode="wait" custom={directionRef.current}>
            <motion.div
              key={state.currentStep}
              custom={directionRef.current}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideTransition}
            >
              {state.currentStep === 0 && (
                <WizardStepObject
                  ref={stepObjectRef}
                  data={state.object}
                  onChange={(data) => dispatch({ type: 'UPDATE_OBJECT', data })}
                />
              )}
              {state.currentStep === 1 && (
                <WizardStepContractor
                  ref={stepContractorRef}
                  data={state.contractor}
                  onChange={(data) => dispatch({ type: 'UPDATE_CONTRACTOR', data })}
                />
              )}
              {state.currentStep === 2 && (
                <WizardStepStages
                  ref={stepStagesRef}
                  stages={state.stages}
                  objectData={state.object}
                  dispatch={dispatch}
                />
              )}
              {state.currentStep === 3 && (
                <WizardStepUsers
                  ref={stepUsersRef}
                  data={state.users}
                  dispatch={dispatch}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Submit progress overlay */}
        {state.isSubmitting && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10 rounded-lg">
            <div className="text-center space-y-3">
              {state.submitProgress.failed ? (
                <>
                  <XCircle className="w-10 h-10 text-red-500 mx-auto" />
                  <div className="text-sm font-medium text-red-600">
                    Ошибка: {state.submitProgress.failed}
                  </div>
                  {state.submitProgress.createdObjectId && (
                    <p className="text-xs text-gray-500">
                      Объект создан — вы можете довершить настройку на его странице
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      dispatch({ type: 'SET_SUBMITTING', value: false });
                      if (state.submitProgress.createdObjectId) {
                        reset();
                        onOpenChange(false);
                        onSuccess();
                      }
                    }}
                  >
                    {state.submitProgress.createdObjectId ? 'Закрыть' : 'Попробовать снова'}
                  </Button>
                </>
              ) : (
                <>
                  <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                  <div className="text-sm font-medium text-gray-700">
                    {state.submitProgress.current}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between gap-2 pt-4 border-t flex-shrink-0">
          {state.currentStep !== 0 ?
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={state.currentStep === 0 || state.isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Назад
            </Button>
          : ''}

          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={state.isSubmitting}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={state.isSubmitting}
            >
              {isLastStep ? (
                'Создать объект'
              ) : (
                <>
                  Далее
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
