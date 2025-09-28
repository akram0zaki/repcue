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
  // Smaller toggle switch design:
  // Track: w-16 (≈64px) h-5 (≈20px) — smaller than original but functional
  // Knob: h-4 w-4 (≈16px) for proper visual proportion
  // Offsets: 2px (Tailwind 0.5) on both sides. Geometry:
  // To ensure knob stays within track bounds: track width (64px) - knob width (16px) - left offset (2px) - right margin (6px)
  // => max translation = 64 - 16 - 2 - 6 = 40px ⇒ translate-x-[40px]
  const baseTrack = 'relative inline-flex h-5 w-16 items-center rounded-full transition-colors duration-200 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed group';
  const trackClasses = `${baseTrack} ${checked ? onColorClass : offColorClass} ${className}`.trim();

  const knobClasses = `absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm will-change-transform transition-transform duration-200 ease-out pointer-events-none ${checked ? 'translate-x-[24px] ' + knobOnExtraClass : 'translate-x-0 ' + knobOffExtraClass} group-active:scale-95`;

  return (
    <button
      id={id}
      type="button"
      data-testid={dataTestId}
      disabled={disabled}
      aria-pressed={checked}
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
