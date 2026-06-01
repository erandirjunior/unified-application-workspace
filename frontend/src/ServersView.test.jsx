import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ServersView from './ServersView';

describe('ServersView', () => {
  const mockMocks = [
    { id: 'm1', name: 'Auth Mock', path: '/auth', method: 'POST', active: true, response: { status: 200, body: '{}' }, assertions: [] }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock do clipboard
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    global.fetch.mockResolvedValue({
      json: async () => mockMocks
    });
  });

  it('should fetch and list mocks on load', async () => {
    render(<ServersView onBack={vi.fn()} onSubViewChange={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Auth Mock')).toBeInTheDocument();
    });
    expect(screen.getByText('http://localhost:8080/mock/auth')).toBeInTheDocument();
  });

  it('should allow entering creation mode and saving a mock', async () => {
    render(<ServersView onBack={vi.fn()} onSubViewChange={vi.fn()} />);
    
    fireEvent.click(await screen.findByText('+ Criar Endpoint'));
    
    const nameInput = screen.getByLabelText('Nome Amigável');
    fireEvent.change(nameInput, { target: { value: 'Novo Mock Teste' } });
    
    fireEvent.click(screen.getByText('Salvar Mock'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('manage-mocks'), expect.objectContaining({
        method: 'POST'
      }));
    });
    
    // Aguarda o editor fechar para evitar avisos de act()
    await waitFor(() => expect(screen.queryByText('Salvar Mock')).not.toBeInTheDocument());
  });

  it('should handle file upload for the mock', async () => {
    render(<ServersView onBack={vi.fn()} onSubViewChange={vi.fn()} />);
    
    fireEvent.click(await screen.findByText('+ Criar Endpoint'));
    fireEvent.click(screen.getByText('ARQUIVO'));
    
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    const input = await screen.findByLabelText('Upload do Arquivo');
    
    // Simula a leitura do arquivo
    await fireEvent.change(input, { target: { files: [file] } });
    
    // Verifica se o feedback visual de arquivo pronto apareceu
    await waitFor(() => {
      expect(screen.getByText(/test\.txt \(Pronto para servir\)/)).toBeInTheDocument();
    });
  });

  it('should open the monitoring screen and close correctly', async () => {
    const onSubViewChange = vi.fn();
    render(<ServersView onBack={vi.fn()} onSubViewChange={onSubViewChange} />);
    
    const monitorBtn = await screen.findByTitle('Monitorar Tráfego');
    fireEvent.click(monitorBtn);
    
    expect(screen.getByText(/Monitoring: Auth Mock/)).toBeInTheDocument();
    expect(onSubViewChange).toHaveBeenCalledWith(true, expect.any(Function));

    // Simula o fechamento via callback do App.jsx
    const closeFn = onSubViewChange.mock.calls[1][1];
    await act(async () => {
      closeFn();
    });
    
    await waitFor(() => {
      expect(screen.queryByText(/Monitoring:/)).not.toBeInTheDocument();
    });
  });

  it('should delete a mock when clicking the button', async () => {
    render(<ServersView onBack={vi.fn()} onSubViewChange={vi.fn()} />);
    const deleteBtn = await screen.findByTitle('Excluir');
    await act(async () => {
      fireEvent.click(deleteBtn);
    });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('id=m1'), expect.objectContaining({ method: 'DELETE' }));
  });

  it('should allow adding and removing assertions in creation/edit mode', async () => {
    render(<ServersView onBack={vi.fn()} onSubViewChange={vi.fn()} />);
    
    fireEvent.click(await screen.findByText('+ Criar Endpoint'));
    
    const addAssertionBtn = screen.getByText('+ Add Validação');
    fireEvent.click(addAssertionBtn);
    
    expect(screen.getByDisplayValue('Authorization')).toBeInTheDocument(); // Default assertion
    
    const inputWithAuth = screen.getByDisplayValue('Authorization');
    const assertionContainer = inputWithAuth.closest('.flex.gap-2');
    const removeAssertionBtn = within(assertionContainer).getByTitle('Remover Asserção');
    fireEvent.click(removeAssertionBtn);
    
    expect(screen.queryByDisplayValue('Authorization')).not.toBeInTheDocument();
  });

  it('should allow toggling the active status of a mock', async () => {
    global.fetch.mockResolvedValueOnce({ json: async () => mockMocks }); // Initial fetch
    global.fetch.mockResolvedValueOnce({ json: async () => [{ ...mockMocks[0], active: false }] }); // Toggle fetch

    render(<ServersView onBack={vi.fn()} onSubViewChange={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('Auth Mock')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByTitle('Parar Servidor');
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('manage-mocks'), expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ ...mockMocks[0], active: false })
      }));
    });
  });

  it('should receive real-time logs via EventSource and allow inspection', async () => {
    // Mock da classe EventSource
    const mockEventSourceInstance = {
      onmessage: null,
      close: vi.fn(),
    };
    const EventSourceMock = vi.fn(() => mockEventSourceInstance);
    vi.stubGlobal('EventSource', EventSourceMock);

    render(<ServersView onBack={vi.fn()} onSubViewChange={vi.fn()} />);
    
    // Entra no monitoramento
    fireEvent.click(await screen.findByTitle('Monitorar Tráfego'));

    // Simula o recebimento de um log pelo stream
    const logData = { 
      mockId: 'm1', 
      method: 'POST', 
      url: '/auth', 
      statusCode: 201, 
      timestamp: '12:00:00',
      requestHeaders: { 'Content-Type': 'application/json' },
      responseHeaders: { 'Server': 'AST-Mock' },
      requestBody: '{"user": "test"}',
      responseBody: '{"token": "abc"}'
    };

    act(() => {
      mockEventSourceInstance.onmessage({ data: JSON.stringify(logData) });
    });

    // Verifica se o log apareceu na lista
    expect(screen.getByText('12:00:00')).toBeInTheDocument();
    expect(screen.getByText('201')).toBeInTheDocument();

    // Clica no log para inspecionar
    fireEvent.click(screen.getByText('12:00:00'));

    // Verifica se os detalhes (headers/body) apareceram
    expect(screen.getByText(/"Server": "AST-Mock"/)).toBeInTheDocument();
    expect(screen.getByText('{"user": "test"}')).toBeInTheDocument();
    expect(screen.getByText('{"token": "abc"}')).toBeInTheDocument();
  });

  it('should allow copying the mock URL to the clipboard', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<ServersView onBack={vi.fn()} onSubViewChange={vi.fn()} />);
    
    const copyBtn = await screen.findByText('Copiar URL');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('http://localhost:8080/mock/auth');
    expect(window.alert).toHaveBeenCalledWith('URL copiada!');
  });
});