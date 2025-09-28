import React from 'react';

interface CalendarIconProps {
  size?: number;
  className?: string;
}

export const CalendarIcon: React.FC<CalendarIconProps> = ({
  size = 24,
  className = ""
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Calendar main body */}
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />

      {/* Top header line */}
      <line
        x1="3"
        y1="8"
        x2="21"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />

      {/* Left binding ring */}
      <rect
        x="7"
        y="1"
        width="1.5"
        height="6"
        rx="0.75"
        fill="currentColor"
        fillOpacity="0.7"
      />

      {/* Right binding ring */}
      <rect
        x="15.5"
        y="1"
        width="1.5"
        height="6"
        rx="0.75"
        fill="currentColor"
        fillOpacity="0.7"
      />

      {/* Calendar grid dots */}
      <circle cx="8" cy="12" r="1" fill="currentColor" fillOpacity="0.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" fillOpacity="0.5" />
      <circle cx="16" cy="12" r="1" fill="currentColor" fillOpacity="0.5" />

      <circle cx="8" cy="16" r="1" fill="currentColor" fillOpacity="0.5" />
      <circle cx="12" cy="16" r="1" fill="currentColor" fillOpacity="0.5" />
      <circle cx="16" cy="16" r="1" fill="currentColor" fillOpacity="0.5" />

      <circle cx="8" cy="20" r="1" fill="currentColor" fillOpacity="0.5" />
      <circle cx="12" cy="20" r="1" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
};

export default CalendarIcon;