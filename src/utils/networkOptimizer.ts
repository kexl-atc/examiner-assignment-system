/**
 * 网络性能优化工具
 * 提供API请求优化、缓存策略、资源预加载等功能
 */

import { ref, computed, watch, type Ref } from 'vue'

/**
 * 请求配置接口
 */
export interface RequestConfig {
  timeout?: number
  retries?: number
  cache?: boolean
  cacheTTL?: number
  priority?: 'high' | 'medium' | 'low'
  debounce?: number
  throttle?: number
}

/**
 * 网络性能指标
 */
export interface NetworkMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  cacheHitRate: number
  bandwidthUsage: number
  concurrentRequests: number
}

/**
 * 请求去重器
 */
export class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>()
  private requestCounts = new Map<string, number>()

  /**
   * 生成请求键
   */
  private generateKey(url: string, options: RequestInit = {}): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }

  /**
   * 去重请求
   */
  async deduplicate<T>(
    url: string,
    options: RequestInit = {},
    fetcher: () => Promise<T>
  ): Promise<T> {
    const key = this.generateKey(url, options)

    // 如果已有相同请求在进行中，返回该请求的Promise
    if (this.pendingRequests.has(key)) {
      process.env.NODE_ENV === 'development' && console.log(`🔄 [网络优化] 请求去重: ${url}`)
      return this.pendingRequests.get(key)!
    }

    // 记录请求次数
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1)

    // 创建新请求
    const promise = fetcher().finally(() => {
      this.pendingRequests.delete(key)
    })

    this.pendingRequests.set(key, promise)
    return promise
  }

  /**
   * 获取请求统计
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      totalRequests: Array.from(this.requestCounts.values()).reduce((sum, count) => sum + count, 0),
      uniqueRequests: this.requestCounts.size,
    }
  }

  /**
   * 清理统计数据
   */
  clearStats() {
    this.requestCounts.clear()
  }
}

/**
 * 请求批处理器
 */
export class RequestBatcher {
  private batches = new Map<
    string,
    {
      requests: Array<{
        resolve: (value: any) => void
        reject: (error: any) => void
        data: any
      }>
      timer: NodeJS.Timeout
    }
  >()

  private batchDelay = 50 // 50ms批处理延迟
  private maxBatchSize = 10

  /**
   * 添加到批处理
   */
  async batch<T>(
    batchKey: string,
    data: any,
    processor: (items: any[]) => Promise<T[]>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, {
          requests: [],
          timer: setTimeout(() => this.processBatch(batchKey, processor), this.batchDelay),
        })
      }

      const batch = this.batches.get(batchKey)!
      batch.requests.push({ resolve, reject, data })

      // 如果达到最大批处理大小，立即处理
      if (batch.requests.length >= this.maxBatchSize) {
        clearTimeout(batch.timer)
        this.processBatch(batchKey, processor)
      }
    })
  }

  /**
   * 处理批处理
   */
  private async processBatch<T>(batchKey: string, processor: (items: any[]) => Promise<T[]>) {
    const batch = this.batches.get(batchKey)
    if (!batch) return

    this.batches.delete(batchKey)

    try {
      const items = batch.requests.map(req => req.data)
      const results = await processor(items)

      batch.requests.forEach((req, index) => {
        req.resolve(results[index])
      })
    } catch (error) {
      batch.requests.forEach(req => {
        req.reject(error)
      })
    }
  }
}

/**
 * 智能缓存管理器
 */
export class SmartCacheManager {
  private cache = new Map<
    string,
    {
      data: any
      timestamp: number
      ttl: number
      accessCount: number
      lastAccess: number
    }
  >()

  private maxSize = 1000
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // 定期清理过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000) // 每分钟清理一次
  }

  /**
   * 设置缓存
   */
  set(key: string, data: any, ttl: number = 300000): void {
    // 如果缓存已满，清理最少使用的项
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccess: Date.now(),
    })
  }

  /**
   * 获取缓存
   */
  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    // 更新访问统计
    item.accessCount++
    item.lastAccess = Date.now()

    return item.data
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 淘汰最少使用的缓存项
   */
  private evictLeastUsed(): void {
    let leastUsedKey = ''
    let leastUsedCount = Infinity
    let oldestAccess = Infinity

    for (const [key, item] of this.cache.entries()) {
      if (
        item.accessCount < leastUsedCount ||
        (item.accessCount === leastUsedCount && item.lastAccess < oldestAccess)
      ) {
        leastUsedKey = key
        leastUsedCount = item.accessCount
        oldestAccess = item.lastAccess
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey)
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const totalItems = this.cache.size
    const totalAccess = Array.from(this.cache.values()).reduce(
      (sum, item) => sum + item.accessCount,
      0
    )

    return {
      totalItems,
      totalAccess,
      hitRate: totalAccess > 0 ? totalItems / totalAccess : 0,
      memoryUsage: this.estimateMemoryUsage(),
    }
  }

  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    let size = 0
    for (const [key, item] of this.cache.entries()) {
      size += key.length * 2 // 字符串大小估算
      size += JSON.stringify(item.data).length * 2
      size += 64 // 元数据大小估算
    }
    return size
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.clear()
  }
}

