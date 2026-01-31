/**
 * 生产环境安全的日志工具
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = string

interface LogEntry {
  level: LogLevel
  message: string
  context?: LogContext
  timestamp: Date
  data?: any
}

class Logger {
  private isDev: boolean
  private logHistory: LogEntry[] = []
  private maxHistorySize: number = 1000

  constructor() {
    this.isDev = import.meta.env.DEV
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? `[${context}]` : ''
    return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}`
  }

  /**
   * 记录日志到内存（用于调试）
   */
  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry)
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift()
    }
  }

  /**
   * 开发环境日志
   */
  private devLog(level: LogLevel, message: string, context?: LogContext, data?: any): void {
    const formattedMessage = this.formatMessage(level, message, context)
    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      data,
    }

    this.addToHistory(logEntry)

    // 开发环境输出到控制台
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data)
        break
      case 'info':
        console.info(formattedMessage, data)
        break
      case 'warn':
        console.warn(formattedMessage, data)
        break
      case 'error':
        console.error(formattedMessage, data)
        break
    }
  }

  /**
   * 生产环境日志（仅记录错误和警告）
   */
  private prodLog(level: LogLevel, message: string, context?: LogContext, data?: any): void {
    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      data,
    }

    this.addToHistory(logEntry)

    // 生产环境只输出错误和警告
    if (level === 'error') {
      console.error(this.formatMessage(level, message, context))
    } else if (level === 'warn') {
      console.warn(this.formatMessage(level, message, context))
    }
    // debug和info在生产环境静默
  }

  /**
   * 通用日志方法
   */
  private log(level: LogLevel, message: string, context?: LogContext, data?: any): void {
    if (this.isDev) {
      this.devLog(level, message, context, data)
    } else {
      this.prodLog(level, message, context, data)
    }
  }

  // 公共方法
  debug(message: string, context?: LogContext, data?: any): void {
    this.log('debug', message, context, data)
  }

  info(message: string, context?: LogContext, data?: any): void {
    this.log('info', message, context, data)
  }

  warn(message: string, context?: LogContext, data?: any): void {
    this.log('warn', message, context, data)
  }

  error(message: string, context?: LogContext, data?: any): void {
    this.log('error', message, context, data)
  }

  /**
   * 获取日志历史（用于调试）
   */
  getHistory(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logHistory.filter(entry => entry.level === level)
    }
    return [...this.logHistory]
  }

  /**
   * 清空日志历史
   */
  clearHistory(): void {
    this.logHistory = []
  }

  /**
   * 导出日志（用于错误报告）
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2)
  }
}

// 创建全局日志实例
export const logger = new Logger()

// 向后兼容的全局方法
export const log = {
  debug: (message: string, context?: LogContext, data?: any) =>
    logger.debug(message, context, data),
  info: (message: string, context?: LogContext, data?: any) => logger.info(message, context, data),
  warn: (message: string, context?: LogContext, data?: any) => logger.warn(message, context, data),
  error: (message: string, context?: LogContext, data?: any) =>
    logger.error(message, context, data),
}

export default logger
