import { describe, it, expect } from 'vitest';
import { parseCurl } from '../src/utils/curlParser';

describe('curlParser', () => {
  it('deve processar uma requisição GET simples', () => {
    const curl = 'curl https://api.exemplo.com/users';
    const result = parseCurl(curl);
    expect(result.method).toBe('GET');
    expect(result.url).toBe('https://api.exemplo.com/users');
    expect(result.name).toBe('cURL: /users');
  });

  it('deve processar requisição com método explícito -X POST', () => {
    const curl = 'curl -X POST https://api.com/data';
    const result = parseCurl(curl);
    expect(result.method).toBe('POST');
    expect(result.url).toBe('https://api.com/data');
  });

  it('deve processar requisição com --request PUT', () => {
    const curl = 'curl --request PUT https://api.com/resource/1';
    const result = parseCurl(curl);
    expect(result.method).toBe('PUT');
  });

  it('deve processar headers com -H', () => {
    const curl = `curl -H "Content-Type: application/json" -H "Accept: text/html" https://api.com/data`;
    const result = parseCurl(curl);
    expect(result.headers).toEqual([
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Accept', value: 'text/html' }
    ]);
  });

  it('deve detectar autenticação Bearer via header Authorization', () => {
    const curl = `curl -H "Authorization: Bearer my-secret-token" https://api.com/secure`;
    const result = parseCurl(curl);
    expect(result.authType).toBe('bearer');
    expect(result.authToken).toBe('my-secret-token');
    expect(result.headers).toEqual([]); // Authorization não deve ir nos headers normais
  });

  it('deve detectar autenticação Basic via header Authorization', () => {
    const encoded = btoa('admin:password123');
    const curl = `curl -H "Authorization: Basic ${encoded}" https://api.com/secure`;
    const result = parseCurl(curl);
    expect(result.authType).toBe('basic');
    expect(result.authUsername).toBe('admin');
    expect(result.authPassword).toBe('password123');
  });

  it('deve detectar autenticação Basic via flag -u', () => {
    const curl = `curl -u user:pass https://api.com/auth`;
    const result = parseCurl(curl);
    expect(result.authType).toBe('basic');
    expect(result.authUsername).toBe('user');
    expect(result.authPassword).toBe('pass');
  });

  it('deve detectar API Key via header x-api-key', () => {
    const curl = `curl -H "x-api-key: abc123" https://api.com/data`;
    const result = parseCurl(curl);
    expect(result.authType).toBe('apikey');
    expect(result.apiKeyValue).toBe('abc123');
  });

  it('deve processar corpo JSON com -d e detectar bodyType json', () => {
    const curl = `curl -X POST -H "Content-Type: application/json" -d '{"name":"test"}' https://api.com/users`;
    const result = parseCurl(curl);
    expect(result.method).toBe('POST');
    expect(result.bodyRaw).toBe('{"name":"test"}');
    expect(result.bodyType).toBe('json');
  });

  it('deve inferir bodyType json pela heurística do corpo (sem Content-Type)', () => {
    const curl = `curl -X POST -d '{"id":1}' https://api.com/data`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('json');
  });

  it('deve inferir bodyType xml pela heurística do corpo', () => {
    const curl = `curl -X POST -d '<root><item/></root>' https://api.com/data`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('xml');
  });

  it('deve inferir bodyType form-urlencoded pela heurística (key=value)', () => {
    const curl = `curl -X POST -d 'name=john&age=30' https://api.com/form`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('form-urlencoded');
    expect(result.bodyParams).toEqual([
      { key: 'name', value: 'john', type: 'text' },
      { key: 'age', value: '30', type: 'text' }
    ]);
  });

  it('deve processar --data-urlencode e definir bodyType form-urlencoded', () => {
    const curl = `curl --data-urlencode 'query=hello world' https://api.com/search`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('form-urlencoded');
    expect(result.method).toBe('POST'); // -d implícito muda GET para POST
  });

  it('deve processar form-data com -F', () => {
    const curl = `curl -F "name=test" -F "file=@photo.png" https://api.com/upload`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('form-data');
    expect(result.bodyParams).toEqual([
      { key: 'name', value: 'test', type: 'text' },
      { key: 'file', value: '@photo.png', type: 'file' }
    ]);
    expect(result.method).toBe('POST');
  });

  it('deve processar --data-binary com arquivo', () => {
    const curl = `curl -X POST --data-binary @data.bin https://api.com/upload`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('form-data');
    expect(result.bodyParams[0].type).toBe('file');
  });

  it('deve mudar método de GET para POST quando -d é utilizado sem -X', () => {
    const curl = `curl -d '{"a":1}' https://api.com/data`;
    const result = parseCurl(curl);
    expect(result.method).toBe('POST');
  });

  it('deve lidar com quebras de linha (continuação de linha com \\)', () => {
    const curl = `curl -X POST \\\n  -H "Content-Type: application/json" \\\n  -d '{"key":"val"}' \\\n  https://api.com/test`;
    const result = parseCurl(curl);
    expect(result.method).toBe('POST');
    expect(result.url).toBe('https://api.com/test');
    expect(result.bodyRaw).toBe('{"key":"val"}');
  });

  it('deve concatenar múltiplos -d com &', () => {
    const curl = `curl -d 'a=1' -d 'b=2' https://api.com/form`;
    const result = parseCurl(curl);
    expect(result.bodyRaw).toBe('a=1&b=2');
  });

  it('deve detectar Content-Type xml no header', () => {
    const curl = `curl -X POST -H "Content-Type: application/xml" -d '<data/>' https://api.com/xml`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('xml');
  });

  it('deve detectar Content-Type text/plain e definir bodyType text', () => {
    const curl = `curl -X POST -H "Content-Type: text/plain" -d 'hello world' https://api.com/text`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('text');
  });

  it('deve lidar com URL entre aspas', () => {
    const curl = `curl "https://api.com/path?q=test"`;
    const result = parseCurl(curl);
    expect(result.url).toBe('https://api.com/path?q=test');
  });

  it('deve retornar bodyType none quando não há corpo', () => {
    const curl = `curl -X DELETE https://api.com/resource/1`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('none');
    expect(result.bodyRaw).toBe('');
  });

  it('deve lidar com -u sem password', () => {
    const curl = `curl -u onlyuser https://api.com/auth`;
    const result = parseCurl(curl);
    expect(result.authType).toBe('basic');
    expect(result.authUsername).toBe('onlyuser');
    expect(result.authPassword).toBe('');
  });

  it('deve detectar multipart/form-data no Content-Type header', () => {
    const curl = `curl -X POST -H "Content-Type: multipart/form-data" -d 'data' https://api.com/upload`;
    const result = parseCurl(curl);
    expect(result.bodyType).toBe('form-data');
  });
});
