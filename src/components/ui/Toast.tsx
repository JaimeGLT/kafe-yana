import React from 'react';
import { clsx } from 'clsx';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useUIStore } from '../../stores';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ type, title, message, onClose }) => {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const backgrounds = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={clsx(
        'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg',
        'min-w-80 max-w-md animate-slide-in',
        backgrounds[type]
      )}
    >
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-coffee-900">{title}</p>
        {message && (
          <p className="mt-1 text-sm text-coffee-600">{message}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-coffee-400 hover:text-coffee-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// Utility functions to show toasts from anywhere
export const toast = {
  success: (title: string, message?: string) => {
    useUIStore.getState().addToast({ type: 'success', title, message });
  },
  error: (title: string, message?: string) => {
    useUIStore.getState().addToast({ type: 'error', title, message });
  },
  warning: (title: string, message?: string) => {
    useUIStore.getState().addToast({ type: 'warning', title, message });
  },
  info: (title: string, message?: string) => {
    useUIStore.getState().addToast({ type: 'info', title, message });
  },
};

// Add CSS for animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
`;
document.head.appendChild(style);