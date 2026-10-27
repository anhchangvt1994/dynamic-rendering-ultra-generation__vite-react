export default class CrawlQueue<T> extends Map<string, T> {
  private expires = new Map<string, number>()
  constructor(private options: { max: number; ttlMs: number }) {
    super()
  }
  private prune() {
    const now = Date.now()
    for (const [key, expiry] of this.expires)
      if (expiry <= now) this.delete(key)
  }
  get size() {
    this.prune()
    return super.size
  }
  has(key: string) {
    this.prune()
    return super.has(key)
  }
  values() {
    this.prune()
    return super.values()
  }
  set(key: string, value: T) {
    this.prune()
    if (!super.has(key) && super.size >= this.options.max) return this
    this.expires.set(key, Date.now() + this.options.ttlMs)
    return super.set(key, value)
  }
  delete(key: string) {
    this.expires.delete(key)
    return super.delete(key)
  }
  clear() {
    this.expires.clear()
    super.clear()
  }
}
