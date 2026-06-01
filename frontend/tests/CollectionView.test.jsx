import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CollectionView from '../src/CollectionView';

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
  onSelectRequest: vi.fn(),
  onUpdateName: vi.fn(),
  onViewDocumentation: vi.fn(),
  onRunRequest: vi.fn(),
  onRunSingleRequest: vi.fn(),
  onBack: vi.fn(),
  onAddRequest: vi.fn(),
  onAddFolder: vi.fn(),
  onMoveRequest: vi.fn(),
  onDeleteRequest: vi.fn(),
  onDeleteFolder: vi.fn(),
  onReorderItem: vi.fn(),
  onUpdateFolderName: vi.fn(),
  onUpdateEnvironments: vi.fn(),
  onSetActiveEnvironment: vi.fn(),
  onUpdateScenarios: vi.fn(),
  onUpdateWorkflows: vi.fn(),
  onToggleSelection: vi.fn(),
  onViewUnifiedDoc: vi.fn(),
  selectedRequestIds: [],
};

describe('CollectionView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render collection header and tabs', () => {
    render(<CollectionView {...defaultProps} />);
    expect(screen.getByText('Minha Coleção')).toBeInTheDocument();
    expect(screen.getByText('Requests')).toBeInTheDocument();
    expect(screen.getByText('Cenários')).toBeInTheDocument();
    expect(screen.getByText('Mocks')).toBeInTheDocument();
  });

  it('should allow navigating between collection tabs', () => {
    render(<CollectionView {...defaultProps} />);
    
    const scenariosTab = screen.getByText('Cenários');
    fireEvent.click(scenariosTab);
    expect(screen.getByText('Cenários de Teste')).toBeInTheDocument();
    
    const mocksTab = screen.getByText('Mocks');
    act(() => {
      fireEvent.click(mocksTab);
    });
    expect(screen.getByText('Mock Servers')).toBeInTheDocument();
  });

  it('should allow expanding/collapsing folders', () => {
    render(<CollectionView {...defaultProps} />);
    const folder = screen.getByText('Auth Folder');
    fireEvent.click(folder);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('should open environments modal and allow interaction', () => {
    render(<CollectionView {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Gerenciar Ambientes'));
    
    expect(screen.getByText('Gerenciar Ambientes')).toBeInTheDocument();
    fireEvent.click(screen.getByText('+ Adicionar Chave'));
    
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should allow renaming an environment in the modal', () => {
    render(<CollectionView {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Gerenciar Ambientes'));
    
    const modal = screen.getByRole('dialog');
    // Localiza o item do ambiente "Produção" para isolar o botão de renomeio e evitar ambiguidade
    const envItem = within(modal).getByText('Produção').closest('.group');
    const editBtn = within(envItem).getByTitle('Renomear Ambiente');
    fireEvent.click(editBtn);
    
    const input = within(modal).getByDisplayValue('Produção');
    fireEvent.change(input, { target: { value: 'Prod' } });
    fireEvent.blur(input);
    
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should allow renaming the collection', () => {
    render(<CollectionView {...defaultProps} />);
    const title = screen.getByText('Minha Coleção');
    fireEvent.click(title);
    
    const input = screen.getByDisplayValue('Minha Coleção');
    fireEvent.change(input, { target: { value: 'Novo Nome' } });
    fireEvent.blur(input);
    
    expect(defaultProps.onUpdateName).toHaveBeenCalledWith('col-1', 'Novo Nome');
  });

  it('should allow renaming a folder', () => {
    render(<CollectionView {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Renomear Pasta'));
    
    const input = screen.getByDisplayValue('Auth Folder');
    fireEvent.change(input, { target: { value: 'Auth v2' } });
    fireEvent.blur(input);
    
    expect(defaultProps.onUpdateFolderName).toHaveBeenCalledWith('col-1', 'Auth v2', 'folder-1');
  });

  it('should allow changing active environment', () => {
    render(<CollectionView {...defaultProps} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'env-1' } });
    expect(defaultProps.onSetActiveEnvironment).toHaveBeenCalledWith('col-1', 'env-1');
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
    
    // Busca por um item que está dentro da "Auth Folder"
    fireEvent.change(searchInput, { target: { value: 'Login' } });
    
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Get Users')).not.toBeInTheDocument();
  });

  it('should allow adding a new folder', () => {
    render(<CollectionView {...defaultProps} />);
    const btn = screen.getByText('NOVA PASTA');
    fireEvent.click(btn);
    
    expect(defaultProps.onAddFolder).toHaveBeenCalledWith('col-1', 'Nova Pasta');
  });

  it('should allow adding and removing environment variables', () => {
    render(<CollectionView {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Gerenciar Ambientes'));
    const modal = screen.getByRole('dialog');

    // Adicionar variável
    const addVarBtn = within(modal).getByText('+ Adicionar Chave');
    fireEvent.click(addVarBtn);
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();

    // Editar variável (Cobre handleUpdateVariable)
    const keyInput = within(modal).getByDisplayValue('host');
    fireEvent.change(keyInput, { target: { value: 'api_url' } });
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();

    const valInput = within(modal).getByDisplayValue('api.com');
    fireEvent.change(valInput, { target: { value: 'localhost' } });
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();

    // Remover variável (Cobre handleRemoveVariable)
    const removeVarBtn = within(modal).getByTitle('Remover Variável');
    fireEvent.click(removeVarBtn);
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalled();
  });

  it('should allow deleting an environment', () => {
    render(<CollectionView {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Gerenciar Ambientes'));
    const modal = screen.getByRole('dialog');

    // Localiza o item do ambiente "Desenvolvimento" para isolar o botão de exclusão
    const envItem = within(modal).getByText('Desenvolvimento').closest('.group');
    const deleteEnvBtn = within(envItem).getByTitle('Excluir Ambiente');
    fireEvent.click(deleteEnvBtn);
    expect(window.confirm).toHaveBeenCalledWith('Tem certeza que deseja excluir este ambiente?');
    expect(defaultProps.onUpdateEnvironments).toHaveBeenCalledWith('col-1', expect.arrayContaining([
      expect.objectContaining({ id: 'env-1' }) // Only env-1 should remain after deleting env-2
    ]));
  });

  it('should not allow deleting the last environment in the collection', () => {
    const singleEnvCol = { ...mockCollection, environments: [{ id: 'env-1', name: 'Global', variables: [] }] };
    render(<CollectionView {...defaultProps} collection={singleEnvCol} />);
    fireEvent.click(screen.getByTitle('Gerenciar Ambientes'));
    const modal = screen.getByRole('dialog');
    const deleteBtn = within(modal).getByTitle('Excluir Ambiente');
    fireEvent.click(deleteBtn);
    expect(defaultProps.onUpdateEnvironments).not.toHaveBeenCalled();
  });

  it('should allow dragging and dropping a request into a folder', () => {
    render(<CollectionView {...defaultProps} />);
    const requestItem = screen.getByText('Get Users');
    const folderItem = screen.getByText('Auth Folder');

    fireEvent.dragStart(requestItem, { dataTransfer: { setData: vi.fn() } });
    fireEvent.dragOver(folderItem);
    fireEvent.drop(folderItem, { dataTransfer: { getData: vi.fn().mockReturnValue('req-1') } });

    expect(defaultProps.onMoveRequest).toHaveBeenCalledWith('col-1', 'req-1', 'folder-1');
  });

  it('should allow dragging and dropping a request to the root', () => {
    const collectionWithNestedRequest = {
      ...mockCollection,
      requests: [
        { id: 'folder-1', name: 'Auth Folder', type: 'folder', requests: [
            { id: 'req-nested', name: 'Login', method: 'POST', url: '/login', type: 'request' }
        ] }
      ]
    };
    render(<CollectionView {...defaultProps} collection={collectionWithNestedRequest} />);
    
    // Expande a pasta para que o item "Login" seja renderizado no DOM
    const folder = screen.getByText('Auth Folder');
    fireEvent.click(folder);

    const requestItem = screen.getByText('Login');
    const rootDropArea = screen.getByTestId('root-drop-container');

    fireEvent.dragStart(requestItem, { dataTransfer: { setData: vi.fn() } });
    fireEvent.dragOver(rootDropArea);
    fireEvent.drop(rootDropArea, { dataTransfer: { getData: vi.fn().mockReturnValue('req-nested') } });

    expect(defaultProps.onMoveRequest).toHaveBeenCalledWith('col-1', 'req-nested', null);
  });

  it('should display unified documentation button when requests are selected', () => {
    const propsWithSelection = { ...defaultProps, selectedRequestIds: ['req-1'] };
    render(<CollectionView {...propsWithSelection} />);
    expect(screen.getByText('GERAR DOC. UNIFICADA (1)')).toBeInTheDocument();
  });
});