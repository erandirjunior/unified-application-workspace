import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRequestForm } from '../src/hooks/useRequestForm';

describe('useRequestForm', () => {
  it('deve atualizar campos do formulário individualmente', () => {
    const { result } = renderHook(() => useRequestForm());

    act(() => {
      result.current.updateField('url', 'http://api.local');
      result.current.updateField('method', 'POST');
    });

    expect(result.current.form.url).toBe('http://api.local');
    expect(result.current.form.method).toBe('POST');
  });

  it('deve resetar o formulário para o estado inicial', () => {
    const { result } = renderHook(() => useRequestForm());

    act(() => {
      result.current.updateField('url', 'http://change.me');
      result.current.resetForm();
    });

    // Assume que o valor padrão é vazio ou uma string específica
    expect(result.current.form.url).not.toBe('http://change.me');
  });

  it('deve gerenciar itens em listas (addListItem, removeListItem, updateIndexedField)', () => {
    const { result } = renderHook(() => useRequestForm());
    
    act(() => {
      result.current.addListItem('headers', { key: 'X-App', value: '1' });
    });
    expect(result.current.form.headers).toHaveLength(2); // O formulário inicial já tem um header, então adicionar um resulta em 2
    
    act(() => {
      result.current.updateIndexedField('headers', 0, 'value', '2');
    });
    expect(result.current.form.headers[0].value).toBe('2');
    
    act(() => {
      result.current.removeListItem('headers', 0);
    });
    expect(result.current.form.headers).toHaveLength(1);
  });

  it('deve carregar os dados de uma requisição para edição (loadRequest)', () => {
    const { result } = renderHook(() => useRequestForm());
    const mockReq = { 
      id: 'r1', name: 'Get Data', method: 'GET', url: '/api',
      headers: [{ key: 'h1', value: 'v1' }]
    };
    
    act(() => {
      result.current.loadRequest(mockReq);
    });
    
    expect(result.current.form.activeRequestId).toBe('r1');
    expect(result.current.form.requestName).toBe('Get Data');
    expect(result.current.form.headers).toHaveLength(1);
  });

  it('deve gerar o payload sanitizado para o motor (getPayload)', () => {
    const { result } = renderHook(() => useRequestForm());
    act(() => {
      result.current.updateField('url', 'http://api.com');
      result.current.updateField('method', 'POST');
    });
    expect(result.current.getPayload()).toMatchObject({ url: 'http://api.com', method: 'POST' });
  });
});