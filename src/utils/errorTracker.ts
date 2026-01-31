/**
 * 🚀 v6.1.3优化: 错误追踪系统
 * 提供全面的错误追踪、分析和报告功能
 */

import { ErrorReport } from './enhancedPerformanceMonitor'

export interface ErrorContext {
  url: string
  userAgent: string
  timestamp: number
  userId?: string
  sessionId?: string
  [key: string]: any
}

export interface ErrorStatistics {
  total: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
  recent: ErrorReport[]
  trends: Array<{ date: string; count: number }>
}

/**
 * 错误追踪器类
 */
class ErrorTracker {
  private errors: ErrorReport[] = []
  private maxErrorsSize = 1000
  private errorHandlers: Array<(error: ErrorReport) => void> = []

  /**
   * 追踪错误
   */
  track(error: Error | string, context?: Partial<ErrorContext>): string {
    const errorReport: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: error instanceof Error ? error.constructor.name : 'String Error',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: Date.now(),
      url: context?.url || (typeof window !== 'undefined' ? window.location.href : ''),
      userAgent: context?.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      context: {
        ...context,
        sessionId: context?.sessionId || this.getSessionId(),
      },
    }

    this.errors.push(errorReport)

    // 限制大小
    if (this.errors.length > this.maxErrorsSize) {
      this.errors.shift()
    }

    // 调用错误处理器
    this.errorHandlers.forEach(handler => {
      try {
        handler(errorReport)
      } catch (e) {
        console.error('错误处理器执行失败:', e)
      }
    })

    // 记录到性能监控
    if (typeof window !== 'undefined') {
      const { reportError } = require('./enhancedPerformanceMonitor')
      reportError(errorReport)
    }

    return errorReport.id
  }

  /**
   * 获取会话ID
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return 'unknown'

    let sessionId = sessionStorage.getItem('error_tracker_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('error_tracker_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * 注册错误处理器
   */
  onError(handler: (error: ErrorReport) => void): () => void {
    this.errorHandlers.push(handler)

    // 返回取消注册函数
    return () => {
      const index = this.errorHandlers.indexOf(handler)
      if (index > -1) {
        this.errorHandlers.splice(index, 1)
      }
    }
  }

  /**
   * 获取错误统计
   */
  getStatistics(): ErrorStatistics {
    const byType: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    const recent: ErrorReport[] = []
    const trends: Array<{ date: string; count: number }> = []

    // 统计错误类型和严重程度
    this.errors.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1
      // 根据错误类型判断严重程度
      const severity = this.getSeverity(error)
      bySeverity[severity] = (bySeverity[severity] || 0) + 1
    })

    // 获取最近24小时的错误
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    recent.push(...this.errors.filter(e => e.timestamp > oneDayAgo))

    // 计算趋势（按小时）
    const now = Date.now()
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - i * 60 * 60 * 1000
      const hourEnd = hourStart + 60 * 60 * 1000
      const count = this.errors.filter(
        e => e.timestamp >= hourStart && e.timestamp < hourEnd
      ).length

      trends.push({
        date: new Date(hourStart).toISOString(),
        count,
      })
    }

    return {
      total: this.errors.length,
      byType,
      bySeverity,
      recent: recent.slice(-50), // 最近50个错误
      trends,
    }
  }

  /**
   * 获取严重程度
   */
  private getSeverity(error: ErrorReport): string {
    if (error.type.includes('Network') || error.type.includes('Timeout')) {
      return 'warning'
    }
    if (error.type.includes('Error') || error.stack) {
      return 'error'
    }
    return 'info'
  }

  /**
   * 获取错误列表
   */
  getErrors(limit?: number): ErrorReport[] {
    const errors = [...this.errors].reverse() // 最新的在前
    return limit ? errors.slice(0, limit) : errors
  }

  /**
   * 根据ID获取错误
   */
  getErrorById(id: string): ErrorReport | undefined {
    return this.errors.find(e => e.id === id)
  }

  /**
   * 清空错误记录
   */
  clear(): void {
    this.errors = []
  }

  /**
   * 导出错误数据
   */
  export(): string {
    return JSON.stringify(this.errors, null, 2)
  }
}

// 导出单例实例
export const errorTracker = new ErrorTracker()

// 导出便捷方法
export const trackError = (error: Error | string, context?: Partial<ErrorContext>) =>
  errorTracker.track(error, context)
export const getErrorStatistics = () => errorTracker.getStatistics()
export const getErrors = (limit?: number) => errorTracker.getErrors(limit)
export const onError = (handler: (error: ErrorReport) => void) => errorTracker.onError(handler)

