import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { useSignalRStatus } from '../../hooks/useSignalRSubscription';

const labels: Record<string, { text: string; tone: string; icon: typeof Wifi }> = {
  idle:        { text: 'Iniciando…',  tone: 'border-coffee-200 bg-coffee-50 text-coffee-700',          icon: RefreshCw },
  connecting:  { text: 'Conectando…', tone: 'border-amber-200 bg-amber-50 text-amber-700',             icon: RefreshCw },
  connected:   { text: 'En vivo',     tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',       icon: Wifi },
  reconnecting:{ text: 'Reconectando…', tone: 'border-amber-200 bg-amber-50 text-amber-700',           icon: RefreshCw },
  disconnected:{ text: 'Sin conexión', tone: 'border-red-200 bg-red-50 text-red-700',                  icon: WifiOff },
};

export const ConnectionStatusBadge: React.FC = () => {
  const status = useSignalRStatus();
  const cfg = labels[status.status] ?? labels.idle;
  const Icon = cfg.icon;
  const spinning = status.status === 'connecting' || status.status === 'reconnecting';

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
        cfg.tone,
      )}
      title={
        status.lastError
          ? `Estado: ${status.status} — ${status.lastError}`
          : `Estado tiempo real: ${status.status}`
      }
    >
      <Icon className={clsx('h-3.5 w-3.5', spinning && 'animate-spin')} />
      <span>{cfg.text}</span>
    </div>
  );
};