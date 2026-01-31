/**
 * 性能监控配置
 * 统一的性能监控和优化配置
 */

// 性能监控配置
export const PERFORMANCE_CONFIG = {
  // 监控阈值
  thresholds: {
    // 首次内容绘制 (FCP) - 1.8秒
    fcp: 1800,

    // 最大内容绘制 (LCP) - 2.5秒
    lcp: 2500,

    // 首次输入延迟 (FID) - 100毫秒
    fid: 100,

    // 累积布局偏移 (CLS) - 0.1
    cls: 0.1,

    // 内存使用率 - 80%
    memoryUsage: 80,

    // JavaScript执行时间 - 50毫秒
    jsExecutionTime: 50
  },

  // 监控间隔
  intervals: {
    // 内存监控间隔
    memory: 5000, // 5秒

    // 性能指标监控间隔
    metrics: 10000, // 10秒

    // 网络请求监控间隔
    network: 30000 // 30秒
  },

  // 报告配置
  reporting: {
    // 是否启用自动报告
    enabled: process.env.NODE_ENV === 'production',

    // 报告端点
    endpoint: '/api/performance/report',

    // 批量报告大小
    batchSize: 10,

    // 报告间隔
    interval: 60000 // 1分钟
  }
}

// 缓存配置
export const CACHE_CONFIG = {
  // 默认缓存时间
  defaultTTL: 5 * 60 * 1000, // 5分钟

  // 不同类型数据的缓存时间
  ttl: {
    // 用户数据 - 10分钟
    userData: 10 * 60 * 1000,

    // 配置数据 - 30分钟
    config: 30 * 60 * 1000,

    // 静态数据 - 1小时
    static: 60 * 60 * 1000,

    // 临时数据 - 1分钟
    temporary: 60 * 1000
  },

  // 最大缓存大小
  maxSize: 100, // 最多缓存100个条目

  // 清理策略
  cleanup: {
    // 清理间隔
    interval: 10 * 60 * 1000, // 10分钟

    // 清理策略
    strategy: 'lru' // 最近最少使用
  }
}

// 网络请求配置
export const NETWORK_CONFIG = {
  // 默认超时时间
  timeout: 10000, // 10秒

  // 重试配置
  retry: {
    // 最大重试次数
    maxAttempts: 3,

    // 重试延迟
    delay: 1000, // 1秒

    // 指数退避
    exponentialBackoff: true
  },

  // 请求缓存
  cache: {
    // 缓存GET请求
    getRequests: true,

    // 缓存时间
    ttl: 5 * 60 * 1000 // 5分钟
  },

  // 并发限制
  concurrency: {
    // 最大并发请求数
    maxConcurrent: 6,

    // 队列大小
    queueSize: 100
  }
}

// 组件懒加载配置
export const LAZY_LOADING_CONFIG = {
  // 预加载策略
  preload: {
    // 预加载触发距离
    distance: 200, // 200px

    // 预加载延迟
    delay: 100 // 100ms
  },

  // 骨架屏配置
  skeleton: {
    // 启用骨架屏
    enabled: true,

    // 骨架屏动画
    animated: true,

    // 骨架屏颜色
    color: '#f0f0f0'
  },

  // 错误处理
  error: {
    // 错误重试次数
    retryAttempts: 3,

    // 错误显示时间
    displayTime: 5000 // 5秒
  }
}

// 虚拟滚动配置
export const VIRTUAL_SCROLL_CONFIG = {
  // 项目高度
  itemHeight: 40,

  // 缓冲区大小
  bufferSize: 10,

  // 预渲染项目数
  prerender: 20,

  // 滚动阈值
  scrollThreshold: 100
}

// 图片优化配置
export const IMAGE_CONFIG = {
  // 懒加载
  lazy: {
    enabled: true,
    threshold: 200
  },

  // 压缩配置
  compression: {
    quality: 0.8,
    progressive: true
  },

  // 格式支持
  formats: {
    webp: true,
    avif: true,
    fallback: 'jpeg'
  },

  // 尺寸配置
  sizes: {
    thumbnail: { width: 100, height: 100 },
    small: { width: 300, height: 300 },
    medium: { width: 800, height: 600 },
    large: { width: 1200, height: 900 }
  }
}

// 开发工具配置
export const DEVTOOLS_CONFIG = {
  // 性能分析
  profiling: {
    enabled: process.env.NODE_ENV === 'development',
    autoStart: false,
    maxRecords: 1000
  },

  // 组件检查
  componentInspector: {
    enabled: true,
    highlightUpdates: true,
    trackComponents: true
  },

  // 网络监控
  networkMonitor: {
    enabled: true,
    logRequests: true,
    logResponses: false
  }
}

export default {
  PERFORMANCE_CONFIG,
  CACHE_CONFIG,
  NETWORK_CONFIG,
  LAZY_LOADING_CONFIG,
  VIRTUAL_SCROLL_CONFIG,
  IMAGE_CONFIG,
  DEVTOOLS_CONFIG
}
