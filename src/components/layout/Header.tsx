import React from 'react';
import { Bell, Settings, User, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { Dropdown } from '../ui';

export const Header: React.FC = () => {
  const { toggleMobileSidebar } = useUI();
  const { currentBranch } = useSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Usar el usuario del authStore; fallback a settingsStore si existiera
  const displayUser = user;

  const userMenuItems = [
    { id: 'profile', label: 'Mi Perfil', icon: <User className="h-4 w-4" /> },
    { id: 'settings', label: 'Configuración', icon: <Settings className="h-4 w-4" /> },
    { id: 'logout', label: 'Cerrar Sesión', icon: <LogOut className="h-4 w-4" /> },
  ];

  const handleUserMenu = (id: string) => {
    switch (id) {
      case 'profile':
        navigate('/settings');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'logout':
        logout().then(() => navigate('/login', { replace: true }));
        break;
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-coffee-100 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side - hamburger on mobile */}
        <div className="flex-1 flex items-center">
          <button
            onClick={toggleMobileSidebar}
            className="md:hidden p-2 rounded-lg hover:bg-coffee-50 transition-colors mr-2"
          >
            <Menu className="h-5 w-5 text-coffee-600" />
          </button>
        </div>


        {/* Right side - Actions */}
        <div className="flex-1 flex items-center justify-end gap-4">
          {/* Branch Selector */}
          {currentBranch && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-coffee-50 rounded-lg">
              <span className="text-sm text-coffee-600">Sucursal:</span>
              <span className="text-sm font-medium text-coffee-900">{currentBranch.name}</span>
              <ChevronDown className="h-4 w-4 text-coffee-500" />
            </div>
          )}

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-coffee-50 transition-colors">
            <Bell className="h-5 w-5 text-coffee-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User Menu */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-coffee-50 transition-colors">
                <div className="w-8 h-8 bg-cream rounded-full flex items-center justify-center">
                  <span className="text-coffee-700 font-medium text-sm">
                    {displayUser?.firstName?.[0] || 'U'}
                    {displayUser?.lastName?.[0] || ''}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-coffee-900">
                    {displayUser?.firstName} {displayUser?.lastName}
                  </p>
                  <p className="text-xs text-coffee-500">{displayUser?.roleName}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-coffee-500" />
              </button>
            }
            items={userMenuItems}
            onSelect={handleUserMenu}
            align="right"
          />
        </div>
      </div>
    </header>
  );
};