import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  joinGroup,
  leaveGroup,
  on,
  off,
  onReconnect,
  subscribe,
  getState,
  type SignalRState,
} from '../lib/signalr';

interface UseSubscriptionOptions {
  group?: string;
  onReconnect?: () => void;
}

// Usamos `any[]` para los argumentos (no en el retorno) por contravarianza:
// permite que cada handler declarado con tipos concretos (ej. `data: { Total: number }`)
// sea asignable a esta firma.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => void;

export function useSignalRSubscription(
  events: Record<string, AnyHandler>,
  options: UseSubscriptionOptions = {},
): void {
  const { group, onReconnect: onReconnectCb } = options;

  const eventsRef = useRef(events);
  const cbRef = useRef(onReconnectCb);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    cbRef.current = onReconnectCb;
  }, [onReconnectCb]);

  // Sólo nos re-suscribimos cuando cambia el grupo. Los handlers se leen vía
  // eventsRef.current para que cambios en `events` no re-registren handlers
  // en SignalR en cada render.
  useEffect(() => {
    if (group) {
      joinGroup(group).catch(err => console.warn('[useSignalRSubscription] joinGroup failed', err));
    }

    const wrappers: Array<[string, AnyHandler]> = Object.keys(events).map(event => [
      event,
      (...args: unknown[]) => { eventsRef.current[event]?.(...args); },
    ]);

    wrappers.forEach(([event, wrapper]) => on(event, wrapper));

    const cleanupReconnect = onReconnect(() => { cbRef.current?.(); });

    return () => {
      wrappers.forEach(([event, wrapper]) => {
        try { off(event, wrapper); } catch (e) { console.error(e); }
      });
      cleanupReconnect();
      if (group) {
        leaveGroup(group).catch(err => console.warn('[useSignalRSubscription] leaveGroup failed', err));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);
}

export function useSignalRStatus(): SignalRState {
  return useSyncExternalStore(subscribe, getState, getState);
}