export const mechanisms = [
  'cookie',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'cacheStorage',
  'httpCache',
] as const

export type Mechanism = (typeof mechanisms)[number]
export type Recovery = Record<Mechanism, string | null>

const endpoint = '/tools/what-you-leak/tag'
const etagUrl = `${endpoint}?kind=etag`
const tagHeader = 'x-leak-tag'
const storageKey = 'leak-tag'
const cachedUrl = `${endpoint}?kind=cached`
const databaseName = 'leak'
const storeName = 'tags'

export function newTag(): string {
  return `${crypto.randomUUID().split('-')[0]}.${Date.now()}`
}

export function tagCreated(tag: string): Date | null {
  const time = Number(tag.split('.')[1])
  return Number.isFinite(time) ? new Date(time) : null
}

export async function plant(tag: string): Promise<void> {
  localStorage.setItem(storageKey, tag)
  sessionStorage.setItem(storageKey, tag)
  await withStore('readwrite', (store) => store.put(tag, storageKey))
  await (await caches.open(storageKey)).put(cachedUrl, new Response(tag))
  await fetch(etagUrl, { cache: 'reload', headers: { [tagHeader]: tag } })
  await fetch(endpoint, { method: 'POST', body: tag })
}

export async function forget(): Promise<void> {
  localStorage.removeItem(storageKey)
  sessionStorage.removeItem(storageKey)
  await withStore('readwrite', (store) => store.delete(storageKey))
  await caches.delete(storageKey)
  await fetch(etagUrl, { cache: 'reload', headers: { [tagHeader]: '' } })
  await fetch(endpoint, { method: 'DELETE' })
}

export async function recover(): Promise<Recovery> {
  const [cookie, indexedDB, cacheStorage, httpCache] = await Promise.all([
    attempt(async () => {
      const response = await fetch(`${endpoint}?kind=cookie`, { cache: 'no-store' })
      return ((await response.json()) as { tag: string | null }).tag
    }),
    attempt(async () => {
      const value = await withStore('readonly', (store) => store.get(storageKey))
      return typeof value === 'string' ? value : null
    }),
    attempt(async () => {
      const cached = await (await caches.open(storageKey)).match(cachedUrl)
      return cached ? await cached.text() : null
    }),
    attempt(async () => {
      const response = await fetch(etagUrl, { cache: 'no-cache' })
      return await response.text()
    }),
  ])
  return {
    cookie,
    localStorage: attemptSync(() => localStorage.getItem(storageKey)),
    sessionStorage: attemptSync(() => sessionStorage.getItem(storageKey)),
    indexedDB,
    cacheStorage,
    httpCache,
  }
}

async function attempt(read: () => Promise<string | null>): Promise<string | null> {
  try {
    return (await read()) || null
  } catch {
    return null
  }
}

function attemptSync(read: () => string | null): string | null {
  try {
    return read() || null
  } catch {
    return null
  }
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(databaseName, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(storeName)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const database = open.result
      const request = run(database.transaction(storeName, mode).objectStore(storeName))
      request.onsuccess = () => {
        database.close()
        resolve(request.result)
      }
      request.onerror = () => {
        database.close()
        reject(request.error)
      }
    }
  })
}
