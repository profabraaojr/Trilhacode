import {
  Background,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { TrackDetail, UnitSummary } from '@trilhacode/content/types';
import { Clock } from 'lucide-react';
import { useMemo } from 'react';
import { useStore } from '../lib/store';
import { useStores } from '../project/ProjectContext';
import { useTheme } from '../theme/ThemeContext';
import {
  completedSteps,
  percent,
  UNIT_STATUS_LABEL,
  unitStatus,
  type UnitStatus,
} from './progress';
import { ProgressBar, StatusIcon } from './StatusIcon';

type UnitNodeData = { unit: UnitSummary; status: UnitStatus; done: number };
type ModuleNodeData = { titulo: string; descricao: string };

function UnitNode({ data }: NodeProps<Node<UnitNodeData>>) {
  const { unit, status, done } = data;
  return (
    <button type="button" className="map-unit nodrag" data-status={status}>
      {/* Sem aria-label: o nome lido é o próprio texto visível (WCAG 2.5.3), com o título
          primeiro no DOM; o CSS mostra o estado acima dele. */}
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <span className="map-unit-title">{unit.titulo}</span>
      <span className="map-unit-head">
        <StatusIcon status={status} decorative />
        <span className="map-unit-status">{UNIT_STATUS_LABEL[status]}</span>
      </span>
      <span className="map-unit-meta">
        {done} de 7 etapas · <Clock size={12} aria-hidden="true" /> {unit.duracaoMinutos} min
      </span>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </button>
  );
}

function ModuleNode({ data }: NodeProps<Node<ModuleNodeData>>) {
  return (
    <div className="map-module">
      <span className="map-module-title">{data.titulo}</span>
      <span className="map-module-desc">{data.descricao}</span>
    </div>
  );
}

const nodeTypes = { unit: UnitNode, module: ModuleNode };

const ZIG = 150; // deslocamento horizontal entre unidades vizinhas
const ROW_H = 140;
const PADDING = 40;

function buildGraph(track: TrackDetail, progress: Parameters<typeof unitStatus>[2]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let y = 0;
  for (const m of track.modulos) {
    nodes.push({
      id: m.id,
      type: 'module',
      position: { x: 0, y },
      data: { titulo: m.titulo, descricao: m.descricao },
      selectable: false,
      draggable: false,
    });
    y += 90;
    m.unidades.forEach((u, i) => {
      // zigue-zague em duas colunas, como uma trilha
      const x = i % 2 === 0 ? 20 : 20 + ZIG;
      nodes.push({
        id: u.id,
        type: 'unit',
        position: { x, y },
        data: {
          unit: u,
          status: unitStatus(u.id, u.requer, progress),
          done: completedSteps(progress.units[u.id]),
        },
        draggable: false,
      });
      y += ROW_H;
      for (const r of u.requer) {
        const done = completedSteps(progress.units[r]) === 7;
        edges.push({
          id: `${r}->${u.id}`,
          source: r,
          target: u.id,
          animated: !done,
          className: done ? 'map-edge-done' : 'map-edge',
        });
      }
    });
    y += 30;
  }
  return { nodes, edges, height: y + PADDING };
}

/** Mapa visual da trilha: módulos, unidades, estado de cada uma e dependências. */
export default function TrackMap() {
  const { learning } = useStores();
  const track = useStore(learning, (s) => s.track);
  const progress = useStore(learning, (s) => s.progress);
  const { resolved } = useTheme();

  const graph = useMemo(
    () => (track.data ? buildGraph(track.data, progress) : null),
    [track.data, progress],
  );

  if (track.status === 'loading') return <p className="view-message">Carregando o mapa…</p>;
  if (track.status === 'error' || !track.data || !graph)
    return (
      <p className="view-message" role="alert">
        {track.error ?? 'Trilha não encontrada.'}
      </p>
    );
  const t = track.data;
  const unitIds = t.modulos.flatMap((m) => m.unidades.map((u) => u.id));

  return (
    <div className="track-map">
      <header className="track-header">
        <p className="welcome-kicker">
          Trilha · {t.nivel} · {t.publico} · {t.duracaoEstimada}
        </p>
        <h1 className="track-heading">{t.titulo}</h1>
        <p className="welcome-text">{t.descricao}</p>
        <ProgressBar value={percent(unitIds, progress)} label={`Progresso na trilha ${t.titulo}`} />
        <details className="track-details">
          <summary>Objetivos de aprendizagem e pré-requisitos</summary>
          <div className="track-columns">
            <section>
              <h2 className="track-subheading">Objetivos de aprendizagem</h2>
              <ul>
                {t.objetivos.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="track-subheading">Pré-requisitos</h2>
              <ul>
                {t.prerequisitos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
          </div>
        </details>
      </header>
      <div className="map-canvas" aria-label="Mapa da trilha" style={{ height: graph.height }}>
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          // O clique (ou Enter no botão do cartão) chega ao nó e abre a unidade.
          onNodeClick={(_, node) => {
            if (node.type === 'unit') void learning.openUnit(node.id);
          }}
          colorMode={resolved}
          fitView
          fitViewOptions={{ padding: 0.05, maxZoom: 1, minZoom: 0.5 }}
          // Mapa estático: a rolagem do mouse rola a página, não o mapa.
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
        >
          <Background gap={24} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
