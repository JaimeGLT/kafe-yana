import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Wifi } from 'lucide-react';
import { useAuth, ApiError } from '../../contexts/AuthContext';
import coffeeImg from '../../assets/img/Gemini_Generated_Image_hnrzfmhnrzfmhnrz.png';

function resolveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return 'Sin conexión. Verifica tu red e intenta de nuevo.';
    if (error.message) return error.message;
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isCheckingSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  if (!isCheckingSession && isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNetworkError(false);
    if (!identificador.trim()) { setError('Ingresa tu correo electrónico o usuario.'); return; }
    if (!password) { setError('Ingresa tu contraseña.'); return; }
    setIsLoading(true);
    try {
      await login(identificador.trim(), password);
      navigate(from === '/login' ? '/' : from, { replace: true });
    } catch (err) {
      const msg = resolveErrorMessage(err);
      setNetworkError(err instanceof ApiError && err.status === 0);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentificadorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentificador(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  return (
    <>
      {/* ── Fondo móvil: imagen de cafetería a pantalla completa ─────────────── */}
      <div
        className="fixed inset-0 z-0 md:hidden"
        style={{
          background: 'linear-gradient(to bottom, rgba(26,9,2,0.7) 0%, rgba(26,9,2,0.85) 100%), url(' + coffeeImg + ') center/cover no-repeat'
        }}
      />

      <div className="min-h-screen flex relative z-10">

        {/* ── Panel izquierdo — hero (visible en md+) ─────────────────────── */}
        <div className="hidden md:flex flex-col relative w-[58%] overflow-hidden bg-[#1a0902]">
          {/* Gradiente radial cálido detrás de la imagen */}
          <div
            className="absolute inset-0 opacity-40"
            style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 52%, #7c3a10 0%, transparent 70%)' }}
          />

          {/* Contenido centrado */}
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-12">
            {/* Imagen con glow cálido + blend para fundir con el fondo */}
            <div className="relative mb-10">
              {/* Glow detrás */}
              <div
                className="absolute inset-0 blur-3xl scale-110 opacity-60 rounded-full"
                style={{ background: 'radial-gradient(circle, #b85c20 0%, transparent 65%)' }}
              />
              {/* mix-blend-mode: screen — el fondo oscuro de la imagen desaparece,
                  la taza blanca queda flotando sobre el panel */}
              <img
                src={coffeeImg}
                alt="Kafe Yana"
                className="relative w-64 h-64 object-contain select-none"
                style={{ mixBlendMode: 'screen' }}
                draggable={false}
              />
            </div>

            {/* Brand — usa Zolina (font-display) */}
            <h1
              className="text-white font-bold tracking-tight text-center leading-none font-display"
              style={{ fontSize: '3.25rem', letterSpacing: '-0.02em' }}
            >
              Kafe<span style={{ color: '#d97c3a' }}>·</span>Yana
            </h1>
            <p className="mt-3 text-[#a07050] text-sm font-medium uppercase tracking-[0.2em]">
              Sistema de gestión
            </p>

            {/* Línea decorativa */}
            <div className="mt-8 flex items-center gap-3">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#5a2e10]" />
              <span className="text-[#4a2010] text-lg">☕</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#5a2e10]" />
            </div>
          </div>

          {/* Footer izquierdo */}
          <p className="relative z-10 text-center text-[10px] text-[#3a1a08] pb-5 font-medium tracking-widest uppercase">
            © {new Date().getFullYear()} Kafe-Yana
          </p>
        </div>

        {/* ── Panel derecho — formulario ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center md:bg-[#faf8f5] px-8 py-12">
          {/* Logo mobile (solo visible en <md) */}
          <div className="md:hidden flex flex-col items-center mb-10">
            <img
              src={coffeeImg}
              alt="Kafe Yana"
              className="w-20 h-20 object-contain mb-3"
              style={{ mixBlendMode: 'screen' }}
            />
            <h1 className="text-white font-bold text-2xl font-display">
              Kafe<span style={{ color: '#d97c3a' }}>·</span>Yana
            </h1>
            <p className="text-[#a07050] text-xs tracking-widest uppercase mt-1">Sistema de gestión</p>
          </div>

          <div className="w-full max-w-sm">
            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white md:text-[#1a0902] font-display">
                Bienvenido de vuelta
              </h2>
              <p className="text-[#d0b0a0] md:text-[#9a7060] text-sm mt-1.5">
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm"
              >
                {networkError
                  ? <Wifi className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                }
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate autoComplete="on" className="space-y-5">
              {/* Identificador (correo o usuario) */}
              <div>
                <label htmlFor="identificador" className="block text-xs font-semibold text-[#5a3020] mb-2 uppercase tracking-wider">
                  Correo o usuario
                </label>
                <input
                  id="identificador"
                  name="identificador"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={isLoading}
                  value={identificador}
                  onChange={handleIdentificadorChange}
                  placeholder="correo@empresa.com o usuario"
                  className="w-full px-4 py-3 rounded-xl border border-[#e0d0c0] bg-white md:bg-white text-[#1a0902] placeholder-[#c0a890] text-sm focus:outline-none focus:ring-2 focus:ring-[#c07040] focus:border-transparent disabled:bg-[#f5f0ea] disabled:text-[#b09080] disabled:cursor-not-allowed transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-[#5a3020] mb-2 uppercase tracking-wider">
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
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-[#e0d0c0] bg-white md:bg-white text-[#1a0902] placeholder-[#c0a890] text-sm focus:outline-none focus:ring-2 focus:ring-[#c07040] focus:border-transparent disabled:bg-[#f5f0ea] disabled:text-[#b09080] disabled:cursor-not-allowed transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a07060] hover:text-[#6a3020] disabled:cursor-not-allowed transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 mt-2 rounded-xl font-semibold text-sm text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c07040] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-[#c0704030]"
                style={{ background: 'linear-gradient(135deg, #7c3a10 0%, #c07040 100%)' }}
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

            {/* Footer */}
            <p className="text-center text-xs text-[#c0a890] mt-10">
              © {new Date().getFullYear()} Kafe-Yana · Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;