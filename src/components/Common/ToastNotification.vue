<template>
  <transition-group name="toast" tag="div" class="toast-container">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      :class="['toast', toast.type]"
      @click="removeToast(toast.id)"
    >
      <el-icon class="toast-icon">
        <component :is="getIcon(toast.type)" />
      </el-icon>
      <div class="toast-content">
        <div class="toast-title">{{ toast.title }}</div>
        <div v-if="toast.message" class="toast-message">{{ toast.message }}</div>
      </div>
      <el-icon class="toast-close" @click.stop="removeToast(toast.id)">
        <Close />
      </el-icon>
    </div>
  </transition-group>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Close, SuccessFilled, WarningFilled, InfoFilled, CircleCloseFilled } from '@element-plus/icons-vue'

export interface Toast {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message?: string
  duration?: number
}

const toasts = ref<Toast[]>([])

const getIcon = (type: Toast['type']) => {
  const icons = {
    success: SuccessFilled,
    warning: WarningFilled,
    error: CircleCloseFilled,
    info: InfoFilled,
  }
  return icons[type]
}

const removeToast = (id: string) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const newToast: Toast = {
    id,
    ...toast,
    duration: toast.duration || 3000,
  }

  toasts.value.push(newToast)

  // 自动移除
  const duration = newToast.duration ?? 0
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  return id
}

// 导出方法供外部使用
defineExpose({
  addToast,
  removeToast,
  clear: () => {
    toasts.value = []
  },
})

// 全局方法（可选）
if (typeof window !== 'undefined') {
  ;(window as any).__toastNotification = {
    addToast,
    success: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'success', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'warning', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'error', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'info', title, message, duration }),
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 300px;
  max-width: 500px;
  padding: 16px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toast:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.toast.success {
  border-left: 4px solid var(--el-color-success);
}

.toast.warning {
  border-left: 4px solid var(--el-color-warning);
}

.toast.error {
  border-left: 4px solid var(--el-color-danger);
}

.toast.info {
  border-left: 4px solid var(--el-color-info);
}

.toast-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.toast.success .toast-icon {
  color: var(--el-color-success);
}

.toast.warning .toast-icon {
  color: var(--el-color-warning);
}

.toast.error .toast-icon {
  color: var(--el-color-danger);
}

.toast.info .toast-icon {
  color: var(--el-color-info);
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.toast-message {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  word-wrap: break-word;
}

.toast-close {
  font-size: 16px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 2px;
  transition: color 0.2s;
}

.toast-close:hover {
  color: var(--el-text-color-primary);
}

/* 过渡动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>

