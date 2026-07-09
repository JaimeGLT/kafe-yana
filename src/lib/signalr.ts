import * as signalR from '@microsoft/signalr';

const HUB_URL = '/hubs/kafayana';

type Status = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface State {
  status: Status;
  lastError: string | null;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
}

type Handler = (...args: unknown[]) => void;

const initialState: State = {
  status: 'idle',
  lastError: null,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
};

let connection: signalR.HubConnection | null = null;
let startPromise: Promise<void> | null = null;
let stopRequested = false;

const joinedGroups = new Set<string>();
const handlersByEvent = new Map<string, Set<Handler>>();
const reconnectListeners = new Set<() => void>();
const disconnectListeners = new Set<(err: string | null) => void>();

const state: State = { ...initialState };
const stateListeners = new Set<(s: State) => void>();

function setState(patch: Partial<State>): void {
  Object.assign(state, patch);
  stateListeners.forEach(l => l(state));
}

function isDev(): boolean {
  return typeof import.meta !== 'undefined' && Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
}

function attachHandler(conn: signalR.HubConnection, event: string, handler: Handler): void {
  (conn.on as (e: string, h: Handler) => void)(event, handler);
}

function detachHandler(conn: signalR.HubConnection, event: string, handler: Handler): void {
  (conn.off as (e: string, h: Handler) => void)(event, handler);
}

function buildConnection(): signalR.HubConnection {
  const logLevel = isDev() ? signalR.LogLevel.Information : signalR.LogLevel.Warning;

  const conn = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, { withCredentials: true })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: ctx => {
        const delays = [0, 2000, 5000, 10000, 20000, 30000];
        if (ctx.previousRetryCount >= delays.length) return null;
        return delays[ctx.previousRetryCount];
      },
    })
    .configureLogging(logLevel)
    .build();

  conn.onreconnecting(err => {
    const msg = err?.message ?? null;
    setState({ status: 'reconnecting', lastError: msg });
    disconnectListeners.forEach(l => l(msg));
  });

  conn.onreconnected(async () => {
    setState({ status: 'connected', lastError: null, lastConnectedAt: Date.now() });
    try {
      await Promise.all(Array.from(joinedGroups).map(g => conn.invoke('UnirseAGrupo', g)));
    } catch (e) {
      console.warn('[signalr] Failed to re-join groups after reconnect', e);
    }
    reconnectListeners.forEach(l => {
      try { l(); } catch (e) { console.error(e); }
    });
  });

  conn.onclose(err => {
    const msg = err?.message ?? null;
    setState({ status: 'disconnected', lastError: msg, lastDisconnectedAt: Date.now() });
    disconnectListeners.forEach(l => l(msg));
    if (!stopRequested) {
      void ensureStarted();
    }
  });

  handlersByEvent.forEach((set, event) => {
    set.forEach(h => { attachHandler(conn, event, h); });
  });

  return conn;
}

function getConnection(): signalR.HubConnection {
  if (!connection) connection = buildConnection();
  return connection;
}

async function ensureStarted(): Promise<void> {
  if (startPromise) return startPromise;
  const conn = getConnection();
  if (conn.state === signalR.HubConnectionState.Connected) {
    setState({ status: 'connected' });
    return;
  }
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    stopRequested = false;
    setState({ status: 'connecting' });
    startPromise = conn
      .start()
      .then(() => {
        setState({ status: 'connected', lastError: null, lastConnectedAt: Date.now() });
        return Promise.all(Array.from(joinedGroups).map(g => conn.invoke('UnirseAGrupo', g)));
      })
      .then(() => undefined)
      .catch(err => {
        setState({ status: 'disconnected', lastError: err instanceof Error ? err.message : 'No se pudo conectar' });
        throw err;
      })
      .finally(() => {
        startPromise = null;
      });
    return startPromise;
  }
  return Promise.resolve();
}

async function startConnection(): Promise<void> {
  await ensureStarted();
}

async function stopConnection(): Promise<void> {
  stopRequested = true;
  const conn = connection;
  startPromise = null;
  if (!conn) return;
  if (conn.state !== signalR.HubConnectionState.Disconnected) {
    try {
      await conn.stop();
    } catch (e) {
      console.warn('[signalr] stop() error', e);
    }
  }
  setState({ status: 'disconnected' });
}

async function joinGroup(group: string): Promise<void> {
  const g = group.toLowerCase();
  const wasNew = !joinedGroups.has(g);
  joinedGroups.add(g);
  const conn = getConnection();
  if (!wasNew) return;
  await ensureStarted();
  if (conn.state === signalR.HubConnectionState.Connected) {
    await conn.invoke('UnirseAGrupo', g);
  }
}

async function leaveGroup(group: string): Promise<void> {
  const g = group.toLowerCase();
  if (!joinedGroups.delete(g)) return;
  const conn = connection;
  if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
  try {
    await conn.invoke('AbandonarGrupo', g);
  } catch (e) {
    console.warn('[signalr] leaveGroup error', e);
  }
}

function on(event: string, handler: Handler): void {
  let set = handlersByEvent.get(event);
  if (!set) {
    set = new Set();
    handlersByEvent.set(event, set);
  }
  set.add(handler);
  if (connection) attachHandler(connection, event, handler);
}

function off(event: string, handler: Handler): void {
  const set = handlersByEvent.get(event);
  if (set) set.delete(handler);
  if (connection) detachHandler(connection, event, handler);
}

function onReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener);
  return () => { reconnectListeners.delete(listener); };
}

function onDisconnect(listener: (err: string | null) => void): () => void {
  disconnectListeners.add(listener);
  return () => { disconnectListeners.delete(listener); };
}

function subscribe(listener: (s: State) => void): () => void {
  stateListeners.add(listener);
  return () => { stateListeners.delete(listener); };
}

function getState(): State {
  return state;
}

export { getConnection, startConnection, stopConnection, joinGroup, leaveGroup, on, off, onReconnect, onDisconnect, subscribe, getState };
export type { State as SignalRState, Status as SignalRStatus, Handler as SignalRHandler };