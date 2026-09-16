import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

export interface StepItem {
  id: number;
  label: string;
}

const STEPS: StepItem[] = [
  { id: 1, label: '1. UPLOAD PO' },
  { id: 2, label: '2. AI EXTRACT' },
  { id: 3, label: '3. VERIFY DETAILS' },
  { id: 4, label: '4. CALCULATE RATES' },
  { id: 5, label: '5. GENERATE QUOTE' },
  { id: 6, label: '6. SEND' }
];

interface WorkflowStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  onStepClick
}) => {
  return (
    <div className="bg-white border-b border-slate-200 py-2.5 px-4 md:px-8 overflow-x-auto shadow-xs">
      <div className="flex items-center justify-start md:justify-center min-w-max gap-2 text-xs font-semibold">
        {STEPS.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isPending = step.id > currentStep;

          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <div className={`w-4 h-0.5 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
              
              <button
                type="button"
                onClick={() => onStepClick && onStepClick(step.id)}
                disabled={!onStepClick || isPending}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-full transition-all text-xs font-medium cursor-pointer disabled:cursor-default ${
                  isCompleted
                    ? 'text-emerald-700 hover:bg-emerald-50'
                    : isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-300 font-semibold shadow-2xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {isCompleted ? (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                ) : isActive ? (
                  <span className="w-4 h-4 rounded-full bg-blue-700 text-white flex items-center justify-center text-[10px] font-bold">
                    {step.id}
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 flex items-center justify-center text-[10px]">
                    {step.id}
                  </span>
                )}
                <span>{step.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
