import React, { useState } from 'react';
import { clsx } from 'clsx';
import {
  Bell, MessageCircle, Mail,
  ShoppingBag, Gift, Cake,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelKey = 'whatsapp' | 'email';

interface EventNotification {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  channels: ChannelKey[];
  isActive: boolean;
}

interface GlobalChannels {
  whatsapp: boolean;
  email: boolean;
}

// ─── Default messages ─────────────────────────────────────────────────────────

const DEFAULT_EVENTS: EventNotification[] = [
  {
    id: 'purchase_completed',
    name: 'Compra completada',
    description: 'Cuando una venta pasa a Completada',
    icon: <ShoppingBag className="w-4 h-4" />,
    channels: ['whatsapp', 'email'],
    isActive: true,
  },
  {
    id: 'points_redeemed',
    name: 'Puntos canjeados',
    description: 'Cuando el cliente canjea un producto',
    icon: <Gift className="w-4 h-4" />,
    channels: ['whatsapp'],
    isActive: true,
  },
  {
    id: 'birthday_bonus',
    name: 'Puntos por cumpleaños',
    description: 'El día del cumpleaños del cliente',
    icon: <Cake className="w-4 h-4" />,
    channels: ['whatsapp', 'email'],
    isActive: true,
  },
];

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={clsx(
      'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent',
      'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-coffee-400 focus:ring-offset-1',
      checked ? 'bg-coffee-500' : 'bg-gray-300',
      disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
    )}
  >
    <span
      className={clsx(
        'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200',
        checked ? 'translate-x-4' : 'translate-x-0'
      )}
    />
  </button>
);

interface ChannelBadgesProps {
  channels: ChannelKey[];
  globalChannels: GlobalChannels;
}

const ChannelBadges: React.FC<ChannelBadgesProps> = ({ channels, globalChannels }) => (
  <div className="flex items-center gap-1.5">
    {channels.includes('whatsapp') && (
      <span
        className={clsx(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body font-semibold border',
          globalChannels.whatsapp
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-gray-100 text-gray-400 border-gray-200'
        )}
      >
        <MessageCircle className="w-3 h-3" />
        WhatsApp
      </span>
    )}
    {channels.includes('email') && (
      <span
        className={clsx(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body font-semibold border',
          globalChannels.email
            ? 'bg-blue-50 text-blue-700 border-blue-200'
            : 'bg-gray-100 text-gray-400 border-gray-200'
        )}
      >
        <Mail className="w-3 h-3" />
        Email
      </span>
    )}
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

export const NotificacionesPage: React.FC = () => {
  const [globalChannels, setGlobalChannels] = useState<GlobalChannels>({
    whatsapp: true,
    email: true,
  });

  const [events, setEvents] = useState<EventNotification[]>(DEFAULT_EVENTS);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleGlobalChannel = (channel: ChannelKey) => {
    setGlobalChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
  };

  const toggleEvent = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isActive: !e.isActive } : e))
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      {/* ═══════════════════════ HERO HEADER ═══════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-800 via-coffee-700 to-coffee-500 px-8 py-8 mb-6 shadow-coffee-lg">
        <div className="absolute top-0 right-0 w-72 h-72 bg-coffee-400/20 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cream-light/10 rounded-full translate-y-1/2 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-yellow-300" />
            </div>
            <span className="font-accent text-cream-light text-lg">Fidelización</span>
          </div>
          <h1 className="text-3xl font-display font-black text-white leading-tight mb-1">
            <span className="text-yellow-300">Notificaciones</span>
          </h1>
          <p className="text-coffee-200 font-body text-sm">
            Configura qué mensajes se envían al cliente por WhatsApp y email
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* ═══════════════════════ SECCIÓN 1: CANALES ═══════════════════════ */}
        <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
          <div className="px-5 py-3.5 border-b border-coffee-50 flex items-center gap-2">
            <Bell className="w-4 h-4 text-coffee-500" />
            <div>
              <h2 className="font-display font-semibold text-coffee-900">Canales de envío</h2>
              <p className="text-xs font-body text-coffee-400 mt-0.5">
                Desactiva un canal para pausar todas sus notificaciones a la vez
              </p>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* WhatsApp */}
            <div
              className={clsx(
                'relative flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200',
                globalChannels.whatsapp
                  ? 'bg-green-50 border-green-300'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              )}
            >
              <div
                className={clsx(
                  'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                  globalChannels.whatsapp ? 'bg-green-500' : 'bg-gray-300'
                )}
              >
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-coffee-900">WhatsApp</p>
                <p className="text-xs font-body text-coffee-500 mt-0.5">
                  {globalChannels.whatsapp
                    ? 'Enviando notificaciones'
                    : 'Canal pausado — no se envían mensajes'}
                </p>
              </div>
              <Toggle
                checked={globalChannels.whatsapp}
                onChange={() => toggleGlobalChannel('whatsapp')}
              />
            </div>

            {/* Email */}
            <div
              className={clsx(
                'relative flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200',
                globalChannels.email
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              )}
            >
              <div
                className={clsx(
                  'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
                  globalChannels.email ? 'bg-blue-500' : 'bg-gray-300'
                )}
              >
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-coffee-900">Email</p>
                <p className="text-xs font-body text-coffee-500 mt-0.5">
                  {globalChannels.email
                    ? 'Enviando notificaciones'
                    : 'Canal pausado — no se envían mensajes'}
                </p>
              </div>
              <Toggle
                checked={globalChannels.email}
                onChange={() => toggleGlobalChannel('email')}
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════ SECCIÓN 2: EVENTOS ═══════════════════════ */}
        <div className="bg-white rounded-2xl border border-coffee-100 shadow-coffee overflow-hidden">
          <div className="px-5 py-3.5 border-b border-coffee-50">
            <h2 className="font-display font-semibold text-coffee-900">
              Notificaciones automáticas
            </h2>
            <p className="text-xs font-body text-coffee-400 mt-0.5">
              Se envían solas cuando ocurre un evento en el sistema
            </p>
          </div>

          <div className="divide-y divide-coffee-50">
            {events.map((ev) => {
              const channelsBlocked = ev.channels.every((ch) => !globalChannels[ch]);
              const isEffectivelyOff = !ev.isActive || channelsBlocked;

              return (
                <div
                  key={ev.id}
                  className={clsx(
                    'flex items-center gap-4 px-5 py-4 transition-colors',
                    isEffectivelyOff ? 'opacity-50' : 'hover:bg-coffee-50/40'
                  )}
                >
                  {/* Toggle */}
                  <Toggle
                    checked={ev.isActive}
                    onChange={() => toggleEvent(ev.id)}
                    disabled={channelsBlocked}
                  />

                  {/* Icon */}
                  <div
                    className={clsx(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      isEffectivelyOff ? 'bg-gray-100 text-gray-400' : 'bg-coffee-100 text-coffee-600'
                    )}
                  >
                    {ev.icon}
                  </div>

                  {/* Name + description */}
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-coffee-900 text-sm">
                      {ev.name}
                    </p>
                    <p className="text-xs font-body text-coffee-400 mt-0.5">
                      {ev.description}
                    </p>
                    {channelsBlocked && (
                      <p className="text-xs font-body text-amber-600 mt-1">
                        Canal(es) desactivados globalmente
                      </p>
                    )}
                  </div>

                  {/* Channel badges */}
                  <div className="hidden sm:block flex-shrink-0">
                    <ChannelBadges channels={ev.channels} globalChannels={globalChannels} />
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>

    </MainLayout>
  );
};
