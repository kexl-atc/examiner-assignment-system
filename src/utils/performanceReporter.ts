/**
 * 性能报告生成器
 * 生成完整的性能优化分析报告
 */

import { ref } from 'vue'
import type { BenchmarkResult, ComparisonResult, TestResult } from './performanceTester'

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  // 基础指标
  loadTime: number
  renderTime: number
  memoryUsage: number
  bundleSize: number

  // 用户体验指标
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number

  // 网络指标
  networkRequests: number
  totalTransferSize: number
  cacheHitRate: number

  // 自定义指标
  customMetrics: Record<string, number>
}

/**
 * 优化建议接口
 */
export interface OptimizationRecommendation {
  category: 'performance' | 'memory' | 'network' | 'ui' | 'code'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  implementation: string
  estimatedImprovement: string
  effort: 'low' | 'medium' | 'high'
}

/**
 * 性能报告接口
 */
export interface PerformanceReport {
  // 报告元数据
  reportId: string
  timestamp: number
  version: string
  environment: string

  // 执行摘要
  executiveSummary: {
    overallScore: number
    keyFindings: string[]
    criticalIssues: number
    improvementOpportunities: number
  }

  // 性能指标
  metrics: PerformanceMetrics

  // 基准测试结果
  benchmarks: BenchmarkResult[]

  // 性能对比
  comparisons: ComparisonResult[]

  // 优化建议
  recommendations: OptimizationRecommendation[]

  // 详细分析
  detailedAnalysis: {
    componentAnalysis: ComponentAnalysis[]
    networkAnalysis: NetworkAnalysis
    memoryAnalysis: MemoryAnalysis
    codeAnalysis: CodeAnalysis
  }

  // 实施计划
  implementationPlan: {
    phase1: OptimizationRecommendation[]
    phase2: OptimizationRecommendation[]
    phase3: OptimizationRecommendation[]
  }
}

/**
 * 组件分析接口
 */
export interface ComponentAnalysis {
  componentName: string
  renderTime: number
  memoryUsage: number
  complexity: 'low' | 'medium' | 'high'
  issues: string[]
  recommendations: string[]
}

/**
 * 网络分析接口
 */
export interface NetworkAnalysis {
  totalRequests: number
  totalSize: number
  averageResponseTime: number
  slowRequests: Array<{
    url: string
    duration: number
    size: number
  }>
  cacheEfficiency: number
  compressionRatio: number
}

/**
 * 内存分析接口
 */
export interface MemoryAnalysis {
  peakUsage: number
  averageUsage: number
  leakRisk: 'low' | 'medium' | 'high'
  gcPressure: number
  largeObjects: Array<{
    type: string
    size: number
    count: number
  }>
}

/**
 * 代码分析接口
 */
export interface CodeAnalysis {
  bundleSize: number
  unusedCode: number
  duplicateCode: number
  complexityScore: number
  maintainabilityIndex: number
  technicalDebt: number
}

/**
 * 性能报告生成器
 */
export class PerformanceReporter {
  private metrics: Partial<PerformanceMetrics> = {}
  private benchmarks: BenchmarkResult[] = []
  private comparisons: ComparisonResult[] = []
  private testResults: TestResult[] = []

