/**
 * 性能测试工具
 * 提供性能回归测试、基准测试和性能对比分析功能
 */

import { ref, computed, type Ref } from 'vue'

/**
 * 性能测试配置
 */
export interface PerformanceTestConfig {
  iterations: number
  warmupRuns: number
  timeout: number
  enableMemoryTracking: boolean
  enableNetworkTracking: boolean
  sampleSize: number
}

/**
 * 测试结果接口
 */
export interface TestResult {
  testName: string
  duration: number
  memoryUsage: number
  networkRequests: number
  errors: string[]
  timestamp: number
  metadata: Record<string, any>
}

/**
 * 基准测试结果
 */
export interface BenchmarkResult {
  testName: string
  averageDuration: number
  minDuration: number
  maxDuration: number
  standardDeviation: number
  throughput: number
  memoryPeak: number
  memoryAverage: number
  successRate: number
  iterations: number
}

/**
 * 性能对比结果
 */
export interface ComparisonResult {
  testName: string
  baseline: BenchmarkResult
  current: BenchmarkResult
  improvement: {
    duration: number
    memory: number
    throughput: number
  }
  regression: boolean
  significance: 'low' | 'medium' | 'high'
}

/**
 * 内存监控器
 */
class MemoryMonitor {
  private samples: number[] = []
  private interval: NodeJS.Timeout | null = null
  private isMonitoring = false

  /**
   * 开始监控
   */
  start(sampleInterval: number = 100): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.samples = []

    this.interval = setInterval(() => {
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memory = (performance as any).memory
        this.samples.push(memory.usedJSHeapSize)
      }
    }, sampleInterval)
  }

  /**
   * 停止监控
   */
  stop(): { peak: number; average: number; samples: number[] } {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    this.isMonitoring = false

    const peak = Math.max(...this.samples, 0)
    const average = this.samples.length > 0 
      ? this.samples.reduce((sum, sample) => sum + sample, 0) / this.samples.length 
      : 0

    return {
      peak,
      average,
      samples: [...this.samples]
    }
  }

  /**
   * 获取当前内存使用
   */
  getCurrentUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }
}

/**
 * 网络监控器
 */
class NetworkMonitor {
  private requests: PerformanceResourceTiming[] = []
  private observer: PerformanceObserver | null = null
  private isMonitoring = false

  /**
   * 开始监控
   */
  start(): void {
    if (this.isMonitoring || typeof PerformanceObserver === 'undefined') return

    this.isMonitoring = true
    this.requests = []

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.requests.push(entry as PerformanceResourceTiming)
        }
      }
    })

    this.observer.observe({ entryTypes: ['resource'] })
  }

  /**
   * 停止监控
   */
  stop(): {
    totalRequests: number
    totalSize: number
    averageDuration: number
    requests: PerformanceResourceTiming[]
  } {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    this.isMonitoring = false

    const totalRequests = this.requests.length
    const totalSize = this.requests.reduce((sum, req) => sum + (req.transferSize || 0), 0)
    const averageDuration = totalRequests > 0
      ? this.requests.reduce((sum, req) => sum + req.duration, 0) / totalRequests
      : 0

    return {
      totalRequests,
      totalSize,
      averageDuration,
      requests: [...this.requests]
    }
  }
}

/**
 * 性能测试器
 */
export class PerformanceTester {
  private config: PerformanceTestConfig
  private memoryMonitor = new MemoryMonitor()
  private networkMonitor = new NetworkMonitor()
  private results: TestResult[] = []

  constructor(config: Partial<PerformanceTestConfig> = {}) {
    this.config = {
      iterations: 10,
      warmupRuns: 3,
      timeout: 30000,
      enableMemoryTracking: true,
      enableNetworkTracking: true,
      sampleSize: 100,
      ...config
    }
  }

