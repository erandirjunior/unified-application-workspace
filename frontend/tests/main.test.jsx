import { vi, describe, it, expect } from 'vitest';
import ReactDOM from 'react-dom/client';

// Mockamos o react-dom/client para não tentar renderizar de fato no JSDOM real
vi.mock('react-dom/client', () => ({
  default: {
    createRoot: vi.fn(() => ({
      render: vi.fn(),
    })),
  },
}));

describe('main.jsx', () => {
  it('should initialize the app in the root element', async () => {
    // Prepara o elemento de montagem no DOM simulado
    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    // Importa o arquivo para disparar a execução do código de topo nível
    await import('../src/main.jsx');

    expect(ReactDOM.createRoot).toHaveBeenCalledWith(rootElement);
  });
});