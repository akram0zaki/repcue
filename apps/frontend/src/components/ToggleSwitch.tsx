import React from 'react';
import logger from '../utils/logger';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
  dataTestId?: string;
  label?: string;
  // Allow color overrides while defaulting to production styles
  onColorClass?: string; // default bg-blue-600
  offColorClass?: string; // default bg-gray-200 dark:bg-gray-600
  knobOnExtraClass?: string; // optional hook for animation/debug
  knobOffExtraClass?: string;
}

// Production-spec toggle: h-6 w-11 track with h-4 w-4 knob.
// ON: track bg-blue-600, knob translate-x-6. OFF: track gray, knob translate-x-1.
const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  className = '',
  dataTestId,
  label,
  onColorClass = 'bg-blue-600',
  offColorClass = 'bg-gray-200 dark:bg-gray-600',
  knobOnExtraClass = 'toggle-switch-on',
  knobOffExtraClass = 'toggle-switch-off'
}) => {
  // Revised “wide + slim” aesthetic per request:
  // Track: wider (w-16 ≈ 64px), slimmer (h-5 ≈ 20px)
  // Knob: smaller (14px) with precise travel distance so it sits flush at both ends.
  // Geometry math: travel = trackWidth - knobSize - (leftOffset * 2)
  // => 64 - 14 - (3*2) = 44px ⇒ translate-x-[44px]
  const baseTrack = 'relative inline-flex h-5 w-16 items-center rounded-full transition-colors duration-200 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed group';
  const trackClasses = `${baseTrack} ${checked ? onColorClass : offColorClass} ${className}`.trim();

  const knobClasses = `absolute top-[3px] left-[3px] h-[14px] w-[14px] rounded-full bg-white shadow-sm will-change-transform transition-transform duration-200 ease-out pointer-events-none ${checked ? 'translate-x-[44px] '+knobOnExtraClass : 'translate-x-0 '+knobOffExtraClass} group-active:scale-95`;

  return (
    <button
      id={id}
      type="button"
      data-testid={dataTestId}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          logger.debug(`toggle ${id} -> ${!checked}`);
          onChange();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!disabled) {
            logger.debug(`toggle ${id} (keyboard) -> ${!checked}`);
            onChange();
          }
        }
      }}
      className={trackClasses}
    >
      <span className="sr-only">{`${label || id.replace(/[-_]/g, ' ')} ${checked ? 'on' : 'off'}`}</span>
      <span className={knobClasses} />
    </button>
  );
};

export default ToggleSwitch;
