import type {
  AssessmentResult,
  ContentFile,
  TrackDetail,
  TrackSummary,
  UnitPayload,
} from '@trilhacode/content/types';
import { UNIT_STEPS, type UnitStepId } from '@trilhacode/shared';
import type { AccountStore } from '../account/accountStore';
import { accountApi, contentApi } from '../api/client';
import { Store } from '../lib/store';
import { DEFAULT_PROJECT, type ProjectStore } from '../project/projectStore';
import type { RunStore } from '../project/runStore';
import type { RecordStorage } from '../project/storage';
import {
  emptyProgress,
  isProgressData,
  nextStep,
  PROGRESS_KEY,
  type ProgressData,
} from './progress';

type Load<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; data?: T; error?: string };

export type Workspace = 'demonstracao' | 'experimentacao' | 'desafio';
export type FocusArea = 'conteudo' | 'codigo' | 'resultado';

export interface LearningState {
  tracks: Load<TrackSummary[]>;
  track: Load<TrackDetail>;
  /** A aba do mapa está aberta / em primeiro plano na área do editor. */
  mapOpen: boolean;
  mapActive: boolean;
  unit: Load<UnitPayload>;
  step: UnitStepId;
  progress: ProgressData;
  assessment: { submitting: boolean; result: AssessmentResult | null; error?: string };
  /** Pedido para a interface mostrar uma área (no celular troca a aba; no computador expande o painel). */
  focus: { area: FocusArea; nonce: number } | null;
}

const WORKSPACE_LABEL: Record<Workspace, string> = {
  demonstracao: 'Exemplo',
  experimentacao: 'Experimento',
  desafio: 'Desafio',
};

export const workspaceKey = (unitId: string, w: Workspace) => `unidade:${unitId}:${w}`;

export function parseWorkspaceKey(key: string): { unitId: string; workspace: Workspace } | null {
  const m = /^unidade:(.+):(demonstracao|experimentacao|desafio)$/.exec(key);
  return m ? { unitId: m[1]!, workspace: m[2] as Workspace } : null;
}

export class LearningStore extends Store<LearningState> {
  private storage: RecordStorage | null = null;
  private nonce = 0;

  constructor(
    private readonly project: ProjectStore,
    private readonly run: RunStore,
    private readonly account: AccountStore,
  ) {
    super({
      tracks: { status: 'idle' },
      track: { status: 'idle' },
      mapOpen: false,
      mapActive: false,
      unit: { status: 'idle' },
      step: 'apresentacao',
      progress: emptyProgress(),
      assessment: { submitting: false, result: null },
      focus: null,
    });
    this.watchRuns();
    this.watchAccount();
  }

  private signedIn() {
    return this.account.getState().status === 'signed-in';
  }

  /**
   * Com login, o progresso vem da conta. No primeiro login, o que estava só no
   * navegador é importado para a conta e apagado do navegador. Ao sair, volta o local.
   */
  private watchAccount() {
    let last = this.account.getState().status;
    this.account.subscribe(() => {
      const status = this.account.getState().status;
      if (status === last) return;
      last = status;
      if (status === 'signed-in') void this.loadAccountProgress();
      if (status === 'anonymous') void this.loadLocalProgress();
    });
  }

  private async loadLocalProgress() {
    try {
      const v = await this.storage?.get(PROGRESS_KEY);
      this.setState({ progress: isProgressData(v) ? v : emptyProgress() });
    } catch {
      this.setState({ progress: emptyProgress() });
    }
  }

  private async loadAccountProgress() {
    try {
      const local = await this.storage?.get(PROGRESS_KEY);
      let progress: ProgressData;
      if (isProgressData(local) && Object.keys(local.units).length > 0) {
        progress = await accountApi.importProgress(local);
        await this.storage?.set(PROGRESS_KEY, emptyProgress());
      } else {
        progress = await accountApi.getProgress();
      }
      if (this.signedIn()) this.setState({ progress });
    } catch {
      /* sem conexão: mantém o que está na tela */
    }
  }

  async init(storage: RecordStorage) {
    this.storage = storage;
    if (this.signedIn()) await this.loadAccountProgress();
    else await this.loadLocalProgress();
  }

  async loadTracks() {
    if (this.state.tracks.status === 'loading') return;
    this.setState({ tracks: { status: 'loading', data: this.state.tracks.data } });
    try {
      this.setState({ tracks: { status: 'ready', data: await contentApi.listTracks() } });
    } catch (e) {
      this.setState({ tracks: { status: 'error', error: (e as Error).message } });
    }
  }

  async openTrack(id: string, showMap = true) {
    if (this.state.track.data?.id !== id || this.state.track.status === 'error') {
      this.setState({ track: { status: 'loading' } });
      try {
        this.setState({ track: { status: 'ready', data: await contentApi.getTrack(id) } });
      } catch (e) {
        this.setState({ track: { status: 'error', error: (e as Error).message } });
      }
    }
    if (showMap) {
      this.setState({ mapOpen: true, mapActive: true });
      this.requestFocus('codigo');
    }
  }

  setMapActive(active: boolean) {
    this.setState({ mapActive: active && this.state.mapOpen });
  }

  closeMap() {
    this.setState({ mapOpen: false, mapActive: false });
  }