  /**
   * 运行单个测试
   */
  async runTest(
    testName: string,
    testFunction: () => Promise<any> | any,
    metadata: Record<string, any> = {}
  ): Promise<TestResult> {
    process.env.NODE_ENV === 'development' && console.log(`🧪 开始测试: ${testName}`)

    const errors: string[] = []
    let duration = 0
    let memoryUsage = 0
    let networkRequests = 0

    try {
      // 预热运行
      for (let i = 0; i < this.config.warmupRuns; i++) {
        try {
          await testFunction()
        } catch (error) {
          console.warn(`预热运行 ${i + 1} 失败:`, error)
        }
      }

      // 开始监控
      if (this.config.enableMemoryTracking) {
        this.memoryMonitor.start()
      }
      if (this.config.enableNetworkTracking) {
        this.networkMonitor.start()
      }

      // 执行测试
      const startTime = performance.now()
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('测试超时')), this.config.timeout)
      })

      await Promise.race([
        testFunction(),
        timeoutPromise
      ])

      duration = performance.now() - startTime

    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
      duration = this.config.timeout
    } finally {
      // 停止监控
      if (this.config.enableMemoryTracking) {
        const memoryStats = this.memoryMonitor.stop()
        memoryUsage = memoryStats.peak
      }

      if (this.config.enableNetworkTracking) {
        const networkStats = this.networkMonitor.stop()
        networkRequests = networkStats.totalRequests
      }
    }

    const result: TestResult = {
      testName,
      duration,
      memoryUsage,
      networkRequests,
      errors,
      timestamp: Date.now(),
      metadata
    }

    this.results.push(result)
    process.env.NODE_ENV === 'development' && console.log(`✅ 测试完成: ${testName} (${duration.toFixed(2)}ms)`)

    return result
  }

  /**
   * 运行基准测试
   */
  async runBenchmark(
    testName: string,
    testFunction: () => Promise<any> | any,
    metadata: Record<string, any> = {}
  ): Promise<BenchmarkResult> {
    process.env.NODE_ENV === 'development' && console.log(`📊 开始基准测试: ${testName} (${this.config.iterations} 次迭代)`)

    const durations: number[] = []
    const memoryUsages: number[] = []
    let successCount = 0

    for (let i = 0; i < this.config.iterations; i++) {
      try {
        const result = await this.runTest(`${testName}_${i + 1}`, testFunction, metadata)
        
        if (result.errors.length === 0) {
          durations.push(result.duration)
          memoryUsages.push(result.memoryUsage)
          successCount++
        }

        // 进度提示
        if ((i + 1) % Math.ceil(this.config.iterations / 10) === 0) {
          process.env.NODE_ENV === 'development' && console.log(`📈 进度: ${i + 1}/${this.config.iterations} (${((i + 1) / this.config.iterations * 100).toFixed(1)}%)`)
        }

      } catch (error) {
        console.warn(`迭代 ${i + 1} 失败:`, error)
      }
    }

    // 计算统计数据
    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0

    const minDuration = Math.min(...durations, 0)
    const maxDuration = Math.max(...durations, 0)

    const variance = durations.length > 0
      ? durations.reduce((sum, d) => sum + Math.pow(d - averageDuration, 2), 0) / durations.length
      : 0
    const standardDeviation = Math.sqrt(variance)

    const throughput = averageDuration > 0 ? 1000 / averageDuration : 0
    const memoryPeak = Math.max(...memoryUsages, 0)
    const memoryAverage = memoryUsages.length > 0
      ? memoryUsages.reduce((sum, m) => sum + m, 0) / memoryUsages.length
      : 0

    const successRate = this.config.iterations > 0 ? successCount / this.config.iterations : 0

    const benchmark: BenchmarkResult = {
      testName,
      averageDuration,
      minDuration,
      maxDuration,
      standardDeviation,
      throughput,
      memoryPeak,
      memoryAverage,
      successRate,
      iterations: this.config.iterations
    }

    process.env.NODE_ENV === 'development' && console.log(`✅ 基准测试完成: ${testName}`)
    process.env.NODE_ENV === 'development' && console.log(`   平均耗时: ${averageDuration.toFixed(2)}ms`)
    process.env.NODE_ENV === 'development' && console.log(`   成功率: ${(successRate * 100).toFixed(1)}%`)
    process.env.NODE_ENV === 'development' && console.log(`   吞吐量: ${throughput.toFixed(2)} ops/sec`)

    return benchmark
  }

  /**
   * 性能对比分析
   */
  comparePerformance(
    baseline: BenchmarkResult,
    current: BenchmarkResult
  ): ComparisonResult {
    const durationImprovement = baseline.averageDuration > 0
      ? (baseline.averageDuration - current.averageDuration) / baseline.averageDuration
      : 0

    const memoryImprovement = baseline.memoryAverage > 0
      ? (baseline.memoryAverage - current.memoryAverage) / baseline.memoryAverage
      : 0

    const throughputImprovement = baseline.throughput > 0
      ? (current.throughput - baseline.throughput) / baseline.throughput
      : 0

    // 判断是否有性能回归
    const regression = durationImprovement < -0.05 || // 耗时增加超过5%
                      memoryImprovement < -0.1 ||     // 内存使用增加超过10%
                      throughputImprovement < -0.05   // 吞吐量下降超过5%

    // 判断改进显著性
    let significance: 'low' | 'medium' | 'high' = 'low'
    const maxImprovement = Math.max(
      Math.abs(durationImprovement),
      Math.abs(memoryImprovement),
      Math.abs(throughputImprovement)
    )

    if (maxImprovement > 0.2) {
      significance = 'high'
    } else if (maxImprovement > 0.1) {
      significance = 'medium'
    }

    return {
      testName: current.testName,
      baseline,
      current,
      improvement: {
        duration: durationImprovement,
        memory: memoryImprovement,
        throughput: throughputImprovement
      },
      regression,
      significance
    }
  }

  /**
   * 运行回归测试套件
   */
  async runRegressionTests(tests: Array<{
    name: string
    test: () => Promise<any> | any
    baseline?: BenchmarkResult
    metadata?: Record<string, any>
  }>): Promise<{
    results: BenchmarkResult[]
    comparisons: ComparisonResult[]
    summary: {
      totalTests: number
      regressions: number
      improvements: number
      stable: number
    }
  }> {
    process.env.NODE_ENV === 'development' && console.log(`🔄 开始回归测试套件 (${tests.length} 个测试)`)

    const results: BenchmarkResult[] = []
    const comparisons: ComparisonResult[] = []
    let regressions = 0
    let improvements = 0
    let stable = 0

    for (const testCase of tests) {
      try {
        const result = await this.runBenchmark(testCase.name, testCase.test, testCase.metadata)
        results.push(result)

        if (testCase.baseline) {
          const comparison = this.comparePerformance(testCase.baseline, result)
          comparisons.push(comparison)

          if (comparison.regression) {
            regressions++
            console.warn(`⚠️ 性能回归: ${testCase.name}`)
          } else if (comparison.significance === 'high' && 
                    (comparison.improvement.duration > 0.1 || comparison.improvement.throughput > 0.1)) {
            improvements++
            process.env.NODE_ENV === 'development' && console.log(`🚀 性能提升: ${testCase.name}`)
          } else {
            stable++
          }
        }

      } catch (error) {
        console.error(`❌ 测试失败: ${testCase.name}`, error)
      }
    }

    const summary = {
      totalTests: tests.length,
      regressions,
      improvements,
      stable
    }

    process.env.NODE_ENV === 'development' && console.log(`✅ 回归测试完成`)
    process.env.NODE_ENV === 'development' && console.log(`   总测试数: ${summary.totalTests}`)
    process.env.NODE_ENV === 'development' && console.log(`   性能回归: ${summary.regressions}`)
    process.env.NODE_ENV === 'development' && console.log(`   性能提升: ${summary.improvements}`)
    process.env.NODE_ENV === 'development' && console.log(`   性能稳定: ${summary.stable}`)

    return {
      results,
      comparisons,
      summary
    }
  }

  /**
   * 获取测试历史
   */
  getTestHistory(): TestResult[] {
    return [...this.results]
  }

  /**
   * 清理测试历史
   */
  clearHistory(): void {
    this.results = []
  }

  /**
   * 导出测试报告
   */
  exportReport(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['testName', 'duration', 'memoryUsage', 'networkRequests', 'errors', 'timestamp']
      const rows = this.results.map(result => [
        result.testName,
        result.duration.toString(),
        result.memoryUsage.toString(),
        result.networkRequests.toString(),
        result.errors.join(';'),
        new Date(result.timestamp).toISOString()
      ])

      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }

    return JSON.stringify(this.results, null, 2)
  }
}

