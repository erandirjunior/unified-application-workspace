import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock de ResizeObserver (necessário para @xyflow/react)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock de APIs globais que o jsdom não implementa completamente
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
  })),
});

// Mocks para funções nativas de diálogo
window.alert = vi.fn();
window.confirm = vi.fn(() => true);

// Mock global de Fetch com retorno padrão seguro
global.fetch = vi.fn().mockResolvedValue({
  json: async () => ([]),
  ok: true,
  status: 200,
});

// Mock de APIs de URL para suportar processos de exportação
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock de EventSource para o Live Monitoring
global.EventSource = vi.fn().mockImplementation(function() {
  this.close = vi.fn();
  this.onmessage = null;
  this.onerror = null;
  this.onopen = null;
});

// Mock de @xyflow/react para jsdom (ReactFlow não renderiza corretamente em jsdom)
vi.mock('@xyflow/react', () => {
  const React = require('react');
  return {
    ReactFlow: ({ nodes, edges, children }) => React.createElement('div', { className: 'react-flow' }, children),
    Background: () => null,
    Controls: () => null,
    Handle: () => null,
    Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
    useNodesState: (initialNodes) => {
      const [nodes, setNodes] = React.useState(initialNodes || []);
      return [nodes, setNodes, vi.fn()];
    },
    useEdgesState: (initialEdges) => {
      const [edges, setEdges] = React.useState(initialEdges || []);
      return [edges, setEdges, vi.fn()];
    },
    MarkerType: { ArrowClosed: 'arrowclosed' },
  };
});

// Mock de dagre para testes
vi.mock('dagre', () => {
  const graphlib = {
    Graph: vi.fn().mockImplementation(() => ({
      setDefaultEdgeLabel: vi.fn(),
      setGraph: vi.fn(),
      setNode: vi.fn(),
      setEdge: vi.fn(),
      node: vi.fn((id) => ({ x: 100, y: 100 })),
    })),
  };
  return {
    default: { graphlib, layout: vi.fn() },
    graphlib,
    layout: vi.fn(),
  };
});

// Mock do módulo IndexedDB usado pelo useCollections
vi.mock('../src/utils/indexedDB', () => {
  const DEFAULT_TEST_COLLECTIONS = [
    { 
      id: '1', 
      name: 'Minha Coleção',
      requests: [
        { id: 'req-1', name: 'Default Request', method: 'GET', url: 'http://example.com', type: 'request' },
        { id: 'folder-1', name: 'Pasta Teste', type: 'folder', requests: [
          { id: 'req-nested-1', name: 'Nested Req 1', method: 'GET', url: 'http://nested.com/1', type: 'request' },
          { id: 'req-nested-2', name: 'Nested Req 2', method: 'POST', url: 'http://nested.com/2', type: 'request' }
        ]}
      ],
      environments: [{ id: 'default', name: 'Global', variables: [] }],
      activeEnvironmentId: 'default',
      scenarios: [],
      workflows: []
    },
    {
      id: '2',
      name: 'Segunda Coleção',
      requests: [], 
      environments: [{ id: 'default', name: 'Global', variables: [] }],
      activeEnvironmentId: 'default',
      scenarios: [],
      workflows: []
    }
  ];
  let store = DEFAULT_TEST_COLLECTIONS;
  return {
    getAllCollections: vi.fn(async () => store),
    saveAllCollections: vi.fn(async (collections) => { store = [...collections]; }),
    migrateFromLocalStorage: vi.fn(async () => null),
    __getStore: () => store,
    __resetStore: () => { store = [...DEFAULT_TEST_COLLECTIONS]; },
  };
});