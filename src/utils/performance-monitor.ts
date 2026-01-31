/**
 * 性能监控工具
 * 监控应用性能指标和资源使用情况
 */

import { ref, onMounted, onUnmounted } from 'vue'

interface PerformanceMetrics {
  memory: {
    used: number
    total: number
    percentage: number
  }
  timing: {
    fcp: number | null
    lcp: number | null
    fid: number | null
    cls: number | null
  }
}

export function usePerformanceMonitor() {
  const metrics = ref<PerformanceMetrics>({
    memory: { used: 0, total: 0, percentage: 0 },
    timing: { fcp: null, lcp: null, fid: null, cls: null },
  })

  // 监控内存使用
  const updateMemoryUsage = () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      metrics.value.memory = {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100),
      }
    }
  }

  // 获取性能评分
  const getPerformanceScore = () => {
    const { memory } = metrics.value
    let score = 100

    if (memory.percentage > 80) score -= 40
    else if (memory.percentage > 60) score -= 20
    else if (memory.percentage > 40) score -= 10

    return Math.max(0, score)
  }

  onMounted(() => {
    updateMemoryUsage()
    setInterval(updateMemoryUsage, 5000)
  })

  return {
    metrics,
    getPerformanceScore,
    updateMemoryUsage,
  }
}

// 性能警告系统
export function usePerformanceWarnings() {
  const warnings = ref<string[]>([])

  const addWarning = (message: string) => {
    warnings.value.push(message)
    setTimeout(() => {
      const index = warnings.value.indexOf(message)
      if (index > -1) {
        warnings.value.splice(index, 1)
      }
    }, 5000)
  }

  return {
    warnings,
    addWarning,
  }
}
