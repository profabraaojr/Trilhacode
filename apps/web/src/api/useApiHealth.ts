import { healthResponseSchema, type HealthResponse } from '@trilhacode/shared';
import { useEffect, useState } from 'react';

export type ApiStatus =
  | { state: 'checking' }
  | { state: 'online'; health: HealthResponse }
  | { state: 'degraded'; health: HealthResponse }
  | { state: 'offline' };

const API_BASE = import.meta.env.VITE_API_URL ?? '';
const POLL_MS = 30_000;
const TIMEOUT_MS = 4_000;

export async function fetchHealth(signal?: AbortSignal): Promise<ApiStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
        : AbortSignal.timeout(TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    const parsed = healthResponseSchema.safeParse(await res.json());
    if (!parsed.success) return { state: 'offline' };
    return parsed.data.status === 'ok'
      ? { state: 'online', health: parsed.data }
      : { state: 'degraded', health: parsed.data };
  } catch {
    return { state: 'offline' };
  }
}

/** Consulta /api/health ao montar, a cada 30 s e quando a janela volta ao foco. */
export function useApiHealth(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>({ state: 'checking' });

  useEffect(() => {
    const controller = new AbortController();
    const check = () => {
      void fetchHealth(controller.signal).then((s) => {
        if (!controller.signal.aborted) setStatus(s);
      });
    };
    check();
    const timer = window.setInterval(check, POLL_MS);
    window.addEventListener('focus', check);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
    };
  }, []);

  return status;
}

export const API_STATUS_LABEL: Record<ApiStatus['state'], string> = {
  checking: 'Verificando servidor…',
  online: 'Servidor conectado',
  degraded: 'Servidor sem banco de dados',
  offline: 'Servidor indisponível',
};
