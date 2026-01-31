/**
 * 性能优化的数据过滤工具
 * 解决大数据量下的过滤性能问题
 */

import { ref, computed, watch, type Ref } from 'vue'

export interface FilterOptions {
  searchQuery?: string
  selectedSubject?: string
  selectedDate?: string
  selectedStatus?: string
}

export interface ScheduleItem {
  id: number
  examDate: Date
  examTime: string
  subject: string
  examRoom: string
  chiefExaminer?: string
  assistantExaminer?: string
  invigilator?: string
  oralExaminer?: string
  status: string
  [key: string]: any
}

/**
 * 高性能数据过滤器
 */
export class PerformanceOptimizedFilter {
  private cache = new Map<string, ScheduleItem[]>()
  private lastCacheKey = ''
  private searchIndex = new Map<string, Set<number>>()
  private subjectIndex = new Map<string, Set<number>>()
  private statusIndex = new Map<string, Set<number>>()
  private dateIndex = new Map<string, Set<number>>()

  constructor(private data: Ref<ScheduleItem[]>) {
    // 监听数据变化，重建索引
    watch(
      data,
      () => {
        this.rebuildIndexes()
        this.clearCache()
      },
      { deep: true }
    )

    // 初始化索引
    this.rebuildIndexes()
  }

  /**
   * 重建搜索索引
   */
  private rebuildIndexes() {
    this.searchIndex.clear()
    this.subjectIndex.clear()
    this.statusIndex.clear()
    this.dateIndex.clear()

    this.data.value.forEach((item, index) => {
      // 构建搜索索引
      const searchTerms = [
        item.chiefExaminer,
        item.assistantExaminer,
        item.invigilator,
        item.oralExaminer,
        item.subject,
      ]
        .filter(Boolean)
        .map(term => term!.toLowerCase())

      searchTerms.forEach(term => {
        if (!this.searchIndex.has(term)) {
          this.searchIndex.set(term, new Set())
        }
        this.searchIndex.get(term)!.add(index)
      })

      // 构建科目索引
      if (!this.subjectIndex.has(item.subject)) {
        this.subjectIndex.set(item.subject, new Set())
      }
      this.subjectIndex.get(item.subject)!.add(index)

      // 构建状态索引
      if (!this.statusIndex.has(item.status)) {
        this.statusIndex.set(item.status, new Set())
      }
      this.statusIndex.get(item.status)!.add(index)

      // 构建日期索引
      const dateStr = item.examDate.toDateString()
      if (!this.dateIndex.has(dateStr)) {
        this.dateIndex.set(dateStr, new Set())
      }
      this.dateIndex.get(dateStr)!.add(index)
    })
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(filters: FilterOptions): string {
    return JSON.stringify({
      search: filters.searchQuery || '',
      subject: filters.selectedSubject || '',
      date: filters.selectedDate || '',
      status: filters.selectedStatus || '',
      dataLength: this.data.value.length,
    })
  }

  /**
   * 清除缓存
   */
  private clearCache() {
    this.cache.clear()
    this.lastCacheKey = ''
  }

  /**
   * 高性能过滤方法
   */
  filter(filters: FilterOptions): ScheduleItem[] {
    const cacheKey = this.generateCacheKey(filters)

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    let candidateIndexes: Set<number> | null = null

    // 使用索引进行快速过滤
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      const searchResults = new Set<number>()

      // 使用索引查找匹配项
      for (const [term, indexes] of this.searchIndex.entries()) {
        if (term.includes(query)) {
          indexes.forEach(index => searchResults.add(index))
        }
      }

      candidateIndexes = searchResults
    }

    // 科目过滤
    if (filters.selectedSubject) {
      const subjectResults = this.subjectIndex.get(filters.selectedSubject) || new Set()
      candidateIndexes = candidateIndexes
        ? new Set([...candidateIndexes].filter(x => subjectResults.has(x)))
        : subjectResults
    }

    // 状态过滤
    if (filters.selectedStatus) {
      const statusResults = this.statusIndex.get(filters.selectedStatus) || new Set()
      candidateIndexes = candidateIndexes
        ? new Set([...candidateIndexes].filter(x => statusResults.has(x)))
        : statusResults
    }

    // 日期过滤
    if (filters.selectedDate) {
      const selectedDateObj = new Date(filters.selectedDate)
      const dateStr = selectedDateObj.toDateString()
      const dateResults = this.dateIndex.get(dateStr) || new Set()
      candidateIndexes = candidateIndexes
        ? new Set([...candidateIndexes].filter(x => dateResults.has(x)))
        : dateResults
    }

    // 如果没有任何过滤条件，返回所有数据
    if (!candidateIndexes) {
      candidateIndexes = new Set(this.data.value.map((_, index) => index))
    }

    // 根据索引获取结果
    const result = Array.from(candidateIndexes)
      .map(index => this.data.value[index])
      .filter(Boolean)

    // 缓存结果
    this.cache.set(cacheKey, result)

    // 限制缓存大小
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    return result
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      searchIndexSize: this.searchIndex.size,
      subjectIndexSize: this.subjectIndex.size,
      statusIndexSize: this.statusIndex.size,
      dateIndexSize: this.dateIndex.size,
    }
  }
}

/**
 * 创建优化的过滤器组合式函数
 */
export function useOptimizedFilter(data: Ref<ScheduleItem[]>) {
  const filter = new PerformanceOptimizedFilter(data)

  const searchQuery = ref('')
  const selectedSubject = ref('')
  const selectedDate = ref('')
  const selectedStatus = ref('')

  const filteredData = computed(() => {
    return filter.filter({
      searchQuery: searchQuery.value,
      selectedSubject: selectedSubject.value,
      selectedDate: selectedDate.value,
      selectedStatus: selectedStatus.value,
    })
  })

  const filterStats = computed(() => filter.getCacheStats())

  return {
    searchQuery,
    selectedSubject,
    selectedDate,
    selectedStatus,
    filteredData,
    filterStats,
  }
}

/**
 * 防抖函数，用于优化搜索性能
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func.apply(null, args)
    }, wait)
  }
}

/**
 * 虚拟滚动优化器
 */
export class VirtualScrollOptimizer {
  private itemHeight: number
  private containerHeight: number
  private buffer: number

  constructor(itemHeight = 50, containerHeight = 600, buffer = 5) {
    this.itemHeight = itemHeight
    this.containerHeight = containerHeight
    this.buffer = buffer
  }

  /**
   * 计算可见范围
   */
  getVisibleRange(scrollTop: number, totalItems: number) {
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight)
    const startIndex = Math.floor(scrollTop / this.itemHeight)

    const start = Math.max(0, startIndex - this.buffer)
    const end = Math.min(totalItems, startIndex + visibleCount + this.buffer)

    return { start, end, visibleCount }
  }

  /**
   * 获取虚拟滚动数据
   */
  getVirtualData<T>(data: T[], scrollTop: number) {
    const { start, end } = this.getVisibleRange(scrollTop, data.length)

    return {
      visibleData: data.slice(start, end),
      startIndex: start,
      endIndex: end,
      totalHeight: data.length * this.itemHeight,
      offsetY: start * this.itemHeight,
    }
  }
}
