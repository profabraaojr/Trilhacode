import type {
  AddStudentResult,
  AssignmentInput,
  ClassroomDashboard,
  ClassroomDetail,
  ClassroomInput,
  ClassroomSummary,
  CustomAssessmentInput,
  CustomAssessmentPublic,
  CustomAssessmentResult,
  Evolution,
  GlossaryTerm,
  GlossaryTermInput,
  MyClassroom,
  StudentGlossary,
  StudentRow,
} from '@trilhacode/shared';
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
  if (res.status === 204) return undefined as T;
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
  recordChallenge: (unitId: string, passed: number, total: number) =>
    request<ProgressDataPayload>('/api/progresso/desafio', {
      method: 'POST',
      body: JSON.stringify({ unitId, passed, total }),
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

/* ------------------------------------------------------------ Turmas */

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});
const enc = encodeURIComponent;

export const classroomApi = {
  list: () => request<ClassroomSummary[]>('/api/turmas'),
  mine: () => request<MyClassroom[]>('/api/minhas-turmas'),
  create: (input: ClassroomInput) => request<{ id: string }>('/api/turmas', json('POST', input)),
  get: (id: string) => request<ClassroomDetail>(`/api/turmas/${enc(id)}`),
  update: (id: string, input: ClassroomInput) =>
    request(`/api/turmas/${enc(id)}`, json('PATCH', input)),
  remove: (id: string) => request(`/api/turmas/${enc(id)}`, json('DELETE')),
  dashboard: (id: string) => request<ClassroomDashboard>(`/api/turmas/${enc(id)}/painel`),
  reportUrl: (id: string) => `${API_BASE}/api/turmas/${enc(id)}/relatorio.csv`,
  addStudents: (id: string, students: StudentRow[]) =>
    request<AddStudentResult[]>(`/api/turmas/${enc(id)}/alunos`, json('POST', { students })),
  removeStudent: (id: string, userId: string) =>
    request(`/api/turmas/${enc(id)}/alunos/${enc(userId)}`, json('DELETE')),
  cancelInvite: (id: string, inviteId: string) =>
    request(`/api/turmas/${enc(id)}/convites/${enc(inviteId)}`, json('DELETE')),
  addTeacher: (id: string, email: string) =>
    request(`/api/turmas/${enc(id)}/professores`, json('POST', { email })),
  removeTeacher: (id: string, userId: string) =>
    request(`/api/turmas/${enc(id)}/professores/${enc(userId)}`, json('DELETE')),
  assign: (id: string, input: AssignmentInput) =>
    request(`/api/turmas/${enc(id)}/trilhas`, json('PUT', input)),
  unassign: (id: string, trackId: string) =>
    request(`/api/turmas/${enc(id)}/trilhas/${enc(trackId)}`, json('DELETE')),
  createAssessment: (id: string, input: CustomAssessmentInput) =>
    request<{ id: string }>(`/api/turmas/${enc(id)}/avaliacoes`, json('POST', input)),
  deleteAssessment: (assessmentId: string) =>
    request(`/api/avaliacoes-turma/${enc(assessmentId)}`, json('DELETE')),
  getAssessment: (assessmentId: string) =>
    request<CustomAssessmentPublic>(`/api/avaliacoes-turma/${enc(assessmentId)}`),
  answerAssessment: (assessmentId: string, respostas: Record<string, number>) =>
    request<CustomAssessmentResult>(
      `/api/avaliacoes-turma/${enc(assessmentId)}/respostas`,
      json('POST', { respostas }),
    ),
};

/* ------------------------------------------------------------ Glossário e evolução */

export const glossaryApi = {
  list: () => request<GlossaryTerm[]>('/api/glossario'),
  create: (input: GlossaryTermInput) =>
    request<GlossaryTerm>('/api/glossario', json('POST', input)),
  update: (id: string, input: GlossaryTermInput) =>
    request<GlossaryTerm>(`/api/glossario/${enc(id)}`, json('PUT', input)),
  remove: (id: string) => request<void>(`/api/glossario/${enc(id)}`, json('DELETE')),
  importTerms: (terms: GlossaryTermInput[]) =>
    request<GlossaryTerm[]>('/api/glossario/importar', json('POST', { terms })),
  ofStudent: (classroomId: string, userId: string) =>
    request<StudentGlossary>(`/api/turmas/${enc(classroomId)}/alunos/${enc(userId)}/glossario`),
};

export const evolutionApi = {
  get: () => request<Evolution>('/api/evolucao'),
};
