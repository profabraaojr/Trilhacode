import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { createMemoryStorage } from '../project/storage';
import { setViewportWidth } from '../test/setup';

// O Monaco depende de APIs que o jsdom não tem; nos testes de unidade ele é substituído
// por um marcador. O editor real é coberto pelos testes de ponta a ponta (Playwright).
vi.mock('../editor/MonacoEditor', () => ({
  default: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="code-editor">editor</div> : null,
}));

const memory = () => Promise.resolve(createMemoryStorage());
const renderApp = () => render(<App storage={memory} />);

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        status: 'ok',
        version: '0.1.0',
        database: 'up',
        time: new Date().toISOString(),
      }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  setViewportWidth(1440);
});

describe('workbench no computador', () => {
  it('mostra explorador, abas, resultado, console e barra de status', async () => {
    renderApp();
    expect(screen.getByRole('navigation', { name: 'Barra de atividades' })).toBeInTheDocument();
    const explorer = screen.getByRole('list', { name: 'Arquivos do projeto' });
    expect(within(explorer).getByRole('button', { name: /index\.html/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Boas-vindas' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('region', { name: 'Resultado' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Console' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Barra de status' })).toBeInTheDocument();
    expect(await screen.findByText('Servidor conectado')).toBeInTheDocument();
    expect(await screen.findByText(/Não será salvo/)).toBeInTheDocument();
  });

  it('abre um arquivo em aba ao clicar no explorador', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'style.css' }));
    expect(screen.getByRole('tab', { name: /style\.css/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
  });

  it('cria um arquivo validando o nome', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Novo arquivo' }));
    const input = screen.getByRole('textbox', { name: 'Nome do novo arquivo' });
    fireEvent.change(input, { target: { value: 'notas.txt' } });
    fireEvent.submit(input);
    expect(screen.getByRole('alert')).toHaveTextContent('.html, .css ou .js');
    fireEvent.change(input, { target: { value: 'app.js' } });
    fireEvent.submit(input);
    expect(screen.getByRole('tab', { name: /app\.js/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('não oferece renomear nem excluir o index.html', () => {
    renderApp();
    expect(screen.queryByRole('button', { name: 'Excluir index.html' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir style.css' })).toBeInTheDocument();
  });

  it('fecha abas', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar Boas-vindas' }));
    expect(screen.queryByRole('tab', { name: 'Boas-vindas' })).not.toBeInTheDocument();
  });

  it('o console começa vazio com uma orientação', () => {
    renderApp();
    expect(screen.getByRole('log', { name: 'Mensagens do console' })).toHaveTextContent(
      'console.log()',
    );
  });

  it('identifica como "Em breve" as visões que ainda não funcionam', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Trilhas' }));
    expect(screen.getByRole('region', { name: 'Trilhas: em breve' })).toHaveTextContent('Etapa 3');
    fireEvent.click(screen.getByRole('button', { name: 'Meu Glossário' }));
    expect(screen.getByRole('region', { name: 'Meu Glossário: em breve' })).toHaveTextContent(
      'Etapa 6',
    );
  });

  it('a visão Configurações altera o tema', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    const sidebar = screen.getByRole('complementary', { name: 'Configurações' });
    fireEvent.click(within(sidebar).getByRole('radio', { name: 'Claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('tc:theme')).toBe('light');
  });

  it('o botão de tema da barra de status alterna claro e escuro', () => {
    renderApp();
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Usar tema claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('o interruptor "Automático" é lembrado', () => {
    renderApp();
    const toggle = screen.getByRole('checkbox', { name: 'Automático' });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(localStorage.getItem('tc:auto-run')).toBe('false');
  });
});

describe('workbench no celular', () => {
  it('usa abas Conteúdo, Código e Resultado', () => {
    setViewportWidth(390);
    renderApp();
    expect(
      screen.queryByRole('navigation', { name: 'Barra de atividades' }),
    ).not.toBeInTheDocument();
    const tabs = screen.getByRole('navigation', { name: 'Áreas de trabalho' });
    expect(within(tabs).getByRole('button', { name: 'Código' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    fireEvent.click(within(tabs).getByRole('button', { name: 'Resultado' }));
    expect(screen.getByRole('region', { name: 'Resultado' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Console' })).toBeInTheDocument();

    fireEvent.click(within(tabs).getByRole('button', { name: 'Conteúdo' }));
    expect(screen.getByRole('complementary', { name: 'Conteúdo da unidade' })).toBeInTheDocument();
  });

  it('abre o explorador pelo menu e volta ao código ao escolher um arquivo', () => {
    setViewportWidth(390);
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('button', {
        name: /Explorador/,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'script.js' }));
    expect(screen.getByRole('tab', { name: /script\.js/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const tabs = screen.getByRole('navigation', { name: 'Áreas de trabalho' });
    expect(within(tabs).getByRole('button', { name: 'Código' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('fecha o menu com Escape', () => {
    setViewportWidth(390);
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menu).not.toBeInTheDocument();
  });
});
