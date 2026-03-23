import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Coffee, Eye, EyeOff, AlertCircle, Wifi } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { ApiError } from '../../lib/api';

/**
 * Convierte un error de login en un mensaje amigable.
 * Los mensajes son intencionalmente genéricos para no revelar
 * si el usuario existe o si solo el password es incorrecto.
 */
function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Sin conexión. Verifica tu red e intenta de nuevo.';
    if (error.status === 401 || error.status === 403)
      return 'Credenciales incorrectas. Verifica tu usuario y contraseña.';
    if (error.status === 429)
      return 'Demasiados intentos fallidos. Espera unos minutos antes de intentar de nuevo.';
    if (error.status >= 500)
      return 'Error del servidor. Intenta de nuevo en unos momentos.';
    // Mensaje del backend si es explícito y el status no es sensible
    if (error.message) return error.message;
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isCheckingSession } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);

  // Destino al que redirigir tras el login exitoso
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  // Si ya está autenticado, redirigir directamente
  if (!isCheckingSession && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNetworkError(false);

    // Validación básica antes de llamar al backend
    if (!email.trim()) {
      setError('Ingresa tu correo electrónico.');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      // Redirigir a la ruta original o al dashboard
      navigate(from === '/login' ? '/' : from, { replace: true });
    } catch (err) {
      const msg = resolveErrorMessage(err);
      setNetworkError(err instanceof ApiError && err.status === 0);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen bg-cafe-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-cream rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Coffee className="h-9 w-9 text-coffee-700" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Kafe-Yana
          </h1>
          <p className="text-coffee-300 text-sm mt-1">Sistema de gestión</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-coffee-900 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-coffee-500 mb-6">Ingresa tus credenciales para continuar</p>

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm"
            >
              {networkError ? (
                <Wifi className="h-4 w-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
            autoComplete="on"
            className="space-y-4"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-coffee-700 mb-1.5"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                disabled={isLoading}
                value={email}
                onChange={handleEmailChange}
                placeholder="correo@empresa.com"
                className="
                  w-full px-3 py-2.5 rounded-lg border border-coffee-200 bg-white
                  text-coffee-900 placeholder-coffee-300 text-sm
                  focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent
                  disabled:bg-coffee-50 disabled:text-coffee-400 disabled:cursor-not-allowed
                  transition-colors
                "
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-coffee-700 mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="••••••••"
                  className="
                    w-full px-3 py-2.5 pr-10 rounded-lg border border-coffee-200 bg-white
                    text-coffee-900 placeholder-coffee-300 text-sm
                    focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:border-transparent
                    disabled:bg-coffee-50 disabled:text-coffee-400 disabled:cursor-not-allowed
                    transition-colors
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="
                    absolute right-3 top-1/2 -translate-y-1/2
                    text-coffee-400 hover:text-coffee-600
                    disabled:cursor-not-allowed transition-colors
                  "
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full py-2.5 px-4 mt-2
                bg-coffee-700 hover:bg-coffee-800 active:bg-coffee-900
                text-white font-medium text-sm rounded-lg
                focus:outline-none focus:ring-2 focus:ring-coffee-500 focus:ring-offset-2
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-colors flex items-center justify-center gap-2
              "
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Ingresando…</span>
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-coffee-400 mt-6">
          © {new Date().getFullYear()} Kafe-Yana · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
