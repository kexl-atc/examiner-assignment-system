/**
 * 🚀 v6.1.3优化: Toast通知 Composable
 * 提供便捷的Toast通知功能
 */

import { ElMessage, ElNotification } from 'element-plus'

export interface ToastOptions {
  duration?: number
  showClose?: boolean
  dangerouslyUseHTMLString?: boolean
}

/**
 * Toast通知工具
 */
export function useToast() {
  const success = (message: string, options?: ToastOptions) => {
    ElMessage({
      message,
      type: 'success',
      duration: options?.duration || 3000,
      showClose: options?.showClose,
      dangerouslyUseHTMLString: options?.dangerouslyUseHTMLString,
    })
  }

  const warning = (message: string, options?: ToastOptions) => {
    ElMessage({
      message,
      type: 'warning',
      duration: options?.duration || 3000,
      showClose: options?.showClose,
      dangerouslyUseHTMLString: options?.dangerouslyUseHTMLString,
    })
  }

  const error = (message: string, options?: ToastOptions) => {
    ElMessage({
      message,
      type: 'error',
      duration: options?.duration || 5000,
      showClose: options?.showClose,
      dangerouslyUseHTMLString: options?.dangerouslyUseHTMLString,
    })
  }

  const info = (message: string, options?: ToastOptions) => {
    ElMessage({
      message,
      type: 'info',
      duration: options?.duration || 3000,
      showClose: options?.showClose,
      dangerouslyUseHTMLString: options?.dangerouslyUseHTMLString,
    })
  }

  const notification = {
    success: (title: string, message?: string, options?: ToastOptions) => {
      ElNotification({
        title,
        message: message || '',
        type: 'success',
        duration: options?.duration || 4500,
      })
    },
    warning: (title: string, message?: string, options?: ToastOptions) => {
      ElNotification({
        title,
        message: message || '',
        type: 'warning',
        duration: options?.duration || 4500,
      })
    },
    error: (title: string, message?: string, options?: ToastOptions) => {
      ElNotification({
        title,
        message: message || '',
        type: 'error',
        duration: options?.duration || 0, // 错误通知默认不自动关闭
      })
    },
    info: (title: string, message?: string, options?: ToastOptions) => {
      ElNotification({
        title,
        message: message || '',
        type: 'info',
        duration: options?.duration || 4500,
      })
    },
  }

  return {
    success,
    warning,
    error,
    info,
    notification,
  }
}

