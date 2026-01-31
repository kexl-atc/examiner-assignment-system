/**
 * 🚀 v6.1.3优化: 性能预测系统
 * 预测分配方案的性能指标
 */

import { predictionModel, type PredictionFeatures } from './predictionModel'
import { learningEngine } from './learningEngine'

export interface PerformanceMetrics {
  acceptanceRate: number
  averageScore: number
  satisfactionScore: number
  conflictRate: number
  processingTime: number
  resourceUtilization: number
}

export interface PerformancePrediction {
  metrics: PerformanceMetrics
  confidence: number
  factors: Array<{ name: string; impact: number; trend: 'up' | 'down' | 'stable' }>
  recommendations: string[]
  riskFactors: string[]
}

/**
 * 性能预测器类
 */
class PerformancePredictor {
  /**
   * 预测性能指标
   */
  predict(features: PredictionFeatures): PerformancePrediction {
    // 使用预测模型
    const prediction = predictionModel.predict(features)

    // 基于历史数据预测各项指标
    const acceptanceRate = this.predictAcceptanceRate(features)
    const averageScore = prediction.score
    const satisfactionScore = this.predictSatisfactionScore(features)
    const conflictRate = features.conflictProbability
    const processingTime = this.predictProcessingTime(features)
    const resourceUtilization = this.predictResourceUtilization(features)

    const metrics: PerformanceMetrics = {
      acceptanceRate,
      averageScore,
      satisfactionScore,
      conflictRate,
      processingTime,
      resourceUtilization,
    }

    // 分析因子影响
    const factors = this.analyzeFactors(features, prediction)

    // 生成推荐
    const recommendations = this.generateRecommendations(metrics, factors)

    // 识别风险因素
    const riskFactors = this.identifyRiskFactors(metrics)

    return {
      metrics,
      confidence: prediction.confidence,
      factors,
      recommendations,
      riskFactors,
    }
  }

  /**
   * 预测接受率
   */
  private predictAcceptanceRate(features: PredictionFeatures): number {
    const history = learningEngine.getHistory(1000)
    const similarRecords = history.filter(r => {
      return (
        r.features.studentDepartment === features.studentDepartment &&
        Math.abs(r.features.availableTeachers - features.availableTeachers) < 5
      )
    })

    if (similarRecords.length > 0) {
      const accepted = similarRecords.filter(r => r.accepted).length
      return accepted / similarRecords.length
    }

    // 默认值
    return 0.7
  }

  /**
   * 预测满意度
   */
  private predictSatisfactionScore(features: PredictionFeatures): number {
    const history = learningEngine.getHistory(1000)
    const similarRecords = history.filter(
      r => r.features.studentDepartment === features.studentDepartment
    )

    if (similarRecords.length > 0) {
      const withSatisfaction = similarRecords.filter(r => r.satisfactionScore !== undefined)
      if (withSatisfaction.length > 0) {
        return (
          withSatisfaction.reduce((sum, r) => sum + (r.satisfactionScore || 0), 0) /
          withSatisfaction.length
        )
      }
    }

    // 基于特征估算
    let score = 3.0 // 基础分

    if (features.sameDeptTeachers > 0) {
      score += 0.5
    }

    if (features.workloadDistribution.length > 0) {
      const balance = this.calculateWorkloadBalance(features.workloadDistribution)
      score += balance * 0.5
    }

    if (features.conflictProbability < 0.3) {
      score += 0.5
    }

    return Math.min(Math.max(score, 1), 5)
  }

  /**
   * 预测处理时间
   */
  private predictProcessingTime(features: PredictionFeatures): number {
    // 基于问题规模估算（毫秒）
    const baseTime = 100
    const scaleFactor = features.availableTeachers * 10
    const complexityFactor = features.workloadDistribution.length * 5

    return baseTime + scaleFactor + complexityFactor
  }

  /**
   * 预测资源利用率
   */
  private predictResourceUtilization(features: PredictionFeatures): number {
    if (features.availableTeachers === 0) return 0

    // 计算资源利用率
    const utilization = Math.min(
      (features.sameDeptTeachers + features.diffDeptTeachers) / features.availableTeachers,
      1
    )

    return utilization
  }

  /**
   * 分析因子影响
   */
  private analyzeFactors(
    features: PredictionFeatures,
    prediction: any
  ): Array<{ name: string; impact: number; trend: 'up' | 'down' | 'stable' }> {
    const factors: Array<{ name: string; impact: number; trend: 'up' | 'down' | 'stable' }> = []

    // 分析历史趋势
    const history = learningEngine.getHistory(100)
    const recentHistory = history.slice(-20)

    // 科室匹配影响
    const deptImpact = features.sameDeptTeachers > 0 ? 0.8 : 0.3
    factors.push({
      name: '科室匹配',
      impact: deptImpact,
      trend: this.calculateTrend('departmentMatch', recentHistory),
    })

    // 工作量平衡影响
    const balance = this.calculateWorkloadBalance(features.workloadDistribution)
    factors.push({
      name: '工作量平衡',
      impact: balance,
      trend: this.calculateTrend('workloadBalance', recentHistory),
    })

    // 冲突风险影响
    const conflictImpact = 1 - features.conflictProbability
    factors.push({
      name: '冲突风险',
      impact: conflictImpact,
      trend: this.calculateTrend('conflictProbability', recentHistory),
    })

    return factors
  }

