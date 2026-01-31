/**
 * 组件性能优化工具
 * 用于优化大型组件的渲染性能和内存使用
 */

import { ref, computed, watch, nextTick, type Ref, type ComputedRef } from 'vue'

/**
 * 虚拟滚动配置
 */
export interface VirtualScrollConfig {
  itemHeight: number
  containerHeight: number
  buffer: number
  threshold: number
}

/**
 * 分页配置
 */
export interface PaginationConfig {
  pageSize: number
  maxPages: number
  preloadPages: number
}

/**
 * 组件拆分建议
 */
export interface ComponentSplitSuggestion {
  componentName: string
  currentLines: number
  suggestedSplits: Array<{
    name: string
    responsibility: string
    estimatedLines: number
  }>
  priority: 'high' | 'medium' | 'low'
}

/**
 * 虚拟滚动优化器
 */
export class VirtualScrollOptimizer<T = any> {
  private config: VirtualScrollConfig
  private scrollTop = ref(0)
  private containerRef = ref<HTMLElement>()

  constructor(config: Partial<VirtualScrollConfig> = {}) {
    this.config = {
      itemHeight: 50,
      containerHeight: 600,
      buffer: 5,
      threshold: 100,
      ...config,
    }
  }

  /**
   * 计算可见范围
   */
  private getVisibleRange(data: T[]) {
    const { itemHeight, containerHeight, buffer } = this.config
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const startIndex = Math.floor(this.scrollTop.value / itemHeight)

    const start = Math.max(0, startIndex - buffer)
    const end = Math.min(data.length, startIndex + visibleCount + buffer)

    return { start, end, visibleCount }
  }

  /**
   * 获取虚拟滚动数据
   */
  getVirtualData(data: Ref<T[]>) {
    return computed(() => {
      if (data.value.length < this.config.threshold) {
        // 数据量小时不使用虚拟滚动
        return {
          visibleData: data.value,
          startIndex: 0,
          endIndex: data.value.length,
          totalHeight: data.value.length * this.config.itemHeight,
          offsetY: 0,
          isVirtual: false,
        }
      }

      const { start, end } = this.getVisibleRange(data.value)

      return {
        visibleData: data.value.slice(start, end),
        startIndex: start,
        endIndex: end,
        totalHeight: data.value.length * this.config.itemHeight,
        offsetY: start * this.config.itemHeight,
        isVirtual: true,
      }
    })
  }

  /**
   * 处理滚动事件
   */
  handleScroll(event: Event) {
    const target = event.target as HTMLElement
    this.scrollTop.value = target.scrollTop
  }

  /**
   * 设置容器引用
   */
  setContainerRef(ref: HTMLElement) {
    this.containerRef.value = ref
  }

  /**
   * 滚动到指定索引
   */
  scrollToIndex(index: number) {
    if (this.containerRef.value) {
      const scrollTop = index * this.config.itemHeight
      this.containerRef.value.scrollTop = scrollTop
    }
  }
}

/**
 * 分页优化器
 */
export class PaginationOptimizer<T = any> {
  private config: PaginationConfig
  private currentPage = ref(1)
  private loadedPages = new Set<number>()
  private pageCache = new Map<number, T[]>()

  constructor(config: Partial<PaginationConfig> = {}) {
    this.config = {
      pageSize: 50,
      maxPages: 10,
      preloadPages: 2,
      ...config,
    }
  }

  /**
   * 获取分页数据
   */
  getPaginatedData(data: Ref<T[]>) {
    return computed(() => {
      const totalItems = data.value.length
      const totalPages = Math.ceil(totalItems / this.config.pageSize)
      const currentPageData = this.getPageData(data.value, this.currentPage.value)

      return {
        data: currentPageData,
        currentPage: this.currentPage.value,
        totalPages,
        totalItems,
        hasNextPage: this.currentPage.value < totalPages,
        hasPrevPage: this.currentPage.value > 1,
      }
    })
  }

  /**
   * 获取指定页面数据
   */
  private getPageData(data: T[], page: number): T[] {
    const cacheKey = page

    if (this.pageCache.has(cacheKey)) {
      return this.pageCache.get(cacheKey)!
    }

    const startIndex = (page - 1) * this.config.pageSize
    const endIndex = startIndex + this.config.pageSize
    const pageData = data.slice(startIndex, endIndex)

    // 缓存页面数据
    this.pageCache.set(cacheKey, pageData)

    // 限制缓存大小
    if (this.pageCache.size > this.config.maxPages) {
      const firstKey = this.pageCache.keys().next().value
      if (firstKey !== undefined) {
        this.pageCache.delete(firstKey)
      }
    }

    return pageData
  }

