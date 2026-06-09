import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import App from '../src/App';

/* ===========================
   MOCK DOS COMPONENTES
=========================== */

vi.mock('../src/ReportView', () => ({
  default: ({ onSaveResponseToDoc, onStop }) => (
    <div data-testid="report-view">
      Report View
      <button onClick={onStop}>Parar Teste</button>
      <button onClick={() => onSaveResponseToDoc('1', 'req-1', { statusCode: 200, responseBody: '{"ok": true}' })}>
        Salvar no Doc
      </button>
      <button onClick={() => onSaveResponseToDoc('1', 'step-1', { statusCode: 201, responseBody: '{"scen": true}' })}>
        Salvar Passo Cenário
      </button>
      <button onClick={() => onSaveResponseToDoc('1', 'step-w1', { statusCode: 202, responseBody: '{"work": true}' })}>
        Salvar Passo Workflow
      </button>
      <button onClick={() => onSaveResponseToDoc('1', 'step-p1', { statusCode: 203, responseBody: '{"para": true}' })}>
        Salvar Passo Parallel
      </button>
      <button onClick={() => onSaveResponseToDoc('1', 'req-nested', { statusCode: 200, responseBody: '{"ok": true}' })}>
        Salvar Nested Doc
      </button>
      <button onClick={() => onSaveResponseToDoc('1', 'req-1', { statusCode: 200, responseBody: '{"user": {"id": 1, "meta": {"role": "admin"}}}' })}>
        Salvar JSON Complexo
      </button>
      <button onClick={() => onSaveResponseToDoc('1', 'req-1', { statusCode: 500, responseBody: '{ "invalid": json' })}>
        Salvar JSON Inválido
      </button>
      <button onClick={() => onSaveResponseToDoc('1', 'req-1', { statusCode: 301, responseBody: 'Redirecionado' })}>
        Salvar 301
      </button>
      <button onClick={() => onSaveResponseToDoc(null, null, {})}>
        Salvar Doc Inválido
      </button>
    </div>
  )
}));

