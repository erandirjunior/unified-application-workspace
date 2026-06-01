import { describe, it, expect } from 'vitest';
import { parseCurl } from './curlParser';

describe('curlParser', () => {
  it('deve processar uma requisição GET simples', () => {
    const curl = 'curl https://api.exemplo.com/users';
    const result = parseCurl(curl);
    expect(result.method).toBe('GET');
    expect(result.url).toBe('https://api.exemplo.com/users');
    expect(result.name).toBe('cURL: /users');
  });

  it('deve processar POST com corpo JSON e detectar bodyType', () => {
    const curl = `curl -X POST https://api.exemplo.com/users \
      -H "Content-Type: application/json" \
      -d '{"name": "João", "email": "joao@email.com"}'`;
    const result = parseCurl(curl);
    expect(result.method).toBe('POST');
    expect(result.bodyType).toBe('json');
    expect(JSON.parse(result.bodyRaw)).toEqual({ name: 'João', email: 'joao@email.com' });
  });

  it('deve detectar bodyType XML baseado no Content-Type', () => {
    const curl = `curl -X POST https://api.exemplo.com/orders \
      -H "Content-Type: application/xml" \
      -d '<order><id>123</id></order>'`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('xml');
    expect(result.bodyRaw).toContain('<order>');
  });

  it('deve processar Form URL Encoded e popular a tabela de parâmetros', () => {
    const curl = `curl -X POST https://api.exemplo.com/login \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "username=admin&password=123%20456"`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('form-urlencoded');
    expect(result.bodyParams).toContainEqual({ key: 'username', value: 'admin', type: 'text' });
    expect(result.bodyParams).toContainEqual({ key: 'password', value: '123 456', type: 'text' });
  });

  it('deve processar Multipart Form Data (-F) e identificar arquivos', () => {
    const curl = `curl -X POST https://api.exemplo.com/upload \
      -F "file=@foto.jpg" \
      -F "name=Minha Foto"`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('form-data');
    expect(result.bodyParams).toContainEqual({ key: 'file', value: '@foto.jpg', type: 'file' });
    expect(result.bodyParams).toContainEqual({ key: 'name', value: 'Minha Foto', type: 'text' });
  });

  it('deve detectar autenticação Bearer Token via header', () => {
    const curl = `curl -H "Authorization: Bearer my-secret-token" https://api.com`;
    const result = parseCurl(curl);
    expect(result.authType).toBe('bearer');
    expect(result.authToken).toBe('my-secret-token');
  });

  it('deve detectar autenticação Basic via flag -u', () => {
    const curl = `curl -u admin:pass123 https://api.com`;
    const result = parseCurl(curl);
    expect(result.authType).toBe('basic');
    expect(result.authUsername).toBe('admin');
    expect(result.authPassword).toBe('pass123');
  });

  it('deve detectar API Key customizada via header', () => {
    const curl = `curl -H "X-API-Key: key-789" https://api.com`;
    const result = parseCurl(curl);
    expect(result.authType).toBe('apikey');
    expect(result.apiKeyName).toBe('X-API-Key');
    expect(result.apiKeyValue).toBe('key-789');
  });

  it('deve tratar --data-binary @file como um upload de arquivo multipart', () => {
    const curl = `curl -X POST https://api.exemplo.com/upload --data-binary @report.pdf`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('form-data');
    expect(result.bodyParams[0]).toEqual({ key: 'file', value: '@report.pdf', type: 'file' });
  });

  it('deve lidar com quebras de linha e barras invertidas de continuação', () => {
    const curl = `curl -X POST https://api.com \\
      -H "X-Test: True" \\
      -d "data=ok"`;
    const result = parseCurl(curl);
    expect(result.method).toBe('POST');
    expect(result.headers).toContainEqual({ key: 'X-Test', value: 'True' });
    expect(result.bodyRaw).toBe('data=ok');
  });
});