  /**
   * 设置性能指标
   */
  setMetrics(metrics: Partial<PerformanceMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics }
  }

  /**
   * 添加基准测试结果
   */
  addBenchmark(benchmark: BenchmarkResult): void {
    this.benchmarks.push(benchmark)
  }

  /**
   * 添加性能对比结果
   */
  addComparison(comparison: ComparisonResult): void {
    this.comparisons.push(comparison)
  }

  /**
   * 添加测试结果
   */
  addTestResults(results: TestResult[]): void {
    this.testResults.push(...results)
  }

  /**
   * 收集Web Vitals指标
   */
  async collectWebVitals(): Promise<Partial<PerformanceMetrics>> {
    const metrics: Partial<PerformanceMetrics> = {}

    try {
      // 收集导航时间
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming
      if (navigation) {
        metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart
      }

      // 收集Paint时间
      const paintEntries = performance.getEntriesByType('paint')
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      if (fcp) {
        metrics.firstContentfulPaint = fcp.startTime
      }

      // 收集LCP (需要PerformanceObserver)
      if (typeof PerformanceObserver !== 'undefined') {
        const lcpPromise = new Promise<number>(resolve => {
          const observer = new PerformanceObserver(list => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            resolve(lastEntry.startTime)
            observer.disconnect()
          })
          observer.observe({ entryTypes: ['largest-contentful-paint'] })

          // 超时处理
          setTimeout(() => {
            observer.disconnect()
            resolve(0)
          }, 5000)
        })

        metrics.largestContentfulPaint = await lcpPromise
      }

      // 收集内存使用
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const memory = (performance as any).memory
        metrics.memoryUsage = memory.usedJSHeapSize
      }

      // 收集网络请求
      const resourceEntries = performance.getEntriesByType(
        'resource'
      ) as PerformanceResourceTiming[]
      metrics.networkRequests = resourceEntries.length
      metrics.totalTransferSize = resourceEntries.reduce(
        (sum, entry) => sum + (entry.transferSize || 0),
        0
      )
    } catch (error) {
      console.warn('收集Web Vitals指标失败:', error)
    }

    return metrics
  }

  /**
   * 分析组件性能
   */
  analyzeComponents(): ComponentAnalysis[] {
    const components: ComponentAnalysis[] = []

    // 基于测试结果分析组件
    const componentTests = this.testResults.filter(
      test => test.testName.includes('Component') || test.testName.includes('component')
    )

    for (const test of componentTests) {
      const analysis: ComponentAnalysis = {
        componentName: test.testName,
        renderTime: test.duration,
        memoryUsage: test.memoryUsage,
        complexity: this.calculateComplexity(test),
        issues: this.identifyIssues(test),
        recommendations: this.generateComponentRecommendations(test),
      }

      components.push(analysis)
    }

    return components
  }

  /**
   * 分析网络性能
   */
  analyzeNetwork(): NetworkAnalysis {
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

    const totalRequests = resourceEntries.length
    const totalSize = resourceEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)
    const averageResponseTime =
      totalRequests > 0
        ? resourceEntries.reduce((sum, entry) => sum + entry.duration, 0) / totalRequests
        : 0

    const slowRequests = resourceEntries
      .filter(entry => entry.duration > 1000) // 超过1秒的请求
      .map(entry => ({
        url: entry.name,
        duration: entry.duration,
        size: entry.transferSize || 0,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)

    // 计算缓存效率
    const cachedRequests = resourceEntries.filter(
      entry => entry.transferSize === 0 || entry.duration < 50
    ).length
    const cacheEfficiency = totalRequests > 0 ? cachedRequests / totalRequests : 0

    // 计算压缩比率
    const compressibleEntries = resourceEntries.filter(
      entry =>
        entry.name.includes('.js') || entry.name.includes('.css') || entry.name.includes('.html')
    )
    const totalUncompressed = compressibleEntries.reduce(
      (sum, entry) => sum + (entry.decodedBodySize || 0),
      0
    )
    const totalCompressed = compressibleEntries.reduce(
      (sum, entry) => sum + (entry.encodedBodySize || 0),
      0
    )
    const compressionRatio = totalUncompressed > 0 ? totalCompressed / totalUncompressed : 1

    return {
      totalRequests,
      totalSize,
      averageResponseTime,
      slowRequests,
      cacheEfficiency,
      compressionRatio,
    }
  }

  /**
   * 分析内存使用
   */
  analyzeMemory(): MemoryAnalysis {
    const memoryTests = this.testResults.filter(test => test.memoryUsage > 0)

    const peakUsage = Math.max(...memoryTests.map(test => test.memoryUsage), 0)
    const averageUsage =
      memoryTests.length > 0
        ? memoryTests.reduce((sum, test) => sum + test.memoryUsage, 0) / memoryTests.length
        : 0

    // 评估内存泄漏风险
    let leakRisk: 'low' | 'medium' | 'high' = 'low'
    const memoryGrowth = this.calculateMemoryGrowth()
    if (memoryGrowth > 0.5) {
      leakRisk = 'high'
    } else if (memoryGrowth > 0.2) {
      leakRisk = 'medium'
    }

    // 计算GC压力
    const gcPressure = peakUsage > 0 ? averageUsage / peakUsage : 0

    return {
      peakUsage,
      averageUsage,
      leakRisk,
      gcPressure,
      largeObjects: [], // 需要更详细的内存分析工具
    }
  }

  /**
   * 分析代码质量
   */
  analyzeCode(): CodeAnalysis {
    // 这里需要集成代码分析工具的结果
    // 暂时返回模拟数据
    return {
      bundleSize: 0,
      unusedCode: 0,
      duplicateCode: 0,
      complexityScore: 0,
      maintainabilityIndex: 0,
      technicalDebt: 0,
    }
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = []

    // 基于性能对比生成建议
    for (const comparison of this.comparisons) {
      if (comparison.regression) {
        recommendations.push({
          category: 'performance',
          priority: 'high',
          title: `修复 ${comparison.testName} 的性能回归`,
          description: `${comparison.testName} 出现了性能回归，需要立即修复`,
          impact: `性能下降 ${Math.abs(comparison.improvement.duration * 100).toFixed(1)}%`,
          implementation: '检查最近的代码更改，回滚或优化相关代码',
          estimatedImprovement: `恢复 ${Math.abs(comparison.improvement.duration * 100).toFixed(1)}% 的性能`,
          effort: 'medium',
        })
      }
    }

    // 基于指标生成建议
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 50 * 1024 * 1024) {
      // 50MB
      recommendations.push({
        category: 'memory',
        priority: 'high',
        title: '优化内存使用',
        description: '应用程序内存使用过高，可能影响性能',
        impact: '减少内存使用可提升应用响应速度',
        implementation: '实施内存优化策略，清理未使用的对象',
        estimatedImprovement: '减少 20-30% 内存使用',
        effort: 'medium',
      })
    }

    if (this.metrics.networkRequests && this.metrics.networkRequests > 50) {
      recommendations.push({
        category: 'network',
        priority: 'medium',
        title: '减少网络请求数量',
        description: '网络请求过多，影响页面加载速度',
        impact: '减少网络请求可显著提升加载速度',
        implementation: '合并请求、启用缓存、使用CDN',
        estimatedImprovement: '提升 15-25% 加载速度',
        effort: 'medium',
      })
    }

    // 添加通用优化建议
    recommendations.push(
      {
        category: 'performance',
        priority: 'medium',
        title: '实施虚拟滚动',
        description: '对大列表使用虚拟滚动技术',
        impact: '显著提升大数据集的渲染性能',
        implementation: '使用 vue-virtual-scroller 或自定义虚拟滚动组件',
        estimatedImprovement: '提升 50-80% 列表渲染性能',
        effort: 'medium',
      },
      {
        category: 'code',
        priority: 'low',
        title: '代码分割和懒加载',
        description: '实施路由级别的代码分割',
        impact: '减少初始包大小，提升首屏加载速度',
        implementation: '使用动态导入和Vue的异步组件',
        estimatedImprovement: '减少 30-50% 初始包大小',
        effort: 'low',
      },
      {
        category: 'ui',
        priority: 'low',
        title: '优化动画性能',
        description: '使用CSS transform和opacity进行动画',
        impact: '提升动画流畅度，减少重排重绘',
        implementation: '避免修改layout属性，使用GPU加速',
        estimatedImprovement: '提升 20-40% 动画性能',
        effort: 'low',
      }
    )

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * 生成完整报告
   */
  async generateReport(): Promise<PerformanceReport> {
    process.env.NODE_ENV === 'development' && console.log('📊 开始生成性能报告...')

    // 收集Web Vitals指标
    const webVitals = await this.collectWebVitals()
    this.setMetrics(webVitals)

    // 分析各个方面
    const componentAnalysis = this.analyzeComponents()
    const networkAnalysis = this.analyzeNetwork()
    const memoryAnalysis = this.analyzeMemory()
    const codeAnalysis = this.analyzeCode()

    // 生成优化建议
    const recommendations = this.generateRecommendations()

    // 计算总体评分
    const overallScore = this.calculateOverallScore()

    // 识别关键发现
    const keyFindings = this.identifyKeyFindings()

    // 统计问题数量
    const criticalIssues = recommendations.filter(r => r.priority === 'high').length
    const improvementOpportunities = recommendations.length

    // 制定实施计划
    const implementationPlan = this.createImplementationPlan(recommendations)

    const report: PerformanceReport = {
      reportId: `perf-report-${Date.now()}`,
      timestamp: Date.now(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',

      executiveSummary: {
        overallScore,
        keyFindings,
        criticalIssues,
        improvementOpportunities,
      },

      metrics: this.metrics as PerformanceMetrics,
      benchmarks: this.benchmarks,
      comparisons: this.comparisons,
      recommendations,

      detailedAnalysis: {
        componentAnalysis,
        networkAnalysis,
        memoryAnalysis,
        codeAnalysis,
      },

      implementationPlan,
    }

    process.env.NODE_ENV === 'development' && console.log('✅ 性能报告生成完成')
    return report
  }

  /**
   * 导出报告为HTML
   */
  exportToHTML(report: PerformanceReport): string {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>性能优化报告 - ${new Date(report.timestamp).toLocaleDateString()}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; }
        .score { font-size: 48px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 10px 0; }
        .recommendation.high { border-color: #e74c3c; background: #fdf2f2; }
        .recommendation.medium { border-color: #f39c12; background: #fef9e7; }
        .recommendation.low { border-color: #27ae60; background: #eafaf1; }
        .chart { height: 300px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .status-good { color: #27ae60; font-weight: bold; }
        .status-warning { color: #f39c12; font-weight: bold; }
        .status-error { color: #e74c3c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 性能优化报告</h1>
            <p>生成时间: ${new Date(report.timestamp).toLocaleString()}</p>
            <p>报告ID: ${report.reportId}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>📈 执行摘要</h2>
                <div class="score">${report.executiveSummary.overallScore}/100</div>
                <div class="metric-grid">
                    <div class="metric-card">
                        <h3>关键发现</h3>
                        <ul>
                            ${report.executiveSummary.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="metric-card">
                        <h3>问题统计</h3>
                        <p>严重问题: <span class="status-error">${report.executiveSummary.criticalIssues}</span></p>
                        <p>优化机会: <span class="status-warning">${report.executiveSummary.improvementOpportunities}</span></p>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>📊 性能指标</h2>
                <div class="metric-grid">
                    <div class="metric-card">
                        <h3>加载性能</h3>
                        <p>页面加载时间: ${(report.metrics.loadTime || 0).toFixed(2)}ms</p>
                        <p>首次内容绘制: ${(report.metrics.firstContentfulPaint || 0).toFixed(2)}ms</p>
                        <p>最大内容绘制: ${(report.metrics.largestContentfulPaint || 0).toFixed(2)}ms</p>
                    </div>
                    <div class="metric-card">
                        <h3>资源使用</h3>
                        <p>内存使用: ${((report.metrics.memoryUsage || 0) / 1024 / 1024).toFixed(2)}MB</p>
                        <p>网络请求: ${report.metrics.networkRequests || 0}</p>
                        <p>传输大小: ${((report.metrics.totalTransferSize || 0) / 1024).toFixed(2)}KB</p>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>🎯 优化建议</h2>
                ${report.recommendations
                  .map(
                    rec => `
                    <div class="recommendation ${rec.priority}">
                        <h3>${rec.title}</h3>
                        <p><strong>优先级:</strong> ${rec.priority === 'high' ? '高' : rec.priority === 'medium' ? '中' : '低'}</p>
                        <p><strong>描述:</strong> ${rec.description}</p>
                        <p><strong>影响:</strong> ${rec.impact}</p>
                        <p><strong>实施方案:</strong> ${rec.implementation}</p>
                        <p><strong>预期改进:</strong> ${rec.estimatedImprovement}</p>
                        <p><strong>工作量:</strong> ${rec.effort === 'high' ? '高' : rec.effort === 'medium' ? '中' : '低'}</p>
                    </div>
                `
                  )
                  .join('')}
            </div>

            <div class="section">
                <h2>📋 实施计划</h2>
                <h3>第一阶段 (高优先级)</h3>
                <ul>
                    ${report.implementationPlan.phase1.map(item => `<li>${item.title}</li>`).join('')}
                </ul>
                <h3>第二阶段 (中优先级)</h3>
                <ul>
                    ${report.implementationPlan.phase2.map(item => `<li>${item.title}</li>`).join('')}
                </ul>
                <h3>第三阶段 (低优先级)</h3>
                <ul>
                    ${report.implementationPlan.phase3.map(item => `<li>${item.title}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>
</body>
</html>
    `
  }

  // 私有辅助方法
  private calculateComplexity(test: TestResult): 'low' | 'medium' | 'high' {
    if (test.duration > 1000 || test.memoryUsage > 10 * 1024 * 1024) return 'high'
    if (test.duration > 500 || test.memoryUsage > 5 * 1024 * 1024) return 'medium'
    return 'low'
  }

  private identifyIssues(test: TestResult): string[] {
    const issues: string[] = []
    if (test.duration > 1000) issues.push('渲染时间过长')
    if (test.memoryUsage > 10 * 1024 * 1024) issues.push('内存使用过高')
    if (test.errors.length > 0) issues.push('存在错误')
    return issues
  }

  private generateComponentRecommendations(test: TestResult): string[] {
    const recommendations: string[] = []
    if (test.duration > 500) recommendations.push('考虑使用虚拟滚动或分页')
    if (test.memoryUsage > 5 * 1024 * 1024) recommendations.push('优化数据结构，减少内存占用')
    if (test.errors.length > 0) recommendations.push('修复组件错误')
    return recommendations
  }

  private calculateMemoryGrowth(): number {
    const memoryTests = this.testResults.filter(test => test.memoryUsage > 0)
    if (memoryTests.length < 2) return 0

    const first = memoryTests[0].memoryUsage
    const last = memoryTests[memoryTests.length - 1].memoryUsage
    return first > 0 ? (last - first) / first : 0
  }

  private calculateOverallScore(): number {
    let score = 100

    // 基于性能回归扣分
    const regressions = this.comparisons.filter(c => c.regression).length
    score -= regressions * 10

    // 基于错误扣分
    const totalErrors = this.testResults.reduce((sum, test) => sum + test.errors.length, 0)
    score -= totalErrors * 5

    // 基于性能指标扣分
    if (this.metrics.loadTime && this.metrics.loadTime > 3000) score -= 15
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 50 * 1024 * 1024) score -= 10

    return Math.max(0, Math.min(100, score))
  }

  private identifyKeyFindings(): string[] {
    const findings: string[] = []

    const regressions = this.comparisons.filter(c => c.regression)
    if (regressions.length > 0) {
      findings.push(`发现 ${regressions.length} 个性能回归问题`)
    }

    const improvements = this.comparisons.filter(c => !c.regression && c.significance === 'high')
    if (improvements.length > 0) {
      findings.push(`实现了 ${improvements.length} 项显著性能提升`)
    }

    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 50 * 1024 * 1024) {
      findings.push('内存使用偏高，需要优化')
    }

    if (this.metrics.networkRequests && this.metrics.networkRequests > 50) {
      findings.push('网络请求过多，影响加载速度')
    }

    if (findings.length === 0) {
      findings.push('整体性能表现良好')
    }

    return findings
  }

  private createImplementationPlan(recommendations: OptimizationRecommendation[]): {
    phase1: OptimizationRecommendation[]
    phase2: OptimizationRecommendation[]
    phase3: OptimizationRecommendation[]
  } {
    return {
      phase1: recommendations.filter(r => r.priority === 'high'),
      phase2: recommendations.filter(r => r.priority === 'medium'),
      phase3: recommendations.filter(r => r.priority === 'low'),
    }
  }
}

/**
 * 性能报告组合式函数
 */
export function usePerformanceReporter() {
  const reporter = new PerformanceReporter()
  const isGenerating = ref(false)
  const currentReport = ref<PerformanceReport | null>(null)

  const generateReport = async () => {
    isGenerating.value = true
    try {
      const report = await reporter.generateReport()
      currentReport.value = report
      return report
    } finally {
      isGenerating.value = false
    }
  }

  const exportHTML = (report: PerformanceReport) => {
    return reporter.exportToHTML(report)
  }

  const downloadReport = (report: PerformanceReport, format: 'html' | 'json' = 'html') => {
    let content: string
    let filename: string
    let mimeType: string

    if (format === 'html') {
      content = reporter.exportToHTML(report)
      filename = `performance-report-${new Date().toISOString().split('T')[0]}.html`
      mimeType = 'text/html'
    } else {
      content = JSON.stringify(report, null, 2)
      filename = `performance-report-${new Date().toISOString().split('T')[0]}.json`
      mimeType = 'application/json'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return {
    // 状态
    isGenerating,
    currentReport,

    // 方法
    setMetrics: reporter.setMetrics.bind(reporter),
    addBenchmark: reporter.addBenchmark.bind(reporter),
    addComparison: reporter.addComparison.bind(reporter),
    addTestResults: reporter.addTestResults.bind(reporter),
    collectWebVitals: reporter.collectWebVitals.bind(reporter),
    generateReport,
    exportHTML,
    downloadReport,
  }
}