  async openUnit(id: string) {
    this.setState({ unit: { status: 'loading' }, assessment: { submitting: false, result: null } });
    this.requestFocus('conteudo');
    try {
      const unit = await contentApi.getUnit(id);
      this.setState({
        unit: { status: 'ready', data: unit },
        step: nextStep(this.state.progress.units[id]),
      });
      if (this.state.track.data?.id !== unit.trilhaId) void this.openTrack(unit.trilhaId, false);
    } catch (e) {
      this.setState({ unit: { status: 'error', error: (e as Error).message } });
    }
  }

  closeUnit() {
    this.setState({ unit: { status: 'idle' } });
  }

  setStep(step: UnitStepId) {
    this.setState({ step, assessment: { submitting: false, result: null } });
  }

  goToNextStep() {
    const i = UNIT_STEPS.findIndex((s) => s.id === this.state.step);
    const next = UNIT_STEPS[i + 1];
    if (next) this.setStep(next.id);
  }

  completeStep(step: UnitStepId, unitId = this.state.unit.data?.id) {
    if (!unitId) return;
    const current = this.state.progress.units[unitId] ?? { steps: {}, attempts: 0 };
    if (current.steps[step]) return;
    this.updateUnitProgress(unitId, {
      ...current,
      steps: { ...current.steps, [step]: new Date().toISOString() },
    });
    // A avaliação é registrada pelo próprio servidor ao corrigir.
    if (this.signedIn() && step !== 'avaliacao') {
      void accountApi
        .completeStep(unitId, step)
        .then((progress) => this.signedIn() && this.setState({ progress }))
        .catch(() => undefined);
    }
  }

  /** Abre no editor os arquivos de uma etapa (exemplo, experimento ou desafio). */
  async openWorkspace(workspace: Workspace) {
    const unit = this.state.unit.data;
    if (!unit) return;
    const files: ContentFile[] =
      workspace === 'demonstracao'
        ? unit.conteudo.etapas.demonstracao.arquivos
        : workspace === 'experimentacao'
          ? unit.conteudo.etapas.experimentacao.arquivos
          : unit.conteudo.etapas.desafio.arquivos;
    await this.project.switchProject(
      workspaceKey(unit.id, workspace),
      `${WORKSPACE_LABEL[workspace]} · ${unit.titulo}`,
      files,
    );
    this.setMapActive(false);
    this.run.requestRun();
    this.requestFocus('codigo');
  }

  async backToMyProject() {
    await this.project.switchProject(DEFAULT_PROJECT.key, DEFAULT_PROJECT.label);
    this.run.requestRun();
  }

  /** Executa o desafio com os testes; o resultado chega pelo RunStore. */
  async verifyChallenge() {
    const unit = this.state.unit.data;
    if (!unit) return;
    const key = workspaceKey(unit.id, 'desafio');
    if (this.project.getState().projectKey !== key) await this.openWorkspace('desafio');
    this.run.requestRun(unit.conteudo.etapas.desafio.testes);
    this.requestFocus('resultado');
  }

  async submitAssessment(respostas: Record<string, string>) {
    const unit = this.state.unit.data;
    if (!unit) return;
    this.setState({ assessment: { submitting: true, result: null } });
    try {
      const result = await contentApi.submitAssessment(unit.id, respostas);
      this.setState({ assessment: { submitting: false, result } });
      const current = this.state.progress.units[unit.id] ?? { steps: {}, attempts: 0 };
      const bestScore = Math.max(current.bestScore ?? 0, result.nota);
      const steps = result.aprovado
        ? { ...current.steps, avaliacao: current.steps.avaliacao ?? new Date().toISOString() }
        : current.steps;
      this.updateUnitProgress(unit.id, { steps, bestScore, attempts: current.attempts + 1 });
    } catch (e) {
      this.setState({
        assessment: { submitting: false, result: null, error: (e as Error).message },
      });
    }
  }

  requestFocus(area: FocusArea) {
    this.setState({ focus: { area, nonce: ++this.nonce } });
  }

  private updateUnitProgress(unitId: string, value: ProgressData['units'][string]) {
    const progress: ProgressData = {
      ...this.state.progress,
      units: { ...this.state.progress.units, [unitId]: value },
    };
    this.setState({ progress });
    if (!this.signedIn()) void this.storage?.set(PROGRESS_KEY, progress).catch(() => undefined);
  }

  /**
   * Conclusões automáticas: o experimento conta quando o aluno o executa; o desafio,
   * quando todos os testes passam.
   */
  private watchRuns() {
    let lastStatus = this.run.getState().status;
    let lastResults = this.run.getState().testResults;
    this.run.subscribe(() => {
      const { status, testResults } = this.run.getState();
      if (status !== lastStatus) {
        lastStatus = status;
        const ws = parseWorkspaceKey(this.project.getState().projectKey);
        if (status === 'finished' && ws?.workspace === 'experimentacao')
          this.completeStep('experimentacao', ws.unitId);
      }
      if (testResults && testResults !== lastResults) {
        lastResults = testResults;
        const ws = parseWorkspaceKey(testResults.projectKey);
        if (
          ws?.workspace === 'desafio' &&
          testResults.results.length &&
          testResults.results.every((r) => r.ok)
        ) {
          this.completeStep('desafio', ws.unitId);
        }
      }
    });
  }
}
