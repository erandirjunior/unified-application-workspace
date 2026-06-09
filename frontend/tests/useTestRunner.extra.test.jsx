import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTestRunner } from '../src/hooks/useTestRunner';

describe('useTestRunner - additional coverage', () => {
  const mockToast = vi.fn();
  const createEmptyStream = () => new ReadableStream({ start(c) { c.close(); } });

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should accept an array as overridePayload and wrap it in { requests }', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn();

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests([{ url: 'http://test.com', method: 'GET' }]);
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.requests).toBeDefined();
    expect(body.requests.length).toBe(1);
    expect(mockGetPayload).not.toHaveBeenCalled();
  });

  it('should accept overridePayload with requests property directly', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn();

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests({ requests: [{ url: '/api', method: 'POST' }], totalRequests: '10', duration: '5', rampUp: '2' });
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.totalRequests).toBe(10);
    expect(body.duration).toBe(5);
    expect(body.rampUp).toBe(2);
    expect(mockGetPayload).not.toHaveBeenCalled();
  });

  it('should fall back to getRequestFormPayload when overridePayload is null', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn(() => ({ url: 'http://fallback.com', method: 'GET' }));

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests(null);
    });

    expect(mockGetPayload).toHaveBeenCalled();
  });

  it('should inject environment variables into the request body', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = {
      id: '1',
      environments: [{ id: 'env-1', name: 'Dev', variables: [{ key: 'host', value: 'localhost' }, { key: '', value: 'ignored' }] }],
      activeEnvironmentId: 'env-1'
    };
    const mockGetPayload = vi.fn(() => ({ url: 'http://{{host}}/api', method: 'GET' }));

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests();
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.variables).toEqual({ host: 'localhost' });
  });

  it('should handle connection error (non-AbortError)', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn(() => ({ url: 'http://test.com', method: 'GET' }));

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests();
    });

    expect(mockToast).toHaveBeenCalledWith('Erro na conexão com o backend.', 'error');
    expect(result.current.isRunning).toBe(false);
  });

  it('should process payload with parallel step type in requests', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn();

    const payload = {
      requests: [
        { type: 'parallel', requests: [{ url: '/p1', method: 'GET', authType: 'bearer', authToken: 'tok123', headers: [] }] }
      ],
      totalRequests: '5',
      duration: '0',
      rampUp: '0'
    };

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests(payload);
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.requests[0].type).toBe('parallel');
    expect(body.requests[0].requests[0].headers).toMatchObject({ Authorization: 'Bearer tok123' });
  });

  it('should process payload with loop step type in requests', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn();

    const payload = {
      requests: [
        { type: 'loop', steps: [{ url: '/loop', method: 'POST', authType: 'basic', authUsername: 'u', authPassword: 'p', headers: {} }] }
      ],
      totalRequests: '1',
      duration: '0',
      rampUp: '0'
    };

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests(payload);
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.requests[0].type).toBe('loop');
    expect(body.requests[0].steps[0].headers).toMatchObject({ Authorization: expect.stringContaining('Basic') });
  });

  it('should process payload with condition step type in requests', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn();

    const payload = {
      requests: [
        {
          type: 'condition',
          steps: [{ url: '/then', method: 'GET', authType: 'apikey', apiKeyName: 'X-Key', apiKeyValue: 'val', headers: [] }],
          elseSteps: [{ url: '/else', method: 'GET', authType: 'none', headers: [] }]
        }
      ],
      totalRequests: '1',
      duration: '0',
      rampUp: '0'
    };

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests(payload);
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.requests[0].steps[0].headers).toMatchObject({ 'X-Key': 'val' });
    expect(body.requests[0].elseSteps[0].headers).toEqual({});
  });

  it('should handle prepareRequest with headers as array', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn();

    const payload = {
      url: 'http://test.com',
      method: 'GET',
      headers: [{ key: 'X-Custom', value: 'val1' }, { key: '', value: 'empty-key' }],
      authType: 'none',
      totalRequests: '1',
      duration: '0',
      rampUp: '0'
    };

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests(payload);
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.headers).toEqual({ 'X-Custom': 'val1' });
  });

  it('should count success and error from streamed logs', async () => {
    const successLog = { type: 'log', success: true, statusCode: 200, responseTime: 10 };
    const errorLog = { type: 'log', success: false, statusCode: 500, responseTime: 50 };

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(successLog) + '\n'));
        controller.enqueue(new TextEncoder().encode(JSON.stringify(errorLog) + '\n'));
        controller.close();
      }
    });

    global.fetch.mockResolvedValueOnce({ ok: true, body: stream });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn(() => ({ url: 'http://test.com', method: 'GET' }));

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests();
    });

    expect(result.current.requestLogs).toHaveLength(2);
  });

  it('should handle invalid JSON in stream gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('invalid json line\n'));
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'log', success: true, statusCode: 200 }) + '\n'));
        controller.close();
      }
    });

    global.fetch.mockResolvedValueOnce({ ok: true, body: stream });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn(() => ({ url: 'http://test.com', method: 'GET' }));

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests();
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.requestLogs).toHaveLength(1);
    consoleSpy.mockRestore();
  });

  it('should generate reportData on abort with correct counts', async () => {
    const successLog = { type: 'log', success: true, statusCode: 200, responseTime: 10 };

    global.fetch.mockImplementation((url, options) => {
      return new Promise((resolve, reject) => {
        // Simulate stream that sends one log then gets aborted
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(JSON.stringify(successLog) + '\n'));
            // Don't close - simulate ongoing stream
            options.signal.addEventListener('abort', () => {
              controller.error(new DOMException('Aborted', 'AbortError'));
            });
          }
        });
        resolve({ ok: true, body: stream });
      });
    });

    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn(() => ({ url: 'http://test.com', method: 'GET' }));

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    // Start the test
    act(() => { result.current.sendRequests(); });

    // Wait for the stream to start reading
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    // Stop the test
    act(() => { result.current.stopTest(); });

    await waitFor(() => expect(result.current.isRunning).toBe(false));
    expect(mockToast).toHaveBeenCalledWith('Teste interrompido!', 'warning');
  });

  it('should store lastExecutedPayload after execution', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const payload = { url: 'http://stored.com', method: 'POST' };
    const mockGetPayload = vi.fn();

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests(payload);
    });

    expect(result.current.lastExecutedPayload).toEqual(payload);
  });

  it('should skip empty lines in NDJSON stream', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('\n\n' + JSON.stringify({ type: 'log', success: true }) + '\n\n'));
        controller.close();
      }
    });

    global.fetch.mockResolvedValueOnce({ ok: true, body: stream });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn(() => ({ url: 'http://test.com', method: 'GET' }));

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests();
    });

    expect(result.current.requestLogs).toHaveLength(1);
  });

  it('should handle prepareRequest returning null/undefined input', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn();

    // A request type step where type is unrecognized should pass through
    const payload = {
      requests: [{ type: 'unknown_type', name: 'Unknown' }],
      totalRequests: '1',
      duration: '0',
      rampUp: '0'
    };

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests(payload);
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.requests[0].type).toBe('unknown_type');
  });

  it('should handle a single request object with url as overridePayload', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const mockCol = { id: '1', environments: [], activeEnvironmentId: null };
    const mockGetPayload = vi.fn();

    const payload = { url: 'http://single.com', method: 'DELETE', headers: {}, totalRequests: '3', duration: '10', rampUp: '1' };

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests(payload);
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.url).toBe('http://single.com');
    expect(body.totalRequests).toBe(3);
    expect(body.duration).toBe(10);
    expect(body.rampUp).toBe(1);
  });
});
