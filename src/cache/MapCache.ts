class MapCache implements CommonCache {
  constructor(options) {
    this.cache = new Map();
    this.timer = {};
    this.extendOptions(options);
  }

  /**ttl超时时间 */
  ttl: number = 5 * 60 * 60 * 1000;
  /** 最大缓存数*/
  maxCache: number = 500;
  /**cha */
  timer;

  cache;

  extendOptions(options) {
    this.maxCache = options.maxCache || 0;
    this.ttl = options.ttl || 5 * 60 * 60 * 1000;
  }

  get(key) {
    return this.cache.get(JSON.stringify(key));
  }

  set(key, value, ttl = 60000) {
    // 如果超过最大缓存数, 删除头部的第一个缓存.
    if (this.maxCache > 0 && this.cache.size >= this.maxCache) {
      const deleteKey = [...this.cache.keys()][0];
      this.cache.delete(deleteKey);
      if (this.timer[deleteKey]) {
        clearTimeout(this.timer[deleteKey]);
      }
    }
    const cacheKey = JSON.stringify(key);

    this.cache.set(cacheKey, value);
    if (ttl > 0) {
      this.timer[cacheKey] = setTimeout(() => {
        this.cache.delete(cacheKey);
        delete this.timer[cacheKey];
      }, ttl);
    }
  }

  delete(key) {
    const cacheKey = JSON.stringify(key);
    delete this.timer[cacheKey];
    return this.cache.delete(cacheKey);
  }

  clear() {
    this.timer = {};
    return this.cache.clear();
  }
}

export default MapCache;
