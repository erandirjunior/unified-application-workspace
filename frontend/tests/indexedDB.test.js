import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Desmockar o módulo para testar o código real
vi.unmock('../src/utils/indexedDB');

// Simular a API IndexedDB do navegador com Promises que resolvem corretamente
function createMockIDB() {
  let storeData = [];

  const createRequest = (result) => {
    const req = { result, onsuccess: null, onerror: null };
    Promise.resolve().then(() => { if (req.onsuccess) req.onsuccess(); });
    return req;
  };

  const mockDB = {
    transaction: vi.fn((storeName, mode) => {
      const store = {
        put: vi.fn((item) => {
          const idx = storeData.findIndex(i => i.id === item.id);
          if (idx >= 0) storeData[idx] = item;
          else storeData.push(item);
          return createRequest(undefined);
        }),
        getAll: vi.fn(() => {
          const req = { result: [...storeData], onsuccess: null, onerror: null };
          Promise.resolve().then(() => { if (req.onsuccess) req.onsuccess(); });
          return req;
        }),
        clear: vi.fn(() => {
          storeData = [];
          return createRequest(undefined);
        }),
      };
      const tx = {
        objectStore: vi.fn(() => store),
        oncomplete: null,
        onerror: null,
      };
      Promise.resolve().then(() => { if (tx.oncomplete) tx.oncomplete(); });
      return tx;
    }),
    objectStoreNames: { contains: vi.fn(() => false) },
    createObjectStore: vi.fn(),
  };

  const idb = {
    open: vi.fn(() => {
      const req = { result: mockDB, onupgradeneeded: null, onsuccess: null, onerror: null };
      Promise.resolve().then(() => {
        if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: mockDB } });
        if (req.onsuccess) req.onsuccess({ target: { result: mockDB } });
      });
      return req;
    }),
    _db: mockDB,
    _getData: () => [...storeData],
    _reset: () => { storeData = []; },
  };

  return idb;
}

describe('indexedDB utils (real module)', () => {
  let mockIDB;

  beforeEach(() => {
    mockIDB = createMockIDB();
    global.indexedDB = mockIDB;
    vi.resetModules();
  });

  afterEach(() => {
    delete global.indexedDB;
  });

  it('should open DB and get all collections', async () => {
    const { getAllCollections } = await import('../src/utils/indexedDB');
    const result = await getAllCollections();
    expect(result).toEqual([]);
    expect(mockIDB.open).toHaveBeenCalledWith('ast_devtools', 1);
  });

  it('should save collections', async () => {
    const { saveAllCollections } = await import('../src/utils/indexedDB');
    await saveAllCollections([{ id: '1', name: 'Test' }]);
    expect(mockIDB._db.transaction).toHaveBeenCalledWith('collections', 'readwrite');
  });

  it('should handle migrateFromLocalStorage with no data', async () => {
    const { migrateFromLocalStorage } = await import('../src/utils/indexedDB');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

    const result = await migrateFromLocalStorage();
    expect(result).toBeNull();

    getItemSpy.mockRestore();
  });

  it('should migrate valid data from localStorage', async () => {
    const { migrateFromLocalStorage } = await import('../src/utils/indexedDB');
    const data = [{ id: '1', name: 'Migrated Col' }];

    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(data));
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});

    const result = await migrateFromLocalStorage();
    expect(getItemSpy).toHaveBeenCalledWith('ast_collections');

    getItemSpy.mockRestore();
    removeItemSpy.mockRestore();
  });

  it('should return null for empty array in localStorage', async () => {
    const { migrateFromLocalStorage } = await import('../src/utils/indexedDB');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify([]));

    const result = await migrateFromLocalStorage();
    expect(result).toBeNull();

    getItemSpy.mockRestore();
  });

  it('should return null on invalid JSON in localStorage', async () => {
    const { migrateFromLocalStorage } = await import('../src/utils/indexedDB');
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid{json');

    const result = await migrateFromLocalStorage();
    expect(result).toBeNull();

    getItemSpy.mockRestore();
  });

  it('should reuse db instance on subsequent calls', async () => {
    const { getAllCollections } = await import('../src/utils/indexedDB');
    await getAllCollections();
    await getAllCollections();
    // open should only be called once due to dbInstance caching
    expect(mockIDB.open).toHaveBeenCalledTimes(1);
  });

  it('should create object store on upgradeneeded', async () => {
    const { getAllCollections } = await import('../src/utils/indexedDB');
    await getAllCollections();
    expect(mockIDB._db.createObjectStore).toHaveBeenCalledWith('collections', { keyPath: 'id' });
  });

  it('should handle open error', async () => {
    vi.resetModules();
    global.indexedDB = {
      open: vi.fn(() => {
        const req = { onupgradeneeded: null, onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          if (req.onerror) req.onerror({ target: { error: new Error('DB Error') } });
        });
        return req;
      }),
    };

    const { getAllCollections } = await import('../src/utils/indexedDB');
    await expect(getAllCollections()).rejects.toThrow('DB Error');
  });

  it('should skip object store creation if store already exists', async () => {
    vi.resetModules();
    const customDB = {
      ...mockIDB._db,
      objectStoreNames: { contains: vi.fn(() => true) },
      createObjectStore: vi.fn(),
      transaction: mockIDB._db.transaction,
    };
    global.indexedDB = {
      open: vi.fn(() => {
        const req = { result: customDB, onupgradeneeded: null, onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          if (req.onupgradeneeded) req.onupgradeneeded({ target: { result: customDB } });
          if (req.onsuccess) req.onsuccess({ target: { result: customDB } });
        });
        return req;
      }),
    };

    const { getAllCollections } = await import('../src/utils/indexedDB');
    await getAllCollections();
    expect(customDB.createObjectStore).not.toHaveBeenCalled();
  });
});