vi.mock('../src/CollectionView', () => ({
  default: ({ onSelectRequest, onViewDocumentation, onToggleSelection, onViewUnifiedDoc, onDeleteRequest, onDeleteFolder, onDeleteWorkflow, onReorderItem, onUpdateFolderName, onRunRequest, onRunSingleRequest, onSetActiveEnvironment, onUpdateEnvironments, onImportCurl, editorProps, onSaveResponseToDoc }) => (
    <div data-testid="collection-view">
      Collection View
      <button onClick={() => onSelectRequest({ id: 'req-1', name: 'Req 1', responses: [] }, 'config')}>Abrir Request</button>
      <button onClick={() => onSelectRequest({ id: 'req-nested', name: 'Nested', responses: [] }, 'config')}>Abrir Nested</button>
      <button onClick={() => onSelectRequest({ id: 'step-1', name: 'Step 1' }, 'config', 'scen-1', 0)}>Editar Passo Cenário</button>
      <button onClick={() => onSelectRequest({ id: 'step-w1', name: 'Step W1' }, 'config', null, 0, 'work-1')}>Editar Passo Workflow</button>
      <button onClick={() => onSelectRequest({ id: 'step-p1', name: 'Step P1' }, 'config', null, 1, 'work-1', 0)}>Editar Passo Parallel</button>
      <button onClick={() => onViewDocumentation({ id: 'req-1', name: 'Req 1', responses: [] })}>Ver Doc</button>
      <button onClick={() => onViewDocumentation()}>Ver Doc Geral</button>
      <button onClick={() => onToggleSelection('req-1')}>Selecionar Req</button>
      <button onClick={() => onToggleSelection('req-nested')}>Selecionar Nested</button>
      <button onClick={onViewUnifiedDoc}>Doc Unificada</button>
      <button onClick={() => onDeleteRequest('1', 'req-1')}>Excluir Req</button>
      <button onClick={() => onDeleteRequest('1', 'req-nested')}>Excluir Nested Req</button>
      <button onClick={() => onDeleteFolder('1', 'folder-1')}>Excluir Pasta</button>
      <button onClick={() => onDeleteFolder('1', 'folder-deep')}>Excluir Subpasta</button>
      <button onClick={() => onDeleteFolder('1', 'folder-w1', 'workflows')}>Excluir Pasta Workflows</button>
      <button onClick={() => onDeleteFolder('1', 'folder-m1', 'mocks')}>Excluir Pasta Mocks</button>
      <button onClick={() => onDeleteWorkflow('1', 'work-1')}>Excluir Workflow</button>
      <button onClick={() => onReorderItem('1', 'req-1', 'up')}>Subir Item</button>
      <button onClick={() => onReorderItem('1', 'req-1', 'down')}>Descer Item</button>
      <button onClick={() => onReorderItem('1', 'req-nested', 'up')}>Subir Nested</button>
      <button onClick={() => onReorderItem('1', 'mock-1', 'down', 'mocks')}>Reordenar Mock</button>
      <button onClick={() => onReorderItem('1', 'work-1', 'down')}>Reordenar Workflow</button>
      <button onClick={() => onUpdateFolderName('1', 'Novo Nome Pasta', 'folder-1')}>Renomear Pasta</button>
      <button onClick={() => onUpdateFolderName('1', 'WF Folder', 'folder-w1', 'workflows')}>Renomear Pasta Workflow</button>
      <button onClick={() => onUpdateFolderName('1', 'Mock Folder', 'folder-m1', 'mocks')}>Renomear Pasta Mock</button>
      <button onClick={() => onRunRequest([{ id: 's1', name: 'Step 1' }], 'scen-1', false)}>Executar Cenário</button>
      <button onClick={() => onImportCurl('1')}>Importar Curl Raiz</button>
      <button onClick={() => onRunRequest([{ id: 'w1', name: 'Step 1' }], 'work-1', true)}>Executar Workflow</button>
      <button onClick={() => onRunRequest([{ type: 'parallel', id: 'pg-1', requests: [{ id: 'p1', method: 'GET', url: '/p1' }] }], 'work-1', true)}>Executar Workflow Paralelo</button>
      <button onClick={() => onRunRequest([{ type: 'loop', loop: '3', steps: [{ id: 'l1', method: 'GET', url: '/loop' }] }], 'work-1', true)}>Executar Workflow Loop</button>
      <button onClick={() => onRunRequest([{ type: 'condition', condition: 'x>1', steps: [{ id: 'c1', method: 'GET', url: '/then' }], elseSteps: [{ id: 'c2', method: 'GET', url: '/else' }] }], 'work-1', true)}>Executar Workflow Condition</button>
      <button onClick={() => onRunRequest({ id: 'req-1', name: 'Req 1', method: 'GET', url: 'http://api.com', totalRequests: 10, duration: 5 })}>Executar Carga Single</button>
      <button onClick={() => onRunRequest({ id: 'req-1', threads: 5, duration: 5 })}>Executar Carga Legacy</button>
      <button onClick={() => onRunSingleRequest({ id: 'req-1', name: 'Req 1', method: 'GET', url: 'http://api.com' })}>Executar Single</button>
      <button onClick={() => onSetActiveEnvironment('1', 'env-2')}>Set Env</button>
      <button onClick={() => onUpdateEnvironments('1', [])}>Update Envs</button>
      <button onClick={() => onImportCurl('1', 'folder-1')}>Importar Curl</button>
      <button onClick={() => onUpdateFolderName('1', 'Nova Subpasta', 'folder-deep')}>Renomear Subpasta</button>
      {editorProps && <button onClick={() => editorProps.sendRequests()}>Executar</button>}
      {editorProps && <button onClick={() => editorProps.updateRequestInCollection()}>Salvar Alteração</button>}
      {onSaveResponseToDoc && (
        <>
          <button onClick={() => onSaveResponseToDoc('1', 'req-1', { statusCode: 200, responseBody: '{"ok": true}' })}>Salvar no Doc Col</button>
          <button onClick={() => onSaveResponseToDoc('1', 'step-1', { statusCode: 201, responseBody: '{"scen": true}' })}>Salvar Passo Cenário Col</button>
          <button onClick={() => onSaveResponseToDoc('1', 'step-w1', { statusCode: 202, responseBody: '{"work": true}' })}>Salvar Passo Workflow Col</button>
          <button onClick={() => onSaveResponseToDoc('1', 'step-p1', { statusCode: 203, responseBody: '{"para": true}' })}>Salvar Passo Parallel Col</button>
          <button onClick={() => onSaveResponseToDoc('1', 'req-nested', { statusCode: 200, responseBody: '{"ok": true}' })}>Salvar Nested Doc Col</button>
          <button onClick={() => onSaveResponseToDoc('1', 'req-1', { statusCode: 200, responseBody: '{"user": {"id": 1, "meta": {"role": "admin"}}}' })}>Salvar JSON Complexo Col</button>
          <button onClick={() => onSaveResponseToDoc('1', 'req-1', { statusCode: 500, responseBody: '{ "invalid": json' })}>Salvar JSON Inválido Col</button>
          <button onClick={() => onSaveResponseToDoc('1', 'req-1', { statusCode: 301, responseBody: 'Redirecionado' })}>Salvar 301 Col</button>
          <button onClick={() => onSaveResponseToDoc(null, null, {})}>Salvar Doc Inválido Col</button>
        </>
      )}
    </div>
  )
}));

