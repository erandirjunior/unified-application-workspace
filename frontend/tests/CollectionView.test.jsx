import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CollectionView from '../src/CollectionView';
import { pt } from '../src/locales/pt';

const mockCollection = {
  id: 'col-1',
  name: 'Minha Coleção',
  requests: [
    { id: 'req-1', name: 'Get Users', method: 'GET', url: 'http://api.local/users', type: 'request' },
    { id: 'folder-1', name: 'Auth Folder', type: 'folder', requests: [
        { id: 'req-nested', name: 'Login', method: 'POST', url: '/login', type: 'request' }
    ] }
  ],
  environments: [
    { id: 'env-1', name: 'Produção', variables: [{ key: 'host', value: 'api.com' }] },
    { id: 'env-2', name: 'Desenvolvimento', variables: [] }
  ],
  activeEnvironmentId: 'env-1',
  scenarios: [{ id: 's1', name: 'Cenário 1', steps: [] }],
  workflows: []
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
};

describe('CollectionView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render collection name and request items', () => {
    render(<CollectionView {...defaultProps} />);
    expect(screen.getByText('Minha Coleção')).toBeInTheDocument();
    expect(screen.getByText('Get Users')).toBeInTheDocument();
  });

  it('should render search input and filter items', () => {
    render(<CollectionView {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Pesquisar requisições...');
    
    fireEvent.change(searchInput, { target: { value: 'Login' } });
    
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Get Users')).not.toBeInTheDocument();
  });

  it('should allow expanding/collapsing folders', () => {
    render(<CollectionView {...defaultProps} />);
    const folder = screen.getByText('Auth Folder');
    fireEvent.click(folder);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('should open environments modal when isEnvModalOpen is true', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    expect(screen.getByText('Gerenciar Ambientes')).toBeInTheDocument();
  });

  it('should allow adding a variable in the environments modal', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    
    const modal = screen.getByRole('dialog');
    fireEvent.click(within(modal).getByText('+ Adicionar Chave'));
    
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should allow renaming an environment in the modal', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    
    const modal = screen.getByRole('dialog');
    const envItem = within(modal).getByText('Produção').closest('.group');
    const editBtn = within(envItem).getByTitle('Renomear Ambiente');
    fireEvent.click(editBtn);
    
    const input = within(modal).getByDisplayValue('Produção');
    fireEvent.change(input, { target: { value: 'Prod' } });
    fireEvent.blur(input);
    
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should allow renaming a folder', () => {
    render(<CollectionView {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Renomear Pasta'));
    
    const input = screen.getByDisplayValue('Auth Folder');
    fireEvent.change(input, { target: { value: 'Auth v2' } });
    fireEvent.blur(input);
    
    expect(defaultProps.onUpdateFolderName).toHaveBeenCalledWith('col-1', 'Auth v2', 'folder-1');
  });

  it('should allow deleting a request', () => {
    render(<CollectionView {...defaultProps} />);
    const deleteBtn = screen.getAllByTitle('Excluir')[0];
    fireEvent.click(deleteBtn);
    expect(defaultProps.onDeleteRequest).toHaveBeenCalledWith('col-1', 'req-1');
  });

  it('should perform recursive search and find items inside folders', () => {
    render(<CollectionView {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Pesquisar requisições...');
    
    fireEvent.change(searchInput, { target: { value: 'Login' } });
    
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Get Users')).not.toBeInTheDocument();
  });

  it('should allow adding a new folder', () => {
    render(<CollectionView {...defaultProps} />);
    const btn = screen.getByText('Pasta');
    fireEvent.click(btn);
    
    expect(defaultProps.onAddFolder).toHaveBeenCalledWith('col-1', 'Nova Pasta');
  });

  it('should allow adding and removing environment variables', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    const modal = screen.getByRole('dialog');

    const addVarBtn = within(modal).getByText('+ Adicionar Chave');
    fireEvent.click(addVarBtn);
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();

    const keyInput = within(modal).getByDisplayValue('host');
    fireEvent.change(keyInput, { target: { value: 'api_url' } });
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();

    const valInput = within(modal).getByDisplayValue('api.com');
    fireEvent.change(valInput, { target: { value: 'localhost' } });
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();

    const removeVarBtn = within(modal).getByTitle('Remover Variável');
    fireEvent.click(removeVarBtn);
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should allow deleting an environment', () => {
    render(<CollectionView {...defaultProps} isEnvModalOpen={true} />);
    const modal = screen.getByRole('dialog');

    const envItem = within(modal).getByText('Desenvolvimento').closest('.group');
    const deleteEnvBtn = within(envItem).getByTitle('Excluir Ambiente');
    fireEvent.click(deleteEnvBtn);
    expect(window.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir este ambiente?');
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalledWith('col-1', expect.arrayContaining([
      expect.objectContaining({ id: 'env-1' })
    ]));
  });

  it('should not allow deleting the last environment in the collection', () => {
    const singleEnvCol = { ...mockCollection, environments: [{ id: 'env-1', name: 'Global', variables: [] }] };
    render(<CollectionView {...defaultProps} collection={singleEnvCol} isEnvModalOpen={true} />);
    const modal = screen.getByRole('dialog');
    const deleteBtn = within(modal).getByTitle('Excluir Ambiente');
    fireEvent.click(deleteBtn);
    expect(defaultProps.onUpdateEnvironments).not.toHaveBeenCalled();
  });

  it('should allow dragging and dropping a request into a folder', () => {
    render(<CollectionView {...defaultProps} />);
    const requestItem = screen.getByText('Get Users');
    const folderItem = screen.getByText('Auth Folder');

    fireEvent.dragStart(requestItem.closest('[draggable]'), { dataTransfer: { setData: vi.fn() } });
    fireEvent.dragOver(folderItem.closest('[class*="rounded-lg"]'));
    fireEvent.drop(folderItem.closest('[class*="rounded-lg"]'), { dataTransfer: { getData: vi.fn().mockReturnValue('req-1') } });

    expect(defaultProps.onMoveRequest).toHaveBeenCalledWith('col-1', 'req-1', 'folder-1', 'req-1');
  });

  it('should call onBack when clicking the back button', () => {
    render(<CollectionView {...defaultProps} />);
    const backBtn = screen.getByTitle('Voltar para o Dashboard');
    fireEvent.click(backBtn);
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('should render WorkflowsPanel when activeTab is workflows', () => {
    const colWithWorkflows = { ...mockCollection, workflows: [{ id: 'wf-1', name: 'Login Flow', steps: [] }] };
    render(<CollectionView {...defaultProps} collection={colWithWorkflows} activeTab="workflows" />);
    // WorkflowsPanel shows empty state when no editing workflow
    expect(screen.getByText(pt.collection.selectWorkflow)).toBeInTheDocument();
  });

  it('should render MocksPanel when activeTab is mocks', () => {
    render(<CollectionView {...defaultProps} activeTab="mocks" />);
    // MocksPanel shows empty state when no mock is selected
    expect(screen.getByText(pt.mocks.selectMock)).toBeInTheDocument();
  });

  it('should call onUpdateWorkflows when adding a new workflow via sidebar', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const colWithWorkflows = { ...mockCollection, workflows: [{ id: 'wf-1', name: 'Existing', steps: [] }] };
    
    render(<CollectionView {...defaultProps} collection={colWithWorkflows} activeTab="workflows" 
      editorProps={{ activeStepIndex: null, bodyRaw: '', theme: 'dark', methodStyles: {} }}
      requestLogs={[]} reportData={null} isRunning={false} sendRequests={vi.fn()} stopTest={vi.fn()} lastExecutedPayload={null} onSaveResponseToDoc={vi.fn()}
    />);
    const workflowBtn = screen.getByText(pt.workflows.newBtn);
    fireEvent.click(workflowBtn);
    
    expect(defaultProps.onUpdateWorkflows).toHaveBeenCalledWith('col-1', expect.arrayContaining([
      expect.objectContaining({ id: 'wf-1' }),
      expect.objectContaining({ name: 'Workflow' })
    ]));
    consoleSpy.mockRestore();
  });

  it('should call onAddFolder for workflows tab', () => {
    render(<CollectionView {...defaultProps} activeTab="workflows" />);
    const pastaBtn = screen.getByText('Pasta');
    fireEvent.click(pastaBtn);
    expect(defaultProps.onAddFolder).toHaveBeenCalledWith('col-1', 'Nova Pasta', 'workflows');
  });

  it('should call onAddFolder for mocks tab', () => {
    render(<CollectionView {...defaultProps} activeTab="mocks" />);
    const pastaBtn = screen.getByText('Pasta');
    fireEvent.click(pastaBtn);
    expect(defaultProps.onAddFolder).toHaveBeenCalledWith('col-1', 'Nova Pasta', 'mocks');
  });

  it('should handle adding a new mock via sidebar', async () => {
    render(<CollectionView {...defaultProps} activeTab="mocks" />);
    const mockBtn = screen.getByText(pt.mocks.newBtn);
    await act(async () => { fireEvent.click(mockBtn); });
    // Mock is created via fetch POST which is mocked globally
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/manage-mocks',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
