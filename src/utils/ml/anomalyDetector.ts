/**
 * 🚀 v6.1.3优化: 异常检测系统
 * 检测异常分配模式和潜在问题
 */

import { learningEngine, type HistoricalRecord } from './learningEngine'

export interface Anomaly {
  id: string
  type: 'outlier' | 'pattern_break' | 'performance_degradation' | 'data_quality'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  detectedAt: string
  confidence: number
  affectedRecords: number
  suggestions: string[]
}

export interface AnomalyDetectionConfig {
  outlierThreshold: number // 异常值阈值（标准差倍数）
  patternBreakWindow: number // 模式中断检测窗口（天数）
  performanceThreshold: number // 性能下降阈值
  minSamples: number // 最小样本数
}

/**
 * 异常检测器类
 */
class AnomalyDetector {
  private config: AnomalyDetectionConfig = {
    outlierThreshold: 2.5, // 2.5倍标准差
    patternBreakWindow: 7, // 7天
    performanceThreshold: 0.2, // 20%下降
    minSamples: 10,
  }

  /**
   * 检测所有异常
   */
  detectAll(): Anomaly[] {
    const anomalies: Anomaly[] = []

    // 异常值检测
    anomalies.push(...this.detectOutliers())

    // 模式中断检测
    anomalies.push(...this.detectPatternBreaks())

    // 性能下降检测
    anomalies.push(...this.detectPerformanceDegradation())

    // 数据质量检测
    anomalies.push(...this.detectDataQualityIssues())

    return anomalies.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  /**
   * 检测异常值
   */
  private detectOutliers(): Anomaly[] {
    const anomalies: Anomaly[] = []
    const history = learningEngine.getHistory()

    if (history.length < this.config.minSamples) {
      return anomalies
    }

    // 计算得分分布
    const scores = history.map(r => r.actualScore)
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)

    // 检测异常低分
    const lowOutliers = history.filter(
      r => r.actualScore < mean - this.config.outlierThreshold * stdDev
    )

    if (lowOutliers.length > 0) {
      anomalies.push({
        id: `outlier_low_${Date.now()}`,
        type: 'outlier',
        severity: lowOutliers.length > 5 ? 'high' : 'medium',
        title: '异常低分检测',
        description: `检测到${lowOutliers.length}条异常低分记录（低于均值${(mean - this.config.outlierThreshold * stdDev).toFixed(1)}分）`,
        detectedAt: new Date().toISOString(),
        confidence: 0.8,
        affectedRecords: lowOutliers.length,
        suggestions: [
          '检查低分记录的特征',
          '分析是否存在系统性问题',
          '考虑调整模型权重',
        ],
      })
    }

    // 检测异常高分
    const highOutliers = history.filter(
      r => r.actualScore > mean + this.config.outlierThreshold * stdDev
    )

    if (highOutliers.length > 0) {
      anomalies.push({
        id: `outlier_high_${Date.now()}`,
        type: 'outlier',
        severity: 'low',
        title: '异常高分检测',
        description: `检测到${highOutliers.length}条异常高分记录（高于均值${(mean + this.config.outlierThreshold * stdDev).toFixed(1)}分）`,
        detectedAt: new Date().toISOString(),
        confidence: 0.7,
        affectedRecords: highOutliers.length,
        suggestions: [
          '分析高分记录的成功因素',
          '考虑将这些模式应用到其他场景',
          '更新最佳实践',
        ],
      })
    }

    return anomalies
  }

  /**
   * 检测模式中断
   */
  private detectPatternBreaks(): Anomaly[] {
    const anomalies: Anomaly[] = []
    const history = learningEngine.getHistory()

    if (history.length < this.config.minSamples * 2) {
      return anomalies
    }

    // 按时间窗口分组
    const windowSize = this.config.patternBreakWindow * 24 * 60 * 60 * 1000
    const now = Date.now()
    const recentWindow = history.filter(
      r => now - new Date(r.timestamp).getTime() < windowSize
    )
    const previousWindow = history.filter(
      r => {
        const timeDiff = now - new Date(r.timestamp).getTime()
        return timeDiff >= windowSize && timeDiff < windowSize * 2
      }
    )

    if (recentWindow.length < this.config.minSamples || previousWindow.length < this.config.minSamples) {
      return anomalies
    }

    // 比较接受率
    const recentAcceptance = recentWindow.filter(r => r.accepted).length / recentWindow.length
    const previousAcceptance = previousWindow.filter(r => r.accepted).length / previousWindow.length

    const acceptanceDrop = previousAcceptance - recentAcceptance
    if (acceptanceDrop > 0.2) {
      anomalies.push({
        id: `pattern_break_acceptance_${Date.now()}`,
        type: 'pattern_break',
        severity: 'high',
        title: '接受率模式中断',
        description: `最近${this.config.patternBreakWindow}天的接受率为${(recentAcceptance * 100).toFixed(1)}%，较之前下降了${(acceptanceDrop * 100).toFixed(1)}%`,
        detectedAt: new Date().toISOString(),
        confidence: 0.85,
        affectedRecords: recentWindow.length,
        suggestions: [
          '检查最近的数据质量',
          '分析推荐算法变化',
          '收集用户反馈',
          '考虑回滚到之前的配置',
        ],
      })
    }

    // 比较平均得分
    const recentAvgScore = recentWindow.reduce((sum, r) => sum + r.actualScore, 0) / recentWindow.length
    const previousAvgScore = previousWindow.reduce((sum, r) => sum + r.actualScore, 0) / previousWindow.length

    const scoreDrop = previousAvgScore - recentAvgScore
    if (scoreDrop > 10) {
      anomalies.push({
        id: `pattern_break_score_${Date.now()}`,
        type: 'pattern_break',
        severity: 'medium',
        title: '得分模式中断',
        description: `最近${this.config.patternBreakWindow}天的平均得分为${recentAvgScore.toFixed(1)}，较之前下降了${scoreDrop.toFixed(1)}分`,
        detectedAt: new Date().toISOString(),
        confidence: 0.75,
        affectedRecords: recentWindow.length,
        suggestions: [
          '检查特征分布变化',
          '分析约束条件变化',
          '评估模型性能',
        ],
      })
    }

    return anomalies
  }

