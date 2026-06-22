import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCollections } from '../src/hooks/useCollections';
import { getAllCollections, saveAllCollections, migrateFromLocalStorage } from '../src/utils/indexedDB';

describe('useCollections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default collections', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.collections).toHaveLength(2);
    expect(result.current.collections[0].name).toBe('Minha Coleção');
  });

  it('should load collections from IndexedDB', async () => {
    const stored = [{ id: '10', name: 'Stored Col', requests: [{ id: 'r1', name: 'Req', method: 'GET', url: '/', type: 'request' }], environments: [], activeEnvironmentId: 'default', scenarios: [], workflows: [] }];
    getAllCollections.mockResolvedValueOnce(stored);

    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.collections[0].name).toBe('Stored Col');
    expect(result.current.isLoaded).toBe(true);
  });

  it('should use migrated data from localStorage if available', async () => {
    const migrated = [{ id: '99', name: 'Migrated', requests: [{ id: 'r1', name: 'R', method: 'GET', url: '/', type: 'request' }], environments: [], activeEnvironmentId: 'default', scenarios: [], workflows: [] }];
    migrateFromLocalStorage.mockResolvedValueOnce(migrated);

    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.collections[0].name).toBe('Migrated');
  });

  it('should create a new collection', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.createCollection('Nova Coleção');
    });

    expect(result.current.collections).toHaveLength(3);
    expect(result.current.collections[2].name).toBe('Nova Coleção');
  });

  it('should create a collection from imported data', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const imported = { id: 'imp-1', name: 'Imported', requests: [], environments: [] };
    act(() => {
      result.current.createCollection('ignored', imported);
    });

    expect(result.current.collections).toHaveLength(3);
    expect(result.current.collections[2].name).toBe('Imported');
  });

  it('should delete a collection', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.deleteCollection('1');
    });

    expect(result.current.collections).toHaveLength(1);
    expect(result.current.collections[0].id).toBe('2');
  });

  it('should reorder collection up', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.reorderCollection('2', 'up');
    });

    expect(result.current.collections[0].id).toBe('2');
    expect(result.current.collections[1].id).toBe('1');
  });

  it('should reorder collection down', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.reorderCollection('1', 'down');
    });

    expect(result.current.collections[0].id).toBe('2');
    expect(result.current.collections[1].id).toBe('1');
  });

  it('should not reorder if already at boundary', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.reorderCollection('1', 'up');
    });

    expect(result.current.collections[0].id).toBe('1');
  });

  it('should update collection name', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.updateCollectionName('1', 'Renamed');
    });

    expect(result.current.collections[0].name).toBe('Renamed');
  });

  it('should update collection environments', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const newEnvs = [{ id: 'prod', name: 'Production', variables: [{ key: 'host', value: 'prod.api.com' }] }];
    act(() => {
      result.current.updateCollectionEnvironments('1', newEnvs);
    });

    expect(result.current.collections[0].environments).toEqual(newEnvs);
  });

  it('should set active environment', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.setActiveEnvironment('1', 'prod');
    });

    expect(result.current.collections[0].activeEnvironmentId).toBe('prod');
  });

  it('should update collection scenarios', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const scenarios = [{ id: 's1', name: 'Scenario 1', steps: [] }];
    act(() => {
      result.current.updateCollectionScenarios('1', scenarios);
    });

    expect(result.current.collections[0].scenarios).toEqual(scenarios);
  });

  it('should update collection workflows', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const workflows = [{ id: 'w1', name: 'Workflow 1', steps: [] }];
    act(() => {
      result.current.updateCollectionWorkflows('1', workflows);
    });

    expect(result.current.collections[0].workflows).toEqual(workflows);
  });

  it('should add request to collection root', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.addRequestToCollection('1', 'New Request');
    });

    const requests = result.current.collections[0].requests;
    expect(requests[requests.length - 1].name).toBe('New Request');
    expect(requests[requests.length - 1].type).toBe('request');
  });

  it('should add request to a folder', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.addRequestToCollection('1', 'In Folder', 'folder-1');
    });

    const folder = result.current.collections[0].requests.find(r => r.id === 'folder-1');
    expect(folder.requests[folder.requests.length - 1].name).toBe('In Folder');
  });

  it('should add folder to collection requests', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.addFolderToCollection('1', 'New Folder');
    });

    const requests = result.current.collections[0].requests;
    const folder = requests[requests.length - 1];
    expect(folder.type).toBe('folder');
    expect(folder.name).toBe('New Folder');
  });

  it('should add folder to workflows section', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.addFolderToCollection('1', 'WF Folder', 'workflows');
    });

    const workflows = result.current.collections[0].workflows;
    expect(workflows[workflows.length - 1].name).toBe('WF Folder');
  });

  it('should add folder to mocks section', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.addFolderToCollection('1', 'Mock Folder', 'mocks');
    });

    const mockFolders = result.current.collections[0].mockFolders;
    expect(mockFolders[mockFolders.length - 1].name).toBe('Mock Folder');
  });

  it('should move request to root', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Move nested request to root
    act(() => {
      result.current.moveRequestInCollection('1', 'req-nested-1', null);
    });

    const requests = result.current.collections[0].requests;
    const rootIds = requests.filter(r => r.type !== 'folder').map(r => r.id);
    expect(rootIds).toContain('req-nested-1');
  });

  it('should move request into a folder', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.moveRequestInCollection('1', 'req-1', 'folder-1');
    });

    const folder = result.current.collections[0].requests.find(r => r.id === 'folder-1');
    expect(folder.requests.map(r => r.id)).toContain('req-1');
  });

  it('should reorder item up within requests', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // folder-1 is at index 1, move it up
    act(() => {
      result.current.reorderItemInCollection('1', 'folder-1', 'up');
    });

    expect(result.current.collections[0].requests[0].id).toBe('folder-1');
  });

  it('should reorder item down within requests', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // req-1 is at index 0, move it down
    act(() => {
      result.current.reorderItemInCollection('1', 'req-1', 'down');
    });

    expect(result.current.collections[0].requests[1].id).toBe('req-1');
  });

  it('should reorder nested item within a folder', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.reorderItemInCollection('1', 'req-nested-2', 'up');
    });

    const folder = result.current.collections[0].requests.find(r => r.id === 'folder-1');
    expect(folder.requests[0].id).toBe('req-nested-2');
  });

  it('should debounce save to IndexedDB', async () => {
    const { result } = renderHook(() => useCollections());
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.updateCollectionName('1', 'Changed');
    });

    // Before debounce fires
    expect(saveAllCollections).not.toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: 'Changed' })])
    );

    // After debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(saveAllCollections).toHaveBeenCalled();
  });
});
