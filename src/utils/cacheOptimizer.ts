/**
 * 缓存优化工具
 * 提供统一的缓存管理、优化策略和性能监控
 */

import { ref, computed, watch, type Ref } from 'vue'

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  maxSize: number
  defaultTTL: number
  cleanupInterval: number
  enableCompression: boolean
  enablePersistence: boolean
  storageQuota: number
}

/**
 * 缓存项接口
 */
export interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccess: number
  size: number
  compressed: boolean
  priority: number
}

/**
 * 缓存统计接口
 */
export interface CacheStats {
  totalItems: number
  totalSize: number
  hitCount: number
  missCount: number
  hitRate: number
  memoryUsage: number
  compressionRatio: number
  evictionCount: number
}

/**
 * 缓存策略枚举
 */
export enum CacheStrategy {
  LRU = 'lru', // 最近最少使用
  LFU = 'lfu', // 最少使用频率
  FIFO = 'fifo', // 先进先出
  TTL = 'ttl', // 基于过期时间
  PRIORITY = 'priority', // 基于优先级
}

/**
 * 压缩工具类
 */
class CompressionUtils {
  /**
   * 压缩数据
   */
  static compress(data: any): string {
    try {
      const jsonString = JSON.stringify(data)
      // 简单的压缩算法（实际项目中可以使用更高效的压缩库）
      return btoa(jsonString)
    } catch (error) {
      console.warn('数据压缩失败:', error)
      return JSON.stringify(data)
    }
  }

  /**
   * 解压数据
   */
  static decompress(compressedData: string): any {
    try {
      const jsonString = atob(compressedData)
      return JSON.parse(jsonString)
    } catch (error) {
      console.warn('数据解压失败:', error)
      return JSON.parse(compressedData)
    }
  }

  /**
   * 计算压缩率
   */
  static getCompressionRatio(original: string, compressed: string): number {
    return compressed.length / original.length
  }
}

/**
 * 多级缓存管理器
 */
export class MultiLevelCacheManager {
  private l1Cache = new Map<string, CacheItem>() // 内存缓存（L1）
  private l2Cache = new Map<string, CacheItem>() // 扩展内存缓存（L2）
  private persistentCache = new Map<string, CacheItem>() // 持久化缓存（L3）

