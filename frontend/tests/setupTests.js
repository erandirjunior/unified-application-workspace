import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock de APIs globais que o jsdom não implementa completamente
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
  })),
});

// Mocks para funções nativas de diálogo
window.alert = vi.fn();
window.confirm = vi.fn(() => true);

// Mock global de Fetch com retorno padrão seguro
global.fetch = vi.fn().mockResolvedValue({
  json: async () => ([]),
  ok: true,
  status: 200,
});

// Mock de APIs de URL para suportar processos de exportação
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock de EventSource para o Live Monitoring
global.EventSource = vi.fn().mockImplementation(function() {
  this.close = vi.fn();
  this.onmessage = null;
  this.onerror = null;
  this.onopen = null;
});