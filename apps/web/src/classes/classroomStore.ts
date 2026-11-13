import { Store } from '../lib/store';

/**
 * Página aberta na área central para a gestão pedagógica: a página de uma turma
 * (professor) ou uma avaliação complementar (aluno). Convive com as abas de arquivo
 * e o mapa da trilha; só uma página especial fica em primeiro plano por vez.
 */
export type ClassroomPage =
  | { kind: 'turma'; id: string; title: string }
  | { kind: 'avaliacao'; id: string; title: string }
  /** Histórico completo do aluno (Minha evolução). */
  | { kind: 'evolucao'; id: 'historico'; title: string };

export interface ClassroomState {
  page: ClassroomPage | null;
  active: boolean;
  /** Aumenta quando listas devem ser recarregadas (turma criada, aluno adicionado...). */
  revision: number;
}

export class ClassroomStore extends Store<ClassroomState> {
  constructor() {
    super({ page: null, active: false, revision: 0 });
  }
  open(page: ClassroomPage) {
    this.setState({ page, active: true });
  }
  setActive(active: boolean) {
    this.setState({ active: active && !!this.state.page });
  }
  close() {
    this.setState({ page: null, active: false });
  }
  rename(title: string) {
    if (this.state.page) this.setState({ page: { ...this.state.page, title } });
  }
  changed() {
    this.setState({ revision: this.state.revision + 1 });
  }
}
