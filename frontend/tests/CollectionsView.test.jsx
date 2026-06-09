import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CollectionsView from '../src/CollectionsView';
import { pt } from '../src/locales/pt';

const mockCollections = [
  { id: '1', name: 'API Produção', requests: [{ id: 'r1' }, { id: 'r2' }] },
  { id: '2', name: 'Microserviço Auth', requests: [] },
];

const defaultProps = {
  collections: mockCollections,
  t: pt,
  onSelectRequest: vi.fn(),
  onCreateCollection: vi.fn(),
  onDeleteCollection: vi.fn(),
  onReorderCollection: vi.fn(),
  onUpdateName: vi.fn(),
};

describe('CollectionsView', () => {
  it('should render the list of collections', () => {
    render(<CollectionsView {...defaultProps} />);
    expect(screen.getByText('API Produção')).toBeInTheDocument();
    expect(screen.getByText('Microserviço Auth')).toBeInTheDocument();
    expect(screen.getByText(/2 Actions/)).toBeInTheDocument();
  });

  it('should filter collections through the search bar', () => {
    render(<CollectionsView {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/Pesquisar coleções/);
    
    fireEvent.change(searchInput, { target: { value: 'Auth' } });
    
    expect(screen.queryByText('API Produção')).not.toBeInTheDocument();
    expect(screen.getByText('Microserviço Auth')).toBeInTheDocument();
  });

  it('should allow creating a new collection', () => {
    render(<CollectionsView {...defaultProps} />);
    const input = screen.getByPlaceholderText(/Ex: API de Pagamentos/);
    const btn = screen.getByText('Nova Coleção');
    
    fireEvent.change(input, { target: { value: 'Nova API' } });
    fireEvent.click(btn);
    
    expect(defaultProps.onCreateCollection).toHaveBeenCalledWith('Nova API');
  });

  it('should allow renaming a collection through edit mode', () => {
    render(<CollectionsView {...defaultProps} />);
    const renameBtn = screen.getAllByTitle('Renomear')[0];
    fireEvent.click(renameBtn);
    
    const input = screen.getByDisplayValue('API Produção');
    fireEvent.change(input, { target: { value: 'API v2' } });
    fireEvent.blur(input);
    
    expect(defaultProps.onUpdateName).toHaveBeenCalledWith('1', 'API v2');
  });

  it('should trigger deletion when clicking the corresponding button', () => {
    render(<CollectionsView {...defaultProps} />);
    const deleteBtn = screen.getAllByTitle('Excluir Coleção')[0];
    fireEvent.click(deleteBtn);
    expect(defaultProps.onDeleteCollection).toHaveBeenCalledWith('1');
  });

  it('should open the granular export flow', () => {
    const colWithDetails = {
      ...mockCollections[0],
      environments: [{ id: 'env-1', name: 'Prod', variables: [{ key: 'url', value: 'api.com' }] }],
      scenarios: [{ id: 's1', name: 'Cenário 1' }],
      workflows: [{ id: 'w1', name: 'Workflow 1' }]
    };
    render(<CollectionsView {...defaultProps} collections={[colWithDetails]} />);
    
    fireEvent.click(screen.getByTitle('Exportar Coleção'));
    expect(screen.getByText(/Exportar: API Produção/)).toBeInTheDocument();

    // Avança para seleção de variáveis
    fireEvent.click(screen.getByText('PRÓXIMO'));
    expect(screen.getByText('Selecione quais variáveis de ambiente deseja incluir no arquivo.')).toBeInTheDocument();
    expect(screen.getByText('url')).toBeInTheDocument();
  });

  it('should open the import modal and allow file selection', () => {
    render(<CollectionsView {...defaultProps} />);
    const importBtn = screen.getByText('IMPORTAR');
    fireEvent.click(importBtn);
    
    expect(screen.getByText('Importar Coleção')).toBeInTheDocument();
    const fileInput = screen.getByLabelText(/Arquivo de Coleção/);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.type).toBe('file');
  });

  it('should execute export after selecting variables', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURLMock = vi.fn().mockReturnValue('blob:url');
    global.URL.createObjectURL = createObjectURLMock;
    const colWithVars = {
      ...mockCollections[0],
      environments: [{ id: 'env-1', name: 'Prod', variables: [{ key: 'url', value: 'api.com' }] }]
    };
    render(<CollectionsView {...defaultProps} collections={[colWithVars]} />);
    
    fireEvent.click(screen.getByTitle('Exportar Coleção'));
    fireEvent.click(screen.getByText('PRÓXIMO'));
    
    const exportBtn = screen.getByText('EXPORTAR AGORA');
    fireEvent.click(exportBtn);
    
    expect(createObjectURLMock).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('should import a collection from a JSON file', async () => {
    const mockFileContent = JSON.stringify({
      collection: { id: 'col-imported', name: 'Imported API', requests: [] }
    });
    const file = new File([mockFileContent], 'collection.json', { type: 'application/json' });
    
    render(<CollectionsView {...defaultProps} />);
    
    fireEvent.click(screen.getByText('IMPORTAR'));
    
    const modal = screen.getByRole('dialog');
    const input = within(modal).getByLabelText(/Arquivo de Coleção/);
    fireEvent.change(input, { target: { files: [file] } });
    
    // Clica especificamente no botão de confirmação dentro do modal
    fireEvent.click(within(modal).getByRole('button', { name: 'IMPORTAR' }));

    await waitFor(() => {
        expect(defaultProps.onCreateCollection).toHaveBeenCalledWith('Imported API', expect.anything());
    });
  });
});
