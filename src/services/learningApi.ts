import axios from 'axios'

// 动态获取Electron环境的基础URL
async function getDynamicBaseUrl(): Promise<string> {
  try {
    const electronAPI = (window as any).electronAPI
    if (!electronAPI || !electronAPI.isElectron) {
      // Web环境：使用相对路径，让HTTP服务器代理处理
      // 🔧 修复：统一使用相对路径，无论是Vite开发服务器还是SimpleHttpServer都能正确代理
      return '/api/learning'
    }
    
    // 🔧 修复：先检查后端是否已就绪
    if (electronAPI.getBackendStatus) {
      try {
        const status = await electronAPI.getBackendStatus()
        if (status && status.isRunning && status.port) {
          return `http://127.0.0.1:${status.port}/api/learning`
        }
      } catch (e) {
        // 忽略错误，继续尝试其他方法
      }
    }
    
    // 🔧 修复：等待后端就绪事件
    if (electronAPI.onBackendReady) {
      await new Promise<void>((resolve) => {
        // 先检查后端是否已经就绪
        electronAPI.getBackendStatus?.().then((status: any) => {
          if (status && status.isRunning && status.port) {
            resolve()
            return
          }
          // 如果未就绪，等待就绪事件
          electronAPI.onBackendReady(() => {
            resolve()
          })
        }).catch(() => {
          // 如果获取状态失败，等待就绪事件
          electronAPI.onBackendReady(() => {
            resolve()
          })
        })
      })
    }
    
    // 🔧 修复：确保获取到的是数字而不是 Promise
    if (electronAPI.getBackendPort) {
      const port = await electronAPI.getBackendPort()
      // 验证端口是有效数字
      if (typeof port === 'number' && port > 0 && port <= 65535) {
        return `http://127.0.0.1:${port}/api/learning`
      } else {
        console.warn('⚠️ 获取到的端口无效:', port, '使用默认端口8082')
      }
    }
  } catch (error) {
    console.warn('⚠️ 无法获取后端端口:', error)
  }
  // 降级方案：Web环境使用相对路径
  return '/api/learning'
}

// 根据环境动态设置API URL
const getApiBaseUrl = async () => {
  // 检查是否在Electron环境中
  if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
    // Electron环境：动态获取端口
    return await getDynamicBaseUrl()
  }
  // Web环境使用相对路径（通过Vite代理）
  return '/api/learning'
}

/**
 * 人工修改日志接口
 */
export interface ManualEditLog {
  editedBy?: string
  context: {
    studentName: string
    department: string
    examDate: string
    fieldName: string
    timeSlot?: string
  }
  original: {
    value: string | null
  }
  selected: {
    value: string
    wasRecommended?: boolean
    recommendationRank?: number
    recommendationScore?: number
  }
  reason: {
    category: string
    detail: string
  }
  hadConflicts?: boolean
  conflicts?: ConflictInfo[]
  isForced?: boolean
  satisfactionScore?: number
  feedback?: string
  hardViolations?: number
  softViolations?: number
}

export interface ConflictInfo {
  type: string
  severity: string
  title: string
  description: string
}

export interface LearningStatistics {
  totalEdits: number
  acceptanceRate: number
  forcedEdits: number
  recommendedSelected: number
  topReasons: Array<{ category: string; count: number }>
  topTeachers: Array<{ name: string; count: number }>
  dateRange: {
    start: string
    end: string
    days: number
  }
}

export interface HistoryRecord {
  id: number
  editedAt: string
  editedBy: string
  studentName: string
  department: string
  fieldName: string
  originalValue: string
  newValue: string
  reasonCategory: string
  reasonDetail: string
  hadConflicts: boolean
  isForced: boolean
}

export interface HistoryResponse {
  records: HistoryRecord[]
  total: number
  limit: number
  offset: number
}

/**
 * 学习API服务类
 */
class LearningApiService {
  private pendingLogsKey = 'pending_edit_logs'

  /**
   * 获取API基础URL
   */
  private async getBaseUrl(): Promise<string> {
    return await getApiBaseUrl()
  }

