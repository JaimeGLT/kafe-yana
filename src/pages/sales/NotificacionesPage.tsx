import React, { useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Bell, MessageCircle, Mail, Pencil, CheckCircle,
  ShoppingBag, Gift, Cake, ChevronRight,
} from 'lucide-react';
import { MainLayout } from '../../components/layout';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelKey = 'whatsapp' | 'email';

interface ChannelMessages {
  whatsapp: string;
  emailSubject: string;
  emailBody: string;
}

interface EventNotification {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  channels: ChannelKey[];   // which channels this event uses (fixed per event in Phase 1)
  isActive: boolean;
  messages: ChannelMessages;
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
    messages: {
      whatsapp:
        'Hola {nombre_cliente} 👋 ¡Gracias por tu compra de Bs. {total_compra}!\n\nGanaste *{puntos_ganados} puntos*. Tu saldo actual es *{saldo_actual} puntos*.\n\n¡Nos vemos pronto en Kafe Yana! ☕',
      emailSubject: '¡Gracias por tu compra en Kafe Yana, {nombre_cliente}!',
      emailBody:
        'Hola {nombre_cliente},\n\nGracias por visitarnos. Tu compra de Bs. {total_compra} fue registrada con éxito.\n\nGanaste {puntos_ganados} puntos con esta compra.\nTu saldo actual es: {saldo_actual} puntos.\n\n¡Te esperamos pronto!\nEl equipo de Kafe Yana',
    },
  },
  {
    id: 'points_redeemed',
    name: 'Puntos canjeados',
    description: 'Cuando el cliente canjea un producto',
    icon: <Gift className="w-4 h-4" />,
    channels: ['whatsapp'],
    isActive: true,
    messages: {
      whatsapp:
        'Hola {nombre_cliente} 🎁 ¡Canjeaste *{puntos_canjeados} puntos* por *{producto_canjeado}*!\n\nTu saldo restante es *{saldo_actual} puntos*. ¡Disfrútalo!',
      emailSubject: 'Canje realizado — {producto_canjeado}',
      emailBody: '',
    },
  },
  {
    id: 'birthday_bonus',
    name: 'Puntos por cumpleaños',
    description: 'El día del cumpleaños del cliente',
    icon: <Cake className="w-4 h-4" />,
    channels: ['whatsapp', 'email'],
    isActive: true,
    messages: {
      whatsapp:
        '¡Feliz cumpleaños {nombre_cliente}! 🎂🎉\n\nHoy es tu día especial, y en Kafe Yana te lo celebramos: *tus puntos de hoy son ×3*.\n\nSaldo actual: *{saldo_actual} puntos*.\n\n¡Ven a celebrar con nosotros! ☕🎈',
      emailSubject: '¡Feliz cumpleaños, {nombre_cliente}! 🎂 Hoy tus puntos se triplican',
      emailBody:
        'Hola {nombre_cliente},\n\n¡Hoy es tu día especial! En Kafe Yana queremos celebrarlo contigo.\n\nComo regalo de cumpleaños, todos los puntos que ganes hoy se triplican automáticamente.\n\nTu saldo actual: {saldo_actual} puntos.\n\n¡Te esperamos hoy en el café!\nEl equipo de Kafe Yana',
    },
  },
];

// ─── Variables disponibles ────────────────────────────────────────────────────

const VARIABLES = [
  { key: '{nombre_cliente}',  label: 'Nombre del cliente' },
  { key: '{puntos_ganados}',  label: 'Puntos ganados' },
  { key: '{puntos_canjeados}',label: 'Puntos canjeados' },
  { key: '{saldo_actual}',    label: 'Saldo actual' },
  { key: '{producto_canjeado}',label: 'Producto canjeado' },
  { key: '{total_compra}',    label: 'Total de la compra' },
];

