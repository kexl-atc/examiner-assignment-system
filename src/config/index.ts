/**
 * 集中化配置管理
 * 统一管理应用的所有配置项
 */

// API配置
export const API_CONFIG = {
  // 后端服务配置
  BACKEND: {
    PORT: import.meta.env.VITE_BACKEND_PORT ? Number(import.meta.env.VITE_BACKEND_PORT) : 8081,
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost',
    TIMEOUT: import.meta.env.VITE_API_TIMEOUT ? Number(import.meta.env.VITE_API_TIMEOUT) : 30000,
    RETRY_COUNT: import.meta.env.VITE_API_RETRY_COUNT
      ? Number(import.meta.env.VITE_API_RETRY_COUNT)
      : 3,
  },

  // WebSocket配置
  WEBSOCKET: {
    PORT: import.meta.env.VITE_WS_PORT ? Number(import.meta.env.VITE_WS_PORT) : 8081,
    RECONNECT_INTERVAL: import.meta.env.VITE_WS_RECONNECT_INTERVAL
      ? Number(import.meta.env.VITE_WS_RECONNECT_INTERVAL)
      : 3000,
    MAX_RECONNECT_ATTEMPTS: import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS
      ? Number(import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS)
      : 5,
  },
}

// 缓存配置
export const CACHE_CONFIG = {
  TTL: import.meta.env.VITE_CACHE_TTL ? Number(import.meta.env.VITE_CACHE_TTL) : 300000, // 5分钟
  MAX_SIZE: import.meta.env.VITE_CACHE_MAX_SIZE ? Number(import.meta.env.VITE_CACHE_MAX_SIZE) : 100,
  CLEANUP_INTERVAL: import.meta.env.VITE_CACHE_CLEANUP_INTERVAL
    ? Number(import.meta.env.VITE_CACHE_CLEANUP_INTERVAL)
    : 60000, // 1分钟
}

// 约束条件配置
export const CONSTRAINT_CONFIG = {
  // 默认权重
  DEFAULT_WEIGHTS: {
    HC1: 1000, // 考官-时间段冲突
    HC2: 1000, // 考官-考场冲突
    HC3: 1000, // 考官-科目冲突
    HC4: 1000, // 考官-时间段不可用
    HC5: 1000, // 考官-连续考试间隔不足
    HC6: 1000, // 考场-时间冲突
    HC7: 1000, // 考场-容量冲突
    HC8: 3000, // 学生分配冲突（最重要）

    SC1: 100, // 考官偏好匹配
    SC2: 200, // 考官工作量均衡
    SC3: 150, // 考场利用率均衡
    SC4: 100, // 时间段分布均匀
    SC5: 120, // 科目类型分布均衡
    SC6: 80, // 考官专业匹配度
    SC7: 90, // 考试难度分布
    SC8: 110, // 连续考试安排优化
    SC9: 70, // 特殊需求满足
    SC10: 60, // 资源利用率
    SC11: 85, // 时间段偏好
    SC12: 75, // 考场设备匹配
    SC13: 95, // 监考安排优化
    SC14: 130, // 整体排班质量
  },

  // 约束验证阈值
  VALIDATION_THRESHOLDS: {
    MAX_HARD_CONSTRAINT_VIOLATIONS: 0,
    MAX_SOFT_SCORE_PENALTY: 10000,
    MIN_COMPLETION_RATE: 0.95,
  },
}

// 性能配置
export const PERFORMANCE_CONFIG = {
  // 前端性能
  FRONTEND: {
    LAZY_LOAD_THRESHOLD: import.meta.env.VITE_LAZY_LOAD_THRESHOLD
      ? Number(import.meta.env.VITE_LAZY_LOAD_THRESHOLD)
      : 50,
    DEBOUNCE_DELAY: import.meta.env.VITE_DEBOUNCE_DELAY
      ? Number(import.meta.env.VITE_DEBOUNCE_DELAY)
      : 300,
    ANIMATION_FRAME_RATE: import.meta.env.VITE_ANIMATION_FRAME_RATE
      ? Number(import.meta.env.VITE_ANIMATION_FRAME_RATE)
      : 60,
    MAX_CONCURRENT_REQUESTS: import.meta.env.VITE_MAX_CONCURRENT_REQUESTS
      ? Number(import.meta.env.VITE_MAX_CONCURRENT_REQUESTS)
      : 5,
  },

  // 内存管理
  MEMORY: {
    CLEANUP_INTERVAL: import.meta.env.VITE_MEMORY_CLEANUP_INTERVAL
      ? Number(import.meta.env.VITE_MEMORY_CLEANUP_INTERVAL)
      : 60000,
    WARNING_THRESHOLD_MB: import.meta.env.VITE_MEMORY_WARNING_THRESHOLD
      ? Number(import.meta.env.VITE_MEMORY_WARNING_THRESHOLD)
      : 100,
    CRITICAL_THRESHOLD_MB: import.meta.env.VITE_MEMORY_CRITICAL_THRESHOLD
      ? Number(import.meta.env.VITE_MEMORY_CRITICAL_THRESHOLD)
      : 200,
  },
}

