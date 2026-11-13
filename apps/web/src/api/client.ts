import type {
  AssessmentResult,
  TrackDetail,
  TrackSummary,
  UnitPayload,
} from '@trilhacode/content/types';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(
      0,
      'Não foi possível falar com o servidor. Verifique se a API está em funcionamento.',
    );
  }
  if (res.status === 404)
    throw new ApiError(404, 'Conteúdo não encontrado. Ele pode ter sido removido ou renomeado.');
  if (!res.ok) throw new ApiError(res.status, `O servidor respondeu com erro (${res.status}).`);
  return (await res.json()) as T;
}

/** Ids de unidade contêm barras; cada segmento é codificado separadamente. */
const encodePath = (id: string) => id.split('/').map(encodeURIComponent).join('/');

export const contentApi = {
  listTracks: () => request<TrackSummary[]>('/api/trilhas'),
  getTrack: (id: string) => request<TrackDetail>(`/api/trilhas/${encodeURIComponent(id)}`),
  getUnit: (id: string) => request<UnitPayload>(`/api/unidades/${encodePath(id)}`),
  submitAssessment: (unitId: string, respostas: Record<string, string>) =>
    request<AssessmentResult>(`/api/avaliacoes/${encodePath(unitId)}`, {
      method: 'POST',
      body: JSON.stringify({ respostas }),
    }),
};
