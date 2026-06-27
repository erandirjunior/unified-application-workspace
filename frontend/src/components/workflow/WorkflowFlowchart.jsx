import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 44;

function getNodeMeta(step) {
  switch (step.type) {
    case 'request': return { color: '#3B82F6', bg: '#1e3a5f33', border: '#3B82F6', label: `${step.method || 'GET'} ${step.name || 'Request'}` };
    case 'aws': return { color: '#F59E0B', bg: '#78350f33', border: '#F59E0B', label: `☁️ ${step.name || 'AWS'}` };
    case 'wait': return { color: '#F59E0B', bg: '#78350f33', border: '#F59E0B', label: `⏳ Aguardar ${step.url || 5}s` };
    case 'parallel': return { color: '#6366F1', bg: '#312e8133', border: '#6366F1', label: `⚡ Parallel (${(step.requests || []).length})` };
    case 'loop': return { color: '#F43F5E', bg: '#4c051533', border: '#F43F5E', label: `🔁 Loop (max ${step.loop?.maxIter || 10})` };
    case 'condition': return { color: '#06B6D4', bg: '#08374933', border: '#06B6D4', label: `🔀 If/Else` };
    default: return { color: '#64748B', bg: '#1e293b33', border: '#64748B', label: step.name || step.type };
  }
}

function buildGraph(steps, parentId = null) {
  const nodes = [];
  const edges = [];
  let prevId = parentId;

  steps.forEach((step) => {
    const nodeId = step.id;
    const meta = getNodeMeta(step);

    nodes.push({
      id: nodeId,
      data: { label: meta.label, color: meta.color, bg: meta.bg, border: meta.border },
      position: { x: 0, y: 0 },
      type: 'workflowNode',
    });

    if (prevId) {
      edges.push({
        id: `e-${prevId}-${nodeId}`,
        source: prevId,
        target: nodeId,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
      });
    }

    if (step.type === 'parallel' && step.requests?.length > 0) {
      const joinId = `${nodeId}-join`;
      nodes.push({ id: joinId, data: { label: '⊕', color: '#6366F1', bg: '#312e8133', border: '#6366F1' }, position: { x: 0, y: 0 }, type: 'workflowNode' });

      step.requests.forEach((child) => {
        const childId = child.id;
        const childMeta = getNodeMeta(child);
        nodes.push({ id: childId, data: { label: childMeta.label, color: childMeta.color, bg: childMeta.bg, border: childMeta.border }, position: { x: 0, y: 0 }, type: 'workflowNode' });
        edges.push({ id: `e-${nodeId}-${childId}`, source: nodeId, target: childId, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } });
        edges.push({ id: `e-${childId}-${joinId}`, source: childId, target: joinId, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } });
      });

      prevId = joinId;
    } else if (step.type === 'loop' && step.steps?.length > 0) {
      const loopResult = buildGraph(step.steps, nodeId);
      nodes.push(...loopResult.nodes);
      edges.push(...loopResult.edges);

      const lastLoopNode = loopResult.lastId || nodeId;
      edges.push({ id: `e-loop-${lastLoopNode}-${nodeId}`, source: lastLoopNode, target: nodeId, type: 'smoothstep', style: { strokeDasharray: '5 5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#F43F5E' }, label: 'repeat' });

      prevId = lastLoopNode;
    } else if (step.type === 'condition') {
      const joinId = `${nodeId}-join`;
      nodes.push({ id: joinId, data: { label: '⊕', color: '#06B6D4', bg: '#08374933', border: '#06B6D4' }, position: { x: 0, y: 0 }, type: 'workflowNode' });

      if (step.steps?.length > 0) {
        const thenResult = buildGraph(step.steps, nodeId);
        nodes.push(...thenResult.nodes);
        edges.push(...thenResult.edges);
        const firstThenEdge = thenResult.edges.find(e => e.source === nodeId);
        if (firstThenEdge) firstThenEdge.label = 'then';
        const lastThenId = thenResult.lastId || nodeId;
        edges.push({ id: `e-${lastThenId}-${joinId}`, source: lastThenId, target: joinId, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } });
      } else {
        edges.push({ id: `e-${nodeId}-${joinId}-then`, source: nodeId, target: joinId, type: 'smoothstep', label: 'then', markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } });
      }

      if (step.elseSteps?.length > 0) {
        const elseResult = buildGraph(step.elseSteps, nodeId);
        nodes.push(...elseResult.nodes);
        edges.push(...elseResult.edges);
        const firstElseEdge = elseResult.edges.find(e => e.source === nodeId);
        if (firstElseEdge) firstElseEdge.label = 'else';
        const lastElseId = elseResult.lastId || nodeId;
        edges.push({ id: `e-${lastElseId}-${joinId}`, source: lastElseId, target: joinId, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } });
      } else {
        edges.push({ id: `e-${nodeId}-${joinId}-else`, source: nodeId, target: joinId, type: 'smoothstep', label: 'else', style: { strokeDasharray: '5 5' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' } });
      }

      prevId = joinId;
    } else {
      prevId = nodeId;
    }
  });

  return { nodes, edges, lastId: prevId };
}

function applyDagreLayout(nodes, edges, direction = 'TB') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 50, ranksep: 60 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } };
  });
}

// Custom node component
function WorkflowNode({ data }) {
  return (
    <div
      className="relative flex items-center justify-center px-3 py-2 rounded-xl text-[10px] font-bold shadow-lg border"
      style={{
        background: data.bg,
        borderColor: data.border,
        color: data.color,
        minWidth: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
      }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-500 !border-none !-top-1" />
      <span className="truncate max-w-[160px]">{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-500 !border-none !-bottom-1" />
    </div>
  );
}

const nodeTypes = { workflowNode: WorkflowNode };

export default function WorkflowFlowchart({ steps }) {
  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!steps || steps.length === 0) {
      return { layoutNodes: [], layoutEdges: [] };
    }

    const { nodes: rawNodes, edges: rawEdges } = buildGraph(steps);
    const positioned = applyDagreLayout(rawNodes, rawEdges);
    return { layoutNodes: positioned, layoutEdges: rawEdges };
  }, [steps]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Sync when steps change
  React.useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
  }, [layoutNodes, layoutEdges]);

  if (!steps || steps.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center theme-surface border theme-border rounded-2xl">
        <p className="text-sm text-slate-500">Nenhum step para visualizar</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] theme-surface border theme-border rounded-2xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          style: { stroke: '#475569', strokeWidth: 1.5 },
        }}
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="!bg-slate-800 !border-slate-700 !rounded-xl !shadow-xl" />
      </ReactFlow>
    </div>
  );
}
