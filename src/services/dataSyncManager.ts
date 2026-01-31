/**
 * 数据同步管理器
 * 处理前后端数据同步、WebSocket连接和状态管理
 */

import { ref, reactive, computed } from 'vue'

export interface WebSocketMessage {
  type: MessageType
  timestamp: string
  userId?: string
  roomId?: string
  data: any
  metadata: Record<string, any>
}

export enum MessageType {
  // 连接管理
  CONNECT = 'CONNECT',
  DISCONNECT = 'DISCONNECT',
  HEARTBEAT = 'HEARTBEAT',

  // 排班状态
  SCHEDULE_START = 'SCHEDULE_START',
  SCHEDULE_PROGRESS = 'SCHEDULE_PROGRESS',
  SCHEDULE_COMPLETE = 'SCHEDULE_COMPLETE',
  SCHEDULE_ERROR = 'SCHEDULE_ERROR',

  // 约束验证
  VALIDATION_START = 'VALIDATION_START',
  VALIDATION_PROGRESS = 'VALIDATION_PROGRESS',
  VALIDATION_COMPLETE = 'VALIDATION_COMPLETE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // 数据同步
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_SYNC = 'DATA_SYNC',
  DATA_CONFLICT = 'DATA_CONFLICT',

  // 用户操作
  USER_JOIN = 'USER_JOIN',
  USER_LEAVE = 'USER_LEAVE',
  USER_ACTION = 'USER_ACTION',

  // 系统通知
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
  ERROR_NOTIFICATION = 'ERROR_NOTIFICATION',
}

export interface SyncState {
  connected: boolean
  connecting: boolean
  reconnecting: boolean
  lastSyncTime: Date | null
  syncErrors: string[]
  activeUsers: string[]
  roomId: string | null
  userId: string | null
}

export interface ScheduleProgress {
  taskId: string
  status: 'started' | 'in_progress' | 'completed' | 'error'
  progress: number
  message: string
  details?: any
}

export interface ValidationProgress {
  taskId: string
  status: 'started' | 'in_progress' | 'completed' | 'error'
  progress: number
  validatedCount: number
  totalCount: number
  violations: any[]
}

class DataSyncManager {
  private ws: WebSocket | null = null
  private heartbeatInterval: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private backendPort = 8081 // 默认端口，将动态获取

  // 响应式状态
  public syncState = reactive<SyncState>({
    connected: false,
    connecting: false,
    reconnecting: false,
    lastSyncTime: null,
    syncErrors: [],
    activeUsers: [],
    roomId: null,
    userId: null,
  })

  // 进度状态
  public scheduleProgress = ref<ScheduleProgress | null>(null)
  public validationProgress = ref<ValidationProgress | null>(null)

  // 事件监听器
  private eventListeners: Map<MessageType, Set<Function>> = new Map()

  // 数据缓存
  private dataCache: Map<string, any> = new Map()

  /**
   * 连接WebSocket
   */
  async connect(userId: string, roomId: string, options: { autoReconnect?: boolean } = {}) {
    if (this.syncState.connected || this.syncState.connecting) {
      console.warn('WebSocket已连接或正在连接中')
      return
    }

    this.syncState.connecting = true
    this.syncState.userId = userId
    this.syncState.roomId = roomId

    const wsUrl = await this.buildWebSocketUrl(userId, roomId)

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        process.env.NODE_ENV === 'development' && console.log('WebSocket连接成功')
        this.syncState.connected = true
        this.syncState.connecting = false
        this.syncState.reconnecting = false
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.clearSyncErrors()
      }

      this.ws.onclose = () => {
        process.env.NODE_ENV === 'development' && console.log('WebSocket连接断开')
        this.syncState.connected = false
        this.syncState.connecting = false
        this.stopHeartbeat()

        if (options.autoReconnect !== false && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          this.syncState.reconnecting = true
          setTimeout(() => {
            this.connect(userId, roomId, options)
          }, this.reconnectDelay)
        }
      }

