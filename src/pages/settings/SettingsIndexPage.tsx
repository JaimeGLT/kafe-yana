import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsProfilePage } from './SettingsProfilePage';
import { SettingsUsersPage } from './SettingsUsersPage';

export const SettingsIndexPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.rol?.toLowerCase();

  if (role === 'admin') {
    return <SettingsUsersPage />;
  }

  return <SettingsProfilePage />;
};
