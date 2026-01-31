/**
 * 🚀 v6.1.3优化: 增强性能监控系统
 * 提供全面的性能监控、错误追踪和告警功能
 */

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  category: 'timing' | 'memory' | 'network' | 'render'
}

export interface ErrorReport {
  id: string
  type: string
  message: string
  stack?: string
  timestamp: number
  url: string
  userAgent: string
  context?: any
}

export interface AlertRule {
  metric: string
  threshold: number
  operator: 'gt' | 'lt' | 'eq'
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
}

/**
 * 增强性能监控器
 */
class EnhancedPerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private errors: ErrorReport[] = []
  private alerts: AlertRule[] = []
  private maxMetricsSize = 1000
  private maxErrorsSize = 500
  private reportInterval: number | null = null
  // 🚀 v6.1.3优化: 告警冷却机制，避免重复告警
  private lastAlertTime: Map<string, number> = new Map()
  private alertCooldown = 60000 // 1分钟冷却时间

  constructor() {
    this.initializeMonitoring()
  }

  /**
   * 初始化监控
   */
  private initializeMonitoring(): void {
    // 监控页面加载性能
    if (typeof window !== 'undefined' && window.performance) {
      this.monitorPageLoad()
      this.monitorMemory()
      this.monitorNetwork()
    }

    // 监控错误
    this.monitorErrors()

    // 定期报告
    this.startReporting()
  }

  /**
   * 监控页面加载性能
   */
  private monitorPageLoad(): void {
    if (typeof window === 'undefined' || !window.performance) return

    window.addEventListener('load', () => {
      const timing = performance.timing
      const navigation = performance.navigation as any

      const metrics: PerformanceMetric[] = [
        {
          name: 'DNS查询时间',
          value: timing.domainLookupEnd - timing.domainLookupStart,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'timing',
        },
        {
          name: 'TCP连接时间',
          value: timing.connectEnd - timing.connectStart,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'timing',
        },
        {
          name: '请求响应时间',
          value: timing.responseEnd - timing.requestStart,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'timing',
        },
        {
          name: 'DOM解析时间',
          value: timing.domInteractive - timing.domLoading,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'timing',
        },
        {
          name: '页面加载时间',
          value: timing.loadEventEnd - timing.navigationStart,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'timing',
        },
      ]

      metrics.forEach(metric => this.recordMetric(metric))
    })
  }

  /**
   * 监控内存使用
   */
  private monitorMemory(): void {
    if (typeof window === 'undefined' || !(performance as any).memory) return

    const checkMemory = () => {
      const memory = (performance as any).memory
      const metric: PerformanceMetric = {
        name: '内存使用',
        value: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        unit: 'MB',
        timestamp: Date.now(),
        category: 'memory',
      }

      this.recordMetric(metric)

      // 检查内存告警（使用更智能的阈值）
      const memoryPercentage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      
      // 🚀 v6.1.3优化: 根据实际内存大小调整告警阈值
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024)
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
      
      // 对于极小内存系统（<50MB），不告警或使用非常宽松的阈值
      // 这些系统通常是测试环境或低配置设备，高使用率是正常的
      if (totalMB < 50) {
        // 极小内存系统，只在超过98%且绝对内存>40MB时才告警
        if (memoryPercentage > 98 && usedMB > 40) {
          const message = `内存使用率极高: ${memoryPercentage.toFixed(1)}% (${usedMB}MB/${totalMB}MB)`
          this.triggerAlert('memory', memoryPercentage, 'gt', 'error', message, true)
        }
        return // 小内存系统，不进行常规告警
      }
      
      // 动态阈值：小内存系统更宽松，大内存系统更严格
      let threshold = 80
      if (totalMB > 500) {
        threshold = 75 // 大内存系统，75%就告警
      } else if (totalMB < 200) {
        threshold = 95 // 中等内存系统，95%才告警
      }
      
      // 同时检查绝对内存使用量
      if (memoryPercentage > threshold || usedMB > 400) {
        const message = usedMB > 400 
          ? `内存使用量较高: ${usedMB}MB (使用率: ${memoryPercentage.toFixed(1)}%)`
          : `内存使用率超过${threshold}%: ${memoryPercentage.toFixed(1)}% (${usedMB}MB/${totalMB}MB)`
        
        const severity = memoryPercentage > 95 || usedMB > 500 ? 'error' : 'warning'
        this.triggerAlert('memory', memoryPercentage, 'gt', severity, message)
      }
    }

    // 每5秒检查一次
    setInterval(checkMemory, 5000)
  }

  /**
   * 监控网络性能
   */
  private monitorNetwork(): void {
    const connection = typeof window === 'undefined' ? undefined : (navigator as any).connection
    if (!connection) return

    const metric: PerformanceMetric = {
      name: '网络速度',
      value: connection.downlink || 0,
      unit: 'Mbps',
      timestamp: Date.now(),
      category: 'network',
    }

    this.recordMetric(metric)
  }

  /**
   * 监控错误
   */
  private monitorErrors(): void {
    if (typeof window === 'undefined') return

    // 全局错误监听
    window.addEventListener('error', (event) => {
      this.reportError({
        type: 'JavaScript Error',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        userAgent: navigator.userAgent,
        context: {
          lineno: event.lineno,
          colno: event.colno,
        },
      })
    })

    // Promise错误监听
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        type: 'Unhandled Promise Rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        context: {
          reason: event.reason,
        },
      })
    })
  }

  /**
   * 记录性能指标
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)

    // 限制大小
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics.shift()
    }

    // 检查告警规则
    this.checkAlerts(metric)
  }

  /**
   * 报告错误
   */
  reportError(error: Omit<ErrorReport, 'id' | 'timestamp'>): void {
    const report: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...error,
    }

    this.errors.push(report)

    // 限制大小
    if (this.errors.length > this.maxErrorsSize) {
      this.errors.shift()
    }

    // 触发错误告警
    this.triggerAlert('error', 1, 'gt', 'error', `错误: ${error.message}`)
  }

  /**
   * 添加告警规则
   */
  addAlertRule(rule: AlertRule): void {
    this.alerts.push(rule)
  }

  /**
   * 检查告警
   */
  private checkAlerts(metric: PerformanceMetric): void {
    for (const alert of this.alerts) {
      if (alert.metric === metric.name) {
        const shouldAlert = this.evaluateAlert(metric.value, alert.threshold, alert.operator)
        if (shouldAlert) {
          this.triggerAlert(alert.metric, metric.value, alert.operator, alert.severity, alert.message)
        }
      }
    }
  }

  /**
   * 评估告警条件
   */
  private evaluateAlert(value: number, threshold: number, operator: AlertRule['operator']): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold
      case 'lt':
        return value < threshold
      case 'eq':
        return value === threshold
      default:
        return false
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(
    metric: string,
    value: number,
    operator: AlertRule['operator'],
    severity: AlertRule['severity'],
    message: string,
    force: boolean = false // 强制触发，忽略冷却时间
  ): void {
    // 🚀 v6.1.3优化: 告警冷却机制，避免重复告警
    const alertKey = `${metric}_${severity}`
    const now = Date.now()
    const lastTime = this.lastAlertTime.get(alertKey) || 0
    
    // 检查冷却时间（除非强制触发）
    if (!force && now - lastTime < this.alertCooldown) {
      return // 在冷却时间内，不触发告警
    }
    
    // 更新最后告警时间
    this.lastAlertTime.set(alertKey, now)
    
    // 清理过期的冷却记录（避免内存泄漏）
    if (this.lastAlertTime.size > 100) {
      const cutoff = now - this.alertCooldown * 10 // 保留最近10个冷却周期的记录
      for (const [key, time] of this.lastAlertTime.entries()) {
        if (time < cutoff) {
          this.lastAlertTime.delete(key)
        }
      }
    }

    const alert = {
      metric,
      value,
      operator,
      severity,
      message,
      timestamp: now,
    }

    // 根据严重程度处理告警
    // 🚀 v6.1.3优化: 减少控制台输出，只在开发环境且严重告警时输出
    if (process.env.NODE_ENV === 'development') {
      switch (severity) {
        case 'critical':
        case 'error':
          console.error('🚨 [告警]', alert)
          break
        case 'warning':
          // 警告级别在开发环境也输出，但已通过冷却机制限制频率
          console.warn('⚠️ [告警]', alert)
          break
        default:
          // info级别不输出到控制台，避免噪音
          break
      }
    }

    // 可以在这里发送告警到服务器
    // this.sendAlertToServer(alert)
  }

  /**
   * 获取性能指标
   */
  getMetrics(category?: PerformanceMetric['category']): PerformanceMetric[] {
    if (category) {
      return this.metrics.filter(m => m.category === category)
    }
    return [...this.metrics]
  }

  /**
   * 获取错误报告
   */
  getErrors(): ErrorReport[] {
    return [...this.errors]
  }

  /**
   * 获取性能统计
   */
  getStatistics(): {
    totalMetrics: number
    totalErrors: number
    errorRate: number
    averageLoadTime: number
  } {
    const timingMetrics = this.metrics.filter(m => m.category === 'timing')
    const loadTimeMetrics = timingMetrics.filter(m => m.name === '页面加载时间')

    return {
      totalMetrics: this.metrics.length,
      totalErrors: this.errors.length,
      errorRate: this.errors.length / Math.max(this.metrics.length, 1),
      averageLoadTime:
        loadTimeMetrics.length > 0
          ? loadTimeMetrics.reduce((sum, m) => sum + m.value, 0) / loadTimeMetrics.length
          : 0,
    }
  }

  /**
   * 开始定期报告
   */
  private startReporting(): void {
    if (this.reportInterval) return

    // 每30秒报告一次
    this.reportInterval = window.setInterval(() => {
      const stats = this.getStatistics()
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 [性能监控]', stats)
      }
    }, 30000)
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval)
      this.reportInterval = null
    }
  }

  /**
   * 清空数据
   */
  clear(): void {
    this.metrics = []
    this.errors = []
  }
}

// 导出单例实例
export const performanceMonitor = new EnhancedPerformanceMonitor()

// 导出便捷方法
export const recordMetric = (metric: PerformanceMetric) => performanceMonitor.recordMetric(metric)
export const reportError = (error: Omit<ErrorReport, 'id' | 'timestamp'>) =>
  performanceMonitor.reportError(error)
export const addAlertRule = (rule: AlertRule) => performanceMonitor.addAlertRule(rule)
export const getMetrics = (category?: PerformanceMetric['category']) =>
  performanceMonitor.getMetrics(category)
export const getErrors = () => performanceMonitor.getErrors()
export const getStatistics = () => performanceMonitor.getStatistics()

