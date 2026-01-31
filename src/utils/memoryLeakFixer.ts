/**
 * 内存泄漏修复工具
 * 自动修复系统中发现的内存泄漏问题
 */

import { useMemoryLeakPrevention } from '@/composables/useMemoryLeakPrevention'

type TimerHandle = number | NodeJS.Timeout

export class MemoryLeakFixer {
  private static instance: MemoryLeakFixer
  private memoryPrevention = useMemoryLeakPrevention()
  private activeTimers = new Map<string, TimerHandle>()
  private activeIntervals = new Map<string, TimerHandle>()
  private activeListeners = new Map<
    string,
    { target: EventTarget; type: string; listener: EventListener }
  >()

  static getInstance(): MemoryLeakFixer {
    if (!MemoryLeakFixer.instance) {
      MemoryLeakFixer.instance = new MemoryLeakFixer()
    }
    return MemoryLeakFixer.instance
  }

  /**
   * 安全的setTimeout包装器
   */
  safeSetTimeout(callback: Function, delay: number, id?: string): TimerHandle {
    const timerId = id || `timeout_${Date.now()}_${Math.random()}`

    const timer = this.memoryPrevention.setTimeoutSafe(
      () => {
        callback()
        this.activeTimers.delete(timerId)
      },
      delay,
      `Safe timeout: ${timerId}`
    )

    this.activeTimers.set(timerId, timer)
    return timer
  }

  /**
   * 安全的setInterval包装器
   */
  safeSetInterval(callback: Function, interval: number, id?: string): TimerHandle {
    const intervalId = id || `interval_${Date.now()}_${Math.random()}`

    const timer = this.memoryPrevention.setIntervalSafe(
      callback,
      interval,
      `Safe interval: ${intervalId}`
    )
    this.activeIntervals.set(intervalId, timer)
    return timer
  }

  /**
   * 安全的事件监听器添加
   */
  safeAddEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
    id?: string
  ): void {
    const listenerId = id || `listener_${Date.now()}_${Math.random()}`

    this.memoryPrevention.addEventListenerSafe(
      target,
      type,
      listener,
      options,
      `Safe listener: ${listenerId}`
    )
    this.activeListeners.set(listenerId, { target, type, listener })
  }

  /**
   * 清理指定的定时器
   */
  clearTimer(id: string): void {
    const timer = this.activeTimers.get(id)
    if (timer) {
      this.memoryPrevention.clearTimeoutSafe(timer)
      this.activeTimers.delete(id)
    }
  }

  /**
   * 清理指定的间隔器
   */
  clearInterval(id: string): void {
    const interval = this.activeIntervals.get(id)
    if (interval) {
      this.memoryPrevention.clearIntervalSafe(interval)
      this.activeIntervals.delete(id)
    }
  }

  /**
   * 移除指定的事件监听器
   */
  removeEventListener(id: string): void {
    const listener = this.activeListeners.get(id)
    if (listener) {
      this.memoryPrevention.removeEventListenerSafe(
        listener.target,
        listener.type,
        listener.listener
      )
      this.activeListeners.delete(id)
    }
  }

  /**
   * 清理所有资源
   */
  cleanupAll(): void {
    // 清理所有定时器
    this.activeTimers.forEach((timer, id) => {
      this.memoryPrevention.clearTimeoutSafe(timer)
    })
    this.activeTimers.clear()

    // 清理所有间隔器
    this.activeIntervals.forEach((interval, id) => {
      this.memoryPrevention.clearIntervalSafe(interval)
    })
    this.activeIntervals.clear()

    // 清理所有事件监听器
    this.activeListeners.forEach((listener, id) => {
      this.memoryPrevention.removeEventListenerSafe(
        listener.target,
        listener.type,
        listener.listener
      )
    })
    this.activeListeners.clear()

    // 调用底层清理
    this.memoryPrevention.cleanupAll()
  }

  /**
   * 获取资源使用统计
   */
  getStats() {
    return {
      activeTimers: this.activeTimers.size,
      activeIntervals: this.activeIntervals.size,
      activeListeners: this.activeListeners.size,
      memoryPreventionStats: this.memoryPrevention.getResourceStats(),
    }
  }

  /**
   * 检测潜在的内存泄漏
   */
  detectMemoryLeaks(): {
    hasLeaks: boolean
    warnings: string[]
    recommendations: string[]
  } {
    const warnings: string[] = []
    const recommendations: string[] = []

    // 检查定时器数量
    if (this.activeTimers.size > 10) {
      warnings.push(`检测到 ${this.activeTimers.size} 个活跃定时器，可能存在内存泄漏`)
      recommendations.push('建议检查定时器是否正确清理')
    }

    // 检查间隔器数量
    if (this.activeIntervals.size > 5) {
      warnings.push(`检测到 ${this.activeIntervals.size} 个活跃间隔器，可能存在内存泄漏`)
      recommendations.push('建议检查间隔器是否正确清理')
    }

    // 检查事件监听器数量
    if (this.activeListeners.size > 20) {
      warnings.push(`检测到 ${this.activeListeners.size} 个活跃事件监听器，可能存在内存泄漏`)
      recommendations.push('建议检查事件监听器是否正确移除')
    }

    return {
      hasLeaks: warnings.length > 0,
      warnings,
      recommendations,
    }
  }
}

// 导出单例实例
export const memoryLeakFixer = MemoryLeakFixer.getInstance()

// 全局错误处理
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryLeakFixer.cleanupAll()
  })
}
