import { Store } from '../lib/store';

export interface EditorStatusState {
  cursor: { line: number; column: number } | null;
  problems: { errors: number; warnings: number };
  /** Pedido para o editor mostrar uma linha (vindo do console). */
  reveal: { file: string; line: number; nonce: number } | null;
}

export class EditorStatusStore extends Store<EditorStatusState> {
  private nonce = 0;
  constructor() {
    super({ cursor: null, problems: { errors: 0, warnings: 0 }, reveal: null });
  }
  setCursor(line: number, column: number) {
    this.setState({ cursor: { line, column } });
  }
  clearCursor() {
    this.setState({ cursor: null });
  }
  setProblems(errors: number, warnings: number) {
    const p = this.state.problems;
    if (p.errors !== errors || p.warnings !== warnings)
      this.setState({ problems: { errors, warnings } });
  }
  requestReveal(file: string, line: number) {
    this.setState({ reveal: { file, line, nonce: ++this.nonce } });
  }
}
