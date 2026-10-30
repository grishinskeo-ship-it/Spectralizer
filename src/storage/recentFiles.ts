import type { RecentFileEntry } from '../types';

const DB_NAME = 'spectralizer';
const STORE_NAME = 'recent-files';
const DB_VERSION = 1;
const MAX_RECENT = 8;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = fn(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  }));
}

export async function saveRecentFile(file: File): Promise<RecentFileEntry> {
  const entry: RecentFileEntry & { blob: Blob } = {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    type: file.type,
    size: file.size,
    openedAt: Date.now(),
    blob: file,
  };

  await runTransaction('readwrite', (store) => store.put(entry));

  const all = await listRecentFiles();
  const stale = all.slice(MAX_RECENT);
  await Promise.all(stale.map((item) => runTransaction('readwrite', (store) => store.delete(item.id))));

  const { blob: _, ...meta } = entry;
  return meta;
}

export async function listRecentFiles(): Promise<RecentFileEntry[]> {
  const all = await runTransaction<RecentFileEntry[]>('readonly', (store) => store.getAll());
  return all
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, MAX_RECENT);
}

export async function loadRecentFile(id: string): Promise<File | null> {
  const entry = await runTransaction<(RecentFileEntry & { blob?: Blob }) | undefined>(
    'readonly',
    (store) => store.get(id),
  );

  if (!entry?.blob) {
    return null;
  }

  return new File([entry.blob], entry.name, {
    type: entry.type || 'application/octet-stream',
    lastModified: entry.openedAt,
  });
}
