import { createContext, useContext, useState, type ReactNode } from 'react';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  searchQuery: string;
}

interface UIContextType extends UIState {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setSearchQuery: (query: string) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const toggleMobileSidebar = () => setMobileSidebarOpen((prev) => !prev);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  return (
    <UIContext.Provider value={{
      sidebarCollapsed,
      mobileSidebarOpen,
      toggleSidebar,
      setSidebarCollapsed,
      toggleMobileSidebar,
      closeMobileSidebar,
      searchQuery,
      setSearchQuery,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}