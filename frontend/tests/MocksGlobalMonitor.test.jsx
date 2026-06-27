import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MocksGlobalMonitor from '../src/components/mocks/MocksGlobalMonitor';
import { pt } from '../src/locales/pt';

describe('MocksGlobalMonitor', () => {
  let eventSourceInstance;

  const mocksList = [
    { id: 'm1', name: 'Get Users', method: 'GET', path: '/users', active: true },
    { id: 'm2', name: 'Post User', method: 'POST', path: '/users', active: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    eventSourceInstance = null;
    global.EventSource = vi.fn().mockImplementation(function (url) {
      this.url = url;
      this.close = vi.fn();
      this.onmessage = null;
      this.onerror = null;
      this.onopen = null;
      eventSourceInstance = this;
    });
    // By default, fetch returns empty mocks (initial load)
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => [],
      ok: true,
      status: 200,
    });
  });

  const defaultProps = {
    t: pt,
    mocks: [],
    collection: { mockFolders: [] },
    fetchMocksList: vi.fn(),
    handleSaveMock: vi.fn(),
    onClose: vi.fn(),
  };

  it('should render the monitor header', () => {
    render(<MocksGlobalMonitor {...defaultProps} />);
    expect(screen.getByText('Mock Server Monitor')).toBeInTheDocument();
  });

  it('should show empty state when no mocks registered', () => {
    render(<MocksGlobalMonitor {...defaultProps} />);
    expect(screen.getByText('Nenhum mock registrado')).toBeInTheDocument();
  });

  it('should show "Aguardando requests..." when no logs', () => {
    render(<MocksGlobalMonitor {...defaultProps} />);
    expect(screen.getByText('Aguardando requests...')).toBeInTheDocument();
  });

  it('should show detail panel empty state', () => {
    render(<MocksGlobalMonitor {...defaultProps} />);
    expect(screen.getByText('Selecione um log para inspecionar')).toBeInTheDocument();
  });

  it('should render mocks from backend fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mocksList,
      ok: true,
      status: 200,
    });

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    expect(screen.getByText('Get Users')).toBeInTheDocument();
    expect(screen.getByText('Post User')).toBeInTheDocument();
  });

  it('should show active count from backend mocks', async () => {
    const activeMocks = [
      { id: 'm1', name: 'Mock 1', method: 'GET', path: '/a', active: true },
      { id: 'm2', name: 'Mock 2', method: 'POST', path: '/b', active: true },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => activeMocks,
      ok: true,
      status: 200,
    });

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    expect(screen.getByText('2 ativos')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    render(<MocksGlobalMonitor {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons.find(btn => btn.querySelector('svg path[d="M6 18L18 6M6 6l12 12"]'));
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should connect to EventSource on mount', () => {
    render(<MocksGlobalMonitor {...defaultProps} />);
    expect(global.EventSource).toHaveBeenCalledWith('http://localhost:8080/mock-stream');
  });

  it('should show connected status when EventSource opens', async () => {
    render(<MocksGlobalMonitor {...defaultProps} />);
    await act(async () => {
      if (eventSourceInstance && eventSourceInstance.onopen) {
        eventSourceInstance.onopen();
      }
    });
    const indicator = document.querySelector('.bg-emerald-500');
    expect(indicator).toBeInTheDocument();
  });

  it('should display logs when messages are received', async () => {
    const mocks = [{ id: 'm1', name: 'Get Users', method: 'GET', path: '/users', active: true }];
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mocks,
      ok: true,
      status: 200,
    });

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    await act(async () => {
      eventSourceInstance.onmessage({
        data: JSON.stringify({
          mockId: 'm1',
          method: 'GET',
          url: '/users',
          statusCode: 200,
          timestamp: '12:00:00',
          requestHeaders: {},
          responseBody: '{"ok":true}',
        }),
      });
    });

    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('GET /users')).toBeInTheDocument();
  });

  it('should show log details when a log is clicked', async () => {
    const mocks = [{ id: 'm1', name: 'Get Users', method: 'GET', path: '/users', active: true }];
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mocks,
      ok: true,
      status: 200,
    });

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    await act(async () => {
      eventSourceInstance.onmessage({
        data: JSON.stringify({
          mockId: 'm1',
          method: 'GET',
          url: '/api/users',
          statusCode: 200,
          timestamp: '14:30:00',
          requestHeaders: { 'Content-Type': 'application/json' },
          responseBody: '{"data":[]}',
        }),
      });
    });

    fireEvent.click(screen.getByText('GET /api/users'));
    expect(screen.getByText(/Detalhes da Transação/)).toBeInTheDocument();
  });

  it('should clear logs when Limpar button is clicked', async () => {
    const mocks = [{ id: 'm1', name: 'Mock', method: 'GET', path: '/x', active: true }];
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mocks,
      ok: true,
      status: 200,
    });

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    await act(async () => {
      eventSourceInstance.onmessage({
        data: JSON.stringify({ mockId: 'm1', method: 'GET', url: '/x', statusCode: 200, timestamp: '10:00', requestHeaders: {} }),
      });
    });

    expect(screen.getByText('GET /x')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Limpar'));
    expect(screen.queryByText('GET /x')).not.toBeInTheDocument();
  });

  it('should call fetch to activate all mocks', async () => {
    const inactiveMocks = [{ id: 'm1', name: 'Mock 1', method: 'GET', path: '/a', active: false }];
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => inactiveMocks,
      ok: true,
      status: 200,
    });

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    // Reset after initial fetch
    global.fetch.mockClear();
    global.fetch.mockResolvedValue({ json: async () => inactiveMocks, ok: true, status: 200 });

    await act(async () => {
      fireEvent.click(screen.getByText('Ativar Todos'));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/manage-mocks',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should call fetch to deactivate all mocks', async () => {
    const activeMocks = [{ id: 'm1', name: 'Mock 1', method: 'GET', path: '/a', active: true }];
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => activeMocks,
      ok: true,
      status: 200,
    });

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    global.fetch.mockClear();
    global.fetch.mockResolvedValue({ json: async () => [], ok: true, status: 200 });

    await act(async () => {
      fireEvent.click(screen.getByText('Parar Todos'));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/manage-mocks',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should toggle mock when toggle button is clicked', async () => {
    const mocks = [{ id: 'm1', name: 'Mock 1', method: 'GET', path: '/a', active: false }];
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mocks,
      ok: true,
      status: 200,
    });

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    // The toggle is a button with class rounded-full inside the mock list
    const toggleBtns = document.querySelectorAll('button[class*="rounded-full"]');
    expect(toggleBtns.length).toBeGreaterThan(0);

    global.fetch.mockClear();
    global.fetch.mockResolvedValue({ json: async () => mocks, ok: true, status: 200 });

    await act(async () => {
      fireEvent.click(toggleBtns[0]);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/manage-mocks',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"active":true'),
      })
    );
  });

  it('should filter logs by mock id', async () => {
    const mocks = [
      { id: 'm1', name: 'Mock A', method: 'GET', path: '/a', active: true },
      { id: 'm2', name: 'Mock B', method: 'POST', path: '/b', active: true },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mocks,
      ok: true,
      status: 200,
    });

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    await act(async () => {
      eventSourceInstance.onmessage({ data: JSON.stringify({ mockId: 'm1', method: 'GET', url: '/a', statusCode: 200, timestamp: '1', requestHeaders: {} }) });
      eventSourceInstance.onmessage({ data: JSON.stringify({ mockId: 'm2', method: 'POST', url: '/b', statusCode: 201, timestamp: '2', requestHeaders: {} }) });
    });

    // Change filter to Mock A
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'm1' } });

    expect(screen.getByText('GET /a')).toBeInTheDocument();
    expect(screen.queryByText('POST /b')).not.toBeInTheDocument();
  });

  it('should extract local mocks from collection mockFolders', async () => {
    const collection = {
      mockFolders: [
        {
          type: 'folder',
          requests: [
            { id: 'local1', name: 'Local Mock', method: 'GET', path: '/local', active: false },
          ],
        },
      ],
    };
    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} collection={collection} />);
    });
    expect(screen.getByText('Local Mock')).toBeInTheDocument();
  });

  it('should show disconnected status on EventSource error', async () => {
    render(<MocksGlobalMonitor {...defaultProps} />);
    await act(async () => {
      if (eventSourceInstance && eventSourceInstance.onerror) {
        eventSourceInstance.onerror();
      }
    });
    const indicator = document.querySelector('.bg-rose-500');
    expect(indicator).toBeInTheDocument();
  });

  it('should show singular ativo when one mock is active', async () => {
    const mocks = [{ id: 'm1', name: 'Mock', method: 'GET', path: '/a', active: true }];
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => mocks,
      ok: true,
      status: 200,
    });

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    expect(screen.getByText('1 ativo')).toBeInTheDocument();
  });

  it('should handle fetch error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await act(async () => {
      render(<MocksGlobalMonitor {...defaultProps} />);
    });

    // Should still render without crashing
    expect(screen.getByText('Mock Server Monitor')).toBeInTheDocument();
  });

  it('should close EventSource on unmount', () => {
    const { unmount } = render(<MocksGlobalMonitor {...defaultProps} />);
    const closeFunc = eventSourceInstance.close;
    unmount();
    expect(closeFunc).toHaveBeenCalled();
  });
});
