/**
 * 性能优化组合式函数
 * 
 * 企业级前端性能优化：
 * 1. 虚拟滚动
 * 2. 防抖节流
 * 3. 懒加载
 * 4. 内存管理
 * 
 * @author Enterprise Architecture Team
 * @version 8.0.1
 */

import { ref, computed, onUnmounted, shallowRef, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'

// ==================== 虚拟滚动 ====================

export interface VirtualScrollOptions {
  itemHeight: number
  overscan?: number
  containerHeight: number
}

export interface VirtualScrollReturn<T> {
  virtualItems: ComputedRef<Array<{ item: T; index: number; style: object }>>
  totalHeight: ComputedRef<number>
  startIndex: Ref<number>
  endIndex: Ref<number>
  onScroll: (event: Event) => void
}

/**
 * 虚拟滚动
 */
export function useVirtualScroll<T>(
  items: Ref<T[]>,
  options: VirtualScrollOptions
): VirtualScrollReturn<T> {
  const { itemHeight, overscan = 5, containerHeight } = options
  
  const scrollTop = ref(0)
  const startIndex = ref(0)
  const endIndex = ref(0)

  const totalHeight = computed(() => items.value.length * itemHeight)

  const virtualItems = computed(() => {
    const start = Math.max(0, startIndex.value - overscan)
    const end = Math.min(items.value.length, endIndex.value + overscan)
    
    return items.value.slice(start, end).map((item, idx) => ({
      item,
      index: start + idx,
      style: {
        position: 'absolute' as const,
        top: `${(start + idx) * itemHeight}px`,
        height: `${itemHeight}px`,
        left: 0,
        right: 0
      }
    }))
  })

  const calculateVisibleRange = () => {
    const visibleStart = Math.floor(scrollTop.value / itemHeight)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    
    startIndex.value = visibleStart
    endIndex.value = Math.min(visibleStart + visibleCount, items.value.length)
  }

  const onScroll = (event: Event) => {
    scrollTop.value = (event.target as HTMLElement).scrollTop
    calculateVisibleRange()
  }

  // 初始化计算
  calculateVisibleRange()

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    onScroll
  }
}

// ==================== 防抖 ====================

export interface DebounceOptions {
  wait?: number
  immediate?: boolean
}

/**
 * 防抖函数
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  options: DebounceOptions = {}
): (...args: Parameters<T>) => void {
  const { wait = 300, immediate = false } = options
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debounced = (...args: Parameters<T>) => {
    const callNow = immediate && !timeoutId

    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      timeoutId = null
      if (!immediate) {
        fn(...args)
      }
    }, wait)

    if (callNow) {
      fn(...args)
    }
  }

  // 清理
  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  // 自动清理
  onUnmounted(cleanup)

  return debounced
}

// ==================== 节流 ====================

export interface ThrottleOptions {
  wait?: number
  leading?: boolean
  trailing?: boolean
}

/**
 * 节流函数
 */
export function useThrottle<T extends (...args: any[]) => any>(
  fn: T,
  options: ThrottleOptions = {}
): (...args: Parameters<T>) => void {
  const { wait = 300, leading = true, trailing = true } = options
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let previous = 0
  let lastArgs: Parameters<T> | null = null

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now()

    if (!previous && !leading) {
      previous = now
    }

    const remaining = wait - (now - previous)

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      previous = now
      fn(...args)
    } else if (!timeoutId && trailing) {
      lastArgs = args
      timeoutId = setTimeout(() => {
        previous = leading ? Date.now() : 0
        timeoutId = null
        if (lastArgs) {
          fn(...lastArgs)
          lastArgs = null
        }
      }, remaining)
    }
  }

  // 清理
  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  onUnmounted(cleanup)

  return throttled
}

// ==================== 懒加载 ====================

export interface LazyLoadOptions {
  rootMargin?: string
  threshold?: number
  triggerOnce?: boolean
}

export interface LazyLoadReturn {
  isVisible: Ref<boolean>
  elementRef: Ref<HTMLElement | null>
}

/**
 * 元素可见性懒加载
 */
export function useLazyLoad(options: LazyLoadOptions = {}): LazyLoadReturn {
  const { rootMargin = '0px', threshold = 0, triggerOnce = true } = options
  
  const isVisible = ref(false)
  const elementRef = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null

  const setupObserver = () => {
    if (!elementRef.value) return

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isVisible.value = true
          if (triggerOnce && observer) {
            observer.disconnect()
          }
        } else if (!triggerOnce) {
          isVisible.value = false
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(elementRef.value)
  }

  watch(elementRef, (el) => {
    if (el) {
      setupObserver()
    }
  })

  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })

  return {
    isVisible,
    elementRef
  }
}

