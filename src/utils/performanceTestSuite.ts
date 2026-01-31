/**
 * 完整的性能测试套件
 * 集成性能测试、回归测试和报告生成功能
 */

import { usePerformanceTester, type BenchmarkResult, type ComparisonResult } from './performanceTester'
import { usePerformanceReporter, type PerformanceReport } from './performanceReporter'
import { ref, computed } from 'vue'

/**
 * 测试套件配置
 */
export interface TestSuiteConfig {
  // 基础配置
  iterations: number
  warmupRuns: number
  timeout: number
  
  // 测试范围
  includeComponentTests: boolean
  includeNetworkTests: boolean
  includeMemoryTests: boolean
  includeRegressionTests: boolean
  
  // 报告配置
  generateReport: boolean
  exportFormats: ('html' | 'json')[]
  
  // 基准数据
  baselineData?: Record<string, BenchmarkResult>
}

/**
 * 测试结果摘要
 */
export interface TestSummary {
  totalTests: number
  passedTests: number
  failedTests: number
  regressions: number
  improvements: number
  duration: number
  overallScore: number
}

/**
 * 性能测试套件
 */
export class PerformanceTestSuite {
  private config: TestSuiteConfig
  private tester: ReturnType<typeof usePerformanceTester>
  private reporter: ReturnType<typeof usePerformanceReporter>
  private startTime = 0

  constructor(config: Partial<TestSuiteConfig> = {}) {
    this.config = {
      iterations: 10,
      warmupRuns: 3,
      timeout: 30000,
      includeComponentTests: true,
      includeNetworkTests: true,
      includeMemoryTests: true,
      includeRegressionTests: true,
      generateReport: true,
      exportFormats: ['html'],
      ...config
    }

    this.tester = usePerformanceTester({
      iterations: this.config.iterations,
      warmupRuns: this.config.warmupRuns,
      timeout: this.config.timeout,
      enableMemoryTracking: this.config.includeMemoryTests,
      enableNetworkTracking: this.config.includeNetworkTests
    })

    this.reporter = usePerformanceReporter()
  }

  /**
   * 运行完整的性能测试套件
   */
  async runFullSuite(): Promise<{
    summary: TestSummary
    report?: PerformanceReport
  }> {
    process.env.NODE_ENV === 'development' && console.log('🚀 开始运行完整性能测试套件...')
    this.startTime = Date.now()

    const results: BenchmarkResult[] = []
    const comparisons: ComparisonResult[] = []
    let totalTests = 0
    let passedTests = 0
    let failedTests = 0
    let regressions = 0
    let improvements = 0

    try {
      // 1. 组件性能测试
      if (this.config.includeComponentTests) {
        process.env.NODE_ENV === 'development' && console.log('📱 运行组件性能测试...')
        const componentResults = await this.runComponentTests()
        results.push(...componentResults)
        totalTests += componentResults.length
        passedTests += componentResults.filter(r => r.successRate > 0.9).length
        failedTests += componentResults.filter(r => r.successRate <= 0.9).length
      }

      // 2. 网络性能测试
      if (this.config.includeNetworkTests) {
        process.env.NODE_ENV === 'development' && console.log('🌐 运行网络性能测试...')
        const networkResults = await this.runNetworkTests()
        results.push(...networkResults)
        totalTests += networkResults.length
        passedTests += networkResults.filter(r => r.successRate > 0.9).length
        failedTests += networkResults.filter(r => r.successRate <= 0.9).length
      }

      // 3. 内存性能测试
      if (this.config.includeMemoryTests) {
        process.env.NODE_ENV === 'development' && console.log('🧠 运行内存性能测试...')
        const memoryResults = await this.runMemoryTests()
        results.push(...memoryResults)
        totalTests += memoryResults.length
        passedTests += memoryResults.filter(r => r.successRate > 0.9).length
        failedTests += memoryResults.filter(r => r.successRate <= 0.9).length
      }

      // 4. 回归测试
      if (this.config.includeRegressionTests && this.config.baselineData) {
        process.env.NODE_ENV === 'development' && console.log('🔄 运行回归测试...')
        const regressionResults = await this.runRegressionTests(results)
        comparisons.push(...regressionResults)
        regressions = regressionResults.filter(r => r.regression).length
        improvements = regressionResults.filter(r => 
          !r.regression && r.significance === 'high'
        ).length
      }

      // 5. 生成性能报告
      let report: PerformanceReport | undefined
      if (this.config.generateReport) {
        process.env.NODE_ENV === 'development' && console.log('📊 生成性能报告...')
        report = await this.generatePerformanceReport(results, comparisons)
      }

      const duration = Date.now() - this.startTime
      const overallScore = this.calculateOverallScore(results, comparisons)

      const summary: TestSummary = {
        totalTests,
        passedTests,
        failedTests,
        regressions,
        improvements,
        duration,
        overallScore
      }

      process.env.NODE_ENV === 'development' && console.log('✅ 性能测试套件完成')
      this.printSummary(summary)

      return { summary, report }

    } catch (error) {
      console.error('❌ 性能测试套件执行失败:', error)
      throw error
    }
  }

