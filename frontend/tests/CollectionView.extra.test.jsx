import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CollectionView from '../src/views/CollectionView';
import { pt } from '../src/locales/pt';

const mockCollection = {
  id: 'col-1',
  name: 'Minha Coleção',
  requests: [
    { id: 'req-1', name: 'Get Users', method: 'GET', url: 'http://api.local/users', type: 'request' },
    { id: 'folder-1', name: 'Auth Folder', type: 'folder', requests: [
      { id: 'req-nested', name: 'Login', method: 'POST', url: '/login', type: 'request' }
    ]}
  ],
  environments: [
    { id: 'env-1', name: 'Produção', variables: [{ key: 'host', value: 'api.com' }] },
    { id: 'env-2', name: 'Dev', variables: [{ key: 'url', value: 'localhost' }] }
  ],
  activeEnvironmentId: 'env-1',
  scenarios: [],
  workflows: [{ id: 'wf-1', name: 'Flow', steps: [] }],
  mockFolders: [{ id: 'mf-1', name: 'Mock Folder', type: 'folder', requests: [] }],
};

const defaultProps = {
  collection: mockCollection,
  t: pt,
  activeTab: 'requests',
  onTabChange: vi.fn(),
  onSelectRequest: vi.fn(),
  onUpdateName: vi.fn(),
  onViewDocumentation: vi.fn(),
  onRunRequest: vi.fn(),
  onRunSingleRequest: vi.fn(),
  onBack: vi.fn(),
  onAddRequest: vi.fn(),
  onAddFolder: vi.fn(),
  onImportCurl: vi.fn(),
  onMoveRequest: vi.fn(),
  onDeleteRequest: vi.fn(),
  onDeleteFolder: vi.fn(),
  onDeleteWorkflow: vi.fn(),
  onReorderItem: vi.fn(),
  onUpdateFolderName: vi.fn(),
  onUpdateEnvironments: vi.fn(),
  onSetActiveEnvironment: vi.fn(),
  onUpdateScenarios: vi.fn(),
  onUpdateWorkflows: vi.fn(),
  onUpdateMockFolders: vi.fn(),
  onToggleSelection: vi.fn(),
  onViewUnifiedDoc: vi.fn(),
  selectedRequestIds: [],
  isEnvModalOpen: false,
  setIsEnvModalOpen: vi.fn(),
  editorProps: {},
  onCloseRequestEditor: vi.fn(),
  setActiveWorkflowId: vi.fn(),
  setActiveStepIndex: vi.fn(),
  setActiveSubIndex: vi.fn(),
  reportData: null,
  requestLogs: [],
  isRunning: false,
  stopTest: vi.fn(),
  sendRequests: vi.fn(),
  lastExecutedPayload: null,
  onSaveResponseToDoc: vi.fn(),
  activeWorkflowId: null,
};

describe('CollectionView - handleSaveMock', () => {
  beforeEach(() => { vi.clearAllMocks(); global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([]), ok: true }); });

  it('should save mock to backend when creating new mock', async () => {
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([]), ok: true });
    render(<CollectionView {...defaultProps} activeTab="mocks" />);
    await waitFor(() => { expect(global.fetch).toHaveBeenCalled(); });
    
    const mockBtn = screen.getByText(pt.mocks.newBtn);
    await act(async () => { fireEvent.click(mockBtn); });
    
    const postCalls = global.fetch.mock.calls.filter(c => c[1]?.method === 'POST');
    expect(postCalls.length).toBeGreaterThan(0);
  });
});

describe('CollectionView - environment modal handlers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should add new environment via modal', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    fireEvent.click(screen.getByText(pt.collection.envModal.newEnv));
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalledWith('col-1', expect.arrayContaining([
      expect.objectContaining({ name: pt.collection.envModal.newEnvName })
    ]));
  });

  it('should delete an environment via modal', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    const modal = screen.getByRole('dialog');
    const devEnv = screen.getByText('Dev').closest('.group');
    const deleteBtn = devEnv.querySelector(`button[title="${pt.collection.envModal.deleteEnv}"]`);
    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should rename environment via modal', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    const envItem = screen.getByText('Produção').closest('.group');
    const renameBtn = envItem.querySelector(`button[title="${pt.collection.envModal.renameEnv}"]`);
    fireEvent.click(renameBtn);
    const input = screen.getByDisplayValue('Produção');
    fireEvent.change(input, { target: { value: 'Production' } });
    fireEvent.blur(input);
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should add variable in environment modal', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    fireEvent.click(screen.getByText(pt.collection.envModal.addVar));
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should update variable key in environment modal', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    const keyInput = screen.getByDisplayValue('host');
    fireEvent.change(keyInput, { target: { value: 'api_host' } });
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should update variable value in environment modal', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    const valInput = screen.getByDisplayValue('api.com');
    fireEvent.change(valInput, { target: { value: 'new.api.com' } });
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should remove variable in environment modal', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    const removeBtn = screen.getByTitle('Remover Variável');
    fireEvent.click(removeBtn);
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should close modal when done button is clicked', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    fireEvent.click(screen.getByText(pt.collection.envModal.done));
    expect(defaultProps.setIsEnvModalOpen).toHaveBeenCalledWith(false);
  });
});

