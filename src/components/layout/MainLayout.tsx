import React from 'react';
import { clsx } from 'clsx';
import { useUI } from '../../contexts/UIContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { sidebarCollapsed } = useUI();

  return (
    <div className="min-h-screen bg-cafe-primary">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={clsx(
          'transition-all duration-300',
          sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        )}
      >
        {/* Header */}
        <Header />

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};