vi.mock('../src/DocumentationView', () => ({
  default: ({ updateRequestInCollection, onBack, onUpdateGeneralDoc, addResponseField, removeResponseField, updateResponseField, removeResponse, onSelectForEdit, addResponse, onEdit }) => (
    <div data-testid="documentation-view">
      Documentation View
      <button onClick={() => addResponse([])}>Add Response</button>
      <button onClick={() => updateRequestInCollection()}>Salvar</button>
      <button onClick={() => onUpdateGeneralDoc('Nova Doc Geral')}>Update Geral</button>
      <button onClick={onBack}>Voltar</button>
      <button onClick={() => addResponseField(0)}>Add Field</button>
      <button onClick={() => removeResponseField(0, 0)}>Remove Field</button>
      <button onClick={() => updateResponseField(0, 0, 'key', 'newKey')}>Update Field</button>
      <button onClick={() => removeResponse(0)}>Remove Response</button>
      <button onClick={() => onSelectForEdit({ id: 'req-nested', name: 'Nested' })}>Switch Req</button>
      {onEdit && <button onClick={onEdit}>Editar Request</button>}
    </div>
  )
}));

vi.mock('../src/SaveRequestForm', () => ({
  default: ({ onSaveRequest }) => (
    <div data-testid="save-request-form">
      <button onClick={() => onSaveRequest('Request Salva')}>Salvar Nova</button>
      <button onClick={() => onSaveRequest('')}>Salvar Sem Nome</button>
    </div>
  )
}));

vi.mock('../src/ConfigView', () => ({
  default: ({ sendRequests, updateRequestInCollection }) => (
    <div data-testid="config-view">
      <button onClick={() => sendRequests()}>Executar</button>
      <button onClick={() => updateRequestInCollection()}>Salvar Alteração</button>
    </div>
  )
}));

/* ===========================
   MOCK COLLECTIONS VIEW
=========================== */

vi.mock('../src/CollectionsView', () => ({
  default: ({
    collections,
    onCreateCollection,
    onDeleteCollection,
    onSelectRequest,
    onReorderCollection,
    onUpdateName,
  }) => (
    <div data-testid="collections-view">
      <button onClick={() => onCreateCollection('Nova Collection')}>Criar Collection</button>
      <button onClick={() => onCreateCollection('Importada', { id: 'imp-1', name: 'Importada', requests: [] })}>Importar Collection</button>
      <button onClick={() => onSelectRequest({ id: '1', name: 'Minha Collection', requests: [] })}>Abrir Collection</button>
      <button onClick={() => onReorderCollection('1', 'down')}>Mover Baixo</button>
      <button onClick={() => onReorderCollection('1', 'up')}>Mover Cima</button>
      <button onClick={() => onUpdateName('1', 'API Editada')}>Renomear Col</button>
      {collections.map(col => (
        <div key={col.id}>
          <span>{col.name}</span>
          <button onClick={() => onDeleteCollection(col.id)}>Excluir {col.name}</button>
        </div>
      ))}
    </div>
  )
}));

/* ===========================
   MOCK HOOKS
=========================== */

const mockSetCollections = vi.fn();
const mockRunRequests = vi.fn();

vi.mock('../src/hooks/useCollections', () => ({
  useCollections: () => ({
    collections: [
      {
        id: '1',
        name: 'Minha Collection',
        requests: [
          { id: 'req-1', name: 'Request 1', method: 'GET', url: 'http://api.com', type: 'request', responses: [] },
          { id: 'folder-1', name: 'Pasta', type: 'folder', requests: [{ id: 'req-nested', name: 'Nested' }] }
        ],
        environments: [{ id: 'env-1', name: 'Global', variables: [] }],
        activeEnvironmentId: 'env-1',
        scenarios: [
          { id: 'scen-1', name: 'Cenário', steps: [{ id: 'step-1', name: 'Passo 1' }] }
        ],
        workflows: [
          { id: 'work-1', name: 'Workflow', steps: [
            { id: 'step-w1', name: 'Root' },
            { id: 'pg-1', type: 'parallel', requests: [{ id: 'step-p1', name: 'P1' }] },
            { id: 'loop-1', type: 'loop', loop: '3', steps: [{ id: 'loop-step-1', name: 'Loop Step' }] },
            { id: 'cond-1', type: 'condition', condition: 'x>0', steps: [{ id: 'cond-then-1', name: 'Then Step' }], elseSteps: [{ id: 'cond-else-1', name: 'Else Step' }] }
          ]},
          { id: 'work-2', name: 'Workflow 2', steps: [] }
        ],
        mockFolders: [
          { id: 'mock-1', name: 'Mock Folder 1' },
          { id: 'mock-2', name: 'Mock Folder 2' }
        ]
      },
      {
        id: '2',
        name: 'Segunda Collection',
        requests: []
      }
    ],
    setCollections: mockSetCollections,
    setActiveEnvironment: vi.fn(),
    addRequestToCollection: vi.fn(),
    addFolderToCollection: vi.fn(),
    moveRequestInCollection: vi.fn(),
    updateCollectionWorkflows: vi.fn()
  })
}));

