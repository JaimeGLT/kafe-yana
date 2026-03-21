import React from 'react';
import { clsx } from 'clsx';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const baseStyles = 'flex';

  const containerStyles = {
    default: 'border-b border-coffee-200',
    pills: 'bg-coffee-100 p-1 rounded-lg',
    underline: '',
  };

  const tabStyles = {
    default: {
      base: 'relative px-4 py-2 font-medium text-sm transition-colors',
      active: 'text-coffee-700 border-b-2 border-coffee-500',
      inactive: 'text-coffee-500 hover:text-coffee-700',
    },
    pills: {
      base: 'px-4 py-2 font-medium text-sm rounded-md transition-colors',
      active: 'bg-white text-coffee-700 shadow-sm',
      inactive: 'text-coffee-500 hover:text-coffee-700',
    },
    underline: {
      base: 'px-4 py-2 font-medium text-sm transition-colors',
      active: 'text-coffee-700 underline decoration-2 decoration-coffee-500 underline-offset-4',
      inactive: 'text-coffee-500 hover:text-coffee-700',
    },
  };

  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={clsx(baseStyles, containerStyles[variant], className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
          className={clsx(
            tabStyles[variant].base,
            sizes[size],
            activeTab === tab.id
              ? tabStyles[variant].active
              : tabStyles[variant].inactive,
            tab.disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="flex items-center gap-2">
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'px-2 py-0.5 text-xs rounded-full',
                  activeTab === tab.id
                    ? 'bg-coffee-500 text-white'
                    : 'bg-coffee-200 text-coffee-600'
                )}
              >
                {tab.count}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

// Tab Panel for content
interface TabPanelProps {
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  isActive,
  className,
}) => {
  if (!isActive) return null;

  return <div className={className}>{children}</div>;
};

// Full Tabs Component with Panels
interface TabsWithPanelsProps {
  tabs: (Tab & { content: React.ReactNode })[];
  defaultTab?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tabsClassName?: string;
  panelClassName?: string;
}

export const TabsWithPanels: React.FC<TabsWithPanelsProps> = ({
  tabs,
  defaultTab,
  variant = 'default',
  size = 'md',
  className,
  tabsClassName,
  panelClassName,
}) => {
  const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

  return (
    <div className={className}>
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant={variant}
        size={size}
        className={tabsClassName}
      />
      <div className={clsx('mt-4', panelClassName)}>
        {tabs.map((tab) => (
          <TabPanel key={tab.id} isActive={activeTab === tab.id}>
            {tab.content}
          </TabPanel>
        ))}
      </div>
    </div>
  );
};