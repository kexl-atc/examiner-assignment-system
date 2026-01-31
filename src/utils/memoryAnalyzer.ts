/**
 * 🚀 v6.1.3优化: 内存分析器
 * 分析内存使用情况，检测潜在的内存泄漏和优化机会
 */

export interface MemoryAnalysis {
  currentUsage: {
    used: number // MB
    total: number // MB
    percentage: number
  }
  trend: 'increasing' | 'stable' | 'decreasing'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
  potentialLeaks: string[]
}

/**
 * 内存分析器类
 */
class MemoryAnalyzer {
  private memoryHistory: Array<{ timestamp: number; used: number; total: number }> = []
  private maxHistorySize = 100
  private analysisInterval: number | null = null

  /**
   * 获取当前内存使用情况
   */
  getCurrentMemory(): { used: number; total: number; percentage: number } | null {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return null
    }

    const memory = (performance as any).memory
    const used = Math.round(memory.usedJSHeapSize / 1024 / 1024) // MB
    const total = Math.round(memory.totalJSHeapSize / 1024 / 1024) // MB
    const percentage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100

    return { used, total, percentage }
  }

  /**
   * 记录内存快照
   */
  recordSnapshot(): void {
    const memory = this.getCurrentMemory()
    if (!memory) return

    this.memoryHistory.push({
      timestamp: Date.now(),
      used: memory.used,
      total: memory.total,
    })

    // 限制历史记录大小
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift()
    }
  }

  /**
   * 分析内存趋势
   */
  analyzeTrend(): 'increasing' | 'stable' | 'decreasing' {
    if (this.memoryHistory.length < 10) {
      return 'stable'
    }

    const recent = this.memoryHistory.slice(-10)
    const older = this.memoryHistory.slice(-20, -10)

    if (older.length === 0) {
      return 'stable'
    }

    const recentAvg = recent.reduce((sum, m) => sum + m.used, 0) / recent.length
    const olderAvg = older.reduce((sum, m) => sum + m.used, 0) / older.length

    const diff = recentAvg - olderAvg
    const threshold = olderAvg * 0.1 // 10%变化阈值

    if (diff > threshold) {
      return 'increasing'
    } else if (diff < -threshold) {
      return 'decreasing'
    }

    return 'stable'
  }

  /**
   * 检测潜在内存泄漏
   */
  detectPotentialLeaks(): string[] {
    const leaks: string[] = []

    // 检查内存是否持续增长
    if (this.memoryHistory.length >= 20) {
      const trend = this.analyzeTrend()
      if (trend === 'increasing') {
        const growth = this.calculateGrowthRate()
        if (growth > 5) {
          // 每分钟增长超过5MB
          leaks.push('检测到内存持续增长，可能存在内存泄漏')
        }
      }
    }

    // 检查内存使用率是否过高
    const current = this.getCurrentMemory()
    if (current && current.percentage > 90) {
      leaks.push('内存使用率超过90%，可能存在内存泄漏或需要优化')
    }

    // 检查内存是否接近上限
    if (current && current.total > 0) {
      const available = current.total - current.used
      if (available < 50) {
        // 可用内存少于50MB
        leaks.push('可用内存不足50MB，系统可能面临内存压力')
      }
    }

    return leaks
  }

  /**
   * 计算内存增长率（MB/分钟）
   */
  private calculateGrowthRate(): number {
    if (this.memoryHistory.length < 2) return 0

    const first = this.memoryHistory[0]
    const last = this.memoryHistory[this.memoryHistory.length - 1]

    const timeDiff = (last.timestamp - first.timestamp) / 1000 / 60 // 分钟
    const memoryDiff = last.used - first.used // MB

    return timeDiff > 0 ? memoryDiff / timeDiff : 0
  }

  /**
   * 评估风险级别
   */
  assessRiskLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const current = this.getCurrentMemory()
    if (!current) return 'low'

    const leaks = this.detectPotentialLeaks()
    const trend = this.analyzeTrend()

    // Critical: 使用率>95% 或 检测到泄漏且持续增长
    if (current.percentage > 95 || (leaks.length > 0 && trend === 'increasing' && current.percentage > 85)) {
      return 'critical'
    }

    // High: 使用率>85% 或 检测到泄漏
    if (current.percentage > 85 || leaks.length > 0) {
      return 'high'
    }

    // Medium: 使用率>70% 或 持续增长
    if (current.percentage > 70 || trend === 'increasing') {
      return 'medium'
    }

    return 'low'
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(): string[] {
    const recommendations: string[] = []
    const current = this.getCurrentMemory()
    const trend = this.analyzeTrend()
    const leaks = this.detectPotentialLeaks()

    if (!current) {
      return ['无法获取内存信息']
    }

    // 基于使用率的建议
    if (current.percentage > 90) {
      recommendations.push('内存使用率极高，建议立即检查内存泄漏')
      recommendations.push('考虑清理不必要的缓存和未使用的对象')
      recommendations.push('检查是否有大量DOM节点未释放')
    } else if (current.percentage > 80) {
      recommendations.push('内存使用率较高，建议监控内存使用趋势')
      recommendations.push('检查是否有未清理的事件监听器')
      recommendations.push('考虑使用虚拟滚动优化大列表渲染')
    }

    // 基于趋势的建议
    if (trend === 'increasing') {
      recommendations.push('内存持续增长，建议检查是否有内存泄漏')
      recommendations.push('使用Chrome DevTools的Memory Profiler进行分析')
      recommendations.push('检查定时器、事件监听器、闭包等是否正确清理')
    }

    // 基于泄漏检测的建议
    if (leaks.length > 0) {
      recommendations.push('检测到潜在内存泄漏，建议进行详细分析')
      recommendations.push('检查组件卸载时是否正确清理资源')
      recommendations.push('检查全局变量和缓存是否无限增长')
    }

    // 通用优化建议
    if (current.percentage > 70) {
      recommendations.push('考虑启用代码分割，减少初始加载内存')
      recommendations.push('检查图片和资源是否过大，考虑压缩')
      recommendations.push('使用WeakMap/WeakSet替代Map/Set（如果适用）')
    }

    return recommendations
  }

  /**
   * 完整分析
   */
  analyze(): MemoryAnalysis | null {
    const current = this.getCurrentMemory()
    if (!current) return null

    const trend = this.analyzeTrend()
    const riskLevel = this.assessRiskLevel()
    const potentialLeaks = this.detectPotentialLeaks()
    const recommendations = this.generateRecommendations()

    return {
      currentUsage: current,
      trend,
      riskLevel,
      recommendations,
      potentialLeaks,
    }
  }

  /**
   * 开始定期分析
   */
  startAnalysis(interval: number = 30000): void {
    if (this.analysisInterval) {
      return // 已经启动
    }

    // 记录初始快照
    this.recordSnapshot()

    // 定期记录和分析
    this.analysisInterval = window.setInterval(() => {
      this.recordSnapshot()
    }, interval)
  }

  /**
   * 停止分析
   */
  stopAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
      this.analysisInterval = null
    }
  }

  /**
   * 获取历史数据
   */
  getHistory(): typeof this.memoryHistory {
    return [...this.memoryHistory]
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.memoryHistory = []
  }
}

// 导出单例实例
export const memoryAnalyzer = new MemoryAnalyzer()

// 导出便捷方法
export const analyzeMemory = () => memoryAnalyzer.analyze()
export const getCurrentMemory = () => memoryAnalyzer.getCurrentMemory()
export const startMemoryAnalysis = (interval?: number) => memoryAnalyzer.startAnalysis(interval)