/**
 * 性能测试组合式函数
 */
export function usePerformanceTester(config: Partial<PerformanceTestConfig> = {}) {
  const tester = new PerformanceTester(config)
  const isRunning = ref(false)
  const currentTest = ref('')
  const progress = ref(0)

  const runTest = async (
    testName: string,
    testFunction: () => Promise<any> | any,
    metadata?: Record<string, any>
  ) => {
    isRunning.value = true
    currentTest.value = testName
    progress.value = 0

    try {
      const result = await tester.runTest(testName, testFunction, metadata)
      progress.value = 100
      return result
    } finally {
      isRunning.value = false
      currentTest.value = ''
    }
  }

  const runBenchmark = async (
    testName: string,
    testFunction: () => Promise<any> | any,
    metadata?: Record<string, any>
  ) => {
    isRunning.value = true
    currentTest.value = testName

    try {
      const result = await tester.runBenchmark(testName, testFunction, metadata)
      return result
    } finally {
      isRunning.value = false
      currentTest.value = ''
      progress.value = 0
    }
  }

  return {
    // 状态
    isRunning,
    currentTest,
    progress,

    // 方法
    runTest,
    runBenchmark,
    comparePerformance: tester.comparePerformance.bind(tester),
    runRegressionTests: tester.runRegressionTests.bind(tester),
    getTestHistory: tester.getTestHistory.bind(tester),
    clearHistory: tester.clearHistory.bind(tester),
    exportReport: tester.exportReport.bind(tester)
  }
}