  private config: CacheConfig
  private stats: CacheStats
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 300000, // 5分钟
      cleanupInterval: 60000, // 1分钟
      enableCompression: true,
      enablePersistence: true,
      storageQuota: 50 * 1024 * 1024, // 50MB
      ...config,
    }

    this.stats = {
      totalItems: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      memoryUsage: 0,
      compressionRatio: 1,
      evictionCount: 0,
    }

    this.startCleanupTimer()
    this.loadPersistentCache()
  }

  /**
   * 设置缓存项
   */
  set(
    key: string,
    data: any,
    options: {
      ttl?: number
      priority?: number
      level?: 1 | 2 | 3
      compress?: boolean
    } = {}
  ): void {
    const {
      ttl = this.config.defaultTTL,
      priority = 1,
      level = 1,
      compress = this.config.enableCompression,
    } = options

    const originalSize = this.estimateSize(data)
    let processedData = data
    let compressed = false

    // 压缩处理
    if (compress && originalSize > 1024) {
      // 大于1KB才压缩
      try {
        processedData = CompressionUtils.compress(data)
        compressed = true
      } catch (error) {
        console.warn('压缩失败，使用原始数据:', error)
      }
    }

    const item: CacheItem = {
      data: processedData,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now(),
      size: this.estimateSize(processedData),
      compressed,
      priority,
    }

    // 根据级别选择缓存
    const cache = this.getCacheByLevel(level)

    // 检查容量并清理
    this.ensureCapacity(cache, level)

    cache.set(key, item)
    this.updateStats()

    // 持久化到本地存储
    if (level === 3 && this.config.enablePersistence) {
      this.persistToStorage(key, item)
    }
  }

  /**
   * 获取缓存项
   */
  get<T = any>(key: string): T | null {
    // 按级别顺序查找
    for (let level = 1; level <= 3; level++) {
      const cache = this.getCacheByLevel(level as 1 | 2 | 3)
      const item = cache.get(key)

      if (item) {
        // 检查是否过期
        if (this.isExpired(item)) {
          cache.delete(key)
          continue
        }

        // 更新访问统计
        item.accessCount++
        item.lastAccess = Date.now()

        // 提升到更高级别缓存
        if (level > 1 && item.accessCount > 3) {
          this.promoteToHigherLevel(key, item, level)
        }

        this.stats.hitCount++
        this.updateHitRate()

        // 解压数据
        const data = item.compressed ? CompressionUtils.decompress(item.data) : item.data

        return data
      }
    }

    this.stats.missCount++
    this.updateHitRate()
    return null
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    let deleted = false

    for (let level = 1; level <= 3; level++) {
      const cache = this.getCacheByLevel(level as 1 | 2 | 3)
      if (cache.delete(key)) {
        deleted = true
      }
    }

    if (deleted) {
      this.removeFromStorage(key)
      this.updateStats()
    }

    return deleted
  }

  /**
   * 清空指定级别的缓存
   */
  clear(level?: 1 | 2 | 3): void {
    if (level) {
      this.getCacheByLevel(level).clear()
    } else {
      this.l1Cache.clear()
      this.l2Cache.clear()
      this.persistentCache.clear()
      this.clearStorage()
    }
    this.updateStats()
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    this.updateStats()
    return { ...this.stats }
  }

  /**
   * 获取详细的缓存信息
   */
  getDetailedInfo() {
    return {
      l1: {
        size: this.l1Cache.size,
        memoryUsage: this.calculateCacheSize(this.l1Cache),
      },
      l2: {
        size: this.l2Cache.size,
        memoryUsage: this.calculateCacheSize(this.l2Cache),
      },
      l3: {
        size: this.persistentCache.size,
        memoryUsage: this.calculateCacheSize(this.persistentCache),
      },
      stats: this.getStats(),
    }
  }

  /**
   * 优化缓存性能
   */
  optimize(): void {
    process.env.NODE_ENV === 'development' && console.log('🔧 开始缓存优化...')

    // 清理过期项
    this.cleanupExpired()

    // 压缩大型数据
    this.compressLargeItems()

    // 重新平衡缓存级别
    this.rebalanceCacheLevels()

    // 更新统计信息
    this.updateStats()

    process.env.NODE_ENV === 'development' && console.log('✅ 缓存优化完成')
  }

  /**
   * 预热缓存
   */
  async warmup(keys: string[], dataLoader: (key: string) => Promise<any>): Promise<void> {
    process.env.NODE_ENV === 'development' && console.log(`🔥 开始预热 ${keys.length} 个缓存项...`)

    const promises = keys.map(async key => {
      if (!this.has(key)) {
        try {
          const data = await dataLoader(key)
          this.set(key, data, { level: 2, priority: 2 })
        } catch (error) {
          console.warn(`预热缓存失败: ${key}`, error)
        }
      }
    })

    await Promise.allSettled(promises)
    process.env.NODE_ENV === 'development' && console.log('✅ 缓存预热完成')
  }

  /**
   * 根据级别获取缓存
   */
  private getCacheByLevel(level: 1 | 2 | 3): Map<string, CacheItem> {
    switch (level) {
      case 1:
        return this.l1Cache
      case 2:
        return this.l2Cache
      case 3:
        return this.persistentCache
      default:
        return this.l1Cache
    }
  }

  /**
   * 检查项是否过期
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl
  }

  /**
   * 确保缓存容量
   */
  private ensureCapacity(cache: Map<string, CacheItem>, level: number): void {
    const maxSize = Math.floor(this.config.maxSize / level)

    while (cache.size >= maxSize) {
      this.evictItem(cache)
    }
  }

  /**
   * 淘汰缓存项
   */
  private evictItem(cache: Map<string, CacheItem>): void {
    let evictKey = ''
    let evictScore = Infinity

    for (const [key, item] of cache.entries()) {
      // 综合考虑访问频率、最后访问时间和优先级
      const score = (Date.now() - item.lastAccess) / item.accessCount / item.priority

      if (score < evictScore) {
        evictScore = score
        evictKey = key
      }
    }

    if (evictKey) {
      cache.delete(evictKey)
      this.stats.evictionCount++
    }
  }

  /**
   * 提升到更高级别缓存
   */
  private promoteToHigherLevel(key: string, item: CacheItem, currentLevel: number): void {
    if (currentLevel > 1) {
      const higherCache = this.getCacheByLevel((currentLevel - 1) as 1 | 2)
      higherCache.set(key, { ...item })
    }
  }

  /**
   * 估算数据大小
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2 // 粗略估算
    } catch {
      return 1024 // 默认1KB
    }
  }

  /**
   * 计算缓存总大小
   */
  private calculateCacheSize(cache: Map<string, CacheItem>): number {
    let totalSize = 0
    for (const item of cache.values()) {
      totalSize += item.size
    }
    return totalSize
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.totalItems = this.l1Cache.size + this.l2Cache.size + this.persistentCache.size
    this.stats.totalSize =
      this.calculateCacheSize(this.l1Cache) +
      this.calculateCacheSize(this.l2Cache) +
      this.calculateCacheSize(this.persistentCache)
    this.stats.memoryUsage = this.stats.totalSize
    this.updateHitRate()
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0
  }

  /**
   * 清理过期项
   */
  private cleanupExpired(): void {
    const caches = [this.l1Cache, this.l2Cache, this.persistentCache]

    caches.forEach(cache => {
      for (const [key, item] of cache.entries()) {
        if (this.isExpired(item)) {
          cache.delete(key)
        }
      }
    })
  }

  /**
   * 压缩大型数据项
   */
  private compressLargeItems(): void {
    if (!this.config.enableCompression) return

    const caches = [this.l1Cache, this.l2Cache, this.persistentCache]

    caches.forEach(cache => {
      for (const [key, item] of cache.entries()) {
        if (!item.compressed && item.size > 2048) {
          // 大于2KB
          try {
            const compressed = CompressionUtils.compress(item.data)
            item.data = compressed
            item.compressed = true
            item.size = this.estimateSize(compressed)
          } catch (error) {
            console.warn(`压缩失败: ${key}`, error)
          }
        }
      }
    })
  }

  /**
   * 重新平衡缓存级别
   */
  private rebalanceCacheLevels(): void {
    // 将高频访问的L2缓存项提升到L1
    for (const [key, item] of this.l2Cache.entries()) {
      if (item.accessCount > 10 && this.l1Cache.size < this.config.maxSize / 2) {
        this.l1Cache.set(key, item)
        this.l2Cache.delete(key)
      }
    }

    // 将低频访问的L1缓存项降级到L2
    for (const [key, item] of this.l1Cache.entries()) {
      if (item.accessCount < 3 && Date.now() - item.lastAccess > 300000) {
        // 5分钟未访问
        this.l2Cache.set(key, item)
        this.l1Cache.delete(key)
      }
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired()
      this.updateStats()
    }, this.config.cleanupInterval)
  }

  /**
   * 持久化到本地存储
   */
  private persistToStorage(key: string, item: CacheItem): void {
    if (typeof localStorage === 'undefined') return

    try {
      const storageKey = `cache_${key}`
      localStorage.setItem(storageKey, JSON.stringify(item))
    } catch (error) {
      console.warn('持久化缓存失败:', error)
    }
  }

  /**
   * 从本地存储移除
   */
  private removeFromStorage(key: string): void {
    if (typeof localStorage === 'undefined') return

    try {
      const storageKey = `cache_${key}`
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('移除持久化缓存失败:', error)
    }
  }

  /**
   * 加载持久化缓存
   */
  private loadPersistentCache(): void {
    if (typeof localStorage === 'undefined' || !this.config.enablePersistence) return

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('cache_')) {
          const cacheKey = key.replace('cache_', '')
          const itemStr = localStorage.getItem(key)
          if (itemStr) {
            const item = JSON.parse(itemStr) as CacheItem
            if (!this.isExpired(item)) {
              this.persistentCache.set(cacheKey, item)
            } else {
              localStorage.removeItem(key)
            }
          }
        }
      }
    } catch (error) {
      console.warn('加载持久化缓存失败:', error)
    }
  }

  /**
   * 清空本地存储
   */
  private clearStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('cache_')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.warn('清空持久化缓存失败:', error)
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

