import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCollections } from '../src/hooks/useCollections';

describe('useCollections', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderAndWait = async () => {
    const hook = renderHook(() => useCollections());
    await act(async () => { await vi.runAllTimersAsync(); });
    return hook;
  };

  it('deve inicializar com dados do localStorage ou padrão', async () => {
    const { result } = await renderAndWait();
    expect(result.current.collections).toBeInstanceOf(Array);
    expect(result.current.collections.length).toBeGreaterThan(0);
  });

  it('deve adicionar uma requisição a uma coleção', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;
    
    act(() => {
      result.current.addRequestToCollection(colId, 'Nova Requisição');
    });
    
    const updatedCol = result.current.collections.find(c => c.id === colId);
    expect(updatedCol.requests.some(r => r.name === 'Nova Requisição')).toBe(true);
  });

  it('deve gerenciar pastas e movimentação de itens', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;
    
    act(() => {
      result.current.addFolderToCollection(colId, 'Subpasta');
    });
    const folder = result.current.collections[0].requests.find(i => i.type === 'folder' && i.name === 'Subpasta');
    
    const reqId = result.current.collections[0].requests.find(i => i.type === 'request').id;
    act(() => {
      result.current.moveRequestInCollection(colId, reqId, folder.id);
    });
    
    const updatedFolder = result.current.collections[0].requests.find(i => i.id === folder.id);
    expect(updatedFolder.requests.some(r => r.id === reqId)).toBe(true);
  });

  it('deve reordenar as coleções na lista (mover para baixo)', async () => {
    const { result } = await renderAndWait();
    const firstColId = result.current.collections[0].id;
    const secondColId = result.current.collections[1].id;

    act(() => {
      result.current.reorderCollection(firstColId, 'down');
    });

    expect(result.current.collections[0].id).toBe(secondColId);
    expect(result.current.collections[1].id).toBe(firstColId);
  });

  it('deve reordenar itens dentro de uma pasta (mover para baixo)', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;
    const folderId = 'folder-1';
    const reqToMoveId = 'req-nested-1';

    act(() => {
      result.current.reorderItemInCollection(colId, reqToMoveId, 'down');
    });

    const updatedFolder = result.current.collections[0].requests.find(item => item.id === folderId);
    expect(updatedFolder.requests[0].id).toBe('req-nested-2');
    expect(updatedFolder.requests[1].id).toBe(reqToMoveId);
  });

  it('deve definir o ambiente ativo para uma coleção', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;
    const newEnvId = 'new-env-id';

    act(() => {
      result.current.setActiveEnvironment(colId, newEnvId);
    });

    const updatedCol = result.current.collections.find(c => c.id === colId);
    expect(updatedCol.activeEnvironmentId).toBe(newEnvId);
  });

  it('deve atualizar as variáveis de ambiente de uma coleção', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;
    const newEnvs = [
      { id: 'env-1', name: 'Production', variables: [{ key: 'API_URL', value: 'https://prod.com' }] }
    ];

    act(() => {
      result.current.updateCollectionEnvironments(colId, newEnvs);
    });

    expect(result.current.collections[0].environments).toEqual(newEnvs);
  });

  it('deve permitir renomear, excluir e gerenciar cenários das coleções', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;

    act(() => { result.current.updateCollectionName(colId, 'Nova API'); });
    expect(result.current.collections[0].name).toBe('Nova API');

    act(() => { result.current.updateCollectionScenarios(colId, [{ id: 's2', name: 'Cenário 2', steps: [] }]); });
    expect(result.current.collections[0].scenarios).toHaveLength(1);

    const imported = { id: 'imp-1', name: 'Importada', requests: [], environments: [], scenarios: [] };
    act(() => { result.current.createCollection('Nome Ignorado', imported); });
    expect(result.current.collections.some(c => c.id === 'imp-1')).toBe(true);

    act(() => { result.current.deleteCollection(colId); });
    expect(result.current.collections.find(c => c.id === colId)).toBeUndefined();
  });

  it('deve reordenar itens dentro de uma pasta (mover para cima)', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;
    const reqToMoveId = 'req-nested-2';

    act(() => {
      result.current.reorderItemInCollection(colId, reqToMoveId, 'up');
    });

    const updatedFolder = result.current.collections[0].requests.find(item => item.id === 'folder-1');
    expect(updatedFolder.requests[0].id).toBe(reqToMoveId);
  });

  it('deve mover uma requisição de uma pasta para a raiz da coleção', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;
    const reqId = 'req-nested-1';

    act(() => {
      result.current.moveRequestInCollection(colId, reqId, null);
    });

    const folder = result.current.collections[0].requests.find(i => i.id === 'folder-1');
    expect(folder.requests.find(r => r.id === reqId)).toBeUndefined();
    expect(result.current.collections[0].requests.some(r => r.id === reqId)).toBe(true);
  });

  it('deve gerenciar workflows e adicionar requisições dentro de pastas', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;
    
    const mockWorkflows = [{ id: 'w-test', name: 'Fluxo Teste', steps: [] }];
    act(() => {
      result.current.updateCollectionWorkflows(colId, mockWorkflows);
    });
    expect(result.current.collections[0].workflows).toEqual(mockWorkflows);

    act(() => {
      result.current.addRequestToCollection(colId, 'Request na Pasta', 'folder-1');
    });
    const folder = result.current.collections[0].requests.find(i => i.id === 'folder-1');
    expect(folder.requests.some(r => r.name === 'Request na Pasta')).toBe(true);
  });

  it('deve reordenar itens no nível raiz da coleção', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;
    const folderId = 'folder-1';

    act(() => {
      result.current.reorderItemInCollection(colId, folderId, 'up');
    });

    expect(result.current.collections[0].requests[0].id).toBe(folderId);
  });

  it('deve ignorar reordenação se o item já estiver no limite da lista', async () => {
    const { result } = await renderAndWait();
    const colId = result.current.collections[0].id;
    
    act(() => {
      result.current.reorderCollection(colId, 'up');
    });
    expect(result.current.collections[0].id).toBe(colId);

    act(() => {
      result.current.reorderItemInCollection(colId, 'req-nested-1', 'up');
    });
    expect(result.current.collections[0].requests[1].requests[0].id).toBe('req-nested-1');
  });

  it('deve inicializar com dados padrão quando IndexedDB está vazio', async () => {
    const { result } = await renderAndWait();
    expect(result.current.collections[0].name).toBe('Minha Coleção');
  });
});
