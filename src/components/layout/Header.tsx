import React from 'react';
import { LogOut, ChevronDown, Menu, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../contexts/UIContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';

export const Header: React.FC = () => {
  const { toggleMobileSidebar } = useUI();
  const { currentBranch } = useSettings();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayUser = user;

  const userMenuItems = [
    { id: 'settings', label: 'Configuración', icon: <Settings className="h-4 w-4" /> },
    { id: 'logout', label: 'Cerrar Sesión', icon: <LogOut className="h-4 w-4" /> },
  ];

  const handleUserMenu = (id: string) => {
    if (id === 'logout') {
      logout().then(() => navigate('/login', { replace: true }));
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
          {currentBranch && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-coffee-50 rounded-lg">
              <span className="text-sm text-coffee-600">Sucursal:</span>
              <span className="text-sm font-medium text-coffee-900">{currentBranch.name}</span>
              <ChevronDown className="h-4 w-4 text-coffee-500" />
            </div>
          )}

          {user?.rol?.toLowerCase() === 'admin' && <NotificationBell />}

          {/* User Menu */}
          <Dropdown
            trigger={
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-coffee-50 transition-colors">
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

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  align?: 'left' | 'right';
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  onSelect,
  align = 'left',
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${className || ''}`}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`absolute z-20 mt-1 min-w-48 bg-white rounded-lg border border-coffee-200 shadow-lg py-1 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (!item.disabled) {
                  onSelect(item.id);
                  setIsOpen(false);
                }
              }}
              disabled={item.disabled}
              className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-coffee-50 ${
                item.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {item.icon && <span className="text-coffee-500">{item.icon}</span>}
                <span className="text-coffee-700">{item.label}</span>
              </div>
              {item.description && (
                <p className="text-xs text-coffee-500 mt-0.5">{item.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};