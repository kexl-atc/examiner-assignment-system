/**
 * 内存泄漏防护工具
 * 用于管理定时器、事件监听器、WebSocket连接等可能造成内存泄漏的资源
 */

import { onUnmounted, ref } from 'vue'

type TimerHandle = number | NodeJS.Timeout

interface TimerResource {
  id: TimerHandle
  description: string
}

interface EventListenerResource {
  target: EventTarget
  type: string
  listener: EventListener
  options?: boolean | AddEventListenerOptions
  description: string
}

interface WebSocketResource {
  ws: WebSocket
  description: string
}

interface CleanupTask {
  description: string
  cleanup: () => void
}

export function useMemoryLeakPrevention() {
  // 存储需要清理的资源
  const timers = ref<TimerResource[]>([])
  const eventListeners = ref<EventListenerResource[]>([])
  const webSockets = ref<WebSocketResource[]>([])
  const cleanupTasks = ref<CleanupTask[]>([])

  /**
   * 安全的setTimeout
   */
  const setTimeoutSafe = (
    callback: Function,
    delay: number,
    description = 'timer'
  ): TimerHandle => {
    const timer = setTimeout(() => {
      callback()
      // 从列表中移除已执行的定时器
      const index = timers.value.findIndex(t => t.id === timer)
      if (index !== -1) {
        timers.value.splice(index, 1)
      }
    }, delay)

    timers.value.push({
      id: timer,
      description,
    })

    return timer
  }

  /**
   * 安全的setInterval
   */
  const setIntervalSafe = (
    callback: Function,
    interval: number,
    description = 'interval'
  ): TimerHandle => {
    const timer = setInterval(callback, interval)

    timers.value.push({
      id: timer,
      description,
    })

    return timer
  }

  /**
   * 安全的clearTimeout
   */
  const clearTimeoutSafe = (timer: TimerHandle): void => {
    clearTimeout(timer)
    const index = timers.value.findIndex(t => t.id === timer)
    if (index !== -1) {
      timers.value.splice(index, 1)
    }
  }

  /**
   * 安全的clearInterval
   */
  const clearIntervalSafe = (timer: TimerHandle): void => {
    clearInterval(timer)
    const index = timers.value.findIndex(t => t.id === timer)
    if (index !== -1) {
      timers.value.splice(index, 1)
    }
  }

  /**
   * 安全的事件监听器添加
   */
  const addEventListenerSafe = (
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
    description = 'event listener'
  ): void => {
    target.addEventListener(type, listener, options)

    eventListeners.value.push({
      target,
      type,
      listener,
      options,
      description,
    })
  }

  /**
   * 安全的事件监听器移除
   */
  const removeEventListenerSafe = (
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | EventListenerOptions
  ): void => {
    target.removeEventListener(type, listener, options)

    const index = eventListeners.value.findIndex(
      el => el.target === target && el.type === type && el.listener === listener
    )
    if (index !== -1) {
      eventListeners.value.splice(index, 1)
    }
  }

  /**
   * 安全的WebSocket管理
   */
  const createWebSocketSafe = (url: string, description = 'websocket'): WebSocket | null => {
    try {
      const ws = new WebSocket(url)

      ws.addEventListener('open', () => {
        console.debug(`WebSocket connected: ${description}`)
      })

      ws.addEventListener('close', () => {
        // 连接关闭时从列表中移除
        const index = webSockets.value.findIndex(w => w.ws === ws)
        if (index !== -1) {
          webSockets.value.splice(index, 1)
        }
      })

      webSockets.value.push({
        ws,
        description,
      })

      return ws
    } catch (error) {
      console.error(`Failed to create WebSocket ${description}:`, error)
      return null
    }
  }

  /**
   * 关闭WebSocket
   */
  const closeWebSocketSafe = (ws: WebSocket): void => {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close()
    }
  }

  /**
   * 添加清理任务
   */
  const addCleanupTask = (cleanup: () => void, description = 'cleanup task'): void => {
    cleanupTasks.value.push({
      description,
      cleanup,
    })
  }

  /**
   * 清理所有资源
   */
  const cleanupAll = (): void => {
    console.debug('开始清理内存泄漏防护资源...')

    // 清理定时器
    timers.value.forEach(timer => {
      clearTimeout(timer.id)
      console.debug(`清理定时器: ${timer.description}`)
    })
    timers.value = []

    // 清理事件监听器
    eventListeners.value.forEach(event => {
      event.target.removeEventListener(event.type, event.listener, event.options)
      console.debug(`清理事件监听器: ${event.description}`)
    })
    eventListeners.value = []

    // 清理WebSocket连接
    webSockets.value.forEach(ws => {
      if (ws.ws.readyState === WebSocket.OPEN) {
        ws.ws.close()
        console.debug(`清理WebSocket: ${ws.description}`)
      }
    })
    webSockets.value = []

    // 执行清理任务
    cleanupTasks.value.forEach(task => {
      try {
        task.cleanup()
        console.debug(`执行清理任务: ${task.description}`)
      } catch (error) {
        console.error(`清理任务执行失败 ${task.description}:`, error)
      }
    })
    cleanupTasks.value = []

    console.debug('内存泄漏防护资源清理完成')
  }

  /**
   * 获取当前资源使用情况（调试用）
   */
  const getResourceStats = () => ({
    timers: timers.value.length,
    eventListeners: eventListeners.value.length,
    webSockets: webSockets.value.length,
    cleanupTasks: cleanupTasks.value.length,
    total:
      timers.value.length +
      eventListeners.value.length +
      webSockets.value.length +
      cleanupTasks.value.length,
  })

  // 在组件卸载时自动清理
  onUnmounted(() => {
    cleanupAll()
  })

  return {
    // 定时器相关
    setTimeoutSafe,
    setIntervalSafe,
    clearTimeoutSafe,
    clearIntervalSafe,

    // 事件监听相关
    addEventListenerSafe,
    removeEventListenerSafe,

    // WebSocket相关
    createWebSocketSafe,
    closeWebSocketSafe,

    // 清理相关
    addCleanupTask,
    cleanupAll,
    getResourceStats,
  }
}
