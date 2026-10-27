"use strict";Object.defineProperty(exports, "__esModule", {value: true}); class CrawlQueue extends Map {
   __init() {this.expires = new Map()}
  constructor( options) {
    super();this.options = options;CrawlQueue.prototype.__init.call(this);
  }
   prune() {
    const now = Date.now()
    for (const [key, expiry] of this.expires)
      if (expiry <= now) this.delete(key)
  }
  get size() {
    this.prune()
    return super.size
  }
  has(key) {
    this.prune()
    return super.has(key)
  }
  values() {
    this.prune()
    return super.values()
  }
  set(key, value) {
    this.prune()
    if (!super.has(key) && super.size >= this.options.max) return this
    this.expires.set(key, Date.now() + this.options.ttlMs)
    return super.set(key, value)
  }
  delete(key) {
    this.expires.delete(key)
    return super.delete(key)
  }
  clear() {
    this.expires.clear()
    super.clear()
  }
} exports.default = CrawlQueue;