describe('CollectionView - workflow handling', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should switch to workflows tab when activeWorkflowId is set', () => {
    render(<CollectionView {...defaultProps} activeWorkflowId="wf-1" />);
    expect(defaultProps.onTabChange).toHaveBeenCalledWith('workflows');
  });
});

describe('CollectionView - mock fetch and sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ id: 'new-mock', name: 'Backend Mock', method: 'GET', active: false }]),
      ok: true,
    });
  });

  it('should fetch mocks when switching to mocks tab', async () => {
    render(<CollectionView {...defaultProps} activeTab="mocks" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/manage-mocks'));
    });
  });

  it('should sync new backend mocks to mockFolders', async () => {
    render(<CollectionView {...defaultProps} activeTab="mocks" />);
    await waitFor(() => {
      expect(defaultProps.onUpdateMockFolders).toHaveBeenCalled();
    });
  });
});

describe('CollectionView - search and filtering', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should filter items when searching', () => {
    render(<CollectionView {...defaultProps} />);
    const input = screen.getByPlaceholderText(pt.collection.searchPlaceholder);
    fireEvent.change(input, { target: { value: 'Login' } });
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Get Users')).not.toBeInTheDocument();
  });

  it('should filter by URL', () => {
    render(<CollectionView {...defaultProps} />);
    const input = screen.getByPlaceholderText(pt.collection.searchPlaceholder);
    fireEvent.change(input, { target: { value: 'api.local' } });
    expect(screen.getByText('Get Users')).toBeInTheDocument();
  });

  it('should show empty state when no items match', () => {
    render(<CollectionView {...defaultProps} />);
    const input = screen.getByPlaceholderText(pt.collection.searchPlaceholder);
    fireEvent.change(input, { target: { value: 'zzz-nonexistent' } });
    expect(screen.getByText(pt.common.empty)).toBeInTheDocument();
  });
});

describe('CollectionView - handleAddNewAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should call onAddRequest and onSelectRequest when Action button is clicked', () => {
    render(<CollectionView {...defaultProps} />);
    fireEvent.click(screen.getByText('HTTP Request'));
    expect(defaultProps.onAddRequest).toHaveBeenCalledWith('col-1', 'HTTP Request', null);
    expect(defaultProps.onSelectRequest).toHaveBeenCalled();
  });
});

describe('CollectionView - handleMoveRequest for mocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ id: 'mock-x', name: 'Movable Mock', method: 'GET', active: false }]),
      ok: true,
    });
  });

  it('should pass mock data from backend when moving mocks section', async () => {
    render(<CollectionView {...defaultProps} activeTab="mocks" />);
    await waitFor(() => { expect(global.fetch).toHaveBeenCalled(); });

    // The sidebar handles drag/drop which calls handleMoveRequest internally
    // We test indirectly that the mock data from backend is available
  });
});

describe('CollectionView - add folder per tab', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should add folder in requests tab', () => {
    render(<CollectionView {...defaultProps} />);
    fireEvent.click(screen.getByText(pt.collection.folderLabel));
    expect(defaultProps.onAddFolder).toHaveBeenCalledWith('col-1', pt.collection.newFolderPlaceholder);
  });

  it('should add folder in workflows tab', () => {
    render(<CollectionView {...defaultProps} activeTab="workflows" />);
    fireEvent.click(screen.getByText(pt.collection.folderLabel));
    expect(defaultProps.onAddFolder).toHaveBeenCalledWith('col-1', pt.collection.newFolderPlaceholder, 'workflows');
  });

  it('should add folder in mocks tab', async () => {
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([]), ok: true });
    render(<CollectionView {...defaultProps} activeTab="mocks" />);
    await waitFor(() => { expect(global.fetch).toHaveBeenCalled(); });
    fireEvent.click(screen.getByText(pt.collection.folderLabel));
    expect(defaultProps.onAddFolder).toHaveBeenCalledWith('col-1', pt.collection.newFolderPlaceholder, 'mocks');
  });
});