// ==================== 内存管理 ====================

export interface MemoryManagerOptions {
  maxItems?: number
  ttl?: number
}

export interface MemoryManagerReturn<T> {
  data: Ref<T[]>
  add: (item: T) => void
  remove: (index: number) => void
  clear: () => void
  cleanup: () => void
}

/**
 * 内存管理器
 */
export function useMemoryManager<T>(
  options: MemoryManagerOptions = {}
): MemoryManagerReturn<T> {
  const { maxItems = 1000, ttl = 300000 } = options // 默认5分钟TTL
  
  const data = shallowRef<T[]>([])
  const timestamps = new Map<number, number>()
  let cleanupInterval: ReturnType<typeof setInterval> | null = null

  const cleanup = () => {
    const now = Date.now()
    let hasExpired = false

    data.value = data.value.filter((_, index) => {
      const timestamp = timestamps.get(index)
      if (timestamp && now - timestamp > ttl) {
        timestamps.delete(index)
        hasExpired = true
        return false
      }
      return true
    })

    if (hasExpired) {
      // 重建索引
      const newTimestamps = new Map<number, number>()
      timestamps.forEach((time, _) => {
        newTimestamps.set(newTimestamps.size, time)
      })
      timestamps.clear()
      newTimestamps.forEach((time, idx) => timestamps.set(idx, time))
    }
  }

  const startCleanup = () => {
    if (cleanupInterval) return
    cleanupInterval = setInterval(cleanup, 60000) // 每分钟清理
  }

  const stopCleanup = () => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval)
      cleanupInterval = null
    }
  }

  const add = (item: T) => {
    // 如果超过最大数量，移除最旧的
    if (data.value.length >= maxItems) {
      data.value = data.value.slice(1)
      // 更新索引
      const newTimestamps = new Map<number, number>()
      timestamps.forEach((time, oldIdx) => {
        if (oldIdx > 0) {
          newTimestamps.set(oldIdx - 1, time)
        }
      })
      timestamps.clear()
      newTimestamps.forEach((time, idx) => timestamps.set(idx, time))
    }

    data.value = [...data.value, item]
    timestamps.set(data.value.length - 1, Date.now())
    
    startCleanup()
  }

  const remove = (index: number) => {
    data.value = data.value.filter((_, i) => i !== index)
    timestamps.delete(index)
  }

  const clear = () => {
    data.value = []
    timestamps.clear()
  }

  onUnmounted(() => {
    stopCleanup()
    clear()
  })

  return {
    data,
    add,
    remove,
    clear,
    cleanup
  }
}

// ==================== 请求缓存 ====================

export interface RequestCacheOptions {
  ttl?: number
  maxSize?: number
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

/**
 * 请求缓存
 */
export function useRequestCache<T>(options: RequestCacheOptions = {}) {
  const { ttl = 60000, maxSize = 100 } = options
  const cache = new Map<string, CacheEntry<T>>()

  const get = (key: string): T | null => {
    const entry = cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > ttl) {
      cache.delete(key)
      return null
    }

    return entry.data
  }

  const set = (key: string, data: T) => {
    // LRU: 如果超过最大大小，删除最旧的
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value
      cache.delete(oldestKey)
    }

    cache.set(key, { data, timestamp: Date.now() })
  }

  const invalidate = (key: string) => {
    cache.delete(key)
  }

  const invalidatePattern = (pattern: string) => {
    const regex = new RegExp(pattern)
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key)
      }
    }
  }

  const clear = () => {
    cache.clear()
  }

  return {
    get,
    set,
    invalidate,
    invalidatePattern,
    clear,
    size: () => cache.size
  }
}

// ==================== 性能监控 ====================

export interface PerformanceMetrics {
  renderTime: Ref<number>
  memoryUsage: Ref<number>
  measureRender: (fn: () => void) => void
}

/**
 * 性能监控
 */
export function usePerformanceMonitor(): PerformanceMetrics {
  const renderTime = ref(0)
  const memoryUsage = ref(0)

  const measureRender = (fn: () => void) => {
    const start = performance.now()
    
    fn()
    
    // 使用 RAF 确保测量包含渲染时间
    requestAnimationFrame(() => {
      renderTime.value = performance.now() - start
      
      // 获取内存使用（如果可用）
      if ('memory' in performance) {
        const mem = (performance as any).memory
        memoryUsage.value = mem.usedJSHeapSize / 1024 / 1024 // MB
      }
    })
  }

  return {
    renderTime,
    memoryUsage,
    measureRender
  }
}