  /**
   * 运行组件性能测试
   */
  private async runComponentTests(): Promise<BenchmarkResult[]> {
    const tests = [
      {
        name: 'SchedulesPage 渲染性能',
        test: async () => {
          // 模拟大量排班数据渲染
          const schedules = Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            examiner: `考官${i}`,
            subject: `科目${i % 10}`,
            date: new Date(2024, 0, i % 30 + 1),
            status: ['已安排', '待确认', '已取消'][i % 3]
          }))

          // 模拟过滤操作
          const filtered = schedules.filter(s => 
            s.status === '已安排' && s.subject.includes('科目1')
          )

          return filtered.length
        }
      },
      {
        name: 'StatisticsPage 数据处理',
        test: async () => {
          // 模拟统计数据计算
          const data = Array.from({ length: 5000 }, (_, i) => ({
            department: `部门${i % 20}`,
            examiner: `考官${i}`,
            workload: Math.random() * 100,
            efficiency: Math.random()
          }))

          // 模拟复杂统计计算
          const stats = data.reduce((acc, item) => {
            if (!acc[item.department]) {
              acc[item.department] = {
                totalWorkload: 0,
                avgEfficiency: 0,
                count: 0
              }
            }
            acc[item.department].totalWorkload += item.workload
            acc[item.department].avgEfficiency += item.efficiency
            acc[item.department].count++
            return acc
          }, {} as Record<string, any>)

          return Object.keys(stats).length
        }
      },
      {
        name: 'TeachersPage 列表渲染',
        test: async () => {
          // 模拟教师列表渲染
          const teachers = Array.from({ length: 2000 }, (_, i) => ({
            id: i,
            name: `教师${i}`,
            department: `部门${i % 15}`,
            subjects: [`科目${i % 8}`, `科目${(i + 1) % 8}`],
            workload: Math.random() * 50
          }))

          // 模拟搜索和排序
          const filtered = teachers
            .filter(t => t.workload > 25)
            .sort((a, b) => b.workload - a.workload)
            .slice(0, 100)

          return filtered.length
        }
      }
    ]

    const results: BenchmarkResult[] = []
    for (const testCase of tests) {
      try {
        const result = await this.tester.runBenchmark(testCase.name, testCase.test)
        results.push(result)
        this.reporter.addBenchmark(result)
      } catch (error) {
        console.error(`组件测试失败: ${testCase.name}`, error)
      }
    }

    return results
  }

  /**
   * 运行网络性能测试
   */
  private async runNetworkTests(): Promise<BenchmarkResult[]> {
    const tests = [
      {
        name: 'API 响应性能',
        test: async () => {
          const startTime = performance.now()
          
          try {
            // 模拟API请求
            const response = await fetch('/api/schedules', {
              method: 'GET',
              cache: 'no-cache'
            })
            
            if (response.ok) {
              await response.json()
            }
          } catch (error) {
            console.warn('API请求失败:', error)
          }
          
          return performance.now() - startTime
        }
      },
      {
        name: '批量数据加载',
        test: async () => {
          const startTime = performance.now()
          
          try {
            // 模拟批量请求
            const requests = Array.from({ length: 5 }, (_, i) => 
              fetch(`/api/data/${i}`, { cache: 'no-cache' })
            )
            
            await Promise.all(requests)
          } catch (error) {
            console.warn('批量请求失败:', error)
          }
          
          return performance.now() - startTime
        }
      },
      {
        name: '缓存效率测试',
        test: async () => {
          const startTime = performance.now()
          
          try {
            // 第一次请求
            await fetch('/api/cache-test', { cache: 'default' })
            
            // 第二次请求（应该使用缓存）
            await fetch('/api/cache-test', { cache: 'default' })
          } catch (error) {
            console.warn('缓存测试失败:', error)
          }
          
          return performance.now() - startTime
        }
      }
    ]

    const results: BenchmarkResult[] = []
    for (const testCase of tests) {
      try {
        const result = await this.tester.runBenchmark(testCase.name, testCase.test)
        results.push(result)
        this.reporter.addBenchmark(result)
      } catch (error) {
        console.error(`网络测试失败: ${testCase.name}`, error)
      }
    }

    return results
  }

  /**
   * 运行内存性能测试
   */
  private async runMemoryTests(): Promise<BenchmarkResult[]> {
    const tests = [
      {
        name: '内存使用优化',
        test: async () => {
          // 创建大量对象
          const objects = Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            data: new Array(100).fill(i),
            timestamp: Date.now()
          }))

          // 模拟数据处理
          const processed = objects
            .filter(obj => obj.id % 2 === 0)
            .map(obj => ({ ...obj, processed: true }))

          // 清理引用
          objects.length = 0

          return processed.length
        }
      },
      {
        name: '内存泄漏检测',
        test: async () => {
          const initialMemory = this.getCurrentMemoryUsage()
          
          // 创建可能导致内存泄漏的结构
          const listeners: (() => void)[] = []
          const timers: NodeJS.Timeout[] = []

          for (let i = 0; i < 100; i++) {
            const listener = () => process.env.NODE_ENV === 'development' && console.log(`Event ${i}`)
            listeners.push(listener)
            
            const timer = setTimeout(() => {}, 1000)
            timers.push(timer)
          }

          // 清理资源
          listeners.length = 0
          timers.forEach(timer => clearTimeout(timer))
          timers.length = 0

          const finalMemory = this.getCurrentMemoryUsage()
          return finalMemory - initialMemory
        }
      },
      {
        name: 'GC 压力测试',
        test: async () => {
          const iterations = 1000
          let totalAllocated = 0

          for (let i = 0; i < iterations; i++) {
            // 创建临时对象
            const temp = new Array(1000).fill(Math.random())
            totalAllocated += temp.length
            
            // 立即释放引用
            temp.length = 0
          }

          // 强制垃圾回收（如果可用）
          if (typeof global !== 'undefined' && global.gc) {
            global.gc()
          }

          return totalAllocated
        }
      }
    ]

    const results: BenchmarkResult[] = []
    for (const testCase of tests) {
      try {
        const result = await this.tester.runBenchmark(testCase.name, testCase.test)
        results.push(result)
        this.reporter.addBenchmark(result)
      } catch (error) {
        console.error(`内存测试失败: ${testCase.name}`, error)
      }
    }

    return results
  }

  /**
   * 运行回归测试
   */
  private async runRegressionTests(currentResults: BenchmarkResult[]): Promise<ComparisonResult[]> {
    const comparisons: ComparisonResult[] = []

    for (const current of currentResults) {
      const baseline = this.config.baselineData?.[current.testName]
      if (baseline) {
        const comparison = this.tester.comparePerformance(baseline, current)
        comparisons.push(comparison)
        this.reporter.addComparison(comparison)
      }
    }

    return comparisons
  }

  /**
   * 生成性能报告
   */
  private async generatePerformanceReport(
    results: BenchmarkResult[],
    comparisons: ComparisonResult[]
  ): Promise<PerformanceReport> {
    // 收集Web Vitals指标
    const webVitals = await this.reporter.collectWebVitals()
    this.reporter.setMetrics(webVitals)

    // 添加测试结果
    const testResults = this.tester.getTestHistory()
    this.reporter.addTestResults(testResults)

    // 生成报告
    const report = await this.reporter.generateReport()

    // 导出报告文件
    for (const format of this.config.exportFormats) {
      this.reporter.downloadReport(report, format)
    }

    return report
  }

  /**
   * 计算总体评分
   */
  private calculateOverallScore(
    results: BenchmarkResult[],
    comparisons: ComparisonResult[]
  ): number {
    let score = 100

    // 基于成功率扣分
    const avgSuccessRate = results.length > 0
      ? results.reduce((sum, r) => sum + r.successRate, 0) / results.length
      : 1
    score -= (1 - avgSuccessRate) * 30

    // 基于性能回归扣分
    const regressionCount = comparisons.filter(c => c.regression).length
    score -= regressionCount * 15

    // 基于平均性能扣分
    const avgDuration = results.length > 0
      ? results.reduce((sum, r) => sum + r.averageDuration, 0) / results.length
      : 0
    if (avgDuration > 1000) score -= 20
    else if (avgDuration > 500) score -= 10

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * 打印测试摘要
   */
  private printSummary(summary: TestSummary): void {
    process.env.NODE_ENV === 'development' && console.log('\n📊 性能测试摘要:')
    process.env.NODE_ENV === 'development' && console.log(`   总测试数: ${summary.totalTests}`)
    process.env.NODE_ENV === 'development' && console.log(`   通过测试: ${summary.passedTests}`)
    process.env.NODE_ENV === 'development' && console.log(`   失败测试: ${summary.failedTests}`)
    process.env.NODE_ENV === 'development' && console.log(`   性能回归: ${summary.regressions}`)
    process.env.NODE_ENV === 'development' && console.log(`   性能提升: ${summary.improvements}`)
    process.env.NODE_ENV === 'development' && console.log(`   执行时间: ${(summary.duration / 1000).toFixed(2)}s`)
    process.env.NODE_ENV === 'development' && console.log(`   总体评分: ${summary.overallScore}/100`)

    if (summary.regressions > 0) {
      console.warn(`⚠️ 发现 ${summary.regressions} 个性能回归问题，需要立即处理！`)
    }

    if (summary.improvements > 0) {
      process.env.NODE_ENV === 'development' && console.log(`🚀 实现了 ${summary.improvements} 项性能提升！`)
    }
  }

  /**
   * 获取当前内存使用
   */
  private getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  /**
   * 保存基准数据
   */
  saveBaseline(results: BenchmarkResult[]): void {
    const baseline: Record<string, BenchmarkResult> = {}
    for (const result of results) {
      baseline[result.testName] = result
    }

    // 保存到本地存储
    try {
      localStorage.setItem('performance-baseline', JSON.stringify(baseline))
      process.env.NODE_ENV === 'development' && console.log('✅ 基准数据已保存')
    } catch (error) {
      console.error('❌ 保存基准数据失败:', error)
    }
  }

  /**
   * 加载基准数据
   */
  loadBaseline(): Record<string, BenchmarkResult> | null {
    try {
      const data = localStorage.getItem('performance-baseline')
      if (data) {
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('❌ 加载基准数据失败:', error)
    }
    return null
  }
}

/**
 * 性能测试套件组合式函数
 */
export function usePerformanceTestSuite(config: Partial<TestSuiteConfig> = {}) {
  const suite = new PerformanceTestSuite(config)
  const isRunning = ref(false)
  const currentPhase = ref('')
  const progress = ref(0)
  const lastSummary = ref<TestSummary | null>(null)
  const lastReport = ref<PerformanceReport | null>(null)

  const runFullSuite = async () => {
    isRunning.value = true
    progress.value = 0

    try {
      const result = await suite.runFullSuite()
      lastSummary.value = result.summary
      lastReport.value = result.report || null
      progress.value = 100
      return result
    } finally {
      isRunning.value = false
      currentPhase.value = ''
    }
  }

  const saveBaseline = (results: BenchmarkResult[]) => {
    suite.saveBaseline(results)
  }

  const loadBaseline = () => {
    return suite.loadBaseline()
  }

  // 计算属性
  const hasBaseline = computed(() => {
    return loadBaseline() !== null
  })

  const canRunRegression = computed(() => {
    return hasBaseline.value && config.includeRegressionTests !== false
  })

  return {
    // 状态
    isRunning,
    currentPhase,
    progress,
    lastSummary,
    lastReport,
    hasBaseline,
    canRunRegression,

    // 方法
    runFullSuite,
    saveBaseline,
    loadBaseline
  }
}

/**
 * 快速性能检查
 */
export async function quickPerformanceCheck(): Promise<{
  score: number
  issues: string[]
  recommendations: string[]
}> {
  process.env.NODE_ENV === 'development' && console.log('⚡ 执行快速性能检查...')

  const issues: string[] = []
  const recommendations: string[] = []
  let score = 100

  try {
    // 检查内存使用
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory
      const memoryMB = memory.usedJSHeapSize / 1024 / 1024

      if (memoryMB > 100) {
        issues.push(`内存使用过高: ${memoryMB.toFixed(2)}MB`)
        recommendations.push('考虑实施内存优化策略')
        score -= 20
      } else if (memoryMB > 50) {
        issues.push(`内存使用偏高: ${memoryMB.toFixed(2)}MB`)
        recommendations.push('监控内存使用情况')
        score -= 10
      }
    }

    // 检查网络请求
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const slowRequests = resourceEntries.filter(entry => entry.duration > 1000)

    if (slowRequests.length > 5) {
      issues.push(`发现 ${slowRequests.length} 个慢速网络请求`)
      recommendations.push('优化网络请求性能')
      score -= 15
    } else if (slowRequests.length > 0) {
      issues.push(`发现 ${slowRequests.length} 个慢速网络请求`)
      recommendations.push('检查网络请求优化机会')
      score -= 5
    }

    // 检查DOM复杂度
    const domNodes = document.querySelectorAll('*').length
    if (domNodes > 3000) {
      issues.push(`DOM节点过多: ${domNodes}`)
      recommendations.push('考虑使用虚拟滚动或分页')
      score -= 10
    }

    // 检查事件监听器
    const eventListeners = (window as any).getEventListeners ? 
      Object.keys((window as any).getEventListeners(document)).length : 0
    if (eventListeners > 100) {
      issues.push(`事件监听器过多: ${eventListeners}`)
      recommendations.push('检查事件监听器清理')
      score -= 5
    }

  } catch (error) {
    console.warn('快速性能检查部分失败:', error)
  }

  if (issues.length === 0) {
    issues.push('未发现明显性能问题')
    recommendations.push('继续保持良好的性能表现')
  }

  process.env.NODE_ENV === 'development' && console.log(`✅ 快速性能检查完成，评分: ${score}/100`)

  return {
    score: Math.max(0, score),
    issues,
    recommendations
  }
}