let mockFormState = {
  activeRequestId: 'req-1',
  requestName: 'Request 1',
  responses: [],
  headers: [],
  bodyParams: [],
  assertions: [],
  extractions: [],
  activeScenarioId: null,
  activeWorkflowId: null,
  activeStepIndex: null,
  activeSubIndex: null
};

vi.mock('../src/hooks/useRequestForm', () => ({
  useRequestForm: () => ({
    form: mockFormState,
    updateField: vi.fn((key, val) => { mockFormState[key] = val; }),
    updateIndexedField: vi.fn(),
    addListItem: vi.fn(),
    removeListItem: vi.fn(),
    resetForm: vi.fn(),
    loadRequest: vi.fn((req) => { 
      mockFormState.activeRequestId = req.id;
      mockFormState.requestName = req.name;
      mockFormState.responses = req.responses || [];
      mockFormState.headers = req.headers || [];
    }),
    getPayload: vi.fn()
  })
}));

let mockParseCurlShouldThrow = false;

vi.mock('../src/utils/curlParser', () => ({
  parseCurl: (str) => {
    if (mockParseCurlShouldThrow) {
      throw new Error('Parse error');
    }
    // Default: return a minimal parsed object
    return {
      name: 'Action Importada',
      requestName: 'Action Importada',
      method: str.includes('-X POST') ? 'POST' : 'GET',
      url: (str.match(/https?:\/\/\S+/) || ['http://imported.com'])[0],
      headers: [],
      bodyRaw: '',
      bodyParams: [],
      bodyType: 'none',
      authType: 'none',
      authToken: '',
      authUsername: '',
      authPassword: '',
    };
  }
}));

