import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Branch, SystemSettings } from '../types';

const defaultSettings: SystemSettings = {
  companyName: 'Kafe Yana',
  currency: 'PEN',
  currencySymbol: 'S/',
  taxPercentage: 18,
  invoicePrefix: 'FAC',
  purchaseOrderPrefix: 'OC',
  receiptPrefix: 'REC',
  defaultPaymentTerms: 30,
  lowStockAlert: true,
  lowStockThreshold: 10,
};

interface SettingsState {
  currentBranch: Branch | null;
  settings: SystemSettings;
}

interface SettingsContextType extends SettingsState {
  setCurrentBranch: (branch: Branch | null) => void;
  updateSettings: (settings: Partial<SystemSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  const updateSettings = (updates: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{
      currentBranch,
      setCurrentBranch,
      settings,
      updateSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}