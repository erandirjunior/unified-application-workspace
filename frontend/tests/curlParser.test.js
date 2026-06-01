import { describe, it, expect } from 'vitest';
import { parseCurl } from '../src/utils/curlParser'; // Import corrigido

describe('curlParser', () => {
  it('deve processar uma requisição GET simples', () => {
    const curl = 'curl https://api.exemplo.com/users';
    const result = parseCurl(curl);
    expect(result.method).toBe('GET');
    expect(result.url).toBe('https://api.exemplo.com/users');
  });
  // ... outros testes ...
});