import React from 'react';
import { clsx } from 'clsx';
import type { BreadcrumbItem } from '../../types';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}) => {
  return (
    <div className={clsx('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-coffee-500 mb-2">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight className="h-4 w-4" />}
              {crumb.path ? (
                <a
                  href={crumb.path}
                  className="hover:text-coffee-700 transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-coffee-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-coffee-600">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 sm:flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

// Page Container
interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
}) => {
  return (
    <div className={clsx('space-y-6', className)}>
      {children}
    </div>
  );
};

// Page Section
interface PageSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const PageSection: React.FC<PageSectionProps> = ({
  title,
  description,
  children,
  className,
  action,
}) => {
  return (
    <div className={clsx('bg-white rounded-xl border border-coffee-100 shadow-sm', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between px-6 py-4 border-b border-coffee-100">
          <div>
            {title && (
              <h2 className="text-lg font-display font-semibold text-coffee-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-coffee-500 mt-1">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};