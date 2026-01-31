/**
 * 🚀 v6.1.3优化: 自适应优化系统
 * 根据历史反馈自动调整参数和策略
 */

import { predictionModel } from './predictionModel'
import { learningEngine } from './learningEngine'
import { performancePredictor } from './performancePredictor'

export interface OptimizationTarget {
  metric: 'acceptanceRate' | 'satisfactionScore' | 'averageScore' | 'satisfactionRate'
  target: number
  weight: number
}

export interface OptimizationResult {
  success: boolean
  improvements: Array<{ metric: string; before: number; after: number; improvement: number }>
  changes: Array<{ parameter: string; oldValue: any; newValue: any }>
  confidence: number
  recommendations: string[]
}

export interface AdaptiveConfig {
  enabled: boolean
  optimizationInterval: number // 优化间隔（毫秒）
  minSamples: number // 最小样本数
  learningRate: number // 学习率
  targets: OptimizationTarget[]
}

/**
 * 自适应优化器类
 */
class AdaptiveOptimizer {
  private config: AdaptiveConfig = {
    enabled: true,
    optimizationInterval: 24 * 60 * 60 * 1000, // 24小时
    minSamples: 100,
    learningRate: 0.01,
    targets: [
      { metric: 'acceptanceRate', target: 0.8, weight: 0.4 },
      { metric: 'satisfactionScore', target: 4.0, weight: 0.3 },
      { metric: 'averageScore', target: 80, weight: 0.3 },
    ],
  }

  private lastOptimization: number = 0
  private optimizationHistory: OptimizationResult[] = []

  /**
   * 检查是否需要优化
   */
  shouldOptimize(): boolean {
    if (!this.config.enabled) return false

    const now = Date.now()
    if (now - this.lastOptimization < this.config.optimizationInterval) {
      return false
    }

    const stats = learningEngine.getStatistics()
    if (stats.totalRecords < this.config.minSamples) {
      return false
    }

    return true
  }

  /**
   * 执行优化
   */
  optimize(): OptimizationResult {
    const beforeMetrics = this.getCurrentMetrics()
    const changes: Array<{ parameter: string; oldValue: any; newValue: any }> = []

    // 优化模型权重
    const weightChanges = this.optimizeWeights()
    changes.push(...weightChanges)

    // 优化学习率
    const learningRateChange = this.optimizeLearningRate()
    if (learningRateChange) {
      changes.push(learningRateChange)
    }

    // 应用更改
    this.applyChanges(changes)

    // 评估优化效果
    const afterMetrics = this.getCurrentMetrics()
    const improvements = this.calculateImprovements(beforeMetrics, afterMetrics)

    const result: OptimizationResult = {
      success: improvements.some(i => i.improvement > 0),
      improvements,
      changes,
      confidence: this.calculateConfidence(changes, improvements),
      recommendations: this.generateRecommendations(improvements),
    }

    // 记录优化历史
    this.optimizationHistory.push(result)
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory.shift()
    }

    this.lastOptimization = Date.now()

