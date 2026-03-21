import React from 'react';
import { clsx } from 'clsx';
import { useUIStore } from '../../stores';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-cafe-primary">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={clsx(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        {/* Header */}
        <Header />

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
};