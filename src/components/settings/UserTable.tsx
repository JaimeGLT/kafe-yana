import React from 'react';
import { Lock, Unlock, Trash2, Eye } from 'lucide-react';
import { StatusBadge } from '../ui';
import type { User } from '../../types/user';

const ROL_LABEL: Record<string, string> = {
  Admin: 'Administrador',
  Mesero: 'Mesero',
  Cajero: 'Cajero',
};

interface UserTableProps {
  usuarios: User[];
  onDelete: (user: User) => void;
  onToggleBlock: (user: User) => void;
  onViewDetail: (user: User) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  usuarios,
  onDelete,
  onToggleBlock,
  onViewDetail,
}) => {
  if (usuarios.length === 0) {
    return (
      <div className="text-center py-8 text-coffee-400">
        No hay usuarios registrados
      </div>
    );
  }

  return (
    <>
      <table className="w-full text-sm hidden sm:table">
        <thead>
          <tr className="border-b border-coffee-100">
            <th className="text-left py-3 px-4 font-semibold text-coffee-700">Nombre</th>
            <th className="text-left py-3 px-4 font-semibold text-coffee-700">Apellido</th>
            <th className="text-left py-3 px-4 font-semibold text-coffee-700">Email</th>
            <th className="text-left py-3 px-4 font-semibold text-coffee-700">Rol</th>
            <th className="text-left py-3 px-4 font-semibold text-coffee-700">Teléfono</th>
            <th className="text-center py-3 px-4 font-semibold text-coffee-700">Estado</th>
            <th className="text-center py-3 px-4 font-semibold text-coffee-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.email} className="border-b border-coffee-50 hover:bg-coffee-50 transition-colors">
              <td className="py-3 px-4 font-medium text-coffee-900">{u.nombre}</td>
              <td className="py-3 px-4 text-coffee-600">{u.apellido}</td>
              <td className="py-3 px-4 text-coffee-600">{u.email}</td>
              <td className="py-3 px-4 text-coffee-600">{ROL_LABEL[u.rol] ?? u.rol}</td>
              <td className="py-3 px-4 text-coffee-600">{u.celular}</td>
              <td className="py-3 px-4 text-center">
                <StatusBadge status={!u.estado ? 'active' : 'inactive'} />
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-center gap-2">
                  {u.rol !== 'Admin' && (
                    <>
                      {!u.estado ? (
                        <button
                          onClick={() => onToggleBlock(u)}
                          className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                          title="Bloquear"
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleBlock(u)}
                          className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          title="Desbloquear"
                        >
                          <Unlock className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(u)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="sm:hidden divide-y divide-coffee-50">
        {usuarios.map((u) => (
          <button
            key={u.email}
            onClick={() => onViewDetail(u)}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-coffee-50/60 active:bg-coffee-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-coffee-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-coffee-600">
                {u.nombre.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-coffee-900 text-sm">{u.nombre} {u.apellido}</p>
              <p className="text-xs text-coffee-400 mt-0.5">{ROL_LABEL[u.rol] ?? u.rol}</p>
            </div>
            <Eye className="h-4 w-4 text-coffee-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </>
  );
};