    return result
  }

  /**
   * 优化权重
   */
  private optimizeWeights(): Array<{ parameter: string; oldValue: any; newValue: any }> {
    const changes: Array<{ parameter: string; oldValue: any; newValue: any }> = []
    const currentWeights = predictionModel.getWeights()
    const stats = learningEngine.getStatistics()

    // 分析各因子的表现
    const history = learningEngine.getHistory(1000)
    const factorPerformance = this.analyzeFactorPerformance(history)

    // 调整权重
    for (const [factor, performance] of factorPerformance) {
      const currentWeight = currentWeights.get(factor) || 0
      const targetWeight = this.calculateOptimalWeight(performance, currentWeight)

      if (Math.abs(targetWeight - currentWeight) > 0.01) {
        changes.push({
          parameter: `weight_${factor}`,
          oldValue: currentWeight,
          newValue: targetWeight,
        })

        currentWeights.set(factor, targetWeight)
      }
    }

    // 应用新权重
    if (changes.length > 0) {
      predictionModel.setWeights(currentWeights)
    }

    return changes
  }

  /**
   * 分析因子表现
   */
  private analyzeFactorPerformance(history: any[]): Map<string, number> {
    const performance = new Map<string, number>()

    // 简化：基于历史记录分析各因子的影响
    // 实际应该更详细地分析每个因子的贡献

    const deptMatchRecords = history.filter(
      r => r.features.sameDeptTeachers > 0 && r.accepted
    )
    const deptMatchRate = deptMatchRecords.length / history.length
    performance.set('departmentMatch', deptMatchRate)

    const workloadRecords = history.filter(
      r => {
        const balance = this.calculateWorkloadBalance(r.features.workloadDistribution)
        return balance > 0.7 && r.accepted
      }
    )
    const workloadRate = workloadRecords.length / history.length
    performance.set('workloadBalance', workloadRate)

    return performance
  }

  /**
   * 计算最优权重
   */
  private calculateOptimalWeight(performance: number, currentWeight: number): number {
    // 如果表现好，增加权重；表现差，减少权重
    const adjustment = (performance - 0.5) * this.config.learningRate
    const newWeight = currentWeight + adjustment

    // 限制在合理范围内
    return Math.max(0.05, Math.min(0.5, newWeight))
  }

  /**
   * 优化学习率
   */
  private optimizeLearningRate(): { parameter: string; oldValue: any; newValue: any } | null {
    const metrics = predictionModel.getMetrics()

    // 如果准确率低且训练样本多，可能需要调整学习率
    if (metrics.accuracy < 0.6 && metrics.trainingSamples > 500) {
      const newLearningRate = this.config.learningRate * 1.1 // 增加学习率

      if (newLearningRate <= 0.1) {
        // 限制最大学习率
        this.config.learningRate = newLearningRate
        return {
          parameter: 'learningRate',
          oldValue: this.config.learningRate / 1.1,
          newValue: newLearningRate,
        }
      }
    }

    return null
  }

  /**
   * 应用更改
   */
  private applyChanges(changes: Array<{ parameter: string; oldValue: any; newValue: any }>): void {
    // 更改已在上面的方法中应用
    // 这里可以添加额外的应用逻辑
  }

  /**
   * 获取当前指标
   */
  private getCurrentMetrics(): Record<string, number> {
    const stats = learningEngine.getStatistics()
    const metrics = predictionModel.getMetrics()

    return {
      acceptanceRate: stats.acceptanceRate,
      averageScore: stats.averageScore,
      modelAccuracy: metrics.accuracy,
    }
  }

  /**
   * 计算改进
   */
  private calculateImprovements(
    before: Record<string, number>,
    after: Record<string, number>
  ): Array<{ metric: string; before: number; after: number; improvement: number }> {
    const improvements: Array<{
      metric: string
      before: number
      after: number
      improvement: number
    }> = []

    for (const metric in before) {
      const beforeValue = before[metric]
      const afterValue = after[metric] || beforeValue
      const improvement = afterValue - beforeValue

      improvements.push({
        metric,
        before: beforeValue,
        after: afterValue,
        improvement,
      })
    }

    return improvements
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    changes: Array<{ parameter: string; oldValue: any; newValue: any }>,
    improvements: Array<{ metric: string; before: number; after: number; improvement: number }>
  ): number {
    // 基于更改数量和改进幅度计算置信度
    let confidence = 0.5

    if (changes.length > 0) {
      confidence += 0.2
    }

    const positiveImprovements = improvements.filter(i => i.improvement > 0).length
    if (positiveImprovements > 0) {
      confidence += (positiveImprovements / improvements.length) * 0.3
    }

    return Math.min(Math.max(confidence, 0), 1)
  }

  /**
   * 生成推荐
   */
  private generateRecommendations(
    improvements: Array<{ metric: string; before: number; after: number; improvement: number }>
  ): string[] {
    const recommendations: string[] = []

    const positiveImprovements = improvements.filter(i => i.improvement > 0)
    if (positiveImprovements.length > 0) {
      recommendations.push(
        `以下指标得到改进：${positiveImprovements.map(i => i.metric).join('、')}`
      )
    }

    const negativeImprovements = improvements.filter(i => i.improvement < 0)
    if (negativeImprovements.length > 0) {
      recommendations.push(
        `以下指标下降：${negativeImprovements.map(i => i.metric).join('、')}，建议回滚或进一步优化`
      )
    }

    return recommendations
  }

  /**
   * 计算工作量平衡
   */
  private calculateWorkloadBalance(workloads: number[]): number {
    if (workloads.length === 0) return 0.5

    const mean = workloads.reduce((sum, w) => sum + w, 0) / workloads.length
    const variance = workloads.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / workloads.length
    const stdDev = Math.sqrt(variance)

    const maxStdDev = mean * 0.5
    return Math.max(0, 1 - stdDev / maxStdDev)
  }

  /**
   * 配置优化器
   */
  configure(config: Partial<AdaptiveConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): AdaptiveConfig {
    return { ...this.config }
  }

  /**
   * 获取优化历史
   */
  getOptimizationHistory(): OptimizationResult[] {
    return [...this.optimizationHistory]
  }

  /**
   * 重置优化器
   */
  reset(): void {
    this.lastOptimization = 0
    this.optimizationHistory = []
  }
}

// 导出单例实例
export const adaptiveOptimizer = new AdaptiveOptimizer()

// 导出便捷方法
export const shouldOptimize = () => adaptiveOptimizer.shouldOptimize()
export const optimize = () => adaptiveOptimizer.optimize()
export const configureOptimizer = (config: Partial<AdaptiveConfig>) =>
  adaptiveOptimizer.configure(config)