      this.ws.onerror = event => {
        console.error('WebSocket错误:', event)
        this.syncState.connecting = false
        this.addSyncError('连接错误')
      }

      this.ws.onmessage = event => {
        this.handleMessage(event.data)
      }
    } catch (error) {
      console.error('创建WebSocket连接失败:', error)
      this.syncState.connecting = false
      this.addSyncError('创建连接失败: ' + error)
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.stopHeartbeat()
    this.syncState.connected = false
    this.syncState.connecting = false
    this.syncState.reconnecting = false
    this.syncState.activeUsers = []

    process.env.NODE_ENV === 'development' && console.log('WebSocket连接已断开')
  }

  /**
   * 发送消息
   */
  sendMessage(type: MessageType, data: any, metadata: Record<string, any> = {}) {
    if (!this.syncState.connected || !this.ws) {
      console.warn('WebSocket未连接，无法发送消息')
      return false
    }

    const message: WebSocketMessage = {
      type,
      timestamp: new Date().toISOString(),
      userId: this.syncState.userId || undefined,
      roomId: this.syncState.roomId || undefined,
      data,
      metadata,
    }

    try {
      this.ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('发送WebSocket消息失败:', error)
      this.addSyncError('发送消息失败: ' + error)
      return false
    }
  }

  /**
   * 同步数据
   */
  syncData(dataType: string, data: any) {
    // 更新本地缓存
    this.dataCache.set(dataType, {
      data,
      timestamp: new Date(),
      version: this.generateVersion(),
    })

    // 发送同步消息
    return this.sendMessage(
      MessageType.DATA_SYNC,
      {
        dataType,
        data,
        timestamp: new Date().toISOString(),
      },
      {
        source: 'local_update',
      }
    )
  }

  /**
   * 获取缓存数据
   */
  getCachedData(dataType: string) {
    return this.dataCache.get(dataType)
  }

  /**
   * 清除缓存数据
   */
  clearCache(dataType?: string) {
    if (dataType) {
      this.dataCache.delete(dataType)
    } else {
      this.dataCache.clear()
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(type: MessageType, listener: Function) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set())
    }
    this.eventListeners.get(type)!.add(listener)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(type: MessageType, listener: Function) {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * 移除所有事件监听器
   */
  removeAllEventListeners(type?: MessageType) {
    if (type) {
      this.eventListeners.delete(type)
    } else {
      this.eventListeners.clear()
    }
  }

  //
  /**
   * 构建WebSocket URL
   */
  private async buildWebSocketUrl(userId: string, roomId: string): Promise<string> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const params = new URLSearchParams({
      userId,
      roomId,
      clientInfo: navigator.userAgent,
    })

    // 🔧 在Electron环境中使用动态端口
    const isElectron = (window as any).electronAPI && (window as any).electronAPI.isElectron
    if (isElectron && (window as any).electronAPI?.getBackendPort) {
      try {
        const currentPort = await (window as any).electronAPI.getBackendPort()
        this.backendPort = currentPort
        console.log('✅ [DataSyncManager] 获取到后端端口:', currentPort)
        
        // 后端当前提供的实时统计 WebSocket 端点为 /ws/statistics
        return `${protocol}//127.0.0.1:${currentPort}/ws/statistics?${params.toString()}`
      } catch (error) {
        console.warn('⚠️ [DataSyncManager] 无法获取后端端口，使用默认端口8082:', error)
      }
    }

    // Web环境或获取端口失败时，直接连接后端（静态文件服务没有代理）
    // 根据访问方式智能判断后端地址
    const currentHostname = window.location.hostname
    let backendHost: string
    if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
      backendHost = '127.0.0.1:8082'
    } else {
      backendHost = `${currentHostname}:8082`
    }
    return `${protocol}//${backendHost}/ws/statistics?${params.toString()}`
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(messageData: string) {
    try {
      const message: WebSocketMessage = JSON.parse(messageData)

      // 更新同步时间
      this.syncState.lastSyncTime = new Date()

      // 处理不同类型的消息
      switch (message.type) {
        case MessageType.CONNECT:
          this.handleConnectMessage(message)
          break
        case MessageType.USER_JOIN:
          this.handleUserJoinMessage(message)
          break
        case MessageType.USER_LEAVE:
          this.handleUserLeaveMessage(message)
          break
        case MessageType.SCHEDULE_START:
        case MessageType.SCHEDULE_PROGRESS:
        case MessageType.SCHEDULE_COMPLETE:
        case MessageType.SCHEDULE_ERROR:
          this.handleScheduleMessage(message)
          break
        case MessageType.VALIDATION_START:
        case MessageType.VALIDATION_PROGRESS:
        case MessageType.VALIDATION_COMPLETE:
        case MessageType.VALIDATION_ERROR:
          this.handleValidationMessage(message)
          break
        case MessageType.DATA_UPDATE:
          this.handleDataUpdateMessage(message)
          break
        case MessageType.DATA_CONFLICT:
          this.handleDataConflictMessage(message)
          break
        case MessageType.SYSTEM_NOTIFICATION:
          this.handleSystemNotificationMessage(message)
          break
        case MessageType.ERROR_NOTIFICATION:
          this.handleErrorNotificationMessage(message)
          break
      }

      // 触发事件监听器
      this.triggerEventListeners(message.type, message)
    } catch (error) {
      console.error('处理WebSocket消息失败:', error)
      this.addSyncError('消息处理失败: ' + error)
    }
  }

  /**
   * 处理连接消息
   */
  private handleConnectMessage(message: WebSocketMessage) {
    process.env.NODE_ENV === 'development' && console.log('收到连接确认:', message.data)
    if (message.metadata.activeUsers) {
      this.syncState.activeUsers = message.metadata.activeUsers
    }
  }

  /**
   * 处理用户加入消息
   */
  private handleUserJoinMessage(message: WebSocketMessage) {
    const { userId } = message.data
    if (userId && !this.syncState.activeUsers.includes(userId)) {
      this.syncState.activeUsers.push(userId)
    }
    process.env.NODE_ENV === 'development' && console.log(`用户 ${userId} 加入房间`)
  }

  /**
   * 处理用户离开消息
   */
  private handleUserLeaveMessage(message: WebSocketMessage) {
    const { userId } = message.data
    const index = this.syncState.activeUsers.indexOf(userId)
    if (index >= 0) {
      this.syncState.activeUsers.splice(index, 1)
    }
    process.env.NODE_ENV === 'development' && console.log(`用户 ${userId} 离开房间`)
  }

  /**
   * 处理排班消息
   */
  private handleScheduleMessage(message: WebSocketMessage) {
    const progress: ScheduleProgress = {
      taskId: message.data.taskId || 'default',
      status: this.getStatusFromMessageType(message.type),
      progress: message.data.progress || 0,
      message: message.data.message || '',
      details: message.data.details,
    }

    this.scheduleProgress.value = progress
    process.env.NODE_ENV === 'development' && console.log('排班进度更新:', progress)
  }

  /**
   * 处理验证消息
   */
  private handleValidationMessage(message: WebSocketMessage) {
    const progress: ValidationProgress = {
      taskId: message.data.taskId || 'default',
      status: this.getStatusFromMessageType(message.type),
      progress: message.data.progress || 0,
      validatedCount: message.data.validatedCount || 0,
      totalCount: message.data.totalCount || 0,
      violations: message.data.violations || [],
    }

    this.validationProgress.value = progress
    process.env.NODE_ENV === 'development' && console.log('验证进度更新:', progress)
  }

  /**
   * 处理数据更新消息
   */
  private handleDataUpdateMessage(message: WebSocketMessage) {
    const { dataType, data, timestamp } = message.data
    const updateType = message.metadata.updateType || 'unknown'
    const source = message.metadata.source || 'unknown'

    // 更新本地缓存
    this.dataCache.set(dataType, {
      data,
      timestamp: new Date(timestamp),
      version: this.generateVersion(),
      source,
    })

    process.env.NODE_ENV === 'development' && console.log(`数据更新: ${dataType}, 来源: ${source}, 类型: ${updateType}`)
  }

  /**
   * 处理数据冲突消息
   */
  private handleDataConflictMessage(message: WebSocketMessage) {
    console.warn('数据冲突:', message.data)
    this.addSyncError('数据冲突: ' + message.data.message)
  }

  /**
   * 处理系统通知消息
   */
  private handleSystemNotificationMessage(message: WebSocketMessage) {
    process.env.NODE_ENV === 'development' && console.log('系统通知:', message.data)
    // 这里可以触发UI通知
  }

  /**
   * 处理错误通知消息
   */
  private handleErrorNotificationMessage(message: WebSocketMessage) {
    console.error('错误通知:', message.data)
    this.addSyncError(message.data)
  }

  /**
   * 触发事件监听器
   */
  private triggerEventListeners(type: MessageType, message: WebSocketMessage) {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(message)
        } catch (error) {
          console.error('事件监听器执行失败', error)
        }
      })
    }
  }

  /**
   * 从消息类型获取状态
   */
  private getStatusFromMessageType(
    type: MessageType
  ): 'started' | 'in_progress' | 'completed' | 'error' {
    if (type.toString().includes('START')) return 'started'
    if (type.toString().includes('PROGRESS')) return 'in_progress'
    if (type.toString().includes('COMPLETE')) return 'completed'
    if (type.toString().includes('ERROR')) return 'error'
    return 'in_progress'
  }

  /**
   * 开始心跳
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    // 🔧 局域网优化：延长心跳间隔到60秒，减少网络流量
    this.heartbeatInterval = window.setInterval(() => {
      this.sendMessage(MessageType.HEARTBEAT, 'ping')
    }, 60000) // 60秒心跳（原30秒）
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * 添加同步错误
   */
  private addSyncError(error: string) {
    this.syncState.syncErrors.push(error)
    // 保持最近10个错误记录
    if (this.syncState.syncErrors.length > 10) {
      this.syncState.syncErrors.shift()
    }
  }

  /**
   * 清除同步错误
   */
  private clearSyncErrors() {
    this.syncState.syncErrors = []
  }

  /**
   * 生成版本号
   */
  private generateVersion(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}

