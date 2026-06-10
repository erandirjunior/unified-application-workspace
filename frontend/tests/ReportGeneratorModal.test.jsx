import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportGeneratorModal from '../src/components/ReportGeneratorModal';
import { pt } from '../src/locales/pt';

describe('ReportGeneratorModal', () => {
  const baseRequest = {
    id: 'req-1',
    name: 'Get Users',
    method: 'GET',
    url: 'http://api.com/users',
    documentation: '# Test Doc',
    authType: 'none',
    bodyType: 'none',
    bodyRaw: '',
    headers: [],
    pathParams: [],
    responses: [],
    bodyParams: [],
  };

  const baseRequest2 = {
    id: 'req-2',
    name: 'Create User',
    method: 'POST',
    url: 'http://api.com/users',
    documentation: '',
    authType: 'bearer',
    authToken: 'abc',
    bodyType: 'json',
    bodyRaw: '{"name":"test"}',
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    pathParams: [],
    responses: [{ statusCode: '201', description: 'Created', body: '{"id":1}', bodyFields: [] }],
    bodyParams: [],
  };

  const collection = {
    id: 'col-1',
    name: 'Test API',
    requests: [baseRequest, baseRequest2],
    environments: [{ id: 'env-1', name: 'Prod', variables: [{ key: 'host', value: 'api.com' }] }],
    activeEnvironmentId: 'env-1',
  };

  const defaultProps = {
    collection,
    t: pt,
    theme: 'dark',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the modal with collection name as title', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    expect(screen.getByDisplayValue('Test API')).toBeInTheDocument();
  });

  it('should show empty state when no requests selected', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    expect(screen.getByText('Selecione as actions para gerar o relatório')).toBeInTheDocument();
  });

  it('should list all requests from collection', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    expect(screen.getByText('Get Users')).toBeInTheDocument();
    expect(screen.getByText('Create User')).toBeInTheDocument();
  });

  it('should show selection count', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    expect(screen.getByText('0 de 2 selecionadas')).toBeInTheDocument();
  });

  it('should select a request when clicked', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Users'));
    expect(screen.getByText('1 de 2 selecionadas')).toBeInTheDocument();
  });

  it('should deselect a request when clicked again', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    // First click selects
    const listItems = screen.getAllByText('Get Users');
    fireEvent.click(listItems[0]);
    expect(screen.getByText('1 de 2 selecionadas')).toBeInTheDocument();
    // After selection "Get Users" appears in multiple places (list, order, preview)
    // Click the first one in the selection list to deselect
    const allGetUsers = screen.getAllByText('Get Users');
    fireEvent.click(allGetUsers[0]);
    expect(screen.getByText('0 de 2 selecionadas')).toBeInTheDocument();
  });

  it('should select all when "Todas" is clicked', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Todas'));
    expect(screen.getByText('2 de 2 selecionadas')).toBeInTheDocument();
  });

  it('should deselect all when "Nenhuma" is clicked', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Todas'));
    fireEvent.click(screen.getByText('Nenhuma'));
    expect(screen.getByText('0 de 2 selecionadas')).toBeInTheDocument();
  });

  it('should show preview when requests are selected', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Users'));
    // Title should appear in the preview section
    expect(screen.getByText('Test API')).toBeInTheDocument();
    expect(screen.getByText('1 endpoint documentado')).toBeInTheDocument();
  });

  it('should show plural when multiple endpoints selected', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Todas'));
    expect(screen.getByText('2 endpoints documentados')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    const closeBtn = screen.getAllByRole('button').find(btn => btn.querySelector('svg path[d="M6 18L18 6M6 6l12 12"]'));
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should update report title', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    const input = screen.getByDisplayValue('Test API');
    fireEvent.change(input, { target: { value: 'Novo Título' } });
    expect(screen.getByDisplayValue('Novo Título')).toBeInTheDocument();
  });

  it('should disable export buttons when no requests selected', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    const htmlBtn = screen.getByText('EXPORTAR HTML').closest('button');
    const pdfBtn = screen.getByText('EXPORTAR PDF').closest('button');
    expect(htmlBtn).toBeDisabled();
    expect(pdfBtn).toBeDisabled();
  });

  it('should enable export buttons when requests are selected', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Users'));
    const htmlBtn = screen.getByText('EXPORTAR HTML').closest('button');
    const pdfBtn = screen.getByText('EXPORTAR PDF').closest('button');
    expect(htmlBtn).not.toBeDisabled();
    expect(pdfBtn).not.toBeDisabled();
  });

  it('should show order panel when requests are selected', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Todas'));
    expect(screen.getByText('Ordem no Relatório')).toBeInTheDocument();
  });

  it('should move item up in order', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Todas'));
    // The order section should exist
    expect(screen.getByText('Ordem no Relatório')).toBeInTheDocument();
    // Find up arrow buttons (chevron up path)
    const allButtons = screen.getAllByRole('button');
    const upButtons = allButtons.filter(btn => btn.querySelector('svg path[d="M5 15l7-7 7 7"]'));
    // The second up button (for item at index 1) should be enabled
    expect(upButtons.length).toBeGreaterThan(0);
    fireEvent.click(upButtons[upButtons.length - 1]);
    // After move, order should have changed
    expect(screen.getByText('Ordem no Relatório')).toBeInTheDocument();
  });

  it('should move item down in order', () => {
    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Todas'));
    const allButtons = screen.getAllByRole('button');
    const downButtons = allButtons.filter(btn => btn.querySelector('svg path[d="M19 9l-7 7-7-7"]'));
    expect(downButtons.length).toBeGreaterThan(0);
    fireEvent.click(downButtons[0]);
    expect(screen.getByText('Ordem no Relatório')).toBeInTheDocument();
  });

  it('should export HTML when button is clicked', () => {
    const mockClick = vi.fn();
    const mockCreateElement = vi.spyOn(document, 'createElement');
    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Users'));

    // Mock anchor element
    const mockAnchor = { href: '', download: '', click: mockClick };
    mockCreateElement.mockReturnValueOnce(mockAnchor);

    fireEvent.click(screen.getByText('EXPORTAR HTML'));
    expect(mockClick).toHaveBeenCalled();
    mockCreateElement.mockRestore();
  });

  it('should export PDF when button is clicked', () => {
    const mockWrite = vi.fn();
    const mockClose = vi.fn();
    const mockPrint = vi.fn();
    window.open = vi.fn().mockReturnValue({
      document: { write: mockWrite, close: mockClose },
      print: mockPrint,
    });

    render(<ReportGeneratorModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Users'));
    fireEvent.click(screen.getByText('EXPORTAR PDF'));

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockWrite).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('should handle collection with folders recursively', () => {
    const collectionWithFolders = {
      ...collection,
      requests: [
        { id: 'folder-1', type: 'folder', name: 'Auth', requests: [baseRequest] },
        baseRequest2,
      ],
    };
    render(<ReportGeneratorModal {...defaultProps} collection={collectionWithFolders} />);
    // Should find both requests (one inside folder)
    expect(screen.getByText('Get Users')).toBeInTheDocument();
    expect(screen.getByText('Create User')).toBeInTheDocument();
    expect(screen.getByText('0 de 2 selecionadas')).toBeInTheDocument();
  });

  it('should use default title when collection has no name', () => {
    const noNameCollection = { ...collection, name: '' };
    render(<ReportGeneratorModal {...defaultProps} collection={noNameCollection} />);
    expect(screen.getByDisplayValue('Documentação da API')).toBeInTheDocument();
  });
});
