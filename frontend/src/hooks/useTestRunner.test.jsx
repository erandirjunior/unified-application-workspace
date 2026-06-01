import { renderHook, act, waitFor } from '@testing-library/react'; // waitFor vem do @testing-library/react
import { describe, it, expect, vi, beforeEach } from 'vitest'; // Outros do vitest
import { useTestRunner } from './useTestRunner';

describe('useTestRunner', () => {
  const mockCol = { id: '1', activeEnvironmentId: 'default', environments: [] };
  const mockGetPayload = vi.fn(() => ({ url: 'http://test.com', method: 'GET' }));
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('deve processar logs e reports recebidos via NDJSON stream', async () => {
    const log = { type: 'log', timestamp: '10:00', statusCode: 200, responseTime: 50 };
    const report = { type: 'summary', totalRequests: 1, successCount: 1 }; // Alterado para 'summary'
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(JSON.stringify(log) + '\n'));
        controller.enqueue(new TextEncoder().encode(JSON.stringify(report) + '\n'));
        controller.close();
      }
    });

    global.fetch.mockResolvedValue({ ok: true, body: stream });

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    await act(async () => {
      await result.current.sendRequests();
    });

    expect(result.current.requestLogs).toHaveLength(1);
    expect(result.current.reportData.totalRequests).toBe(1);
    expect(result.current.isRunning).toBe(false);
  });

  it('deve suportar interrupção do teste via AbortController (stopTest)', async () => {
    // Mock fetch para simular uma requisição em andamento que pode ser abortada
    global.fetch.mockImplementation((url, options) => {
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const { result } = renderHook(() => useTestRunner(mockCol, mockGetPayload, mockToast));

    act(() => { result.current.sendRequests(); });
    expect(result.current.isRunning).toBe(true);

    act(() => { result.current.stopTest(); });
    await waitFor(() => expect(result.current.isRunning).toBe(false));
  });

  it('deve injetar headers de autenticação corretamente no payload', async () => {
    const mockPayloadBearer = {
      url: 'http://test.com/bearer', method: 'GET', authType: 'bearer', authToken: 'mytoken123'
    };
    const mockPayloadBasic = {
      url: 'http://test.com/basic', method: 'GET', authType: 'basic', authUsername: 'user', authPassword: 'pass'
    };
    const mockPayloadApiKey = {
      url: 'http://test.com/apikey', method: 'GET', authType: 'apikey', apiKeyName: 'X-API-Key', apiKeyValue: 'myapikey'
    };

    // Helper para criar um ReadableStream que se fecha imediatamente.
    // Streams não podem ser reutilizados após lidos.
    const createEmptyStream = () => new ReadableStream({
      start(controller) { controller.close(); }
    });

    // Mock para bearer
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const { result: resultBearer } = renderHook(() => useTestRunner(mockCol, () => mockPayloadBearer, mockToast));
    await act(async () => { await resultBearer.current.sendRequests(); });
    const bearerBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(bearerBody.headers).toMatchObject({ 'Authorization': 'Bearer mytoken123' });

    // Mock para basic
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const { result: resultBasic } = renderHook(() => useTestRunner(mockCol, () => mockPayloadBasic, mockToast));
    await act(async () => { await resultBasic.current.sendRequests(); });
    const basicBody = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(basicBody.headers).toMatchObject({ 'Authorization': 'Basic dXNlcjpwYXNz' });

    // Mock para apikey
    global.fetch.mockResolvedValueOnce({ ok: true, body: createEmptyStream() });
    const { result: resultApiKey } = renderHook(() => useTestRunner(mockCol, () => mockPayloadApiKey, mockToast));
    await act(async () => { await resultApiKey.current.sendRequests(); });
    const apiKeyBody = JSON.parse(global.fetch.mock.calls[2][1].body);
    expect(apiKeyBody.headers).toMatchObject({ 'X-API-Key': 'myapikey' });
  });
});