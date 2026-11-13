import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { setViewportWidth } from '../test/setup';

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
  it('mostra barra de atividades, boas-vindas, painéis e barra de status', async () => {
    render(<App />);
    expect(screen.getByRole('navigation', { name: 'Barra de atividades' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Boas-vindas' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('heading', { name: 'Estado do desenvolvimento' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Barra de status' })).toBeInTheDocument();
    expect(await screen.findByText('Servidor conectado')).toBeInTheDocument();
  });

  it('identifica como "Em breve" as áreas que ainda não funcionam', () => {
    render(<App />);
    const soon = screen.getAllByText(/Em breve · Etapa/);
    // barra lateral (Trilhas), painel inferior (Console) e conteúdo da unidade
    expect(soon.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('region', { name: 'Trilhas: em breve' })).toHaveTextContent('Etapa 3');
    expect(screen.getByRole('region', { name: 'Console: em breve' })).toHaveTextContent('Etapa 2');
  });

  it('troca a visão da barra lateral pela barra de atividades', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Meu Glossário' }));
    expect(screen.getByRole('complementary', { name: 'Meu Glossário' })).toHaveTextContent(
      'Etapa 6',
    );
    expect(screen.getByRole('button', { name: 'Meu Glossário' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('a visão Configurações funciona e altera o tema', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    const sidebar = screen.getByRole('complementary', { name: 'Configurações' });
    expect(within(sidebar).queryByText(/Em breve/)).not.toBeInTheDocument();
    fireEvent.click(within(sidebar).getByRole('radio', { name: 'Claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('tc:theme')).toBe('light');
    fireEvent.click(within(sidebar).getByRole('radio', { name: 'Escuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('o botão de tema da barra de status alterna claro e escuro', () => {
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Usar tema claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Usar tema escuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

describe('workbench no celular', () => {
  it('usa abas Conteúdo, Código e Resultado em vez de colunas', () => {
    setViewportWidth(390);
    render(<App />);
    expect(
      screen.queryByRole('navigation', { name: 'Barra de atividades' }),
    ).not.toBeInTheDocument();
    const tabs = screen.getByRole('navigation', { name: 'Áreas de trabalho' });
    expect(within(tabs).getByRole('button', { name: 'Código' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    fireEvent.click(within(tabs).getByRole('button', { name: 'Conteúdo' }));
    expect(screen.getByRole('complementary', { name: 'Conteúdo da unidade' })).toBeInTheDocument();

    fireEvent.click(within(tabs).getByRole('button', { name: 'Resultado' }));
    expect(screen.getByRole('region', { name: 'Painel inferior' })).toBeInTheDocument();
  });

  it('abre as visões pelo menu e fecha com Escape', () => {
    setViewportWidth(390);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menu).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('button', { name: /Trilhas/ }),
    );
    expect(screen.getByRole('complementary', { name: 'Trilhas' })).toBeInTheDocument();
  });
});