  /**
   * 跳转到指定页面
   */
  goToPage(page: number) {
    this.currentPage.value = page
    this.preloadAdjacentPages()
  }

  /**
   * 下一页
   */
  nextPage() {
    this.currentPage.value++
    this.preloadAdjacentPages()
  }

  /**
   * 上一页
   */
  prevPage() {
    if (this.currentPage.value > 1) {
      this.currentPage.value--
      this.preloadAdjacentPages()
    }
  }

  /**
   * 预加载相邻页面
   */
  private preloadAdjacentPages() {
    const { preloadPages } = this.config
    const currentPage = this.currentPage.value

    for (let i = -preloadPages; i <= preloadPages; i++) {
      const page = currentPage + i
      if (page > 0 && !this.loadedPages.has(page)) {
        this.loadedPages.add(page)
      }
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.pageCache.clear()
    this.loadedPages.clear()
  }
}

/**
 * 组件拆分分析器
 */
export class ComponentSplitAnalyzer {
  /**
   * 分析大型组件并提供拆分建议
   */
  static analyzeLargeComponents(): ComponentSplitSuggestion[] {
    return [
      {
        componentName: 'SchedulesPage.vue',
        currentLines: 15912,
        suggestedSplits: [
          {
            name: 'ScheduleTable',
            responsibility: '排班表格显示和操作',
            estimatedLines: 800,
          },
          {
            name: 'ScheduleFilters',
            responsibility: '搜索和筛选功能',
            estimatedLines: 400,
          },
          {
            name: 'ScheduleHistory',
            responsibility: '历史排班管理',
            estimatedLines: 600,
          },
          {
            name: 'ScheduleActions',
            responsibility: '操作按钮和批量操作',
            estimatedLines: 300,
          },
          {
            name: 'ScheduleModals',
            responsibility: '各种弹窗和对话框',
            estimatedLines: 1000,
          },
        ],
        priority: 'high',
      },
      {
        componentName: 'StatisticsPage.vue',
        currentLines: 1625,
        suggestedSplits: [
          {
            name: 'StatisticsCharts',
            responsibility: '图表展示',
            estimatedLines: 500,
          },
          {
            name: 'StatisticsTable',
            responsibility: '数据表格',
            estimatedLines: 400,
          },
          {
            name: 'StatisticsFilters',
            responsibility: '筛选和搜索',
            estimatedLines: 300,
          },
        ],
        priority: 'medium',
      },
      {
        componentName: 'TeachersPage.vue',
        currentLines: 3412,
        suggestedSplits: [
          {
            name: 'TeacherList',
            responsibility: '教师列表展示',
            estimatedLines: 800,
          },
          {
            name: 'TeacherForm',
            responsibility: '教师信息编辑',
            estimatedLines: 600,
          },
          {
            name: 'TeacherSchedule',
            responsibility: '教师排班管理',
            estimatedLines: 700,
          },
          {
            name: 'TeacherConstraints',
            responsibility: '约束条件设置',
            estimatedLines: 500,
          },
        ],
        priority: 'high',
      },
    ]
  }

  /**
   * 生成组件拆分代码模板
   */
  static generateSplitTemplate(suggestion: ComponentSplitSuggestion): string {
    const { componentName, suggestedSplits } = suggestion

    let template = `// ${componentName} 拆分建议\n\n`

    suggestedSplits.forEach(split => {
      template += `// ${split.name}.vue - ${split.responsibility}\n`
      template += `<template>\n  <!-- ${split.responsibility} -->\n</template>\n\n`
      template += `<script setup lang="ts">\n// ${split.responsibility}逻辑\n</script>\n\n`
      template += `<style scoped>\n/* ${split.responsibility}样式 */\n</style>\n\n`
      template += '---\n\n'
    })

    return template
  }
}

/**
 * 性能监控器
 */
export class ComponentPerformanceMonitor {
  private renderTimes = new Map<string, number[]>()
  private memoryUsage = new Map<string, number[]>()

  /**
   * 记录渲染时间
   */
  recordRenderTime(componentName: string, renderTime: number) {
    if (!this.renderTimes.has(componentName)) {
      this.renderTimes.set(componentName, [])
    }

    const times = this.renderTimes.get(componentName)!
    times.push(renderTime)

    // 只保留最近50次记录
    if (times.length > 50) {
      times.shift()
    }
  }

