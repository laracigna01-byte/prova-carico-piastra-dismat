const KEY = "piastra_archive_v2";
const LEGACY_KEY = "piastra_archive_v1";
const COUNTER = "piastra_counter_v1";
const DB_NAME = "prova_carico_piastra_db";
const DB_VERSION = 2;
const STORE = "tests";
const DRAFT_STORE = "drafts";
const DRAFT_ID = "current";

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

function lightSnapshot(list) {
  return sortTests(list).map((record) => ({
    ...record,
    data: record?.data
      ? { ...record.data, fotoProva: null, firmaTecnico: null }
      : record?.data,
  }));
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
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: "id" });
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
    localStorage.setItem(KEY, JSON.stringify(lightSnapshot(list)));
  } catch {
    // Se foto grandi rendono localStorage troppo piccolo,
    // IndexedDB resta la memoria principale della PWA.
  }
}

export function nextReportId(existingRecords = []) {
  const year = new Date().getFullYear();
  let raw;
  try {
    raw = localStorage.getItem(COUNTER) || sessionStorage.getItem(COUNTER);
  } catch {
    raw = sessionStorage.getItem(COUNTER);
  }
  const state = safeJsonParse(raw, { year, n: 0 });
  const maxExisting = (existingRecords || []).reduce((max, record) => {
    const match = String(record?.id || "").match(new RegExp(`^PIA-${year}-(\\d+)$`));
    return match ? Math.max(max, Number(match[1]) || 0) : max;
  }, 0);
  const previous = state.year === year ? Number(state.n) || 0 : 0;
  const n = Math.max(previous, maxExisting) + 1;

  try {
    localStorage.setItem(COUNTER, JSON.stringify({ year, n }));
  } catch {
    sessionStorage.setItem(COUNTER, JSON.stringify({ year, n }));
  }
  return `PIA-${year}-${String(n).padStart(3, "0")}`;
}

export function listTests() {
  let current;
  let legacy;
  try {
    current = safeJsonParse(localStorage.getItem(KEY), null);
    legacy = safeJsonParse(localStorage.getItem(LEGACY_KEY), []);
  } catch {
    return [];
  }
  if (Array.isArray(current)) return sortTests(current);

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
    writeLocalSnapshot(local);
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

export function saveTest(record, currentList = null) {
  const list = Array.isArray(currentList) ? currentList : listTests();
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

export function deleteTest(id, currentList = null) {
  const list = Array.isArray(currentList) ? currentList : listTests();
  const next = list.filter((x) => x.id !== id);

  writeLocalSnapshot(next);
  idbDelete(id);

  return next;
}

export async function loadDraft() {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(DRAFT_STORE)) return null;

  return new Promise((resolve) => {
    const tx = db.transaction(DRAFT_STORE, "readonly");
    const request = tx.objectStore(DRAFT_STORE).get(DRAFT_ID);
    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => resolve(null);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export async function saveDraft(data) {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(DRAFT_STORE)) return false;

  return new Promise((resolve) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    tx.objectStore(DRAFT_STORE).put({ id: DRAFT_ID, data, updatedAt: Date.now() });
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); resolve(false); };
    tx.onabort = () => { db.close(); resolve(false); };
  });
}

export async function clearDraft() {
  const db = await openDb();
  if (!db || !db.objectStoreNames.contains(DRAFT_STORE)) return false;

  return new Promise((resolve) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");
    tx.objectStore(DRAFT_STORE).delete(DRAFT_ID);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); resolve(false); };
    tx.onabort = () => { db.close(); resolve(false); };
  });
}
