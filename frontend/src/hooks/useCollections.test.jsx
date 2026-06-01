import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCollections } from './useCollections';

describe('useCollections', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve inicializar com dados do localStorage ou padrão', () => {
    const { result } = renderHook(() => useCollections());
    expect(result.current.collections).toBeInstanceOf(Array);
    expect(result.current.collections.length).toBeGreaterThan(0);
  });

  it('deve adicionar uma requisição a uma coleção', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;
    
    act(() => {
      result.current.addRequestToCollection(colId, 'Nova Requisição');
    });
    
    const updatedCol = result.current.collections.find(c => c.id === colId);
    expect(updatedCol.requests.some(r => r.name === 'Nova Requisição')).toBe(true);
  });

  it('deve gerenciar pastas e movimentação de itens', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;
    
    // Adiciona Pasta
    act(() => {
      result.current.addFolderToCollection(colId, 'Subpasta');
    });
    // Seleciona especificamente a pasta criada para evitar conflito com a estrutura padrão
    const folder = result.current.collections[0].requests.find(i => i.type === 'folder' && i.name === 'Subpasta');
    
    // Move primeira request para dentro da pasta
    const reqId = result.current.collections[0].requests.find(i => i.type === 'request').id;
    act(() => {
      result.current.moveRequestInCollection(colId, reqId, folder.id);
    });
    
    const updatedFolder = result.current.collections[0].requests.find(i => i.id === folder.id);
    expect(updatedFolder.requests.some(r => r.id === reqId)).toBe(true);
    
    // Verifica persistência
    const saved = JSON.parse(localStorage.getItem('ast_collections'));
    expect(saved[0].requests.find(i => i.id === folder.id).requests).toHaveLength(1);
  });

  it('deve reordenar as coleções na lista (mover para baixo)', () => {
    const { result } = renderHook(() => useCollections());
    const firstColId = result.current.collections[0].id;
    const secondColId = result.current.collections[1].id;

    act(() => {
      result.current.reorderCollection(firstColId, 'down');
    });

    expect(result.current.collections[0].id).toBe(secondColId);
    expect(result.current.collections[1].id).toBe(firstColId);
  });

  it('deve reordenar itens dentro de uma pasta (mover para baixo)', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;
    const folderId = 'folder-1'; // ID da pasta adicionada no initial state
    const reqToMoveId = 'req-nested-1'; // Primeira requisição dentro da pasta

    act(() => {
      result.current.reorderItemInCollection(colId, reqToMoveId, 'down');
    });

    const updatedFolder = result.current.collections[0].requests.find(item => item.id === folderId);
    expect(updatedFolder.requests[0].id).toBe('req-nested-2'); // A segunda agora é a primeira
    expect(updatedFolder.requests[1].id).toBe(reqToMoveId); // A primeira agora é a segunda
  });

  it('deve definir o ambiente ativo para uma coleção', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;
    const newEnvId = 'new-env-id';

    act(() => {
      result.current.setActiveEnvironment(colId, newEnvId);
    });

    const updatedCol = result.current.collections.find(c => c.id === colId);
    expect(updatedCol.activeEnvironmentId).toBe(newEnvId);
  });

  it('deve atualizar as variáveis de ambiente de uma coleção', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;
    const newEnvs = [
      { id: 'env-1', name: 'Production', variables: [{ key: 'API_URL', value: 'https://prod.com' }] }
    ];

    act(() => {
      result.current.updateCollectionEnvironments(colId, newEnvs);
    });

    expect(result.current.collections[0].environments).toEqual(newEnvs);
  });

  it('deve permitir renomear, excluir e gerenciar cenários das coleções', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;

    // Testa updateCollectionName
    act(() => { result.current.updateCollectionName(colId, 'Nova API'); });
    expect(result.current.collections[0].name).toBe('Nova API');

    // Testa updateCollectionScenarios
    act(() => { result.current.updateCollectionScenarios(colId, [{ id: 's2', name: 'Cenário 2', steps: [] }]); });
    expect(result.current.collections[0].scenarios).toHaveLength(1);

    // Testa createCollection com dados importados (Branch coverage)
    const imported = { id: 'imp-1', name: 'Importada', requests: [], environments: [], scenarios: [] };
    act(() => { result.current.createCollection('Nome Ignorado', imported); });
    expect(result.current.collections.some(c => c.id === 'imp-1')).toBe(true);

    // Testa deleteCollection
    act(() => { result.current.deleteCollection(colId); });
    expect(result.current.collections.find(c => c.id === colId)).toBeUndefined();
  });

  it('deve reordenar itens dentro de uma pasta (mover para cima)', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;
    const folderId = 'folder-1';
    const reqToMoveId = 'req-nested-2'; // O segundo item da pasta padrão

    act(() => {
      result.current.reorderItemInCollection(colId, reqToMoveId, 'up');
    });

    const updatedFolder = result.current.collections[0].requests.find(item => item.id === folderId);
    // Verifica se o segundo item agora é o primeiro (reordenação UP)
    expect(updatedFolder.requests[0].id).toBe(reqToMoveId);
  });

  it('deve mover uma requisição de uma pasta para a raiz da coleção', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;
    const reqId = 'req-nested-1'; // Item que já existe dentro de folder-1 no estado inicial

    act(() => {
      result.current.moveRequestInCollection(colId, reqId, null); // null indica que o alvo é a raiz
    });

    const folder = result.current.collections[0].requests.find(i => i.id === 'folder-1');
    expect(folder.requests.find(r => r.id === reqId)).toBeUndefined();
    expect(result.current.collections[0].requests.some(r => r.id === reqId)).toBe(true);
  });

  it('deve gerenciar workflows e adicionar requisições dentro de pastas', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;
    
    // Testa updateCollectionWorkflows
    const mockWorkflows = [{ id: 'w-test', name: 'Fluxo Teste', steps: [] }];
    act(() => {
      result.current.updateCollectionWorkflows(colId, mockWorkflows);
    });
    expect(result.current.collections[0].workflows).toEqual(mockWorkflows);

    // Testa addRequestToCollection dentro de uma pasta existente
    act(() => {
      result.current.addRequestToCollection(colId, 'Request na Pasta', 'folder-1');
    });
    const folder = result.current.collections[0].requests.find(i => i.id === 'folder-1');
    expect(folder.requests.some(r => r.name === 'Request na Pasta')).toBe(true);
  });

  it('deve reordenar itens no nível raiz da coleção', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;
    const folderId = 'folder-1';

    act(() => {
      result.current.reorderItemInCollection(colId, folderId, 'up'); // Pasta é o segundo item, sobe para primeiro
    });

    expect(result.current.collections[0].requests[0].id).toBe(folderId);
  });

  it('deve ignorar reordenação se o item já estiver no limite da lista', () => {
    const { result } = renderHook(() => useCollections());
    const colId = result.current.collections[0].id;
    
    // Tenta subir o primeiro item da coleção global (índice 0)
    act(() => {
      result.current.reorderCollection(colId, 'up');
    });
    expect(result.current.collections[0].id).toBe(colId);

    // Tenta subir o primeiro item de uma pasta (req-nested-1)
    act(() => {
      result.current.reorderItemInCollection(colId, 'req-nested-1', 'up');
    });
    expect(result.current.collections[0].requests[1].requests[0].id).toBe('req-nested-1');
  });

  it('deve restaurar dados padrão se o localStorage estiver corrompido', () => {
    localStorage.setItem('ast_collections', 'invalid-json-{');
    const { result } = renderHook(() => useCollections());
    expect(result.current.collections[0].name).toBe('Minha Coleção');
  });
});