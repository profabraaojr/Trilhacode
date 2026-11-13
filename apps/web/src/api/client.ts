import type {
  AccountProfile,
  ProfileUpdate,
  ProgressDataPayload,
  UserRole,
} from '@trilhacode/shared';
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
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { erro?: string } | null;
    throw new ApiError(res.status, body?.erro ?? `O servidor respondeu com erro (${res.status}).`);
  }
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

export interface AdminUser extends Omit<AccountProfile, 'role'> {
  role: UserRole;
}

export const accountApi = {
  /** Perfil do usuário logado, ou null sem sessão. */
  async me(): Promise<AccountProfile | null> {
    try {
      return await request<AccountProfile>('/api/me');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  updateMe: (update: ProfileUpdate) =>
    request<AccountProfile>('/api/me', { method: 'PATCH', body: JSON.stringify(update) }),
  getProgress: () => request<ProgressDataPayload>('/api/progresso'),
  completeStep: (unitId: string, step: string) =>
    request<ProgressDataPayload>('/api/progresso/etapas', {
      method: 'POST',
      body: JSON.stringify({ unitId, step }),
    }),
  importProgress: (progress: ProgressDataPayload) =>
    request<ProgressDataPayload>('/api/progresso/importar', {
      method: 'POST',
      body: JSON.stringify(progress),
    }),
  listUsers: () => request<AdminUser[]>('/api/admin/usuarios'),
  setRole: (id: string, role: UserRole) =>
    request<{ id: string; role: UserRole }>(`/api/admin/usuarios/${encodeURIComponent(id)}/papel`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
};
