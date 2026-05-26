import React, { createContext, useContext } from 'react';
import { useHeaderNotifications } from '../hooks/useHeaderNotifications';
import type { UseHeaderNotificationsReturn } from '../hooks/useHeaderNotifications';

const NotificationsContext = createContext<UseHeaderNotificationsReturn | null>(null);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useHeaderNotifications();
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export function useNotifications(): UseHeaderNotificationsReturn {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be inside NotificationsProvider');
  return ctx;
}