  /**
   * 检测性能下降
   */
  private detectPerformanceDegradation(): Anomaly[] {
    const anomalies: Anomaly[] = []
    const history = learningEngine.getHistory()

    if (history.length < this.config.minSamples * 2) {
      return anomalies
    }

    // 计算预测准确率
    const recentRecords = history.slice(-100)
    let correct = 0
    for (const record of recentRecords) {
      const predictionError = Math.abs(record.predictedScore - record.actualScore)
      if (predictionError < 10) {
        // 误差小于10分视为正确
        correct++
      }
    }

    const recentAccuracy = correct / recentRecords.length

    // 与历史准确率比较
    const olderRecords = history.slice(-200, -100)
    if (olderRecords.length >= this.config.minSamples) {
      let olderCorrect = 0
      for (const record of olderRecords) {
        const predictionError = Math.abs(record.predictedScore - record.actualScore)
        if (predictionError < 10) {
          olderCorrect++
        }
      }

      const olderAccuracy = olderCorrect / olderRecords.length
      const accuracyDrop = olderAccuracy - recentAccuracy

      if (accuracyDrop > this.config.performanceThreshold) {
        anomalies.push({
          id: `performance_degradation_${Date.now()}`,
          type: 'performance_degradation',
          severity: 'high',
          title: '模型性能下降',
          description: `最近100条记录的预测准确率为${(recentAccuracy * 100).toFixed(1)}%，较之前下降了${(accuracyDrop * 100).toFixed(1)}%`,
          detectedAt: new Date().toISOString(),
          confidence: 0.8,
          affectedRecords: recentRecords.length,
          suggestions: [
            '重新训练模型',
            '检查数据质量',
            '分析特征变化',
            '调整模型参数',
          ],
        })
      }
    }

    return anomalies
  }

  /**
   * 检测数据质量问题
   */
  private detectDataQualityIssues(): Anomaly[] {
    const anomalies: Anomaly[] = []
    const history = learningEngine.getHistory()

    if (history.length < this.config.minSamples) {
      return anomalies
    }

    // 检测缺失数据
    const recordsWithMissingData = history.filter(r => {
      const features = r.features
      return (
        !features.studentDepartment ||
        !features.examDate ||
        features.availableTeachers === undefined
      )
    })

    if (recordsWithMissingData.length > history.length * 0.1) {
      anomalies.push({
        id: `data_quality_missing_${Date.now()}`,
        type: 'data_quality',
        severity: 'medium',
        title: '数据缺失问题',
        description: `有${recordsWithMissingData.length}条记录（${((recordsWithMissingData.length / history.length) * 100).toFixed(1)}%）存在缺失数据`,
        detectedAt: new Date().toISOString(),
        confidence: 0.9,
        affectedRecords: recordsWithMissingData.length,
        suggestions: [
          '检查数据收集流程',
          '修复缺失数据',
          '改进数据验证',
        ],
      })
    }

    // 检测异常值范围
    const scores = history.map(r => r.actualScore)
    const invalidScores = scores.filter(s => s < 0 || s > 100)

    if (invalidScores.length > 0) {
      anomalies.push({
        id: `data_quality_invalid_${Date.now()}`,
        type: 'data_quality',
        severity: 'high',
        title: '无效数据检测',
        description: `检测到${invalidScores.length}条记录的得分不在有效范围内（0-100）`,
        detectedAt: new Date().toISOString(),
        confidence: 1.0,
        affectedRecords: invalidScores.length,
        suggestions: [
          '立即修复无效数据',
          '检查数据输入验证',
          '审查数据收集流程',
        ],
      })
    }

    return anomalies
  }

  /**
   * 配置检测参数
   */
  configure(config: Partial<AnomalyDetectionConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): AnomalyDetectionConfig {
    return { ...this.config }
  }
}

// 导出单例实例
export const anomalyDetector = new AnomalyDetector()

// 导出便捷方法
export const detectAnomalies = () => anomalyDetector.detectAll()
export const configureAnomalyDetection = (config: Partial<AnomalyDetectionConfig>) =>
  anomalyDetector.configure(config)

