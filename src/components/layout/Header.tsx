import React from 'react';
import { LogOut, ChevronDown, Menu, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';

export const Header: React.FC = () => {
  const { toggleMobileSidebar } = useUI();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayUser = user;

  const userMenuItems = [
    { id: 'settings', label: 'Configuración', icon: <Settings className="h-4 w-4" /> },
    { id: 'logout', label: 'Cerrar Sesión', icon: <LogOut className="h-4 w-4" /> },
  ];

  const handleUserMenu = (id: string) => {
    if (id === 'logout') {
      logout()
        .then(() => navigate('/login', { replace: true }));
    } else if (id === 'settings') {
      navigate('/settings');
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-coffee-100 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex-1 flex items-center">
          <button
            onClick={toggleMobileSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-coffee-50 transition-colors mr-2"
          >
            <Menu className="h-5 w-5 text-coffee-600" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-end gap-4">
          {user?.rol?.toLowerCase() === 'admin' && <NotificationBell />}

          {/* User Menu */}
          <div className="relative">
            <details className="group">
              <summary className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-coffee-50 transition-colors cursor-pointer list-none">
                <div className="w-8 h-8 bg-cream rounded-full flex items-center justify-center">
                  <span className="text-coffee-700 font-medium text-sm">
                    {displayUser?.nombre?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-coffee-900">
                    {displayUser?.nombre}
                  </p>
                  <p className="text-xs text-coffee-500">{displayUser?.rol}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-coffee-500" />
              </summary>
              <div className="absolute right-0 mt-1 min-w-48 bg-white rounded-lg border border-coffee-200 shadow-lg py-1 z-30">
                {userMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={(e) => {
                      e.currentTarget.closest('details')?.removeAttribute('open');
                      handleUserMenu(item.id);
                    }}
                    className="w-full px-4 py-2 text-left text-sm transition-colors hover:bg-coffee-50 flex items-center gap-2 text-coffee-700"
                  >
                    <span className="text-coffee-500">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
};
