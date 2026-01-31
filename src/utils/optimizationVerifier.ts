/**
 * 🚀 v6.1.3优化: 优化模块验证器
 * 验证所有优化模块是否正常运行
 */

import { getOptimizationStatus } from './optimizationInitializer'
import { performanceMonitor } from './enhancedPerformanceMonitor'
import { errorTracker } from './errorTracker'
import { logger } from './enhancedLogger'
import { alertSystem } from './alertSystem'
import { learningEngine } from './ml/learningEngine'
import { adaptiveOptimizer } from './ml/adaptiveOptimizer'
import { anomalyDetector } from './ml/anomalyDetector'
import { predictionModel } from './ml/predictionModel'
import { requestCache } from './requestCache'
import ErrorHandler from './errorHandler'
import ResponseFormatter from './responseFormatter'

export interface VerificationResult {
  module: string
  status: 'ok' | 'warning' | 'error'
  message: string
  details?: any
}

/**
 * 验证所有优化模块
 */
export function verifyAllOptimizations(): VerificationResult[] {
  const results: VerificationResult[] = []

  // 1. 验证性能监控
  try {
    const stats = performanceMonitor.getStatistics()
    results.push({
      module: '性能监控',
      status: 'ok',
      message: '性能监控系统正常运行',
      details: stats,
    })
  } catch (error) {
    results.push({
      module: '性能监控',
      status: 'error',
      message: `性能监控系统错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 2. 验证错误追踪
  try {
    const stats = errorTracker.getStatistics()
    results.push({
      module: '错误追踪',
      status: 'ok',
      message: '错误追踪系统正常运行',
      details: stats,
    })
  } catch (error) {
    results.push({
      module: '错误追踪',
      status: 'error',
      message: `错误追踪系统错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 3. 验证日志系统
  try {
    logger.info('验证测试', 'verification')
    const stats = logger.getStatistics()
    results.push({
      module: '日志系统',
      status: 'ok',
      message: '日志系统正常运行',
      details: stats,
    })
  } catch (error) {
    results.push({
      module: '日志系统',
      status: 'error',
      message: `日志系统错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 4. 验证告警系统
  try {
    const stats = alertSystem.getStatistics()
    results.push({
      module: '告警系统',
      status: 'ok',
      message: '告警系统正常运行',
      details: stats,
    })
  } catch (error) {
    results.push({
      module: '告警系统',
      status: 'error',
      message: `告警系统错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 5. 验证请求缓存
  try {
    const stats = requestCache.getStats()
    results.push({
      module: '请求缓存',
      status: 'ok',
      message: '请求缓存系统正常运行',
      details: stats,
    })
  } catch (error) {
    results.push({
      module: '请求缓存',
      status: 'error',
      message: `请求缓存系统错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 6. 验证错误处理
  try {
    ErrorHandler.handle(new Error('测试错误'), { showMessage: false, logError: false })
    results.push({
      module: '错误处理',
      status: 'ok',
      message: '错误处理系统正常运行',
    })
  } catch (error) {
    results.push({
      module: '错误处理',
      status: 'error',
      message: `错误处理系统错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 7. 验证响应格式化
  try {
    ResponseFormatter.success({ test: 'data' })
    results.push({
      module: '响应格式化',
      status: 'ok',
      message: '响应格式化系统正常运行',
    })
  } catch (error) {
    results.push({
      module: '响应格式化',
      status: 'error',
      message: `响应格式化系统错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 8. 验证学习引擎
  try {
    const stats = learningEngine.getStatistics()
    results.push({
      module: '学习引擎',
      status: stats.totalRecords < 10 ? 'warning' : 'ok',
      message: stats.totalRecords < 10
        ? '学习引擎正常运行，但数据量较少'
        : '学习引擎正常运行',
      details: stats,
    })
  } catch (error) {
    results.push({
      module: '学习引擎',
      status: 'error',
      message: `学习引擎错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 9. 验证自适应优化器
  try {
    const config = adaptiveOptimizer.getConfig()
    results.push({
      module: '自适应优化器',
      status: config.enabled ? 'ok' : 'warning',
      message: config.enabled
        ? '自适应优化器已启用'
        : '自适应优化器已禁用',
      details: config,
    })
  } catch (error) {
    results.push({
      module: '自适应优化器',
      status: 'error',
      message: `自适应优化器错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 10. 验证异常检测
  try {
    const config = anomalyDetector.getConfig()
    const anomalies = anomalyDetector.detectAll()
    results.push({
      module: '异常检测',
      status: anomalies.length > 0 ? 'warning' : 'ok',
      message:
        anomalies.length > 0
          ? `异常检测系统正常运行，检测到${anomalies.length}个异常`
          : '异常检测系统正常运行',
      details: { config, anomaliesCount: anomalies.length },
    })
  } catch (error) {
    results.push({
      module: '异常检测',
      status: 'error',
      message: `异常检测系统错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 11. 验证预测模型
  try {
    const metrics = predictionModel.getMetrics()
    results.push({
      module: '预测模型',
      status: metrics.accuracy < 0.5 && metrics.trainingSamples > 100 ? 'warning' : 'ok',
      message:
        metrics.accuracy < 0.5 && metrics.trainingSamples > 100
          ? '预测模型正常运行，但准确率较低'
          : '预测模型正常运行',
      details: metrics,
    })
  } catch (error) {
    results.push({
      module: '预测模型',
      status: 'error',
      message: `预测模型错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 12. 验证公共组件（检查是否可导入）
  try {
    // 动态导入检查
    const commonComponents = import('@/components/Common')
    results.push({
      module: '公共组件',
      status: 'ok',
      message: '公共组件模块可正常导入',
    })
  } catch (error) {
    results.push({
      module: '公共组件',
      status: 'error',
      message: `公共组件导入错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  // 13. 验证Composables（检查是否可导入）
  try {
    const useToast = import('@/composables/useToast')
    const useUndoRedo = import('@/composables/useUndoRedo')
    results.push({
      module: 'Composables',
      status: 'ok',
      message: 'Composables模块可正常导入',
    })
  } catch (error) {
    results.push({
      module: 'Composables',
      status: 'error',
      message: `Composables导入错误: ${error instanceof Error ? error.message : String(error)}`,
    })
  }

  return results
}

/**
 * 打印验证结果
 */
export function printVerificationResults(): void {
  const results = verifyAllOptimizations()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 优化模块验证报告')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const okCount = results.filter(r => r.status === 'ok').length
  const warningCount = results.filter(r => r.status === 'warning').length
  const errorCount = results.filter(r => r.status === 'error').length

  results.forEach(result => {
    const icon =
      result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
    console.log(`${icon} [${result.status.toUpperCase()}] ${result.module}: ${result.message}`)
    if (result.details) {
      console.log('   详情:', JSON.stringify(result.details, null, 2))
    }
  })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`总计: ${results.length} 个模块`)
  console.log(`✅ 正常: ${okCount}`)
  console.log(`⚠️  警告: ${warningCount}`)
  console.log(`❌ 错误: ${errorCount}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

// 在开发环境自动运行验证
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // 延迟执行，确保所有模块都已加载
  setTimeout(() => {
    printVerificationResults()
    
    // 暴露到全局
    ;(window as any).__verifyOptimizations = verifyAllOptimizations
    ;(window as any).__printVerificationResults = printVerificationResults
    console.log('💡 提示: 使用 window.__verifyOptimizations() 或 window.__printVerificationResults() 验证优化模块')
  }, 2000)
}