/**
 * 资源预加载器
 */
export class ResourcePreloader {
  private preloadedResources = new Set<string>()
  private preloadQueue: Array<{
    url: string
    type: 'script' | 'style' | 'image' | 'fetch'
    priority: number
  }> = []

  /**
   * 预加载脚本
   */
  preloadScript(url: string, priority: number = 1): Promise<void> {
    if (this.preloadedResources.has(url)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'script'
      link.href = url
      link.onload = () => {
        this.preloadedResources.add(url)
        resolve()
      }
      link.onerror = reject
      document.head.appendChild(link)
    })
  }

  /**
   * 预加载样式
   */
  preloadStyle(url: string, priority: number = 1): Promise<void> {
    if (this.preloadedResources.has(url)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = url
      link.onload = () => {
        this.preloadedResources.add(url)
        resolve()
      }
      link.onerror = reject
      document.head.appendChild(link)
    })
  }

  /**
   * 预加载图片
   */
  preloadImage(url: string, priority: number = 1): Promise<void> {
    if (this.preloadedResources.has(url)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        this.preloadedResources.add(url)
        resolve()
      }
      img.onerror = reject
      img.src = url
    })
  }

  /**
   * 预获取数据
   */
  async prefetchData(url: string, priority: number = 1): Promise<void> {
    if (this.preloadedResources.has(url)) {
      return
    }

    try {
      await fetch(url, {
        method: 'GET',
        cache: 'force-cache',
      })
      this.preloadedResources.add(url)
    } catch (error) {
      console.warn(`预获取数据失败: ${url}`, error)
    }
  }

  /**
   * 批量预加载
   */
  async batchPreload(
    resources: Array<{
      url: string
      type: 'script' | 'style' | 'image' | 'fetch'
      priority?: number
    }>
  ): Promise<void> {
    // 按优先级排序
    resources.sort((a, b) => (b.priority || 1) - (a.priority || 1))

    const promises = resources.map(resource => {
      switch (resource.type) {
        case 'script':
          return this.preloadScript(resource.url, resource.priority)
        case 'style':
          return this.preloadStyle(resource.url, resource.priority)
        case 'image':
          return this.preloadImage(resource.url, resource.priority)
        case 'fetch':
          return this.prefetchData(resource.url, resource.priority)
        default:
          return Promise.resolve()
      }
    })

    await Promise.allSettled(promises)
  }

  /**
   * 获取预加载统计
   */
  getStats() {
    return {
      preloadedCount: this.preloadedResources.size,
      queueLength: this.preloadQueue.length,
    }
  }
}

/**
 * 网络性能监控器
 */
export class NetworkPerformanceMonitor {
  private metrics: NetworkMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    bandwidthUsage: 0,
    concurrentRequests: 0,
  }

  private responseTimes: number[] = []
  private observer: PerformanceObserver | null = null

  constructor() {
    this.initPerformanceObserver()
  }

  /**
   * 初始化性能观察器
   */
  private initPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') {
      return
    }

    this.observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.recordResourceMetrics(entry as PerformanceResourceTiming)
        }
      }
    })

    this.observer.observe({ entryTypes: ['resource'] })
  }

  /**
   * 记录资源指标
   */
  private recordResourceMetrics(entry: PerformanceResourceTiming): void {
    this.metrics.totalRequests++

    const responseTime = entry.responseEnd - entry.requestStart
    this.responseTimes.push(responseTime)

    // 只保留最近100次请求的响应时间
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift()
    }

    // 计算平均响应时间
    this.metrics.averageResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length

    // 记录带宽使用
    if (entry.transferSize) {
      this.metrics.bandwidthUsage += entry.transferSize
    }
  }

  /**
   * 记录请求成功
   */
  recordSuccess(): void {
    this.metrics.successfulRequests++
  }

  /**
   * 记录请求失败
   */
  recordFailure(): void {
    this.metrics.failedRequests++
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(): void {
    // 缓存命中率计算在获取指标时进行
  }

  /**
   * 更新并发请求数
   */
  updateConcurrentRequests(count: number): void {
    this.metrics.concurrentRequests = count
  }

  /**
   * 获取性能指标
   */
  getMetrics(): NetworkMetrics {
    return { ...this.metrics }
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      bandwidthUsage: 0,
      concurrentRequests: 0,
    }
    this.responseTimes = []
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}

