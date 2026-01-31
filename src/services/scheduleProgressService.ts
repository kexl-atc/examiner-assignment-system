/**
 * 排班进度实时推送服务
 * 通过WebSocket接收后端的分级求解进度
 */

export interface ProgressUpdate {
  currentLevel: number
  levelName: string
  elapsedTime: number
  estimatedRemaining: number
  progressPercentage: number
  currentScore: string
  iterationCount: number
  assignmentCount?: number // 🔧 新增：当前分配数量
}

export interface IntermediateResult {
  score: string
  assignmentCount: number
  confidence: number
  quality: string
  elapsedTime: number
}

export interface ScoreUpdate {
  oldScore: string
  newScore: string
  improvementAmount: number
  elapsedTime: number
}

export interface LevelUpgrade {
  fromLevel: number
  toLevel: number
  fromLevelName: string
  toLevelName: string
  reason: string
  previousScore: string
}

export interface FinalResult {
  success: boolean
  level: string
  score: string
  quality: string
  totalTime: number
  message: string
}

export interface LogMessage {
  time: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export interface ProgressMessage {
  type:
    | 'connected'
    | 'progress'
    | 'intermediate_result'
    | 'score_improvement'
    | 'level_upgrade'
    | 'final_result'
    | 'error'
    | 'log'
    | 'started'
  message: string
  data:
    | ProgressUpdate
    | IntermediateResult
    | ScoreUpdate
    | LevelUpgrade
    | FinalResult
    | LogMessage
    | null
  timestamp: number
}

export type ProgressCallback = (message: ProgressMessage) => void

class ScheduleProgressService {
  private ws: WebSocket | null = null
  private callbacks: ProgressCallback[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private connectionTimeout: NodeJS.Timeout | null = null // 🔧 修复：使用实例变量管理超时
  private backendPort = 8081 // 默认端口，将动态获取

  constructor() {
    this.initializeBackendPort()
  }

  private async initializeBackendPort() {
    try {
      const electronAPI = (window as any).electronAPI
      if (!electronAPI || !electronAPI.isElectron) {
        return
      }
      
      // 🔧 修复：先检查后端是否已就绪
      if (electronAPI.getBackendStatus) {
        try {
          const status = await electronAPI.getBackendStatus()
          if (status && status.isRunning && status.port) {
            this.backendPort = status.port
            process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 后端已就绪，端口:', this.backendPort)
            return
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
              this.backendPort = status.port
              process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 后端已就绪，端口:', this.backendPort)
              resolve()
              return
            }
            // 如果未就绪，等待就绪事件
            electronAPI.onBackendReady(() => {
              electronAPI.getBackendPort?.().then((port: number) => {
                if (typeof port === 'number' && port > 0) {
                  this.backendPort = port
                  process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 收到后端就绪事件，端口:', this.backendPort)
                }
                resolve()
              }).catch(() => resolve())
            })
          }).catch(() => {
            // 如果获取状态失败，等待就绪事件
            electronAPI.onBackendReady(() => {
              electronAPI.getBackendPort?.().then((port: number) => {
                if (typeof port === 'number' && port > 0) {
                  this.backendPort = port
                  process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 收到后端就绪事件，端口:', this.backendPort)
                }
                resolve()
              }).catch(() => resolve())
            })
          })
        })
      } else if (electronAPI.getBackendPort) {
        // 降级方案：直接获取端口
        const port = await electronAPI.getBackendPort()
        if (typeof port === 'number' && port > 0) {
          this.backendPort = port
          process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 获取到后端端口:', this.backendPort)
        }
      }
    } catch (error) {
      console.warn('⚠️ [WebSocket] 无法获取后端端口，使用默认端口8081:', error)
      this.backendPort = 8081
    }
  }

  connect(sessionId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // 🔧 修复时序问题：在连接时重新获取最新端口，确保后端已就绪
        let currentPort = this.backendPort

        // 在Electron环境中，每次连接时都重新获取端口以确保使用最新值
        const electronAPI = (window as any).electronAPI
        const isElectron = electronAPI && electronAPI.isElectron
        
        if (isElectron) {
          try {
            // 🔧 优先使用 getBackendStatus 获取最新状态
            if (electronAPI.getBackendStatus) {
              const status = await electronAPI.getBackendStatus()
              if (status && status.isRunning && status.port && typeof status.port === 'number') {
                currentPort = status.port
                this.backendPort = currentPort
                process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 从状态获取到最新后端端口:', currentPort)
              } else {
                // 如果后端未运行，等待就绪
                if (electronAPI.onBackendReady) {
                  await new Promise<void>((resolveReady) => {
                    electronAPI.onBackendReady(() => {
                      electronAPI.getBackendPort?.().then((port: number) => {
                        if (typeof port === 'number' && port > 0) {
                          currentPort = port
                          this.backendPort = currentPort
                          process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 等待后端就绪后获取端口:', currentPort)
                        }
                        resolveReady()
                      }).catch(() => resolveReady())
                    })
                  })
                }
              }
            } else if (electronAPI.getBackendPort) {
              // 降级方案：直接获取端口
              const port = await electronAPI.getBackendPort()
              if (typeof port === 'number' && port > 0) {
                currentPort = port
                this.backendPort = currentPort
                process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 重新获取到最新后端端口:', currentPort)
              }
            }
          } catch (error) {
            console.warn('⚠️ [WebSocket] 无法获取最新后端端口，使用缓存值:', currentPort, error)
          }
        }

        const isHttps = window.location.protocol === 'https:'
        const protocol = isHttps ? 'wss:' : 'ws:'
        let wsUrl: string

        // Electron 打包/本地运行时，直接连后端
        if (isElectron) {
          // 🔧 修复：使用重新获取的最新端口连接本地后端服务
          wsUrl = `${protocol}//127.0.0.1:${currentPort}/ws/schedule-progress/${sessionId}`
          process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] Electron环境，使用本地连接:', wsUrl)
          process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 使用端口:', currentPort)
        } else {
          // 浏览器生产环境：直接连接后端（静态文件服务没有代理）
          // 根据访问方式智能判断后端地址
          const currentHostname = window.location.hostname
          let backendHost: string
          if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
            backendHost = '127.0.0.1:8082'
          } else {
            backendHost = `${currentHostname}:8082`
          }
          wsUrl = `${protocol}//${backendHost}/ws/schedule-progress/${sessionId}`
          process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 浏览器环境，直接连接后端:', wsUrl)
        }

        process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 正在连接:', wsUrl)
        process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] sessionId:', sessionId)
        process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 当前时间:', new Date().toISOString())
        process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] isElectron:', isElectron)

        this.ws = new WebSocket(wsUrl)

        // 🔧 修复：使用实例变量管理连接超时
        this.connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ [WebSocket] 连接超时（10秒）')
            console.error('❌ [WebSocket] readyState:', this.ws.readyState)
            this.ws.close()
            reject(new Error('WebSocket connection timeout after 10 seconds'))
          }
        }, 10000)

        this.ws.onopen = () => {
          // 🔧 修复：清理超时计时器
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout)
            this.connectionTimeout = null
          }
          process.env.NODE_ENV === 'development' && console.log('✅ [WebSocket] 连接成功')
          process.env.NODE_ENV === 'development' && console.log('✅ [WebSocket] readyState:', this.ws?.readyState)
          process.env.NODE_ENV === 'development' && console.log('✅ [WebSocket] URL:', wsUrl)
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = event => {
          try {
            const message: ProgressMessage = JSON.parse(event.data)
            process.env.NODE_ENV === 'development' && console.log('📨 [WebSocket] 收到消息:', message.type, message)
            process.env.NODE_ENV === 'development' && console.log('🔍 [WebSocket调试] 消息详情:', JSON.stringify(message, null, 2))

            this.callbacks.forEach(callback => {
              try {
                process.env.NODE_ENV === 'development' && console.log('📤 [WebSocket调试] 调用回调函数')
                callback(message)
              } catch (error) {
                console.error('❌ [WebSocket] 回调处理失败:', error)
              }
            })
          } catch (error) {
            console.error('❌ [WebSocket] 消息解析失败:', error)
          }
        }

        this.ws.onerror = error => {
          // 🔧 修复：清理超时计时器
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout)
            this.connectionTimeout = null
          }
          console.error('❌ [WebSocket] 连接错误:', error)
          console.error('❌ [WebSocket] 错误详情:', {
            url: wsUrl,
            readyState: this.ws?.readyState,
            isElectron: isElectron,
            location: window.location.href,
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
          })
          reject(error)
        }

        this.ws.onclose = event => {
          // 🔧 修复：清理超时计时器
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout)
            this.connectionTimeout = null
          }
          process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 连接关闭')
          process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 关闭代码:', event.code)
          process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 关闭原因:', event.reason)
          process.env.NODE_ENV === 'development' && console.log('🔌 [WebSocket] 是否正常关闭:', event.wasClean)

          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            process.env.NODE_ENV === 'development' && console.log(
              `🔄 [WebSocket] 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
            )

            setTimeout(() => {
              this.connect(sessionId).catch(console.error)
            }, this.reconnectDelay * this.reconnectAttempts)
          }
        }
      } catch (error) {
        // 🔧 修复：清理超时计时器
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout)
          this.connectionTimeout = null
        }
        console.error('❌ [WebSocket] 创建连接失败:', error)
        reject(error)
      }
    })
  }

  disconnect() {
    // 🔧 修复：清理超时计时器
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client closed connection')
      this.ws = null
    }
    this.callbacks = []
    this.reconnectAttempts = 0
  }

  onProgress(callback: ProgressCallback): () => void {
    this.callbacks.push(callback)

    return () => {
      const index = this.callbacks.indexOf(callback)
      if (index > -1) {
        this.callbacks.splice(index, 1)
      }
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED
  }
}

export const scheduleProgressService = new ScheduleProgressService()

// Provide a default export for dynamic import users
export default scheduleProgressService