/**
 * 缓存优化组合式函数
 */
export function useCacheOptimizer(config: Partial<CacheConfig> = {}) {
  const cacheManager = new MultiLevelCacheManager(config)
  const stats = ref(cacheManager.getStats())

  // 🔧 局域网优化：降低统计更新频率
  const statsInterval = setInterval(() => {
    stats.value = cacheManager.getStats()
  }, 30000) // 每30秒更新（原5秒）

  // 缓存操作方法
  const set = (key: string, data: any, options?: any) => {
    cacheManager.set(key, data, options)
    stats.value = cacheManager.getStats()
  }

  const get = <T = any>(key: string): T | null => {
    const result = cacheManager.get<T>(key)
    stats.value = cacheManager.getStats()
    return result
  }

  const has = (key: string): boolean => {
    return cacheManager.has(key)
  }

  const del = (key: string): boolean => {
    const result = cacheManager.delete(key)
    stats.value = cacheManager.getStats()
    return result
  }

  const clear = (level?: 1 | 2 | 3) => {
    cacheManager.clear(level)
    stats.value = cacheManager.getStats()
  }

  const optimize = () => {
    cacheManager.optimize()
    stats.value = cacheManager.getStats()
  }

  const warmup = async (keys: string[], dataLoader: (key: string) => Promise<any>) => {
    await cacheManager.warmup(keys, dataLoader)
    stats.value = cacheManager.getStats()
  }

  // 清理函数
  const cleanup = () => {
    clearInterval(statsInterval)
    cacheManager.destroy()
  }

  return {
    // 状态
    stats,

    // 方法
    set,
    get,
    has,
    delete: del,
    clear,
    optimize,
    warmup,
    getDetailedInfo: cacheManager.getDetailedInfo.bind(cacheManager),

    // 清理
    cleanup,
  }
}

/**
 * 全局缓存实例
 */
export const globalCache = new MultiLevelCacheManager({
  maxSize: 2000,
  defaultTTL: 600000, // 10分钟
  cleanupInterval: 120000, // 2分钟
  enableCompression: true,
  enablePersistence: true,
  storageQuota: 100 * 1024 * 1024, // 100MB
})

// 在页面卸载时清理缓存
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalCache.destroy()
  })
}