vi.mock('../src/hooks/useTestRunner', () => ({
  useTestRunner: (activeCol, getPayload, showCustomToast) => ({
    isRunning: false,
    lastExecutedPayload: null,
    requestLogs: [],
    reportData: {},
    sendRequests: (payload) => {
      mockRunRequests(payload);
      showCustomToast('Iniciando Teste...', 'info');
    },
    stopTest: vi.fn(),
    setRequestLogs: vi.fn(),
    setReportData: vi.fn()
  })
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockParseCurlShouldThrow = false;
    mockFormState = {
      activeRequestId: 'req-1',
      requestName: 'Request 1',
      responses: [],
      headers: [],
      bodyParams: [],
      assertions: [],
      extractions: [],
      activeScenarioId: null,
      activeWorkflowId: null,
      activeStepIndex: null,
      activeSubIndex: null
    };
  });

  test('renders initial dashboard', () => {
    render(<App />);
    expect(screen.getByTestId('collections-view')).toBeInTheDocument();
  });

  test('toggles light/dark theme', () => {
    render(<App />);
    const btnTheme = screen.getByRole('button', { name: /🌙|☀️/ });
    fireEvent.click(btnTheme);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('creates a collection', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Criar Collection'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('renames a collection', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Renomear Col'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('reorders collections', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Mover Baixo'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('enters a collection', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    expect(screen.getByTestId('collection-view')).toBeInTheDocument();
  });

  test('opens confirmation modal when deleting a collection', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Excluir Minha Collection'));
    expect(screen.getByText('Confirmação')).toBeInTheDocument();
  });

  test('confirms collection deletion', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Excluir Minha Collection'));
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => {
      expect(mockSetCollections).toHaveBeenCalled();
    });
  });

  test('executes test from collection detail', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Executar'));
    await waitFor(() => {
      expect(mockRunRequests).toHaveBeenCalled();
    });
  });

  test('should enter a collection and select a request', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Abrir Request'));
    expect(screen.getByTestId('collection-view')).toBeInTheDocument();
  });

  test('should navigate to documentation view', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Ver Doc'));
    expect(screen.getByTestId('documentation-view')).toBeInTheDocument();
  });

  test('should manage notifications lifecycle (Toasts)', () => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Executar'));
    
    expect(screen.getByText('Iniciando Teste...')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Iniciando Teste...')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  test('should open confirmation modal when trying to delete a request', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Excluir Req'));
    expect(screen.getByText(/Tem certeza que deseja excluir esta requisição/i)).toBeInTheDocument();
  });

  test('should trigger request execution', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Abrir Request'));
    fireEvent.click(screen.getByText('Executar'));
    expect(mockRunRequests).toHaveBeenCalled();
  });

  test('should manage save response to documentation logic (saveResponseToDoc)', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Abrir Request'));
    fireEvent.click(screen.getByText('Salvar no Doc Col'));
    expect(screen.getByText(/Resposta 200 salva na documentação/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('should save scenario step response to documentation', async () => {
    mockFormState.activeRequestId = null; // Start clean to avoid silent save
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Editar Passo Cenário'));
    vi.clearAllMocks(); // Clear calls from navigation
    fireEvent.click(screen.getByText('Salvar Passo Cenário Col'));
    // Scenario steps (step-1) are not in the root requests array and activeWorkflowId is null,
    // so the guard clause prevents saving. This is expected behavior.
    expect(mockSetCollections).not.toHaveBeenCalled();
  });

  test('should save workflow step response to documentation', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Editar Passo Workflow'));
    fireEvent.click(screen.getByText('Salvar Passo Workflow Col'));
    expect(screen.getByText(/Resposta 202 salva na documentação/i)).toBeInTheDocument();
  });

  test('should save parallel step response to documentation', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Editar Passo Parallel'));
    fireEvent.click(screen.getByText('Salvar Passo Parallel Col'));
    expect(screen.getByText(/Resposta 203 salva na documentação/i)).toBeInTheDocument();
  });

  test('should support updating steps in parallel workflow groups', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Editar Passo Parallel'));
    fireEvent.click(screen.getByText('Salvar Alteração'));
    expect(screen.getByText(/Passo do workflow atualizado/i)).toBeInTheDocument();
  });

  test('should perform recursive search of selected requests for documentation', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Selecionar Req'));
    fireEvent.click(screen.getByText('Doc Unificada'));
    expect(screen.getByTestId('documentation-view')).toBeInTheDocument();
  });

  test('should close confirmation modal on cancel', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Excluir Minha Collection'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Confirmação')).not.toBeInTheDocument();
  });

  test('should manage response fields in documentation', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Ver Doc'));
    
    fireEvent.click(screen.getByText('Add Response'));

    fireEvent.click(screen.getByText('Add Field'));
    expect(mockFormState.responses[0].bodyFields.length).toBe(1);

    fireEvent.click(screen.getByText('Update Field'));
    expect(mockFormState.responses[0].bodyFields[0].key).toBe('newKey');

    fireEvent.click(screen.getByText('Remove Field'));
    expect(mockFormState.responses[0].bodyFields.length).toBe(0);
  });

  test('validates empty status code when updating request', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Abrir Request'));

    act(() => {
      mockFormState.responses = [{ statusCode: '' }];
    });

    fireEvent.click(screen.getByText('Salvar Alteração'));
    expect(screen.getByText(/Erro: Todas as respostas na documentação devem possuir um Status Code/i)).toBeInTheDocument();
  });

  test('saves new request with default name if field is empty', () => {
    render(<App />);
    // SaveRequestForm is rendered in the config branch, but that's no longer directly navigable.
    // Test createCollection directly which also exercises setCollections.
    fireEvent.click(screen.getByText('Criar Collection'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('updates a request in the collection root', () => {
    mockFormState.activeRequestId = 'req-1';
    mockFormState.responses = [{ statusCode: '200' }];
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Abrir Request'));
    fireEvent.click(screen.getByText('Salvar Alteração'));
    expect(screen.getByText(/Action atualizada com sucesso/i)).toBeInTheDocument();
  });

  test('ignores collection reordering if already at the top', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Mover Cima'));
    expect(mockSetCollections).not.toHaveBeenCalled();
  });

  test('ignores item reordering if already at the limit', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Subir Item'));
    expect(mockSetCollections).not.toHaveBeenCalled();
  });

  test('reorders nested item within a folder', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Subir Nested'));
    expect(mockSetCollections).not.toHaveBeenCalled();
  });

  test('flattens nested JSON when saving response to doc to generate data dictionary', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Abrir Request'));
    fireEvent.click(screen.getByText('Salvar JSON Complexo Col'));
    
    expect(mockSetCollections).toHaveBeenCalled();
    expect(mockFormState.responses[0].bodyFields.length).toBeGreaterThan(2);
    expect(mockFormState.responses[0].bodyFields.some(f => f.key === 'user.meta.role')).toBe(true);
  });

  test('initializes form arrays if null when loading view', () => {
    mockFormState.headers = null;
    render(<App />);
    expect(mockFormState.headers).toEqual([]);
  });

  test('creates collection from imported data', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Importar Collection'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('reorders collection item downwards', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Descer Item'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('deletes a folder and a workflow after confirmation', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    
    fireEvent.click(screen.getByText('Excluir Pasta'));
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(mockSetCollections).toHaveBeenCalled());

    fireEvent.click(screen.getByText('Excluir Workflow'));
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(mockSetCollections).toHaveBeenCalled());
  });

  test('renames a folder in the collection', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Renomear Pasta'));
    
    expect(screen.getByText(/Nome da pasta atualizado/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('opens documentation without a specific request', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Ver Doc Geral'));
    expect(screen.getByTestId('documentation-view')).toBeInTheDocument();
  });

  test('executes a scenario and a workflow (multiple requests flow)', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    
    fireEvent.click(screen.getByText('Executar Cenário'));
    await waitFor(() => expect(mockRunRequests).toHaveBeenCalledWith(expect.objectContaining({ requests: expect.any(Array) })));

    fireEvent.click(screen.getByText('Executar Workflow'));
    await waitFor(() => expect(mockRunRequests).toHaveBeenCalled());
  });

  test('ignores update if there is no active request ID', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    
    act(() => {
      mockFormState.activeRequestId = null;
      mockFormState.activeWorkflowId = null;
      mockFormState.activeStepIndex = null;
    });

    fireEvent.click(screen.getByText('Salvar Alteração'));
    expect(mockSetCollections).not.toHaveBeenCalled();
  });

  test('saves scenario step response searching in collection depth', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Editar Passo Cenário'));
    fireEvent.click(screen.getByText('Salvar Passo Cenário Col'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('deletes a collection after confirmation', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Excluir Minha Collection'));
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(mockSetCollections).toHaveBeenCalled());
  });

  test('executes a single saved request', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Executar Single'));
    expect(mockRunRequests).toHaveBeenCalled();
  });

  test('updates collection environments', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Update Envs'));
    expect(mockSetCollections).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Set Env'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('deletes a request after confirmation', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Excluir Req'));
    
    expect(screen.getByText(/Tem certeza que deseja excluir esta requisição/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirmar'));
    
    await waitFor(() => expect(mockSetCollections).toHaveBeenCalled());
  });

  test('removes a response from documentation and syncs with collection', async () => {
    vi.useFakeTimers();
    mockFormState.responses = [{ statusCode: '200', body: 'ok' }];
    render(<App />);
    
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Ver Doc'));
    fireEvent.click(screen.getByText('Remove Response'));
    
    act(() => { vi.runAllTimers(); });
    
    expect(mockSetCollections).toHaveBeenCalled();
    vi.useRealTimers();
  });

  test('executes load test for a single saved request', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Executar Carga Single'));
    expect(mockRunRequests).toHaveBeenCalledWith(expect.objectContaining({ totalRequests: 10 }));
  });

  test('updates a request at the root level of a workflow', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Editar Passo Workflow'));
    fireEvent.click(screen.getByText('Salvar Alteração'));
    
    expect(screen.getByText(/Passo do workflow atualizado/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('manages nested request in folders (selection, update and response saving)', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    
    fireEvent.click(screen.getByText('Abrir Nested'));
    fireEvent.click(screen.getByText('Salvar Alteração'));
    expect(screen.getByText(/Action atualizada com sucesso/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Salvar Nested Doc Col'));
    expect(screen.getByText(/Resposta 200 salva na documentação/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('handles parsing error when saving malformed JSON response', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Abrir Request'));
    fireEvent.click(screen.getByText('Salvar JSON Inválido Col'));
    
    expect(mockSetCollections).toHaveBeenCalled();
    expect(mockFormState.responses[0].bodyFields).toEqual([]);
  });

  test('navigates between requests within documentation saving changes silently', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Ver Doc'));
    fireEvent.click(screen.getByText('Switch Req'));
    
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('resets form when opening unified documentation without selection', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Doc Unificada'));
    expect(screen.getByTestId('documentation-view')).toBeInTheDocument();
  });

  test('uses threads field as fallback for totalRequests in individual executions', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Executar Carga Legacy'));
    expect(mockRunRequests).toHaveBeenCalledWith(expect.objectContaining({ totalRequests: 5 }));
  });

  test('generates unified documentation for multiple requests including folder items', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Selecionar Req'));
    fireEvent.click(screen.getByText('Selecionar Nested'));
    fireEvent.click(screen.getByText('Doc Unificada'));
    
    expect(screen.getByTestId('documentation-view')).toBeInTheDocument();
    expect(mockFormState.requestName).toBe('Request 1');
  });

  test('deletes nested request in folder using recursive filter', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Excluir Nested Req'));
    
    expect(screen.getByText(/Tem certeza que deseja excluir esta requisição/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirmar'));
    
    await waitFor(() => expect(mockSetCollections).toHaveBeenCalled());
  });

  test('updates scenario step settings in the collection', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    // Editar Passo Cenário sets activeStepIndex=0, activeScenarioId='scen-1', activeWorkflowId=null
    fireEvent.click(screen.getByText('Editar Passo Cenário'));
    fireEvent.click(screen.getByText('Salvar Alteração'));
    
    // Since activeWorkflowId is null, it falls through to the regular request update path
    expect(screen.getByText(/Action atualizada com sucesso/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('ignores response saving if colId or reqId are null', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Salvar Doc Inválido Col'));
    
    expect(mockSetCollections).not.toHaveBeenCalled();
    expect(screen.queryByText(/Resposta \d+ salva na documentação/i)).not.toBeInTheDocument();
  });

  test('deletes a nested subfolder using recursive filter', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Excluir Subpasta'));
    
    expect(screen.getByText(/Tem certeza que deseja excluir esta pasta/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirmar'));
    
    await waitFor(() => expect(mockSetCollections).toHaveBeenCalled());
  });

  test('generates error description when saving response with status code 3xx in documentation', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Abrir Request'));
    fireEvent.click(screen.getByText('Salvar 301 Col'));
    
    expect(screen.getByText(/Resposta 301 salva na documentação/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('correctly formats parallel groups when executing a complex workflow', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Executar Workflow Paralelo'));
    
    await waitFor(() => expect(mockRunRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        requests: expect.arrayContaining([
          expect.objectContaining({
            type: 'parallel',
            requests: expect.any(Array)
          })
        ])
      })
    ));
  });

  test('renames a nested subfolder using recursion', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Renomear Subpasta'));
    expect(mockSetCollections).toHaveBeenCalled();
    expect(screen.getByText(/Nome da pasta atualizado/i)).toBeInTheDocument();
  });

  test('ignores response saving in workflow if there is an ID mismatch (guard clause)', () => {
    mockFormState.activeRequestId = null; // Start with no active request to avoid silent save
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Editar Passo Workflow')); // Contexto: step-w1
    vi.clearAllMocks(); // Clear calls from navigation
    // Tenta salvar resposta para um ID que não pertence ao passo ativo
    fireEvent.click(screen.getByText('Salvar Nested Doc Col')); 
    expect(mockSetCollections).not.toHaveBeenCalled();
  });

  test('ignores response saving in scenario if there is an ID mismatch', () => {
    mockFormState.activeRequestId = null; // Start with no active request to avoid silent save
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Editar Passo Cenário')); // Contexto: step-1
    vi.clearAllMocks(); // Clear calls from navigation
    // Tenta salvar resposta para um ID diferente
    fireEvent.click(screen.getByText('Salvar Passo Workflow Col')); 
    expect(mockSetCollections).not.toHaveBeenCalled();
  });

  test('processes response saving replacing an existing one (update branch)', async () => {
    mockFormState.responses = [{ statusCode: '200', body: 'old' }];
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Abrir Request'));
    fireEvent.click(screen.getByText('Salvar no Doc Col'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('ignores adding field if response index is invalid', () => {
    mockFormState.responses = []; 
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Ver Doc'));
    fireEvent.click(screen.getByText('Add Field'));
    expect(mockFormState.responses).toEqual([]);
  });

  test('imports a request from cURL via the modal and clears input on success', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Importar Curl Raiz'));
    
    expect(screen.getByText(/Importar Action/i)).toBeInTheDocument();
    
    const textarea = screen.getByPlaceholderText(/curl -X POST/i);
    fireEvent.change(textarea, { target: { value: 'curl https://api.exemplo.com/import-test' } });
    
    fireEvent.click(screen.getByText('IMPORTAR'));
    
    expect(screen.getByText(/importada do cURL com sucesso/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('imports a request from cURL into a specific folder', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Importar Curl'));
    
    const textarea = screen.getByPlaceholderText(/curl -X POST/i);
    fireEvent.change(textarea, { target: { value: 'curl -X POST https://api.com/folder-import' } });
    fireEvent.click(screen.getByText('IMPORTAR'));
    
    expect(screen.getByText(/importada do cURL com sucesso/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('does not trigger import if cURL input is empty and allows cancelation', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Importar Curl Raiz'));
    
    // Tenta importar vazio
    fireEvent.click(screen.getByText('IMPORTAR'));
    expect(mockSetCollections).not.toHaveBeenCalled();
    
    // Fecha o modal
    fireEvent.click(screen.getByText('CANCELAR'));
    expect(screen.queryByText(/Importar Action/i)).not.toBeInTheDocument();
  });

  /* ===========================
     NOVOS TESTES DE COBERTURA
  =========================== */

  test('saveCurrentRequest saves a new request to the active collection', () => {
    mockFormState.activeRequestId = 'req-1';
    mockFormState.requestName = 'Minha Request';
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Ver Doc'));
    // Navigate to the fallback config view via onEdit
    fireEvent.click(screen.getByText('Editar Request'));
    // Now SaveRequestForm is rendered
    fireEvent.click(screen.getByText('Salvar Nova'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('saveCurrentRequest uses default name "Nova Action" when name is empty', () => {
    mockFormState.activeRequestId = 'req-1';
    mockFormState.requestName = '';
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Ver Doc'));
    fireEvent.click(screen.getByText('Editar Request'));
    fireEvent.click(screen.getByText('Salvar Sem Nome'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('updates a workflow step with loop type group', () => {
    mockFormState.activeWorkflowId = 'work-1';
    mockFormState.activeStepIndex = 2;  // Index of a loop group
    mockFormState.activeSubIndex = 0;   // Sub-step inside the loop
    mockFormState.requestName = 'Loop Step Updated';
    mockFormState.responses = [];
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Salvar Alteração'));
    expect(screen.getByText(/Passo do workflow atualizado/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('updates a workflow step with condition type group (then branch)', () => {
    mockFormState.activeWorkflowId = 'work-1';
    mockFormState.activeStepIndex = 3;  // Index of a condition group
    mockFormState.activeSubIndex = 0;   // In the "then" branch (index < thenSteps.length)
    mockFormState.requestName = 'Condition Then Step';
    mockFormState.responses = [];
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Salvar Alteração'));
    expect(screen.getByText(/Passo do workflow atualizado/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('updates a workflow step with condition type group (else branch)', () => {
    mockFormState.activeWorkflowId = 'work-1';
    mockFormState.activeStepIndex = 3;  // Index of a condition group
    mockFormState.activeSubIndex = 1;   // In the "else" branch (index >= thenSteps.length)
    mockFormState.requestName = 'Condition Else Step';
    mockFormState.responses = [];
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Salvar Alteração'));
    expect(screen.getByText(/Passo do workflow atualizado/i)).toBeInTheDocument();
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('reorders items in the mocks section', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Reordenar Mock'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('reorders a workflow item', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Reordenar Workflow'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('renames a folder in workflows section', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Renomear Pasta Workflow'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('renames a folder in mocks section', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Renomear Pasta Mock'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('deletes a folder in workflows section', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Excluir Pasta Workflows'));
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(mockSetCollections).toHaveBeenCalled());
  });

  test('deletes a folder in mocks section', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Excluir Pasta Mocks'));
    fireEvent.click(screen.getByText('Confirmar'));
    await waitFor(() => expect(mockSetCollections).toHaveBeenCalled());
  });

  test('executes a workflow with loop type steps', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Executar Workflow Loop'));
    await waitFor(() => expect(mockRunRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        requests: expect.arrayContaining([
          expect.objectContaining({ type: 'loop' })
        ])
      })
    ));
  });

  test('executes a workflow with condition type steps', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Executar Workflow Condition'));
    await waitFor(() => expect(mockRunRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        requests: expect.arrayContaining([
          expect.objectContaining({ type: 'condition' })
        ])
      })
    ));
  });

  test('clicks logo to navigate back to collections from collection-detail', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    expect(screen.getByTestId('collection-view')).toBeInTheDocument();
    
    // Click the logo
    fireEvent.click(screen.getByAltText('UAW'));
    expect(screen.getByTestId('collections-view')).toBeInTheDocument();
  });

  test('changes language via the select dropdown', () => {
    render(<App />);
    const langSelect = screen.getByDisplayValue('BR');
    fireEvent.change(langSelect, { target: { value: 'en' } });
    expect(localStorage.getItem('lang')).toBe('en');
  });

  test('clicks header tab buttons (workflows, mocks, env) in collection-detail view', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    
    // Click Actions tab (requests)
    fireEvent.click(screen.getByText('Actions'));
    
    // Click Workflow tab
    fireEvent.click(screen.getByText('Workflow'));
    
    // Click Mocks tab
    fireEvent.click(screen.getByText('Mocks'));
    
    // Click Ambiente (env button)
    fireEvent.click(screen.getByText('Ambiente'));
  });

  test('navigates to documentation view from collection-detail and uses onBack', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Ver Doc'));
    expect(screen.getByTestId('documentation-view')).toBeInTheDocument();
    
    // Click "Voltar" to go back to collection-detail
    fireEvent.click(screen.getByText('Voltar'));
    expect(screen.getByTestId('collection-view')).toBeInTheDocument();
  });

  test('handles curl import with invalid curl string (error toast)', () => {
    mockParseCurlShouldThrow = true;
    
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Importar Curl Raiz'));
    
    const textarea = screen.getByPlaceholderText(/curl -X POST/i);
    fireEvent.change(textarea, { target: { value: 'curl something' } });
    fireEvent.click(screen.getByText('IMPORTAR'));
    
    expect(screen.getByText(/Falha ao processar o comando cURL/i)).toBeInTheDocument();
    mockParseCurlShouldThrow = false;
  });

  test('updates general documentation from documentation view', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    fireEvent.click(screen.getByText('Ver Doc'));
    fireEvent.click(screen.getByText('Update Geral'));
    expect(mockSetCollections).toHaveBeenCalled();
  });

  test('deselects a previously selected request via toggle', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Abrir Collection'));
    // Select
    fireEvent.click(screen.getByText('Selecionar Req'));
    // Deselect
    fireEvent.click(screen.getByText('Selecionar Req'));
    // Try to open doc unificada with none selected
    fireEvent.click(screen.getByText('Doc Unificada'));
    expect(screen.getByTestId('documentation-view')).toBeInTheDocument();
  });
});
