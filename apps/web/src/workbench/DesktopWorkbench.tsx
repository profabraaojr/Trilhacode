import { useCallback, useEffect, useState } from 'react';
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from 'react-resizable-panels';
import type { ApiStatus } from '../api/useApiHealth';
import { safeStorage } from '../lib/storage';
import { useStores } from '../project/ProjectContext';
import { ActivityBar } from './ActivityBar';
import { ConsolePanel } from './ConsolePanel';
import { ContentPane } from './ContentPane';
import { EditorArea } from './EditorArea';
import { PreviewPane } from './PreviewPane';
import { useWorkbenchShortcuts } from './shortcuts';
import { SideBar } from './SideBar';
import { StatusBar } from './StatusBar';
import type { ViewId } from './views';

type PanelRef = ReturnType<typeof usePanelRef>;

function togglePanelRef(ref: PanelRef) {
  const p = ref.current;
  if (!p) return;
  if (p.isCollapsed()) p.expand();
  else p.collapse();
}

/**
 * Layout em colunas para computador e tablet.
 * Painéis recolhidos ficam com `hidden`, para não serem lidos por leitores de tela nem focados.
 */
export function DesktopWorkbench({ api }: { api: ApiStatus }) {
  // O painel de conteúdo começa recolhido enquanto não há conteúdo de unidades (Etapa 3),
  // deixando espaço para o editor e o resultado.
  const compactAtMount = true;

  const sidebarRef = usePanelRef();
  const contentRef = usePanelRef();
  const panelRef = usePanelRef();

  const { learning, account } = useStores();
  // Vindo de um link de e-mail (confirmação ou nova senha), abre direto na Conta.
  const [activeView, setActiveView] = useState<ViewId>(() =>
    account.getState().urlAction ? 'conta' : 'trilhas',
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(!compactAtMount);
  const [panelOpen, setPanelOpen] = useState(true);

  const horizontal = useDefaultLayout({ id: 'tc:layout:h', storage: safeStorage });
  const vertical = useDefaultLayout({ id: 'tc:layout:v', storage: safeStorage });
  const editorSplit = useDefaultLayout({ id: 'tc:layout:editor', storage: safeStorage });

  const toggleSidebar = useCallback(() => togglePanelRef(sidebarRef), [sidebarRef]);
  const toggleContent = useCallback(() => togglePanelRef(contentRef), [contentRef]);
  const togglePanel = useCallback(() => togglePanelRef(panelRef), [panelRef]);
  useWorkbenchShortcuts({ toggleSidebar, togglePanel, toggleContent });

  // Ao abrir uma unidade, o painel de conteúdo aparece.
  useEffect(() => {
    let last = learning.getState().focus?.nonce ?? 0;
    return learning.subscribe(() => {
      const f = learning.getState().focus;
      if (!f || f.nonce === last) return;
      last = f.nonce;
      // a unidade abre com cerca de um terço da largura, para o texto não ficar espremido
      const content = contentRef.current;
      if (
        f.area === 'conteudo' &&
        content &&
        (content.isCollapsed() || content.getSize().inPixels < 360)
      ) {
        if (content.isCollapsed()) content.expand();
        content.resize('34%');
      }
      if (f.area === 'resultado' && panelRef.current?.isCollapsed()) panelRef.current.expand();
    });
  }, [learning, contentRef, panelRef]);

  const showTracks = () => {
    setActiveView('trilhas');
    if (sidebarRef.current?.isCollapsed()) sidebarRef.current.expand();
  };

  const selectView = (id: ViewId) => {
    const p = sidebarRef.current;
    if (id === activeView && p && !p.isCollapsed()) {
      p.collapse();
      return;
    }
    setActiveView(id);
    if (p?.isCollapsed()) p.expand();
  };

  return (
    <div className="workbench">
      <div className="workbench-body">
        <ActivityBar activeView={activeView} sidebarOpen={sidebarOpen} onSelect={selectView} />
        <Group
          orientation="horizontal"
          className="panel-group"
          defaultLayout={horizontal.defaultLayout}
          onLayoutChange={horizontal.onLayoutChange}
        >
          <Panel
            id="sidebar"
            panelRef={sidebarRef}
            defaultSize="20"
            minSize="180px"
            maxSize="40"
            collapsible
            collapsedSize="0"
            onResize={() => setSidebarOpen(!sidebarRef.current?.isCollapsed())}
          >
            <div className="panel-slot" hidden={!sidebarOpen}>
              <SideBar view={activeView} onClose={toggleSidebar} />
            </div>
          </Panel>
          <Separator className="resize-handle resize-handle-v" />
          <Panel id="main" minSize="30">
            <Group
              orientation="vertical"
              className="panel-group"
              defaultLayout={vertical.defaultLayout}
              onLayoutChange={vertical.onLayoutChange}
            >
              <Panel id="editor" defaultSize="68" minSize="20">
                <Group
                  orientation="horizontal"
                  className="panel-group"
                  defaultLayout={editorSplit.defaultLayout}
                  onLayoutChange={editorSplit.onLayoutChange}
                >
                  <Panel id="code" defaultSize="55" minSize="25">
                    <EditorArea />
                  </Panel>
                  <Separator className="resize-handle resize-handle-v" />
                  <Panel id="preview" defaultSize="45" minSize="200px">
                    <PreviewPane />
                  </Panel>
                </Group>
              </Panel>
              <Separator className="resize-handle resize-handle-h" />
              <Panel
                id="panel"
                panelRef={panelRef}
                defaultSize="32"
                minSize="100px"
                collapsible
                collapsedSize="0"
                onResize={() => setPanelOpen(!panelRef.current?.isCollapsed())}
              >
                <div className="panel-slot" hidden={!panelOpen}>
                  <ConsolePanel onClose={togglePanel} />
                </div>
              </Panel>
            </Group>
          </Panel>
          <Separator className="resize-handle resize-handle-v" />
          <Panel
            id="content"
            panelRef={contentRef}
            defaultSize={compactAtMount ? '0' : '26'}
            minSize="240px"
            maxSize="45"
            collapsible
            collapsedSize="0"
            onResize={() => setContentOpen(!contentRef.current?.isCollapsed())}
          >
            <div className="panel-slot" hidden={!contentOpen}>
              <ContentPane onClose={toggleContent} onShowTracks={showTracks} />
            </div>
          </Panel>
        </Group>
      </div>
      <StatusBar
        api={api}
        sidebarOpen={sidebarOpen}
        panelOpen={panelOpen}
        contentOpen={contentOpen}
        onToggleSidebar={toggleSidebar}
        onTogglePanel={togglePanel}
        onToggleContent={toggleContent}
        onShowAccount={() => {
          setActiveView('conta');
          if (sidebarRef.current?.isCollapsed()) sidebarRef.current.expand();
        }}
      />
    </div>
  );
}
