/**
 * 日志服务
 * 提供日志获取、缓存和实时更新功能
 */

export interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  level?: string
  thread?: string
  logger?: string
}

export interface LogResponse {
  success: boolean
  logs: LogEntry[]
  total: number
  timestamp: string
  error?: string
}

export interface LogInfo {
  success: boolean
  logFile: string
  exists: boolean
  size?: number
  lastModified?: string
  error?: string
}

class LogService {
  private baseUrl: string = ''
  private initialized: boolean = false
  private cache: LogEntry[] = []
  private lastFetchTime: number = 0
  private readonly CACHE_TTL = 5000 // 5秒缓存

  /**
   * 初始化服务
   */
  private async initializeBaseUrl(): Promise<void> {
    if (this.initialized) return

    // @ts-ignore - electronAPI是在Electron环境中动态注入的
    const electronAPI = window.electronAPI
    if (electronAPI && electronAPI.isElectron) {
      return new Promise(resolve => {
        // 先尝试直接获取
        electronAPI.getBackendPort().then((port: number) => {
           if (port > 0) {
              this.baseUrl = `http://127.0.0.1:${port}`
              this.initialized = true
              resolve()
              return
           }
        }).catch(() => {})

        // 监听就绪事件作为后备
        electronAPI.onBackendReady(async () => {
          try {
            const port = await electronAPI.getBackendPort()
            this.baseUrl = `http://127.0.0.1:${port}`
          } catch (error) {
            console.warn('Failed to get backend port, using relative path:', error)
            // 降级方案：使用相对路径
            this.baseUrl = ''
          }
          this.initialized = true
          resolve()
        })
      })
    } else {
      // 在浏览器环境下，使用空字符串作为baseUrl
      // 因为Vite已经配置了/api的代理
      this.baseUrl = ''
      this.initialized = true
    }
  }

  /**
   * 确保服务已初始化
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeBaseUrl()
    }
  }

  /**
   * 获取最新日志
   * @param limit 日志条目数量限制，默认100
   * @param level 日志级别过滤，可选值：ALL, INFO, WARN, ERROR
   * @param useCache 是否使用缓存，默认true
   */
  async getRecentLogs(
    limit: number = 100,
    level: string = 'ALL',
    useCache: boolean = true
  ): Promise<LogEntry[]> {
    await this.ensureInitialized()

    // 检查缓存
    const now = Date.now()
    if (useCache && this.cache.length > 0 && now - this.lastFetchTime < this.CACHE_TTL) {
      return this.cache.slice(0, limit)
    }

    try {
      // 移除多余的 /api 前缀，如果 baseUrl 已经包含 /api 则不需要重复，但这里 baseUrl 是 host:port
      // 检查 LogResource.java 定义的路径是 /api/logs/recent
      // 所以这里应该是 ${this.baseUrl}/api/logs/recent
      const url = `${this.baseUrl}/api/logs/recent?limit=${limit}&level=${level}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10秒超时
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: LogResponse = await response.json()

      if (!data.success) {
        throw new Error(data.error || '获取日志失败')
      }

      // 更新缓存
      this.cache = data.logs || []
      this.lastFetchTime = now

      return this.cache
    } catch (error) {
      // 🔧 优化：404错误降低日志级别（后端可能正在启动）
      if (error instanceof Error && error.message.includes('404')) {
        console.warn('⚠️ 日志服务暂时不可用（后端可能正在启动）:', error.message)
      } else {
        console.error('获取日志失败:', error)
      }

      // 如果有缓存，返回缓存数据
      if (this.cache.length > 0) {
        return this.cache
      }

      // 否则返回空数组（不显示模拟数据，避免误导）
      return []
    }
  }

  /**
   * 获取日志文件信息
   */
  async getLogInfo(): Promise<LogInfo> {
    await this.ensureInitialized()

    try {
      const url = `${this.baseUrl}/api/logs/info`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5秒超时
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: LogInfo = await response.json()
      return data
    } catch (error) {
      console.error('获取日志信息失败:', error)
      return {
        success: false,
        logFile: 'unknown',
        exists: false,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 清理旧日志
   * @param days 保留天数，默认7天
   */
  async cleanupLogs(
    days: number = 7
  ): Promise<{ success: boolean; message: string; deletedFiles: number }> {
    await this.ensureInitialized()

    try {
      const url = `${this.baseUrl}/api/logs/cleanup?days=${days}`
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(30000), // 30秒超时
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('清理日志失败:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '清理日志失败',
        deletedFiles: 0,
      }
    }
  }

  /**
   * 清除本地缓存
   */
  clearCache(): void {
    this.cache = []
    this.lastFetchTime = 0
  }

  /**
   * 获取降级日志数据（当API不可用时）
   */
  private getFallbackLogs(): LogEntry[] {
    const now = new Date()
    const timeStr = now.toTimeString().substring(0, 8)

    return [
      {
        time: timeStr,
        message: '⚠️ 无法连接到后端日志服务，显示模拟数据',
        type: 'warning',
      },
      {
        time: timeStr,
        message: '📡 正在尝试重新连接后端服务...',
        type: 'info',
      },
      {
        time: timeStr,
        message: '🔧 请检查后端服务是否正常运行',
        type: 'info',
      },
    ]
  }

  /**
   * 实时日志监听器（基于轮询）
   */
  startRealtimeLogging(
    callback: (logs: LogEntry[]) => void,
    interval: number = 2000,
    limit: number = 50
  ): () => void {
    let isRunning = true

    const poll = async () => {
      if (!isRunning) return

      try {
        const logs = await this.getRecentLogs(limit, 'ALL', false)
        callback(logs)
      } catch (error) {
        console.error('实时日志获取失败:', error)
      }

      if (isRunning) {
        setTimeout(poll, interval)
      }
    }

    // 立即执行一次
    poll()

    // 返回停止函数
    return () => {
      isRunning = false
    }
  }

  /**
   * 格式化日志消息（移除ANSI颜色代码等）
   */
  formatLogMessage(message: string): string {
    // 移除ANSI颜色代码
    return message.replace(/\x1b\[[0-9;]*m/g, '')
  }

  /**
   * 根据日志类型获取图标
   */
  getLogIcon(type: string): string {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  /**
   * 根据日志级别获取颜色类名
   */
  getLogColorClass(type: string): string {
    switch (type) {
      case 'success':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      case 'info':
      default:
        return 'text-blue-400'
    }
  }
}

// 创建并导出服务实例
export const logService = new LogService()
export default logService