// Sample data for preview
const SAMPLE: Record<string, string> = {
  '{nombre_cliente}':   'Ana Quispe',
  '{puntos_ganados}':   '15',
  '{puntos_canjeados}': '20',
  '{saldo_actual}':     '340',
  '{producto_canjeado}':'Café Americano',
  '{total_compra}':     '150',
};

function renderPreview(text: string): string {
  let out = text;
  for (const [key, val] of Object.entries(SAMPLE)) out = out.replaceAll(key, val);
  return out;
}

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

// ─── Message editor inside modal ──────────────────────────────────────────────

interface EditorPanelProps {
  channel: ChannelKey;
  subject?: string;
  onSubjectChange?: (v: string) => void;
  message: string;
  onMessageChange: (v: string) => void;
}

const WHATSAPP_WARN = 400;

const EditorPanel: React.FC<EditorPanelProps> = ({
  channel, subject, onSubjectChange, message, onMessageChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isWA = channel === 'whatsapp';
  const charCount = message.length;

  const insertVar = useCallback((variable: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = message.substring(0, start) + variable + message.substring(end);
    onMessageChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = start + variable.length;
      el.selectionEnd = start + variable.length;
      el.focus();
    });
  }, [message, onMessageChange]);

  return (
    <div className="space-y-4">
      {/* Subject — email only */}
      {!isWA && onSubjectChange && (
        <div>
          <label className="block text-xs font-body font-semibold text-coffee-600 uppercase tracking-wide mb-1.5">
            Asunto del email
          </label>
          <input
            type="text"
            value={subject ?? ''}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Escribe el asunto..."
            className="w-full rounded-xl border border-coffee-200 px-3 py-2.5 text-sm font-body text-coffee-900 placeholder-coffee-300 focus:outline-none focus:ring-2 focus:ring-coffee-400 transition-colors"
          />
        </div>
      )}

      {/* Message textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-body font-semibold text-coffee-600 uppercase tracking-wide">
            Mensaje
          </label>
          {isWA && (
            <span
              className={clsx(
                'text-xs font-body font-semibold tabular-nums',
                charCount > WHATSAPP_WARN ? 'text-amber-600' : 'text-coffee-400'
              )}
            >
              {charCount} caracteres
              {charCount > WHATSAPP_WARN && ' — mensajes largos pueden cortarse'}
            </span>
          )}
        </div>
        <textarea
          ref={textareaRef}
          rows={isWA ? 5 : 7}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          className="w-full rounded-xl border border-coffee-200 px-3 py-2.5 text-sm font-body text-coffee-900 placeholder-coffee-300 focus:outline-none focus:ring-2 focus:ring-coffee-400 transition-colors resize-none"
          placeholder="Escribe el mensaje..."
        />
      </div>

      {/* Variable chips */}
      <div>
        <p className="text-xs font-body text-coffee-500 mb-2">
          Variables disponibles — clic para insertar en el cursor:
        </p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVar(v.key)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-coffee-50 border border-coffee-200 text-xs font-body font-medium text-coffee-700 hover:bg-coffee-100 hover:border-coffee-300 transition-colors"
            >
              <span className="font-display font-bold text-coffee-500 text-xs">{'{}'}</span>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {message.trim() && (
        <div>
          <p className="text-xs font-body font-semibold text-coffee-500 uppercase tracking-wide mb-2">
            Vista previa
          </p>
          <div
            className={clsx(
              'rounded-xl p-4 text-sm font-body whitespace-pre-wrap leading-relaxed',
              isWA
                ? 'bg-[#d9fdd3] text-gray-800 border border-green-200'
                : 'bg-blue-50 text-gray-800 border border-blue-100'
            )}
          >
            {renderPreview(message)}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const NotificacionesPage: React.FC = () => {
  const [globalChannels, setGlobalChannels] = useState<GlobalChannels>({
    whatsapp: true,
    email: true,
  });

  const [events, setEvents] = useState<EventNotification[]>(DEFAULT_EVENTS);

  // Editor modal
  const [editingEvent, setEditingEvent] = useState<EventNotification | null>(null);
  const [editorTab, setEditorTab] = useState<ChannelKey>('whatsapp');

  // Draft state for the editor
  const [draftWhatsapp, setDraftWhatsapp] = useState('');
  const [draftEmailSubject, setDraftEmailSubject] = useState('');
  const [draftEmailBody, setDraftEmailBody] = useState('');

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleGlobalChannel = (channel: ChannelKey) => {
    setGlobalChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
  };

  const toggleEvent = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isActive: !e.isActive } : e))
    );
  };

  const openEditor = (ev: EventNotification) => {
    setEditingEvent(ev);
    setDraftWhatsapp(ev.messages.whatsapp);
    setDraftEmailSubject(ev.messages.emailSubject);
    setDraftEmailBody(ev.messages.emailBody);
    setEditorTab(ev.channels[0]);
  };

  const saveEditor = () => {
    if (!editingEvent) return;
    setEvents((prev) =>
      prev.map((e) =>
        e.id === editingEvent.id
          ? {
              ...e,
              messages: {
                whatsapp: draftWhatsapp,
                emailSubject: draftEmailSubject,
                emailBody: draftEmailBody,
              },
            }
          : e
      )
    );
    setEditingEvent(null);
    toast.success('Mensaje guardado');
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

                  {/* Edit button */}
                  <button
                    onClick={() => openEditor(ev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-semibold text-coffee-600 border border-coffee-200 hover:bg-coffee-100 hover:border-coffee-300 transition-colors flex-shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar mensaje
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ EDITOR MODAL ═══════════════════════ */}
      <Modal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title={editingEvent ? `Editar mensaje — ${editingEvent.name}` : ''}
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={() => setEditingEvent(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={saveEditor} leftIcon={<CheckCircle className="w-4 h-4" />}>
              Guardar mensaje
            </Button>
          </div>
        }
      >
        {editingEvent && (
          <div className="space-y-4">
            {/* Event info strip */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-coffee-50 border border-coffee-100">
              <div className="w-8 h-8 rounded-lg bg-coffee-200 text-coffee-700 flex items-center justify-center flex-shrink-0">
                {editingEvent.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body font-semibold text-coffee-800">{editingEvent.name}</p>
                <p className="text-xs font-body text-coffee-500">{editingEvent.description}</p>
              </div>
              <ChannelBadges channels={editingEvent.channels} globalChannels={globalChannels} />
            </div>

            {/* Channel tabs — only if event uses both channels */}
            {editingEvent.channels.length > 1 && (
              <div className="bg-coffee-50 rounded-xl p-1 flex gap-1">
                {editingEvent.channels.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setEditorTab(ch)}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-body font-medium transition-all duration-200',
                      editorTab === ch
                        ? 'bg-white shadow text-coffee-900'
                        : 'text-coffee-500 hover:text-coffee-700'
                    )}
                  >
                    {ch === 'whatsapp' ? (
                      <MessageCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Mail className="w-4 h-4 text-blue-600" />
                    )}
                    {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
                    <ChevronRight className={clsx('w-3.5 h-3.5 transition-transform', editorTab === ch && 'rotate-90')} />
                  </button>
                ))}
              </div>
            )}

            {/* Editor panel */}
            {(editingEvent.channels.length === 1 ? editingEvent.channels[0] : editorTab) === 'whatsapp' && (
              <EditorPanel
                channel="whatsapp"
                message={draftWhatsapp}
                onMessageChange={setDraftWhatsapp}
              />
            )}
            {(editingEvent.channels.length === 1 ? editingEvent.channels[0] : editorTab) === 'email' && (
              <EditorPanel
                channel="email"
                subject={draftEmailSubject}
                onSubjectChange={setDraftEmailSubject}
                message={draftEmailBody}
                onMessageChange={setDraftEmailBody}
              />
            )}
          </div>
        )}
      </Modal>
    </MainLayout>
  );
};
