/**
 * 🚀 v6.1.3优化: 请求缓存管理器
 * 提供HTTP请求的缓存功能，减少重复请求
 */

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

/**
 * 请求缓存管理器
 */
class RequestCacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private stats = {
    hits: 0,
    misses: 0,
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'requestCache.ts:get',message:'Cache get called',data:{key:key.substring(0,50),cacheSize:this.cache.size},timestamp:Date.now(),sessionId:'debug-session',runId:'test-run-1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'requestCache.ts:get',message:'Cache miss',data:{key:key.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'test-run-1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return null
    }

    // 检查是否过期
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'requestCache.ts:get',message:'Cache expired',data:{key:key.substring(0,50),age:now-entry.timestamp,ttl:entry.ttl},timestamp:Date.now(),sessionId:'debug-session',runId:'test-run-1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return null
    }

    this.stats.hits++
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'requestCache.ts:get',message:'Cache hit',data:{key:key.substring(0,50),hits:this.stats.hits,misses:this.stats.misses},timestamp:Date.now(),sessionId:'debug-session',runId:'test-run-1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return entry.data as T
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'requestCache.ts:set',message:'Cache set called',data:{key:key.substring(0,50),ttl:ttl,cacheSize:this.cache.size+1},timestamp:Date.now(),sessionId:'debug-session',runId:'test-run-1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * 清空过期缓存
   */
  clearExpired(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
    }
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.hits = 0
    this.stats.misses = 0
  }
}

// 导出单例实例
export const requestCache = new RequestCacheManager()

// 定期清理过期缓存（每5分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestCache.clearExpired()
  }, 5 * 60 * 1000)
}

