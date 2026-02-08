'use client';

import { Check } from 'lucide-react';
import { STEP_LABELS } from './wizard-types';
import { cn } from '@/lib/utils';

interface WizardStepperProps {
  currentStep: number;
}

export function WizardStepper({ currentStep }: WizardStepperProps) {
  return (
    <div className="flex items-center px-4 py-2">
      {STEP_LABELS.map((label, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              {/* Circle */}
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2',
                  isCompleted && 'bg-primary border-primary text-primary-foreground',
                  isCurrent && 'bg-primary border-primary text-primary-foreground shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]',
                  !isCompleted && !isCurrent && 'bg-muted border-border text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  index + 1
                )}
              </div>
              {/* Label */}
              <span
                className={cn(
                  'text-xs whitespace-nowrap transition-colors',
                  isCurrent && 'font-semibold text-primary',
                  isCompleted && 'font-medium text-foreground',
                  !isCompleted && !isCurrent && 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {index < STEP_LABELS.length - 1 && (
              <div className="flex-1 mx-3 mb-5">
                <div
                  className={cn(
                    'h-0.5 w-full rounded-full transition-colors duration-200',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
