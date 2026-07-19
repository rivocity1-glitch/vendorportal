import React from 'react';
import { TooltipRenderProps } from 'react-joyride';

export const TourTooltip: React.FC<TooltipRenderProps> = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  size,
  isLastStep,
}) => {
  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xl max-w-sm w-full font-sans animate-in fade-in zoom-in-95 duration-200 relative z-50">
      
      {/* Tooltip Header */}
      <div className="flex justify-between items-center mb-2.5">
        <h4 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
          {step.title as string}
        </h4>
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded-md uppercase tracking-wider">
          Step {index + 1} of {size}
        </span>
      </div>

      {/* Description Content */}
      <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
        {step.content as React.ReactNode}
      </div>

      {/* Footer Controllers */}
      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900 pt-3 text-xs font-semibold">
        
        {/* Skip Tour Button */}
        {!isLastStep ? (
          <button
            {...closeProps}
            className="h-8 px-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Skip Tour
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          {/* Previous Button */}
          {index > 0 && (
            <button
              {...backProps}
              className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            >
              Previous
            </button>
          )}

          {/* Next or Finish Button */}
          <button
            {...primaryProps}
            className="h-8 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white shadow-xs transition-colors flex items-center justify-center font-bold"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>

      </div>
    </div>
  );
};