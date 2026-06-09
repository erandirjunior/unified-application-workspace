import { describe, it, expect, vi } from 'vitest';
import { resolveVariables, generateCurl, renderMarkdown, renderStaticMarkdown, copyToClipboard } from '../src/components/documentation/docUtils';

describe('docUtils', () => {
  describe('resolveVariables', () => {
    const env = { variables: [{ key: 'host', value: 'api.com' }, { key: 'port', value: '8080' }] };

    it('should replace variables in text', () => {
      expect(resolveVariables('http://{{host}}:{{port}}/api', env)).toBe('http://api.com:8080/api');
    });

    it('should handle variables with spaces around braces', () => {
      expect(resolveVariables('{{ host }}', env)).toBe('api.com');
    });

    it('should return text unchanged if no env', () => {
      expect(resolveVariables('{{host}}', null)).toBe('{{host}}');
    });

    it('should return null/empty text unchanged', () => {
      expect(resolveVariables(null, env)).toBe(null);
      expect(resolveVariables('', env)).toBe('');
    });

    it('should skip variables with empty key', () => {
      const envWithEmpty = { variables: [{ key: '', value: 'nope' }] };
      expect(resolveVariables('{{test}}', envWithEmpty)).toBe('{{test}}');
    });
  });

  describe('generateCurl', () => {
    const env = { variables: [{ key: 'base', value: 'https://api.com' }] };

    it('should generate basic GET curl', () => {
      const req = { method: 'GET', url: '{{base}}/users', headers: [] };
      const result = generateCurl(req, env);
      expect(result).toContain('curl -X GET');
      expect(result).toContain('https://api.com/users');
    });

    it('should include headers', () => {
      const req = { method: 'POST', url: 'https://api.com', headers: [{ key: 'Authorization', value: 'Bearer {{base}}' }] };
      const result = generateCurl(req, env);
      expect(result).toContain('-H "Authorization: Bearer https://api.com"');
    });

    it('should include body for non-GET methods', () => {
      const req = { method: 'POST', url: 'https://api.com', headers: [], bodyRaw: '{"id":1}' };
      const result = generateCurl(req, env);
      expect(result).toContain("-d '{\"id\":1}'");
    });

    it('should not include body for GET', () => {
      const req = { method: 'GET', url: 'https://api.com', headers: [], bodyRaw: 'test' };
      const result = generateCurl(req, env);
      expect(result).not.toContain('-d');
    });

    it('should escape single quotes in body', () => {
      const req = { method: 'POST', url: 'https://api.com', headers: [], bodyRaw: "it's a test" };
      const result = generateCurl(req, env);
      expect(result).toContain("'\\''");
    });

    it('should skip headers with empty key', () => {
      const req = { method: 'GET', url: 'https://api.com', headers: [{ key: '', value: 'val' }] };
      const result = generateCurl(req, env);
      expect(result).not.toContain('-H');
    });
  });

  describe('renderMarkdown', () => {
    it('should return null for empty text', () => {
      expect(renderMarkdown(null)).toBe(null);
      expect(renderMarkdown('')).toBe(null);
    });

    it('should render headings', () => {
      expect(renderMarkdown('# Title')).toContain('<h1');
      expect(renderMarkdown('## Subtitle')).toContain('<h2');
      expect(renderMarkdown('### Small')).toContain('<h3');
    });

    it('should render bold text', () => {
      const result = renderMarkdown('**bold**');
      expect(result).toContain('<strong');
      expect(result).toContain('bold');
    });

    it('should render italic text', () => {
      const result = renderMarkdown('*italic*');
      expect(result).toContain('<em');
    });

    it('should render links', () => {
      const result = renderMarkdown('[Click](http://example.com)');
      expect(result).toContain('href="http://example.com"');
      expect(result).toContain('Click');
    });

    it('should render images', () => {
      const result = renderMarkdown('![Alt](http://img.com/pic.png)');
      expect(result).toContain('<img');
      expect(result).toContain('src="http://img.com/pic.png"');
    });

    it('should render inline code', () => {
      const result = renderMarkdown('Use `code` here');
      expect(result).toContain('<code');
      expect(result).toContain('code');
    });

    it('should render list items', () => {
      const result = renderMarkdown('- Item A');
      expect(result).toContain('<li');
      expect(result).toContain('Item A');
    });

    it('should escape ampersands', () => {
      const result = renderMarkdown('A & B');
      expect(result).toContain('&amp;');
    });
  });

  describe('renderStaticMarkdown', () => {
    it('should return empty string for null/empty', () => {
      expect(renderStaticMarkdown(null)).toBe('');
      expect(renderStaticMarkdown('')).toBe('');
    });

    it('should render basic markdown without classes', () => {
      expect(renderStaticMarkdown('# Title')).toContain('<h1>Title</h1>');
      expect(renderStaticMarkdown('**bold**')).toContain('<strong>bold</strong>');
    });
  });

  describe('copyToClipboard', () => {
    it('should call navigator.clipboard.writeText and alert', () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText: writeTextMock } });
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      copyToClipboard('test text');
      expect(writeTextMock).toHaveBeenCalledWith('test text');
      expect(window.alert).toHaveBeenCalledWith('Copiado para a área de transferência!');
    });
  });
});
