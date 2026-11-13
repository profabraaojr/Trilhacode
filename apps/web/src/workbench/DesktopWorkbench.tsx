import { useCallback, useState } from 'react';
import { Group, Panel, Separator, useDefaultLayout, usePanelRef } from 'react-resizable-panels';
import type { ApiStatus } from '../api/useApiHealth';
import { safeStorage } from '../lib/storage';
import { COMPACT_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import { ActivityBar } from './ActivityBar';
import { BottomPanel } from './BottomPanel';
import { ContentPane } from './ContentPane';
import { EditorArea } from './EditorArea';
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
  // No tablet o painel de conteúdo começa recolhido para sobrar espaço ao editor.
  const [compactAtMount] = useState(() => window.matchMedia(COMPACT_QUERY).matches);
  useMediaQuery(COMPACT_QUERY);

  const sidebarRef = usePanelRef();
  const contentRef = usePanelRef();
  const panelRef = usePanelRef();

  const [activeView, setActiveView] = useState<ViewId>('trilhas');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(!compactAtMount);
  const [panelOpen, setPanelOpen] = useState(true);

  const horizontal = useDefaultLayout({ id: 'tc:layout:h', storage: safeStorage });
  const vertical = useDefaultLayout({ id: 'tc:layout:v', storage: safeStorage });

  const toggleSidebar = useCallback(() => togglePanelRef(sidebarRef), [sidebarRef]);
  const toggleContent = useCallback(() => togglePanelRef(contentRef), [contentRef]);
  const togglePanel = useCallback(() => togglePanelRef(panelRef), [panelRef]);
  useWorkbenchShortcuts({ toggleSidebar, togglePanel, toggleContent });

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
              <Panel id="editor" defaultSize="70" minSize="20">
                <EditorArea />
              </Panel>
              <Separator className="resize-handle resize-handle-h" />
              <Panel
                id="panel"
                panelRef={panelRef}
                defaultSize="30"
                minSize="100px"
                collapsible
                collapsedSize="0"
                onResize={() => setPanelOpen(!panelRef.current?.isCollapsed())}
              >
                <div className="panel-slot" hidden={!panelOpen}>
                  <BottomPanel onClose={togglePanel} />
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
              <ContentPane onClose={toggleContent} />
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
      />
    </div>
  );
}