// 创建全局实例
export const dataSyncManager = new DataSyncManager()

// 导出类型和枚举
export { DataSyncManager }

// 提供Vue组合式API
export function useDataSync() {
  return {
    syncState: dataSyncManager.syncState,
    scheduleProgress: dataSyncManager.scheduleProgress,
    validationProgress: dataSyncManager.validationProgress,

    connect: dataSyncManager.connect.bind(dataSyncManager),
    disconnect: dataSyncManager.disconnect.bind(dataSyncManager),
    sendMessage: dataSyncManager.sendMessage.bind(dataSyncManager),
    syncData: dataSyncManager.syncData.bind(dataSyncManager),
    getCachedData: dataSyncManager.getCachedData.bind(dataSyncManager),
    clearCache: dataSyncManager.clearCache.bind(dataSyncManager),
    addEventListener: dataSyncManager.addEventListener.bind(dataSyncManager),
    removeEventListener: dataSyncManager.removeEventListener.bind(dataSyncManager),
    removeAllEventListeners: dataSyncManager.removeAllEventListeners.bind(dataSyncManager),

    // 计算属性
    isConnected: computed(() => dataSyncManager.syncState.connected),
    isConnecting: computed(() => dataSyncManager.syncState.connecting),
    hasErrors: computed(() => dataSyncManager.syncState.syncErrors.length > 0),
    activeUserCount: computed(() => dataSyncManager.syncState.activeUsers.length),
  }
}
