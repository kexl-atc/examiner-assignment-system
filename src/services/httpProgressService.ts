/**
 * 🔧 HTTP 轮询进度服务
 * 完全替代 WebSocket，解决 403 错误问题
 */

export interface ProgressUpdate {
  currentLevel: number
  levelName: string
  elapsedTime: number
  estimatedRemaining: number
  progressPercentage: number
  currentScore: string
  iterationCount: number
  assignmentCount?: number
}

export interface ProgressMessage {
  type: string
  message: string
  data: any
  timestamp: number
}

export type ProgressCallback = (message: ProgressMessage) => void

class HttpProgressService {
  private callbacks: ProgressCallback[] = []
  private pollingInterval: NodeJS.Timeout | null = null
  private sessionId: string | null = null
  private backendPort = 8081
  private isPolling = false

  constructor() {
    this.initializeBackendPort()
  }

  private async initializeBackendPort() {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI || !electronAPI.isElectron) {
        return
      }

      // 等待后端就绪
      if (electronAPI.getBackendStatus) {
        try {
          const status = await electronAPI.getBackendStatus()
          if (status && status.isRunning && status.port) {
            this.backendPort = status.port
            console.log('📊 [HTTP Progress] 后端已就绪，端口:', this.backendPort)
            return
          }
        } catch (e) {
          // 忽略错误
        }
      }

      // 等待后端就绪事件
      if (electronAPI.onBackendReady) {
        await new Promise<void>((resolve) => {
          electronAPI.getBackendStatus?.().then((status: any) => {
            if (status && status.isRunning && status.port) {
              this.backendPort = status.port
              console.log('📊 [HTTP Progress] 后端已就绪，端口:', this.backendPort)
              resolve()
              return
            }
            electronAPI.onBackendReady(() => {
              electronAPI.getBackendPort?.().then((port: number) => {
                if (typeof port === 'number' && port > 0) {
                  this.backendPort = port
                  console.log('📊 [HTTP Progress] 收到后端就绪事件，端口:', this.backendPort)
                }
                resolve()
              }).catch(() => resolve())
            })
          }).catch(() => {
            electronAPI.onBackendReady(() => {
              electronAPI.getBackendPort?.().then((port: number) => {
                if (typeof port === 'number' && port > 0) {
                  this.backendPort = port
                  console.log('📊 [HTTP Progress] 收到后端就绪事件，端口:', this.backendPort)
                }
                resolve()
              }).catch(() => resolve())
            })
          })
        })
      } else if (electronAPI.getBackendPort) {
        const port = await electronAPI.getBackendPort()
        if (typeof port === 'number' && port > 0) {
          this.backendPort = port
          console.log('📊 [HTTP Progress] 获取到后端端口:', this.backendPort)
        }
      }
    } catch (error) {
      console.warn('⚠️ [HTTP Progress] 无法获取后端端口，使用默认端口8081:', error)
      this.backendPort = 8081
    }
  }

  async connect(sessionId: string): Promise<void> {
    this.sessionId = sessionId
    
    // 重新获取最新端口
    const electronAPI = (window as any).electronAPI
    const isElectron = electronAPI && electronAPI.isElectron
    
    if (isElectron) {
      try {
        if (electronAPI.getBackendStatus) {
          const status = await electronAPI.getBackendStatus()
          if (status && status.isRunning && status.port && typeof status.port === 'number') {
            this.backendPort = status.port
            console.log('📊 [HTTP Progress] 连接前获取到最新端口:', this.backendPort)
          }
        }
      } catch (error) {
        console.warn('⚠️ [HTTP Progress] 获取端口失败:', error)
      }
    }

    console.log('📊 [HTTP Progress] 开始轮询，sessionId:', sessionId)
    
    // 发送连接确认消息
    this.notifyCallbacks({
      type: 'connected',
      message: 'HTTP轮询已建立',
      data: null,
      timestamp: Date.now()
    })

    // 开始轮询
    this.startPolling()
  }

  private startPolling() {
    if (this.isPolling) {
      return
    }

    this.isPolling = true
    
    // 立即轮询一次
    this.poll()
    
    // 🔧 局域网优化：每800ms轮询一次（1.25Hz）
    // 降低网络负载，800ms对于进度显示已足够流畅
    // 同时减少服务器压力和网络带宽消耗
    this.pollingInterval = setInterval(() => {
      this.poll()
    }, 800)
  }

  private async poll() {
    if (!this.sessionId) {
      return
    }

    try {
      const electronAPI = (window as any).electronAPI
      const isElectron = electronAPI && electronAPI.isElectron
      
      let url: string
      if (isElectron) {
        url = `http://127.0.0.1:${this.backendPort}/api/schedule/progress/${this.sessionId}`
      } else {
        url = `/api/schedule/progress/${this.sessionId}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // 如果返回404，说明任务可能还未开始或已结束
        if (response.status === 404) {
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // 如果任务不存在，忽略
      if (data.type === 'not_found') {
        return
      }

      // 转换为 ProgressMessage 格式
      const message: ProgressMessage = {
        type: 'progress',
        message: data.levelName || '求解中',
        data: {
          currentLevel: data.level || 0,
          levelName: data.levelName || '求解中',
          elapsedTime: 0, // 后端未提供
          estimatedRemaining: 0, // 后端未提供
          progressPercentage: data.progressPercentage || 0,
          currentScore: data.currentScore || '',
          iterationCount: data.iterationCount || 0, // 🔧 修复：从后端读取迭代次数
          assignmentCount: data.assignmentCount || 0
        } as ProgressUpdate,
        timestamp: data.timestamp || Date.now()
      }

      // 🔧 调试日志：记录进度更新
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 [HTTP Progress] 进度更新:', data.progressPercentage + '%', data.levelName)
      }
      
      this.notifyCallbacks(message)

      // 如果进度达到100%，停止轮询
      if (data.progressPercentage >= 100) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [HTTP Progress] 进度达到100%，停止轮询')
        }
        this.stopPolling()
      }

    } catch (error) {
      // 轮询错误不影响继续轮询
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ [HTTP Progress] 轮询出错:', error)
      }
    }
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.isPolling = false
  }

  disconnect() {
    console.log('📊 [HTTP Progress] 断开连接')
    this.stopPolling()
    this.sessionId = null
  }

  onProgress(callback: ProgressCallback) {
    this.callbacks.push(callback)
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback)
    }
  }

  private notifyCallbacks(message: ProgressMessage) {
    this.callbacks.forEach((cb) => {
      try {
        cb(message)
      } catch (error) {
        console.error('❌ [HTTP Progress] 回调执行失败:', error)
      }
    })
  }

  // 手动发送完成消息（供外部调用）
  sendComplete(result: any) {
    this.notifyCallbacks({
      type: 'complete',
      message: '求解完成',
      data: result,
      timestamp: Date.now()
    })
    this.stopPolling()
  }

  // 手动发送错误消息（供外部调用）
  sendError(error: string) {
    this.notifyCallbacks({
      type: 'error',
      message: error,
      data: null,
      timestamp: Date.now()
    })
    this.stopPolling()
  }
}

// 导出单例
export const httpProgressService = new HttpProgressService()

