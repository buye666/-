
import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps, steps }) => {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 -z-10" />
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const isActive = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={index} className="flex flex-col items-center bg-slate-50 px-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                } ${isCurrent ? 'ring-4 ring-indigo-600/20 scale-110' : ''}`}
              >
                {stepNum}
              </div>
              <span className={`text-xs mt-2 font-medium ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
