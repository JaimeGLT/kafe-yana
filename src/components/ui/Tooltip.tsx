import React, { useState, useRef } from 'react';
import { HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  text,
  children,
  position = 'top',
  className,
}) => {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timer.current = setTimeout(() => setVisible(true), 150);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  };

  const positionClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  const arrowClass = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-coffee-800 border-x-transparent border-b-transparent border-t-4 border-x-4 border-b-0',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-coffee-800 border-x-transparent border-t-transparent border-b-4 border-x-4 border-t-0',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-coffee-800 border-y-transparent border-r-transparent border-l-4 border-y-4 border-r-0',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-coffee-800 border-y-transparent border-l-transparent border-r-4 border-y-4 border-l-0',
  }[position];

  return (
    <span
      className={clsx('relative inline-flex items-center', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={clsx(
            'absolute z-50 w-56 rounded-lg bg-coffee-800 text-white text-xs leading-relaxed px-3 py-2 shadow-xl pointer-events-none',
            positionClass
          )}
        >
          {text}
          <span className={clsx('absolute border', arrowClass)} />
        </span>
      )}
    </span>
  );
};

/** Standalone help icon with tooltip — drop next to any label */
export const HelpTooltip: React.FC<{ text: string; position?: TooltipProps['position'] }> = ({
  text,
  position = 'top',
}) => (
  <Tooltip text={text} position={position}>
    <button
      type="button"
      tabIndex={-1}
      className="ml-1 text-coffee-400 hover:text-coffee-600 transition-colors focus:outline-none"
      aria-label="Ayuda"
    >
      <HelpCircle className="h-3.5 w-3.5" />
    </button>
  </Tooltip>
);
