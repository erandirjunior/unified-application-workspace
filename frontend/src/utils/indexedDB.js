const DB_NAME = 'unified_application_workspace';
const DB_VERSION = 1;
const STORE_NAME = 'collections';

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

export async function getAllCollections() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAllCollections(collections) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Limpa o store e insere todas as collections de uma vez
    store.clear();
    collections.forEach(col => store.put(col));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function migrateFromLocalStorage() {
  try {
    const saved = localStorage.getItem('ast_collections');
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    // Salva no IndexedDB
    await saveAllCollections(parsed);
    // Remove do localStorage após migração bem-sucedida
    localStorage.removeItem('ast_collections');
    return parsed;
  } catch (e) {
    console.warn('Migration from localStorage failed:', e);
    return null;
  }
}