/**
 * 预定义的性能测试用例
 */
export const performanceTestSuites = {
  /**
   * 组件渲染性能测试
   */
  componentRendering: {
    name: 'Component Rendering',
    test: async () => {
      // 模拟组件渲染
      const startTime = performance.now()
      
      // 创建大量DOM元素
      const container = document.createElement('div')
      for (let i = 0; i < 1000; i++) {
        const element = document.createElement('div')
        element.textContent = `Item ${i}`
        container.appendChild(element)
      }
      
      document.body.appendChild(container)
      
      // 等待渲染完成
      await new Promise(resolve => requestAnimationFrame(resolve))
      
      document.body.removeChild(container)
      
      return performance.now() - startTime
    }
  },

  /**
   * 数据处理性能测试
   */
  dataProcessing: {
    name: 'Data Processing',
    test: async () => {
      const data = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random() * 100
      }))

      // 数据过滤和排序
      const filtered = data
        .filter(item => item.value > 50)
        .sort((a, b) => b.value - a.value)
        .slice(0, 100)

      return filtered.length
    }
  },

  /**
   * 网络请求性能测试
   */
  networkRequest: {
    name: 'Network Request',
    test: async () => {
      const startTime = performance.now()
      
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          cache: 'no-cache'
        })
        
        if (response.ok) {
          await response.json()
        }
      } catch (error) {
        console.warn('网络请求测试失败:', error)
      }
      
      return performance.now() - startTime
    }
  }
}