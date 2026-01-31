/**
 * 性能优化工具类
 */

// LRU缓存实现
export class LRUCache<K, V> {
  private capacity: number
  private cache = new Map<K, V>()

  constructor(capacity: number) {
    this.capacity = capacity
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!
      this.cache.delete(key)
      this.cache.set(key, value)
      return value
    }
    return undefined
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// 性能测量器
export class PerformanceMeasurer {
  private measurements = new Map<string, number>()

  start(label: string): void {
    this.measurements.set(label, performance.now())
  }

  end(label: string): number {
    const startTime = this.measurements.get(label)
    if (startTime === undefined) {
      throw new Error(`No measurement started for label: ${label}`)
    }
    const duration = performance.now() - startTime
    this.measurements.delete(label)
    return duration
  }

  measure<T>(label: string, fn: () => T): T {
    this.start(label)
    try {
      return fn()
    } finally {
      this.end(label)
    }
  }
}

// 对象池
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn?: (obj: T) => void

  constructor(createFn: () => T, resetFn?: (obj: T) => void) {
    this.createFn = createFn
    this.resetFn = resetFn
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createFn()
  }

  release(obj: T): void {
    if (this.resetFn) {
      this.resetFn(obj)
    }
    this.pool.push(obj)
  }

  clear(): void {
    this.pool.length = 0
  }
}

// 批处理器
export class BatchProcessor<T> {
  private batchSize: number
  private processFn: (batch: T[]) => Promise<void>
  private currentBatch: T[] = []

  constructor(batchSize: number, processFn: (batch: T[]) => Promise<void>) {
    this.batchSize = batchSize
    this.processFn = processFn
  }

  async add(item: T): Promise<void> {
    this.currentBatch.push(item)
    if (this.currentBatch.length >= this.batchSize) {
      await this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.currentBatch.length > 0) {
      const batch = [...this.currentBatch]
      this.currentBatch.length = 0
      await this.processFn(batch)
    }
  }
}

// 内存监控器
export class MemoryMonitor {
  private static instance: MemoryMonitor
  private callbacks: Array<() => void> = []

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor()
    }
    return MemoryMonitor.instance
  }

  onMemoryPressure(callback: () => void): void {
    this.callbacks.push(callback)
  }

  checkMemory(): void {
    // 简化的内存检查
    if (typeof (performance as any).memory !== 'undefined') {
      const memory = (performance as any).memory
      const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit
      if (usedRatio > 0.8) {
        this.callbacks.forEach(callback => callback())
      }
    }
  }
}

// 创建优化缓存
export function createOptimizedCache<K, V>(capacity: number): LRUCache<K, V> {
  return new LRUCache<K, V>(capacity)
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait) as unknown as number
  }
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