/**
 * 网络优化器主类
 */
export class NetworkOptimizer {
  private deduplicator = new RequestDeduplicator()
  private batcher = new RequestBatcher()
  private cacheManager = new SmartCacheManager()
  private preloader = new ResourcePreloader()
  private monitor = new NetworkPerformanceMonitor()

  /**
   * 优化的fetch请求
   */
  async optimizedFetch(url: string, options: RequestInit & RequestConfig = {}): Promise<Response> {
    const {
      timeout = 10000,
      retries = 3,
      cache = true,
      cacheTTL = 300000,
      priority = 'medium',
      ...fetchOptions
    } = options

    // 检查缓存
    if (cache && fetchOptions.method !== 'POST') {
      const cacheKey = `${fetchOptions.method || 'GET'}:${url}`
      const cached = this.cacheManager.get(cacheKey)
      if (cached) {
        this.monitor.recordCacheHit()
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // 请求去重
    return this.deduplicator.deduplicate(url, fetchOptions, async () => {
      let lastError: Error | null = null

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), timeout)

          const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (response.ok) {
            this.monitor.recordSuccess()

            // 缓存响应
            if (cache && fetchOptions.method !== 'POST') {
              const cacheKey = `${fetchOptions.method || 'GET'}:${url}`
              const data = await response.clone().json()
              this.cacheManager.set(cacheKey, data, cacheTTL)
            }

            return response
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
        } catch (error) {
          lastError = error as Error

          if (attempt < retries) {
            // 指数退避重试
            const delay = Math.pow(2, attempt) * 1000
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }

      this.monitor.recordFailure()
      throw lastError || new Error('请求失败')
    })
  }

  /**
   * 批量请求
   */
  async batchRequest<T>(
    batchKey: string,
    data: any,
    processor: (items: any[]) => Promise<T[]>
  ): Promise<T> {
    return this.batcher.batch(batchKey, data, processor)
  }

  /**
   * 预加载资源
   */
  async preloadResources(
    resources: Array<{
      url: string
      type: 'script' | 'style' | 'image' | 'fetch'
      priority?: number
    }>
  ): Promise<void> {
    return this.preloader.batchPreload(resources)
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return {
      network: this.monitor.getMetrics(),
      cache: this.cacheManager.getStats(),
      deduplication: this.deduplicator.getStats(),
      preloader: this.preloader.getStats(),
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.cacheManager.clear()
    this.deduplicator.clearStats()
    this.monitor.reset()
  }

  /**
   * 销毁优化器
   */
  destroy(): void {
    this.cacheManager.destroy()
    this.monitor.destroy()
  }
}

/**
 * 网络优化组合式函数
 */
export function useNetworkOptimizer(
  config: {
    enableCache?: boolean
    enableDeduplication?: boolean
    enableBatching?: boolean
    enablePreloading?: boolean
    enableMonitoring?: boolean
  } = {}
) {
  const optimizer = new NetworkOptimizer()
  const isOnline = ref(navigator.onLine)
  const networkStats = ref(optimizer.getPerformanceStats())

  // 监听网络状态
  const updateOnlineStatus = () => {
    isOnline.value = navigator.onLine
  }

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)

  // 🔧 局域网优化：降低统计更新频率
  const statsInterval = setInterval(() => {
    networkStats.value = optimizer.getPerformanceStats()
  }, 30000) // 每30秒更新（原5秒）

  // 清理函数
  const cleanup = () => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
    clearInterval(statsInterval)
    optimizer.destroy()
  }

  return {
    // 状态
    isOnline,
    networkStats,

    // 方法
    optimizedFetch: optimizer.optimizedFetch.bind(optimizer),
    batchRequest: optimizer.batchRequest.bind(optimizer),
    preloadResources: optimizer.preloadResources.bind(optimizer),
    getPerformanceStats: optimizer.getPerformanceStats.bind(optimizer),

    // 清理
    cleanup,
  }
}
