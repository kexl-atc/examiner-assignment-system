/**
 * 🚀 v6.1.3优化: 优化模块初始化器
 * 确保所有优化模块在系统启动时正确初始化
 */

// 第四阶段：监控系统
import { performanceMonitor } from './enhancedPerformanceMonitor'
import { errorTracker } from './errorTracker'
import { logger } from './enhancedLogger'
import { alertSystem } from './alertSystem'

// 机器学习模块
import { learningEngine } from './ml/learningEngine'
import { adaptiveOptimizer } from './ml/adaptiveOptimizer'
import { anomalyDetector } from './ml/anomalyDetector'

// 内存分析器
import { memoryAnalyzer } from './memoryAnalyzer'

// 第二阶段：错误处理和响应格式化（已在api-service中集成）
// 第三阶段：Toast通知（已在App.vue中集成）

/**
 * 初始化所有优化模块
 */
export function initializeOptimizations(): void {
  console.log('🚀 [优化初始化] 开始初始化所有优化模块...')

  try {
    // 1. 初始化性能监控
    console.log('📊 [优化初始化] 初始化性能监控系统...')
    // performanceMonitor 已在导入时自动初始化
    // 添加默认告警规则（使用 addRule 方法）
    alertSystem.addRule({
      metric: '内存使用',
      threshold: 100, // MB
      operator: 'gt',
      severity: 'warning',
      message: '内存使用超过100MB',
      enabled: true,
      cooldown: 60000, // 1分钟
    })

    // 2. 初始化错误追踪
    console.log('🔍 [优化初始化] 初始化错误追踪系统...')
    // errorTracker 已在导入时自动初始化
    // 注册错误处理器
    errorTracker.onError((error) => {
      logger.error('系统错误', 'error-tracker', error)
      // 可以在这里发送错误到服务器
    })

    // 3. 初始化日志系统
    console.log('📝 [优化初始化] 初始化日志系统...')
    logger.configure({
      minLevel: process.env.NODE_ENV === 'development' ? 0 : 1, // 开发环境显示DEBUG
      enableConsole: true,
      enableRemote: false, // 可根据需要启用
      maxEntries: 1000,
    })
    logger.info('系统启动', 'system', { timestamp: new Date().toISOString() })

    // 4. 初始化机器学习模块
    console.log('🤖 [优化初始化] 初始化机器学习模块...')
    // learningEngine 已在导入时自动初始化
    // adaptiveOptimizer 已在导入时自动初始化
    // anomalyDetector 已在导入时自动初始化

    // 配置自适应优化器
    adaptiveOptimizer.configure({
      enabled: true,
      optimizationInterval: 24 * 60 * 60 * 1000, // 24小时
      minSamples: 100,
      learningRate: 0.01,
      targets: [
        { metric: 'acceptanceRate', target: 0.8, weight: 0.4 },
        { metric: 'satisfactionScore', target: 4.0, weight: 0.3 },
        { metric: 'averageScore', target: 80, weight: 0.3 },
      ],
    })

    // 配置异常检测
    anomalyDetector.configure({
      outlierThreshold: 2.5,
      patternBreakWindow: 7,
      performanceThreshold: 0.2,
      minSamples: 10,
    })

    // 6. 启动内存分析
    console.log('🔍 [优化初始化] 启动内存分析...')
    memoryAnalyzer.startAnalysis(30000) // 每30秒分析一次

    // 5. 全局错误处理集成
    if (typeof window !== 'undefined') {
      // 集成错误追踪到全局错误处理
      window.addEventListener('error', (event) => {
        errorTracker.track(event.error || new Error(event.message), {
          url: event.filename || window.location.href,
          userAgent: navigator.userAgent,
        })
      })

      window.addEventListener('unhandledrejection', (event) => {
        errorTracker.track(
          event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason)),
          {
            url: window.location.href,
            userAgent: navigator.userAgent,
          }
        )
      })
    }

    console.log('✅ [优化初始化] 所有优化模块初始化完成')
    logger.info('优化模块初始化完成', 'system')
  } catch (error) {
    console.error('❌ [优化初始化] 初始化失败:', error)
    logger.error('优化模块初始化失败', 'system', error as Error)
  }
}

/**
 * 获取优化模块状态
 */
export function getOptimizationStatus(): {
  performanceMonitor: boolean
  errorTracker: boolean
  logger: boolean
  alertSystem: boolean
  learningEngine: boolean
  adaptiveOptimizer: boolean
  anomalyDetector: boolean
} {
  return {
    performanceMonitor: performanceMonitor !== undefined,
    errorTracker: errorTracker !== undefined,
    logger: logger !== undefined,
    alertSystem: alertSystem !== undefined,
    learningEngine: learningEngine !== undefined,
    adaptiveOptimizer: adaptiveOptimizer !== undefined,
    anomalyDetector: anomalyDetector !== undefined,
  }
}

/**
 * 定期运行优化任务
 */
export function startOptimizationTasks(): void {
  // 定期检测异常
  setInterval(() => {
    try {
      const anomalies = anomalyDetector.detectAll()
      if (anomalies.length > 0) {
        logger.warn(`检测到${anomalies.length}个异常`, 'anomaly-detector', { anomalies })
        
        // 触发告警
        anomalies.forEach(anomaly => {
          if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
            alertSystem.check('异常检测', anomaly.confidence * 100)
          }
        })
      }
    } catch (error) {
      logger.error('异常检测失败', 'anomaly-detector', error as Error)
    }
  }, 5 * 60 * 1000) // 每5分钟检测一次

  // 定期检查是否需要优化
  setInterval(() => {
    try {
      if (adaptiveOptimizer.shouldOptimize()) {
        logger.info('开始自适应优化', 'adaptive-optimizer')
        const result = adaptiveOptimizer.optimize()
        
        if (result.success) {
          logger.info('自适应优化成功', 'adaptive-optimizer', result)
        } else {
          logger.warn('自适应优化未产生改进', 'adaptive-optimizer', result)
        }
      }
    } catch (error) {
      logger.error('自适应优化失败', 'adaptive-optimizer', error as Error)
    }
  }, 60 * 60 * 1000) // 每小时检查一次

  // 定期记录性能指标
  setInterval(() => {
    try {
      const stats = performanceMonitor.getStatistics()
      logger.debug('性能统计', 'performance-monitor', stats)
    } catch (error) {
      // 静默失败
    }
  }, 30 * 1000) // 每30秒记录一次
}

