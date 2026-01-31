/**
 * 🚀 v6.1.3优化: 撤销/重做功能工具
 * 提供通用的撤销/重做功能，支持任意数据类型的操作历史管理
 */

export interface HistoryItem<T = any> {
  state: T
  timestamp: number
  description?: string
}

/**
 * 撤销/重做管理器
 */
export class UndoRedoManager<T = any> {
  private history: HistoryItem<T>[] = []
  private currentIndex: number = -1
  private maxHistorySize: number = 50

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize
  }

  /**
   * 添加状态到历史记录
   */
  push(state: T, description?: string): void {
    // 如果当前不在历史记录的末尾，删除后面的记录
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1)
    }

    // 添加新状态
    this.history.push({
      state: this.cloneState(state),
      timestamp: Date.now(),
      description,
    })

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    } else {
      this.currentIndex++
    }
  }

  /**
   * 撤销操作
   */
  undo(): T | null {
    if (!this.canUndo()) {
      return null
    }

    this.currentIndex--
    return this.cloneState(this.history[this.currentIndex].state)
  }

  /**
   * 重做操作
   */
  redo(): T | null {
    if (!this.canRedo()) {
      return null
    }

    this.currentIndex++
    return this.cloneState(this.history[this.currentIndex].state)
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex > 0
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): T | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      return null
    }
    return this.cloneState(this.history[this.currentIndex].state)
  }

  /**
   * 获取历史记录信息
   */
  getHistoryInfo(): {
    total: number
    current: number
    canUndo: boolean
    canRedo: boolean
  } {
    return {
      total: this.history.length,
      current: this.currentIndex + 1,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    }
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
  }

  /**
   * 克隆状态（深拷贝）
   */
  private cloneState(state: T): T {
    if (state === null || typeof state !== 'object') {
      return state
    }

    try {
      return JSON.parse(JSON.stringify(state)) as T
    } catch {
      // 如果无法序列化，返回原状态（浅拷贝）
      if (Array.isArray(state)) {
        return [...state] as T
      }
      return { ...state } as T
    }
  }
}

/**
 * 创建撤销/重做管理器实例
 */
export function createUndoRedoManager<T>(maxHistorySize?: number): UndoRedoManager<T> {
  return new UndoRedoManager<T>(maxHistorySize)
}