// UI配置
export const UI_CONFIG = {
  // 主题配置
  THEME: {
    PRIMARY_COLOR: '#3b82f6',
    SECONDARY_COLOR: '#8b5cf6',
    SUCCESS_COLOR: '#10b981',
    WARNING_COLOR: '#f59e0b',
    ERROR_COLOR: '#ef4444',
  },

  // 布局配置
  LAYOUT: {
    SIDEBAR_WIDTH: import.meta.env.VITE_SIDEBAR_WIDTH
      ? Number(import.meta.env.VITE_SIDEBAR_WIDTH)
      : 250,
    HEADER_HEIGHT: import.meta.env.VITE_HEADER_HEIGHT
      ? Number(import.meta.env.VITE_HEADER_HEIGHT)
      : 64,
    CONTENT_PADDING: import.meta.env.VITE_CONTENT_PADDING
      ? Number(import.meta.env.VITE_CONTENT_PADDING)
      : 16,
  },

  // 分页配置
  PAGINATION: {
    DEFAULT_PAGE_SIZE: import.meta.env.VITE_DEFAULT_PAGE_SIZE
      ? Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE)
      : 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    MAX_PAGE_SIZE: 200,
  },
}

// 安全配置
export const SECURITY_CONFIG = {
  // CSP配置
  CSP: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'ws:', 'wss:'],
  },

  // 输入验证
  VALIDATION: {
    MAX_INPUT_LENGTH: 1000,
    ALLOWED_HTML_TAGS: ['b', 'i', 'em', 'strong', 'span', 'br'],
    XSS_PATTERNS: [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ],
  },
}

// 开发环境配置
export const DEV_CONFIG = {
  // 调试配置
  DEBUG: {
    ENABLE_LOGGING: import.meta.env.DEV,
    LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'debug',
    ENABLE_PERFORMANCE_MONITORING: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
  },

  // 模拟数据
  MOCK: {
    ENABLE_MOCK_DATA: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true',
    MOCK_API_DELAY: import.meta.env.VITE_MOCK_API_DELAY
      ? Number(import.meta.env.VITE_MOCK_API_DELAY)
      : 1000,
  },
}

// 导出所有配置
export const CONFIG = {
  API: API_CONFIG,
  CACHE: CACHE_CONFIG,
  CONSTRAINT: CONSTRAINT_CONFIG,
  PERFORMANCE: PERFORMANCE_CONFIG,
  UI: UI_CONFIG,
  SECURITY: SECURITY_CONFIG,
  DEV: DEV_CONFIG,
}

// 获取环境特定的配置
export function getEnvConfig() {
  const isDev = import.meta.env.DEV
  const isProd = import.meta.env.PROD

  return {
    isDev,
    isProd,
    mode: import.meta.env.MODE,
    apiBaseUrl: isDev ? API_CONFIG.BACKEND.BASE_URL : window.location.origin,
    enableDebugMode: isDev && DEV_CONFIG.DEBUG.ENABLE_LOGGING,
  }
}

// 验证配置有效性
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证API配置
  if (API_CONFIG.BACKEND.PORT < 1 || API_CONFIG.BACKEND.PORT > 65535) {
    errors.push('后端端口配置无效')
  }

  if (API_CONFIG.BACKEND.TIMEOUT < 1000) {
    errors.push('API超时时间过短')
  }

  // 验证缓存配置
  if (CACHE_CONFIG.TTL < 1000) {
    errors.push('缓存TTL过短')
  }

  if (CACHE_CONFIG.MAX_SIZE < 10) {
    errors.push('缓存大小配置过小')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export default CONFIG
