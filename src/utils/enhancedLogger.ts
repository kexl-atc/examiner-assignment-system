/**
 * 🚀 v6.1.3优化: 增强日志系统
 * 提供结构化日志、日志级别、日志过滤和日志聚合功能
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: number
  category?: string
  context?: any
  stack?: string
}

export interface LoggerConfig {
  minLevel: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteEndpoint?: string
  maxEntries: number
  categories?: string[]
}

/**
 * 增强日志器类
 */
class EnhancedLogger {
  private logs: LogEntry[] = []
  private config: LoggerConfig = {
    minLevel: LogLevel.INFO,
    enableConsole: true,
    enableRemote: false,
    maxEntries: 1000,
  }

  /**
   * 配置日志器
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, category?: string, context?: any, error?: Error): void {
    // 检查日志级别
    if (level < this.config.minLevel) {
      return
    }

    // 检查分类过滤
    if (this.config.categories && category && !this.config.categories.includes(category)) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      category,
      context,
      stack: error?.stack,
    }

    // 添加到日志列表
    this.logs.push(entry)

    // 限制大小
    if (this.logs.length > this.config.maxEntries) {
      this.logs.shift()
    }

    // 控制台输出
    if (this.config.enableConsole) {
      this.logToConsole(entry)
    }

    // 远程日志
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.logToRemote(entry)
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const prefix = this.getLevelPrefix(entry.level)
    const category = entry.category ? `[${entry.category}]` : ''
    const message = `${prefix} ${category} ${entry.message}`

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.context || '')
        break
      case LogLevel.INFO:
        console.info(message, entry.context || '')
        break
      case LogLevel.WARN:
        console.warn(message, entry.context || '')
        break
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.context || '', entry.stack || '')
        break
    }
  }

  /**
   * 发送到远程
   */
  private logToRemote(entry: LogEntry): void {
    if (!this.config.remoteEndpoint) return

    fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {
      // 静默失败，避免日志系统本身出错
    })
  }

  /**
   * 获取级别前缀
   */
  private getLevelPrefix(level: LogLevel): string {
    const prefixes = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.CRITICAL]: '🚨',
    }
    return prefixes[level] || '📝'
  }

  /**
   * 调试日志
   */
  debug(message: string, category?: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, category, context)
  }

  /**
   * 信息日志
   */
  info(message: string, category?: string, context?: any): void {
    this.log(LogLevel.INFO, message, category, context)
  }

  /**
   * 警告日志
   */
  warn(message: string, category?: string, context?: any): void {
    this.log(LogLevel.WARN, message, category, context)
  }

  /**
   * 错误日志
   */
  error(message: string, category?: string, context?: any, error?: Error): void {
    this.log(LogLevel.ERROR, message, category, context, error)
  }

  /**
   * 严重错误日志
   */
  critical(message: string, category?: string, context?: any, error?: Error): void {
    this.log(LogLevel.CRITICAL, message, category, context, error)
  }

  /**
   * 获取日志
   */
  getLogs(level?: LogLevel, category?: string, limit?: number): LogEntry[] {
    let filtered = [...this.logs]

    if (level !== undefined) {
      filtered = filtered.filter(log => log.level === level)
    }

    if (category) {
      filtered = filtered.filter(log => log.category === category)
    }

    filtered.reverse() // 最新的在前

    return limit ? filtered.slice(0, limit) : filtered
  }

  /**
   * 获取日志统计
   */
  getStatistics(): {
    total: number
    byLevel: Record<string, number>
    byCategory: Record<string, number>
  } {
    const byLevel: Record<string, number> = {}
    const byCategory: Record<string, number> = {}

    this.logs.forEach(log => {
      byLevel[LogLevel[log.level]] = (byLevel[LogLevel[log.level]] || 0) + 1
      if (log.category) {
        byCategory[log.category] = (byCategory[log.category] || 0) + 1
      }
    })

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
    }
  }

  /**
   * 清空日志
   */
  clear(): void {
    this.logs = []
  }

  /**
   * 导出日志
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

// 导出单例实例
export const logger = new EnhancedLogger()

// 导出便捷方法
export const debug = (message: string, category?: string, context?: any) =>
  logger.debug(message, category, context)
export const info = (message: string, category?: string, context?: any) =>
  logger.info(message, category, context)
export const warn = (message: string, category?: string, context?: any) =>
  logger.warn(message, category, context)
export const error = (message: string, category?: string, context?: any, err?: Error) =>
  logger.error(message, category, context, err)
export const critical = (message: string, category?: string, context?: any, err?: Error) =>
  logger.critical(message, category, context, err)

