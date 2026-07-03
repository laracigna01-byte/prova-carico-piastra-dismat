const KEY = "piastra_archive_v2";
const LEGACY_KEY = "piastra_archive_v1";
const COUNTER = "piastra_counter_v1";
const DB_NAME = "prova_carico_piastra_db";
const DB_VERSION = 1;
const STORE = "tests";

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function sortTests(list) {
  return [...(list || [])].sort((a, b) => {
    const da = new Date(a?.savedAt || 0).getTime();
    const db = new Date(b?.savedAt || 0).getTime();
    return db - da;
  });
}

function canUseIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openDb() {
  if (!canUseIndexedDb()) return Promise.resolve(null);

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function idbGetAll() {
  const db = await openDb();
  if (!db) return [];

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(sortTests(request.result || []));
    request.onerror = () => resolve([]);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

async function idbPut(record) {
  const db = await openDb();
  if (!db) return false;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);

    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };

    tx.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}

async function idbDelete(id) {
  const db = await openDb();
  if (!db) return false;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);

    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };

    tx.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}

async function idbWriteAll(list) {
  const db = await openDb();
  if (!db) return false;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    store.clear();
    (list || []).forEach((record) => store.put(record));

    tx.oncomplete = () => {
      db.close();
      resolve(true);
    };

    tx.onerror = () => {
      db.close();
      resolve(false);
    };
  });
}

function writeLocalSnapshot(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(sortTests(list)));
  } catch {
    // Se foto grandi rendono localStorage troppo piccolo,
    // IndexedDB resta la memoria principale della PWA.
  }
}

export function nextReportId() {
  const year = new Date().getFullYear();
  const raw = localStorage.getItem(COUNTER);
  const state = safeJsonParse(raw, { year, n: 0 });
  const n = state.year === year ? state.n + 1 : 1;

  localStorage.setItem(COUNTER, JSON.stringify({ year, n }));
  return `PIA-${year}-${String(n).padStart(3, "0")}`;
}

export function listTests() {
  const current = safeJsonParse(localStorage.getItem(KEY), null);
  if (Array.isArray(current)) return sortTests(current);

  const legacy = safeJsonParse(localStorage.getItem(LEGACY_KEY), []);

  if (Array.isArray(legacy) && legacy.length) {
    writeLocalSnapshot(legacy);
    idbWriteAll(legacy);
    return sortTests(legacy);
  }

  return [];
}

export async function loadServerTests() {
  const indexed = await idbGetAll();

  if (indexed.length) {
    writeLocalSnapshot(indexed);
    return indexed;
  }

  const local = listTests();

  if (local.length) {
    await idbWriteAll(local);
  }

  return local;
}

export async function syncServerTests(list) {
  const sorted = sortTests(list);
  writeLocalSnapshot(sorted);
  await idbWriteAll(sorted);
  return sorted;
}

export function writeTests(list) {
  const sorted = sortTests(list);
  writeLocalSnapshot(sorted);
  idbWriteAll(sorted);
  return sorted;
}

export function saveTest(record) {
  const list = listTests();
  const idx = list.findIndex((x) => x.id === record.id);

  const next =
    idx >= 0
      ? list.map((x) => (x.id === record.id ? record : x))
      : [record, ...list];

  const sorted = sortTests(next);

  writeLocalSnapshot(sorted);
  idbPut(record);

  return sorted;
}

export function deleteTest(id) {
  const next = listTests().filter((x) => x.id !== id);

  writeLocalSnapshot(next);
  idbDelete(id);

  return next;
}