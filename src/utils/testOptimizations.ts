/**
 * 🚀 v6.1.3优化: 第二阶段优化测试工具
 * 用于测试和验证第二阶段优化的效果
 */

import ErrorHandler from './errorHandler'
import ResponseFormatter from './responseFormatter'
import { requestCache } from './requestCache'

/**
 * 测试错误处理功能
 */
export function testErrorHandler() {
  console.log('🧪 测试错误处理功能...')

  // 测试1: 普通错误
  const normalError = new Error('测试错误')
  ErrorHandler.handle(normalError, { showMessage: false, logError: false })

  // 测试2: API错误
  const apiError = {
    message: 'API请求失败',
    status: 500,
    code: 'SERVER_ERROR',
  }
  ErrorHandler.handle(apiError, { showMessage: false, logError: false })

  // 测试3: 网络错误
  const networkError = new TypeError('fetch failed')
  ErrorHandler.handleNetworkError(networkError, { showMessage: false, logError: false })

  console.log('✅ 错误处理测试完成')
}

/**
 * 测试响应格式化功能
 */
export function testResponseFormatter() {
  console.log('🧪 测试响应格式化功能...')

  // 测试1: 成功响应
  const successResponse = ResponseFormatter.success({ data: 'test' })
  console.log('成功响应:', successResponse)

  // 测试2: 失败响应
  const errorResponse = ResponseFormatter.error('操作失败', 'ERROR_CODE')
  console.log('失败响应:', errorResponse)

  // 测试3: 分页响应
  const paginatedResponse = ResponseFormatter.paginated(['item1', 'item2'], 100, 1, 10)
  console.log('分页响应:', paginatedResponse)

  console.log('✅ 响应格式化测试完成')
}

/**
 * 测试请求缓存功能
 */
export function testRequestCache() {
  console.log('🧪 测试请求缓存功能...')

  // 测试1: 设置缓存
  requestCache.set('test-key-1', { data: 'test data' }, 60000)
  console.log('缓存已设置')

  // 测试2: 获取缓存（应该命中）
  const cached1 = requestCache.get('test-key-1')
  console.log('缓存获取 (应该命中):', cached1)

  // 测试3: 获取不存在的缓存（应该未命中）
  const cached2 = requestCache.get('test-key-2')
  console.log('缓存获取 (应该未命中):', cached2)

  // 测试4: 获取统计信息
  const stats = requestCache.getStats()
  console.log('缓存统计:', stats)

  // 测试5: 再次获取相同缓存（应该命中）
  const cached3 = requestCache.get('test-key-1')
  console.log('缓存获取 (再次，应该命中):', cached3)

  // 获取最终统计
  const finalStats = requestCache.getStats()
  console.log('最终缓存统计:', finalStats)

  console.log('✅ 请求缓存测试完成')
}

/**
 * 运行所有测试
 */
export function runAllTests() {
  console.log('🚀 开始运行第二阶段优化测试...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  testErrorHandler()
  console.log('')

  testResponseFormatter()
  console.log('')

  testRequestCache()
  console.log('')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 所有测试完成！')
}

// 如果在浏览器环境中运行，导出到window对象以便在控制台中调用
if (typeof window !== 'undefined') {
  (window as any).testOptimizations = {
    testErrorHandler,
    testResponseFormatter,
    testRequestCache,
    runAllTests,
  }
  console.log('💡 提示: 可以在控制台中使用 window.testOptimizations.runAllTests() 运行所有测试')
}

