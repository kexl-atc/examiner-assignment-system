/**
 * 🚀 v6.1.3优化: 统一错误处理工具
 * 提供统一的错误处理、错误消息显示和错误日志记录
 */

import { ElMessage, ElNotification } from 'element-plus'

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  BUSINESS = 'BUSINESS_ERROR',
  PERMISSION = 'PERMISSION_ERROR',
  SERVER = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * 错误级别枚举
 */
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * 统一错误接口
 */
export interface UnifiedError {
  type: ErrorType
  level: ErrorLevel
  message: string
  code?: string
  details?: any
  timestamp: string
  stack?: string
}

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  showMessage?: boolean // 是否显示消息提示
  showNotification?: boolean // 是否显示通知
  logError?: boolean // 是否记录日志
  duration?: number // 消息显示时长（毫秒）
  title?: string // 通知标题
}

/**
 * 错误处理器类
 */
class ErrorHandler {
  /**
   * 处理错误
   */
  static handle(error: any, options: ErrorHandlerOptions = {}): UnifiedError {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:handle',message:'ErrorHandler.handle called',data:{errorType:error?.constructor?.name,hasOptions:!!options},timestamp:Date.now(),sessionId:'debug-session',runId:'test-run-1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const {
      showMessage = true,
      showNotification = false,
      logError = true,
      duration = 3000,
      title = '错误',
    } = options

    // 转换为统一错误格式
    const unifiedError = this.normalizeError(error)
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:handle',message:'Error normalized',data:{errorType:unifiedError.type,errorLevel:unifiedError.level,message:unifiedError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'test-run-1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // 显示错误消息
    if (showMessage) {
      this.showErrorMessage(unifiedError, duration)
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:handle',message:'Error message displayed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'test-run-1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    // 显示通知
    if (showNotification) {
      this.showErrorNotification(unifiedError, title, duration)
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:handle',message:'Error notification displayed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'test-run-1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    // 记录日志
    if (logError) {
      this.logError(unifiedError)
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'errorHandler.ts:handle',message:'Error logged',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'test-run-1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    return unifiedError
  }

  /**
   * 标准化错误
   */
  static normalizeError(error: any): UnifiedError {
    // 如果已经是统一错误格式，直接返回
    if (error && typeof error === 'object' && 'type' in error && 'level' in error) {
      return error as UnifiedError
    }

    // API错误（来自api-service）
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as any
      return {
        type: this.getErrorTypeFromStatus(apiError.status),
        level: apiError.status >= 500 ? ErrorLevel.CRITICAL : ErrorLevel.ERROR,
        message: apiError.message || '请求失败',
        code: apiError.code,
        details: apiError.context || apiError.details,
        timestamp: apiError.timestamp || new Date().toISOString(),
        stack: apiError.stack,
      }
    }

    // Error对象
    if (error instanceof Error) {
      return {
        type: ErrorType.UNKNOWN,
        level: ErrorLevel.ERROR,
        message: error.message || '未知错误',
        code: error.name,
        details: { name: error.name },
        timestamp: new Date().toISOString(),
        stack: error.stack,
      }
    }

    // 字符串错误
    if (typeof error === 'string') {
      return {
        type: ErrorType.UNKNOWN,
        level: ErrorLevel.ERROR,
        message: error,
        timestamp: new Date().toISOString(),
      }
    }

    // 其他类型
    return {
      type: ErrorType.UNKNOWN,
      level: ErrorLevel.ERROR,
      message: '未知错误',
      details: error,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * 根据HTTP状态码获取错误类型
   */
  private static getErrorTypeFromStatus(status?: number): ErrorType {
    if (!status) return ErrorType.NETWORK

    if (status >= 500) return ErrorType.SERVER
    if (status === 401 || status === 403) return ErrorType.PERMISSION
    if (status === 400 || status === 422) return ErrorType.VALIDATION
    if (status === 408 || status === 504) return ErrorType.TIMEOUT

    return ErrorType.BUSINESS
  }

  /**
   * 显示错误消息
   */
  private static showErrorMessage(error: UnifiedError, duration: number): void {
    const message = this.getUserFriendlyMessage(error)
    ElMessage({
      message,
      type: this.getElMessageType(error.level),
      duration,
      showClose: true,
    })
  }

  /**
   * 显示错误通知
   */
  private static showErrorNotification(
    error: UnifiedError,
    title: string,
    duration: number
  ): void {
    const message = this.getUserFriendlyMessage(error)
    ElNotification({
      title,
      message,
      type: this.getElNotificationType(error.level),
      duration,
      position: 'top-right',
    })
  }

  /**
   * 获取用户友好的错误消息
   */
  private static getUserFriendlyMessage(error: UnifiedError): string {
    // 优先使用错误消息
    if (error.message) {
      return error.message
    }

    // 根据错误类型生成默认消息
    const defaultMessages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
      [ErrorType.TIMEOUT]: '请求超时，请稍后重试',
      [ErrorType.VALIDATION]: '数据验证失败，请检查输入',
      [ErrorType.BUSINESS]: '操作失败，请稍后重试',
      [ErrorType.PERMISSION]: '权限不足，无法执行此操作',
      [ErrorType.SERVER]: '服务器错误，请联系管理员',
      [ErrorType.UNKNOWN]: '发生未知错误',
    }

    return defaultMessages[error.type] || '操作失败'
  }

  /**
   * 获取ElMessage类型
   */
  private static getElMessageType(level: ErrorLevel): 'success' | 'warning' | 'error' | 'info' {
    switch (level) {
      case ErrorLevel.INFO:
        return 'info'
      case ErrorLevel.WARNING:
        return 'warning'
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
        return 'error'
      default:
        return 'error'
    }
  }

  /**
   * 获取ElNotification类型
   */
  private static getElNotificationType(
    level: ErrorLevel
  ): 'success' | 'warning' | 'error' | 'info' {
    return this.getElMessageType(level)
  }

  /**
   * 记录错误日志
   */
  private static logError(error: UnifiedError): void {
    const logMessage = `[${error.type}] ${error.message}`
    const logData = {
      type: error.type,
      level: error.level,
      code: error.code,
      details: error.details,
      timestamp: error.timestamp,
      stack: error.stack,
    }

    // 根据错误级别选择日志方法
    switch (error.level) {
      case ErrorLevel.CRITICAL:
        console.error('🚨 [CRITICAL]', logMessage, logData)
        break
      case ErrorLevel.ERROR:
        console.error('❌ [ERROR]', logMessage, logData)
        break
      case ErrorLevel.WARNING:
        console.warn('⚠️ [WARNING]', logMessage, logData)
        break
      case ErrorLevel.INFO:
        console.info('ℹ️ [INFO]', logMessage, logData)
        break
    }
  }

  /**
   * 处理API错误（便捷方法）
   */
  static handleAPIError(error: any, options?: ErrorHandlerOptions): UnifiedError {
    return this.handle(error, {
      showMessage: true,
      showNotification: false,
      logError: true,
      ...options,
    })
  }

  /**
   * 处理网络错误（便捷方法）
   */
  static handleNetworkError(error: any, options?: ErrorHandlerOptions): UnifiedError {
    return this.handle(error, {
      showMessage: true,
      showNotification: false,
      logError: true,
      ...options,
    })
  }

  /**
   * 静默处理错误（不显示消息）
   */
  static handleSilently(error: any): UnifiedError {
    return this.handle(error, {
      showMessage: false,
      showNotification: false,
      logError: true,
    })
  }
}

export default ErrorHandler