  /**
   * 记录人工修改
   */
  async recordManualEdit(
    log: ManualEditLog
  ): Promise<{ success: boolean; id?: number; message: string }> {
    try {
      const baseUrl = await this.getBaseUrl()
      const response = await axios.post(`${baseUrl}/manual-edit`, log, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      process.env.NODE_ENV === 'development' && console.log('✅ 人工修改记录已保存:', response.data)

      // 如果有待发送的日志，尝试发送
      this.sendPendingLogs()

      return response.data
    } catch (error) {
      console.error('❌ 记录人工修改失败:', error)

      // 失败时保存到本地存储
      this.saveToLocalStorage(log)

      // 不抛出错误，避免影响用户操作
      return {
        success: false,
        message: '已保存到本地缓存，将在下次启动时重试',
      }
    }
  }

  /**
   * 保存到本地存储
   */
  private saveToLocalStorage(log: ManualEditLog): void {
    try {
      const pending = this.getPendingLogs()
      pending.push({
        ...log,
        timestamp: new Date().toISOString(),
      })
      localStorage.setItem(this.pendingLogsKey, JSON.stringify(pending))
      process.env.NODE_ENV === 'development' && console.log('💾 已保存到本地缓存，待发送数量:', pending.length)
    } catch (error) {
      console.error('保存到本地存储失败:', error)
    }
  }

  /**
   * 获取待发送的日志
   */
  private getPendingLogs(): any[] {
    try {
      const data = localStorage.getItem(this.pendingLogsKey)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('读取本地缓存失败:', error)
      return []
    }
  }

  /**
   * 发送待处理的日志
   */
  async sendPendingLogs(): Promise<void> {
    const pending = this.getPendingLogs()

    if (pending.length === 0) {
      return
    }

    process.env.NODE_ENV === 'development' && console.log(`📤 发送${pending.length}条待处理日志...`)

    const succeeded: number[] = []
    const baseUrl = await this.getBaseUrl() // 🔧 修复：正确 await Promise

    for (let i = 0; i < pending.length; i++) {
      try {
        const log = pending[i]
        await axios.post(`${baseUrl}/manual-edit`, log, { timeout: 3000 })
        succeeded.push(i)
      } catch (error) {
        console.error(`发送第${i + 1}条日志失败:`, error)
      }
    }

    if (succeeded.length > 0) {
      // 删除已成功发送的日志
      const remaining = pending.filter((_, index) => !succeeded.includes(index))
      localStorage.setItem(this.pendingLogsKey, JSON.stringify(remaining))
      process.env.NODE_ENV === 'development' && console.log(`✅ 已发送${succeeded.length}条日志，剩余${remaining.length}条`)
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics(days: number = 30): Promise<LearningStatistics> {
    try {
      const baseUrl = await this.getBaseUrl() // 🔧 修复：正确 await Promise
      const response = await axios.get(`${baseUrl}/statistics`, {
        params: { days },
        timeout: 5000,
      })
      return response.data
    } catch (error) {
      console.error('获取统计信息失败:', error)
      throw error
    }
  }

  /**
   * 获取历史记录
   */
  async getHistory(limit: number = 50, offset: number = 0): Promise<HistoryResponse> {
    try {
      const baseUrl = await this.getBaseUrl() // 🔧 修复：正确 await Promise
      const response = await axios.get(`${baseUrl}/history`, {
        params: { limit, offset },
        timeout: 5000,
      })
      return response.data
    } catch (error) {
      console.error('获取历史记录失败:', error)
      throw error
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const baseUrl = await this.getBaseUrl() // 🔧 修复：正确 await Promise
      const response = await axios.get(`${baseUrl}/health`, { timeout: 2000 })
      return response.data.status === 'ok'
    } catch (error) {
      return false
    }
  }

  /**
   * 初始化 - 尝试发送待处理的日志
   */
  async initialize(): Promise<void> {
    const isHealthy = await this.healthCheck()
    if (isHealthy) {
      await this.sendPendingLogs()
    }
  }
}

// 创建单例
export const learningApi = new LearningApiService()

// 导出类型
export type { ManualEditLog as ManualEditLogType }

// 应用启动时初始化
if (typeof window !== 'undefined') {
  // 延迟初始化，避免阻塞应用启动
  setTimeout(() => {
    learningApi.initialize().catch(err => {
      console.warn('Learning API初始化失败:', err)
    })
  }, 2000)
}
