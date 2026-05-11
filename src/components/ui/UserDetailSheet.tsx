import React from 'react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { StatusBadge } from './Badge';
import type { User } from '../../types/user';

const ROL_LABEL: Record<string, string> = {
  Admin: 'Administrador',
  Mesero: 'Mesero',
  Cajero: 'Cajero',
};

interface UserDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onDelete: (user: User) => void;
  onToggleBlock: (user: User) => void;
  currentUserEmail?: string;
}

export const UserDetailSheet: React.FC<UserDetailSheetProps> = ({
  isOpen,
  onClose,
  user,
  onDelete,
  onToggleBlock,
  currentUserEmail,
}) => {
  if (!isOpen || !user) return null;

  const isOwnProfile = currentUserEmail === user.email;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle del usuario"
      footer={
        <div className="flex flex-col sm:flex-row gap-2">
          {!isOwnProfile && user.rol !== 'Admin' && (
            <div className="flex gap-2">
              <Button
                variant={!user.estado ? 'outline' : 'primary'}
                size="sm"
                className="flex-1 text-xs sm:text-sm"
                onClick={() => { onClose(); onToggleBlock(user); }}
              >
                {!user.estado ? 'Bloquear' : 'Desbloquear'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1 text-xs sm:text-sm"
                onClick={() => { onClose(); onDelete(user); }}
              >
                Eliminar
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-semibold text-coffee-600">
              {user.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-bold text-coffee-900 text-base leading-tight">
              {user.nombre} {user.apellido}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-coffee-100 text-coffee-700">
                {ROL_LABEL[user.rol] ?? user.rol}
              </span>
              <StatusBadge status={!user.estado ? 'active' : 'inactive'} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-coffee-50 rounded-xl p-3">
            <p className="text-xs text-coffee-400 mb-1">Email</p>
            <p className="text-sm font-medium text-coffee-900">{user.email}</p>
          </div>
          <div className="bg-coffee-50 rounded-xl p-3">
            <p className="text-xs text-coffee-400 mb-1">Teléfono</p>
            <p className="text-sm font-medium text-coffee-900">{user.celular || '—'}</p>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