  /**
   * 记录内存使用
   */
  recordMemoryUsage(componentName: string, memoryUsage: number) {
    if (!this.memoryUsage.has(componentName)) {
      this.memoryUsage.set(componentName, [])
    }

    const usage = this.memoryUsage.get(componentName)!
    usage.push(memoryUsage)

    // 只保留最近50次记录
    if (usage.length > 50) {
      usage.shift()
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(componentName: string) {
    const renderTimes = this.renderTimes.get(componentName) || []
    const memoryUsage = this.memoryUsage.get(componentName) || []

    const avgRenderTime =
      renderTimes.length > 0
        ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
        : 0

    const avgMemoryUsage =
      memoryUsage.length > 0
        ? memoryUsage.reduce((sum, usage) => sum + usage, 0) / memoryUsage.length
        : 0

    return {
      avgRenderTime,
      maxRenderTime: Math.max(...renderTimes, 0),
      minRenderTime: Math.min(...renderTimes, 0),
      avgMemoryUsage,
      maxMemoryUsage: Math.max(...memoryUsage, 0),
      renderCount: renderTimes.length,
    }
  }

  /**
   * 获取所有组件的性能报告
   */
  getPerformanceReport() {
    const report: Record<string, any> = {}

    for (const componentName of this.renderTimes.keys()) {
      report[componentName] = this.getPerformanceStats(componentName)
    }

    return report
  }
}

/**
 * 组件优化组合式函数
 */
export function useComponentOptimizer<T = any>(
  config: {
    virtualScroll?: Partial<VirtualScrollConfig>
    pagination?: Partial<PaginationConfig>
    enableMonitoring?: boolean
  } = {}
) {
  const virtualScrollOptimizer = new VirtualScrollOptimizer<T>(config.virtualScroll)
  const paginationOptimizer = new PaginationOptimizer<T>(config.pagination)
  const performanceMonitor = config.enableMonitoring ? new ComponentPerformanceMonitor() : null

  return {
    // 虚拟滚动
    getVirtualData: virtualScrollOptimizer.getVirtualData.bind(virtualScrollOptimizer),
    handleScroll: virtualScrollOptimizer.handleScroll.bind(virtualScrollOptimizer),
    setContainerRef: virtualScrollOptimizer.setContainerRef.bind(virtualScrollOptimizer),
    scrollToIndex: virtualScrollOptimizer.scrollToIndex.bind(virtualScrollOptimizer),

    // 分页
    getPaginatedData: paginationOptimizer.getPaginatedData.bind(paginationOptimizer),
    goToPage: paginationOptimizer.goToPage.bind(paginationOptimizer),
    nextPage: paginationOptimizer.nextPage.bind(paginationOptimizer),
    prevPage: paginationOptimizer.prevPage.bind(paginationOptimizer),
    clearCache: paginationOptimizer.clearCache.bind(paginationOptimizer),

    // 性能监控
    recordRenderTime: performanceMonitor?.recordRenderTime.bind(performanceMonitor),
    recordMemoryUsage: performanceMonitor?.recordMemoryUsage.bind(performanceMonitor),
    getPerformanceStats: performanceMonitor?.getPerformanceStats.bind(performanceMonitor),
    getPerformanceReport: performanceMonitor?.getPerformanceReport.bind(performanceMonitor),
  }
}

/**
 * 延迟加载优化器
 */
export class LazyLoadOptimizer {
  private observer: IntersectionObserver | null = null
  private loadedElements = new Set<Element>()

  constructor(private options: IntersectionObserverInit = {}) {
    this.initObserver()
  }

  private initObserver() {
    if (typeof IntersectionObserver === 'undefined') {
      return
    }

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
            this.loadElement(entry.target)
            this.loadedElements.add(entry.target)
            this.observer?.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...this.options,
      }
    )
  }

  private loadElement(element: Element) {
    // 触发自定义加载事件
    element.dispatchEvent(new CustomEvent('lazy-load'))

    // 处理图片懒加载
    if (element.tagName === 'IMG') {
      const img = element as HTMLImageElement
      const dataSrc = img.dataset.src
      if (dataSrc) {
        img.src = dataSrc
        img.removeAttribute('data-src')
      }
    }
  }

  /**
   * 观察元素
   */
  observe(element: Element) {
    if (this.observer) {
      this.observer.observe(element)
    }
  }

  /**
   * 停止观察元素
   */
  unobserve(element: Element) {
    if (this.observer) {
      this.observer.unobserve(element)
    }
  }

  /**
   * 销毁观察器
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.loadedElements.clear()
  }
}

/**
 * 延迟加载组合式函数
 */
export function useLazyLoad(options?: IntersectionObserverInit) {
  const optimizer = new LazyLoadOptimizer(options)

  return {
    observe: optimizer.observe.bind(optimizer),
    unobserve: optimizer.unobserve.bind(optimizer),
    destroy: optimizer.destroy.bind(optimizer),
  }
}
