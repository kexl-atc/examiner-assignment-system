import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const frontendLogForwardingEnabled =
  (import.meta as any).env?.DEV || localStorage.getItem('frontend_log_forwarding') === '1'

const safeStringify = (value: any): string => {
  if (typeof value === 'string') return value
  try {
    const s = JSON.stringify(value)
    return typeof s === 'string' ? s : String(value)
  } catch {
    try {
      return String(value)
    } catch {
      return '[unserializable]'
    }
  }
}

const sendFrontendLog = (level: string, message: string, context?: any) => {
  if (!frontendLogForwardingEnabled) return
  try {
    const msg = message && message.length > 8000 ? message.slice(0, 8000) : message
    const ctx = context ? safeStringify(context) : ''
    fetch('/api/logs/frontend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message: msg,
        timestamp: new Date().toISOString(),
        context: ctx && ctx.length > 8000 ? ctx.slice(0, 8000) : ctx,
      }),
    }).catch(() => {})
  } catch {
    // ignore
  }
}

if (frontendLogForwardingEnabled) {
  const origError = console.error.bind(console)
  const origWarn = console.warn.bind(console)

  console.error = (...args: any[]) => {
    origError(...args)
    sendFrontendLog('ERROR', args.map(a => safeStringify(a)).join(' '))
  }

  console.warn = (...args: any[]) => {
    origWarn(...args)
    sendFrontendLog('WARN', args.map(a => safeStringify(a)).join(' '))
  }
}

// 🛡️ 全局错误处理：忽略浏览器扩展引起的错误
// 这个错误通常由 Vue DevTools 等浏览器扩展触发，不影响应用功能
window.addEventListener('unhandledrejection', event => {
  const errorMessage = event.reason?.message || ''

  // 忽略浏览器扩展的消息通道错误
  if (
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('Extension context invalidated')
  ) {
    event.preventDefault()
    console.debug('🔧 已忽略浏览器扩展错误:', errorMessage)
    return
  }
})

// ====== 调试信息开始 ======
process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('🎯 [main.ts] 脚本开始执行')
process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('🎯 [main.ts] Vue版本:', createApp.name)
process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('🎯 [main.ts] Router:', router)
process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('🎯 [main.ts] #app元素:', document.getElementById('app'))

// 添加全局错误捕获
window.addEventListener('error', e => {
  console.error('🔥 [全局错误]', {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    error: e.error,
  })
  sendFrontendLog('ERROR', 'window.error', {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    error: e.error ? String(e.error) : '',
  })
})

window.addEventListener('unhandledrejection', e => {
  const errorMessage = (e as any).reason?.message || ''
  if (
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('Extension context invalidated')
  ) {
    return
  }
  console.error('🔥 [未处理的Promise]', e.reason)
  sendFrontendLog('ERROR', 'unhandledrejection', {
    reason: e.reason ? (typeof e.reason === 'string' ? e.reason : JSON.stringify(e.reason)) : '',
  })
})

process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('🎯 [main.ts] 准备创建Vue应用...')
// ====== 调试信息结束 ======

// 创建应用实例
const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用插件
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 挂载应用

app.mount('#app')
process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('✅ [main.ts] Vue应用已成功挂载到#app')
process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('✅ [main.ts] App实例:', app)
