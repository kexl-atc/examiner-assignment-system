/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '../pages/StatisticsPage.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 扩展 import.meta.env 类型
interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string
  readonly VITE_BACKEND_URL?: string
  readonly VITE_WS_URL?: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Electron API 类型定义
interface ElectronAPI {
  // 文件操作
  saveBackup: (filename: string, data: any) => Promise<any>
  loadBackup: () => Promise<any>
  exportExcel: (filename: string, data: any) => Promise<any>

  // 应用信息
  getAppInfo: () => Promise<any>
  getBackendStatus?: () => Promise<any>
  getBackendPort: () => Promise<number>
  onBackendReady: (callback: Function) => void
  showMessageBox: (options: any) => Promise<any>

  // 窗口控制
  minimizeWindow: () => void
  toggleMaximize: () => void
  closeWindow: () => void
  restartApp: () => void

  // 环境检测
  isElectron: boolean
  platform: string
  arch: string

  // 实用工具
  openExternal: (url: string) => void
  showNotification: (title: string, body: string, options?: any) => Notification | null
  requestNotificationPermission: () => Promise<NotificationPermission>
}

interface NodeVersions {
  node: string
  chrome: string
  electron: string
  v8: string
}

interface Env {
  NODE_ENV: string
  platform: string
  arch: string
}

// 全局类型声明
declare global {
  interface Window {
    electronAPI?: ElectronAPI
    nodeVersions?: NodeVersions
    env?: Env
  }
}

// 确保这个文件被当作模块处理
export {}