  /**
   * 计算趋势
   */
  private calculateTrend(
    factorName: string,
    history: any[]
  ): 'up' | 'down' | 'stable' {
    if (history.length < 10) return 'stable'

    // 简化：基于最近记录的变化趋势
    const recent = history.slice(-5)
    const older = history.slice(-10, -5)

    if (recent.length === 0 || older.length === 0) return 'stable'

    const recentAvg = recent.reduce((sum, r) => sum + r.actualScore, 0) / recent.length
    const olderAvg = older.reduce((sum, r) => sum + r.actualScore, 0) / older.length

    const diff = recentAvg - olderAvg

    if (diff > 2) return 'up'
    if (diff < -2) return 'down'
    return 'stable'
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
   * 生成推荐
   */
  private generateRecommendations(
    metrics: PerformanceMetrics,
    factors: Array<{ name: string; impact: number; trend: 'up' | 'down' | 'stable' }>
  ): string[] {
    const recommendations: string[] = []

    if (metrics.acceptanceRate < 0.5) {
      recommendations.push('接受率较低，建议优化推荐算法')
    }

    if (metrics.conflictRate > 0.3) {
      recommendations.push('冲突率较高，建议调整时间或考官选择')
    }

    if (metrics.satisfactionScore < 3.0) {
      recommendations.push('满意度较低，建议收集用户反馈并改进')
    }

    const lowImpactFactors = factors.filter(f => f.impact < 0.5 && f.trend === 'down')
    if (lowImpactFactors.length > 0) {
      recommendations.push(
        `以下因素影响下降：${lowImpactFactors.map(f => f.name).join('、')}，建议关注`
      )
    }

    return recommendations
  }

  /**
   * 识别风险因素
   */
  private identifyRiskFactors(metrics: PerformanceMetrics): string[] {
    const risks: string[] = []

    if (metrics.acceptanceRate < 0.3) {
      risks.push('接受率极低，可能存在系统性问题')
    }

    if (metrics.conflictRate > 0.5) {
      risks.push('冲突率过高，可能导致分配失败')
    }

    if (metrics.resourceUtilization < 0.2) {
      risks.push('资源利用率过低，可能存在资源浪费')
    }

    if (metrics.processingTime > 5000) {
      risks.push('处理时间过长，可能影响用户体验')
    }

    return risks
  }

  /**
   * 批量预测
   */
  batchPredict(featuresList: PredictionFeatures[]): PerformancePrediction[] {
    return featuresList.map(features => this.predict(features))
  }

  /**
   * 比较预测与实际
   */
  compareWithActual(
    prediction: PerformancePrediction,
    actual: Partial<PerformanceMetrics>
  ): {
    accuracy: number
    differences: Array<{ metric: string; predicted: number; actual: number; diff: number }>
  } {
    const differences: Array<{ metric: string; predicted: number; actual: number; diff: number }> =
      []

    if (actual.acceptanceRate !== undefined) {
      differences.push({
        metric: '接受率',
        predicted: prediction.metrics.acceptanceRate,
        actual: actual.acceptanceRate,
        diff: Math.abs(prediction.metrics.acceptanceRate - actual.acceptanceRate),
      })
    }

    if (actual.averageScore !== undefined) {
      differences.push({
        metric: '平均得分',
        predicted: prediction.metrics.averageScore,
        actual: actual.averageScore,
        diff: Math.abs(prediction.metrics.averageScore - actual.averageScore),
      })
    }

    if (actual.satisfactionScore !== undefined) {
      differences.push({
        metric: '满意度',
        predicted: prediction.metrics.satisfactionScore,
        actual: actual.satisfactionScore,
        diff: Math.abs(prediction.metrics.satisfactionScore - actual.satisfactionScore),
      })
    }

    // 计算整体准确率
    const avgDiff = differences.reduce((sum, d) => sum + d.diff, 0) / differences.length
    const accuracy = Math.max(0, 1 - avgDiff)

    return { accuracy, differences }
  }
}

// 导出单例实例
export const performancePredictor = new PerformancePredictor()

// 导出便捷方法
export const predictPerformance = (features: PredictionFeatures) =>
  performancePredictor.predict(features)
export const batchPredictPerformance = (featuresList: PredictionFeatures[]) =>
  performancePredictor.batchPredict(featuresList)

