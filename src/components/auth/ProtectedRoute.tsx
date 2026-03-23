import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * Guarda de rutas protegidas.
 * - Si la sesión aún se está verificando → pantalla de carga
 * - Si no está autenticado → redirige a /login guardando la ruta original
 * - Si está autenticado → renderiza los hijos
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isCheckingSession } = useAuthStore();
  const location = useLocation();

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-cafe-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-coffee-300 border-t-coffee-600 rounded-full animate-spin" />
          <p className="text-sm text-coffee-500">Verificando sesión…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Guarda la ruta a la que el usuario quería ir para redirigir después del login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
