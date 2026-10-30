export async function cached<T>(key: URL, expires: number, load: () => Promise<T>): Promise<T> {
  const cache = await caches.open('stats')
  const hit = await cache.match(key)
  if (hit) return (await hit.json()) as T
  const value = await load()
  const seconds = Math.floor((expires - Date.now()) / 1000)
  if (seconds > 0) {
    await cache.put(
      key,
      Response.json(value, { headers: { 'cache-control': `public, max-age=${seconds}` } }),
    )
  }
  return value
}
