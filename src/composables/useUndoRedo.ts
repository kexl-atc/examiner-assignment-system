/**
 * 🚀 v6.1.3优化: 撤销/重做 Composable
 * 提供Vue组合式API的撤销/重做功能
 */

import { ref, computed } from 'vue'
import { UndoRedoManager, createUndoRedoManager } from '../utils/undoRedo'

export function useUndoRedo<T = any>(initialState?: T, maxHistorySize?: number) {
  const manager = ref<UndoRedoManager<T>>(createUndoRedoManager<T>(maxHistorySize))
  const currentState = ref<T | null>(initialState || null)

  // 初始化时添加初始状态
  if (initialState !== undefined) {
    manager.value.push(initialState, '初始状态')
  }

  const canUndo = computed(() => manager.value.canUndo())
  const canRedo = computed(() => manager.value.canRedo())

  const historyInfo = computed(() => manager.value.getHistoryInfo())

  const push = (state: T, description?: string) => {
    manager.value.push(state, description)
    currentState.value = manager.value.getCurrentState()
  }

  const undo = () => {
    const state = manager.value.undo()
    if (state !== null) {
      currentState.value = state
    }
    return state
  }

  const redo = () => {
    const state = manager.value.redo()
    if (state !== null) {
      currentState.value = state
    }
    return state
  }

  const clear = () => {
    manager.value.clear()
    currentState.value = null
  }

  return {
    currentState,
    canUndo,
    canRedo,
    historyInfo,
    push,
    undo,
    redo,
    clear,
  }
}

