/**
 * 🚀 v6.1.3优化: 机器学习引擎
 * 从历史数据中学习模式，持续优化分配策略
 */

import { predictionModel } from './predictionModel'
import type { PredictionFeatures } from './predictionModel'

export interface LearningPattern {
  pattern: string
  frequency: number
  successRate: number
  averageScore: number
  confidence: number
}

export interface LearningInsight {
  type: 'trend' | 'anomaly' | 'recommendation' | 'warning'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  actionable: boolean
  suggestions?: string[]
}

export interface HistoricalRecord {
  id: string
  timestamp: string
  features: PredictionFeatures
  predictedScore: number
  actualScore: number
  accepted: boolean
  manualEdit: boolean
  satisfactionScore?: number
}

/**
 * 学习引擎类
 */
class LearningEngine {
  private historicalRecords: HistoricalRecord[] = []
  private patterns: Map<string, LearningPattern> = new Map()
  private maxRecords = 50000
  private learningWindow = 30 * 24 * 60 * 60 * 1000 // 30天

  /**
   * 记录历史数据
   */
  record(record: Omit<HistoricalRecord, 'id' | 'timestamp'>): void {
    const fullRecord: HistoricalRecord = {
      id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...record,
    }

    this.historicalRecords.push(fullRecord)

    // 限制记录数量
    if (this.historicalRecords.length > this.maxRecords) {
      this.historicalRecords.shift()
    }

    // 清理过期记录
    this.cleanExpiredRecords()

    // 在线学习
    if (record.actualScore !== undefined) {
      predictionModel.train(record.features, record.actualScore)
    }

    // 更新模式
    this.updatePatterns()
  }

  /**
   * 清理过期记录
   */
  private cleanExpiredRecords(): void {
    const cutoff = Date.now() - this.learningWindow
    this.historicalRecords = this.historicalRecords.filter(
      record => new Date(record.timestamp).getTime() > cutoff
    )
  }

  /**
   * 更新学习模式
   */
  private updatePatterns(): void {
    this.patterns.clear()

    // 按科室分组
    const deptPatterns = this.analyzeDepartmentPatterns()
    deptPatterns.forEach((pattern, key) => {
      this.patterns.set(`dept_${key}`, pattern)
    })

    // 按时间段分组
    const timePatterns = this.analyzeTimePatterns()
    timePatterns.forEach((pattern, key) => {
      this.patterns.set(`time_${key}`, pattern)
    })

    // 按考官经验分组
    const experiencePatterns = this.analyzeExperiencePatterns()
    experiencePatterns.forEach((pattern, key) => {
      this.patterns.set(`exp_${key}`, pattern)
    })
  }

  /**
   * 分析科室模式
   */
  private analyzeDepartmentPatterns(): Map<string, LearningPattern> {
    const patterns = new Map<string, LearningPattern>()
    const deptGroups = new Map<string, HistoricalRecord[]>()

    // 按科室分组
    for (const record of this.historicalRecords) {
      const dept = record.features.studentDepartment
      if (!deptGroups.has(dept)) {
        deptGroups.set(dept, [])
      }
      deptGroups.get(dept)!.push(record)
    }

    // 分析每个科室
    for (const [dept, records] of deptGroups) {
      const accepted = records.filter(r => r.accepted).length
      const avgScore = records.reduce((sum, r) => sum + r.actualScore, 0) / records.length

      patterns.set(dept, {
        pattern: `科室: ${dept}`,
        frequency: records.length,
        successRate: accepted / records.length,
        averageScore: avgScore,
        confidence: Math.min(records.length / 100, 1), // 数据越多，置信度越高
      })
    }

    return patterns
  }

  /**
   * 分析时间段模式
   */
  private analyzeTimePatterns(): Map<string, LearningPattern> {
    const patterns = new Map<string, LearningPattern>()
    const timeGroups = new Map<string, HistoricalRecord[]>()

    // 按时间段分组（工作日/周末）
    for (const record of this.historicalRecords) {
      const date = new Date(record.features.examDate)
      const dayOfWeek = date.getDay()
      const timeSlot = dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday'

      if (!timeGroups.has(timeSlot)) {
        timeGroups.set(timeSlot, [])
      }
      timeGroups.get(timeSlot)!.push(record)
    }

    // 分析每个时间段
    for (const [timeSlot, records] of timeGroups) {
      const accepted = records.filter(r => r.accepted).length
      const avgScore = records.reduce((sum, r) => sum + r.actualScore, 0) / records.length

      patterns.set(timeSlot, {
        pattern: `时间段: ${timeSlot === 'weekend' ? '周末' : '工作日'}`,
        frequency: records.length,
        successRate: accepted / records.length,
        averageScore: avgScore,
        confidence: Math.min(records.length / 100, 1),
      })
    }

    return patterns
  }

  /**
   * 分析考官经验模式
   */
  private analyzeExperiencePatterns(): Map<string, LearningPattern> {
    const patterns = new Map<string, LearningPattern>()
    const expGroups = new Map<string, HistoricalRecord[]>()

    // 按经验水平分组
    for (const record of this.historicalRecords) {
      const experiences = Array.from(record.features.teacherExperience.values())
      const avgExp = experiences.length > 0
        ? experiences.reduce((sum, e) => sum + e, 0) / experiences.length
        : 0
      const expLevel = avgExp < 3 ? 'junior' : avgExp < 7 ? 'mid' : 'senior'

      if (!expGroups.has(expLevel)) {
        expGroups.set(expLevel, [])
      }
      expGroups.get(expLevel)!.push(record)
    }

    // 分析每个经验水平
    for (const [expLevel, records] of expGroups) {
      const accepted = records.filter(r => r.accepted).length
      const avgScore = records.reduce((sum, r) => sum + r.actualScore, 0) / records.length

      patterns.set(expLevel, {
        pattern: `经验水平: ${expLevel === 'junior' ? '初级' : expLevel === 'mid' ? '中级' : '高级'}`,
        frequency: records.length,
        successRate: accepted / records.length,
        averageScore: avgScore,
        confidence: Math.min(records.length / 100, 1),
      })
    }

    return patterns
  }

  /**
   * 生成学习洞察
   */
  generateInsights(): LearningInsight[] {
    const insights: LearningInsight[] = []

    // 趋势分析
    const trends = this.analyzeTrends()
    insights.push(...trends)

    // 异常检测
    const anomalies = this.detectAnomalies()
    insights.push(...anomalies)

    // 推荐建议
    const recommendations = this.generateRecommendations()
    insights.push(...recommendations)

    // 警告
    const warnings = this.generateWarnings()
    insights.push(...warnings)

    return insights.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 }
      return impactOrder[b.impact] - impactOrder[a.impact]
    })
  }

  /**
   * 分析趋势
   */
  private analyzeTrends(): LearningInsight[] {
    const insights: LearningInsight[] = []

    // 分析接受率趋势
    const recentRecords = this.historicalRecords.slice(-100)
    const olderRecords = this.historicalRecords.slice(-200, -100)

    if (recentRecords.length > 10 && olderRecords.length > 10) {
      const recentAcceptance = recentRecords.filter(r => r.accepted).length / recentRecords.length
      const olderAcceptance = olderRecords.filter(r => r.accepted).length / olderRecords.length

      const trend = recentAcceptance - olderAcceptance
      if (Math.abs(trend) > 0.1) {
        insights.push({
          type: 'trend',
          title: '推荐接受率趋势',
          description: `最近100条记录的接受率为${(recentAcceptance * 100).toFixed(1)}%，较之前${trend > 0 ? '提升' : '下降'}了${Math.abs(trend * 100).toFixed(1)}%`,
          impact: Math.abs(trend) > 0.2 ? 'high' : 'medium',
          confidence: 0.8,
          actionable: true,
          suggestions: trend < 0 ? ['检查推荐算法', '优化特征权重', '收集用户反馈'] : [],
        })
      }
    }

    return insights
  }

  /**
   * 检测异常
   */
  private detectAnomalies(): LearningInsight[] {
    const insights: LearningInsight[] = []

    // 检测异常低接受率
    const recentRecords = this.historicalRecords.slice(-50)
    if (recentRecords.length > 10) {
      const acceptanceRate = recentRecords.filter(r => r.accepted).length / recentRecords.length

      if (acceptanceRate < 0.3) {
        insights.push({
          type: 'anomaly',
          title: '异常低接受率',
          description: `最近50条记录的接受率仅为${(acceptanceRate * 100).toFixed(1)}%，远低于正常水平`,
          impact: 'high',
          confidence: 0.9,
          actionable: true,
          suggestions: ['检查数据质量', '审查推荐逻辑', '联系用户获取反馈'],
        })
      }
    }

    // 检测异常高分但低接受
    const highScoreLowAccept = recentRecords.filter(
      r => r.predictedScore > 80 && !r.accepted
    ).length

    if (highScoreLowAccept > 5) {
      insights.push({
        type: 'anomaly',
        title: '高分低接受异常',
        description: `有${highScoreLowAccept}条记录预测得分>80但未被接受，可能存在模型偏差`,
        impact: 'medium',
        confidence: 0.7,
        actionable: true,
        suggestions: ['重新评估特征权重', '检查实际约束条件', '优化预测模型'],
      })
    }

    return insights
  }

  /**
   * 生成推荐
   */
  private generateRecommendations(): LearningInsight[] {
    const insights: LearningInsight[] = []

    // 分析最佳实践
    const topRecords = [...this.historicalRecords]
      .filter(r => r.accepted && r.satisfactionScore && r.satisfactionScore > 4)
      .sort((a, b) => b.actualScore - a.actualScore)
      .slice(0, 10)

    if (topRecords.length > 5) {
      // 分析共同特征
      const commonDepts = new Map<string, number>()
      for (const record of topRecords) {
        const dept = record.features.studentDepartment
        commonDepts.set(dept, (commonDepts.get(dept) || 0) + 1)
      }

      const topDept = Array.from(commonDepts.entries()).sort((a, b) => b[1] - a[1])[0]
      if (topDept && topDept[1] > topRecords.length * 0.5) {
        insights.push({
          type: 'recommendation',
          title: '最佳实践发现',
          description: `高满意度记录中，${topDept[0]}科室占比${((topDept[1] / topRecords.length) * 100).toFixed(1)}%，建议优先考虑该科室的分配模式`,
          impact: 'medium',
          confidence: 0.6,
          actionable: true,
          suggestions: [`在${topDept[0]}科室分配中应用该模式`, '记录成功案例', '推广到其他科室'],
        })
      }
    }

    return insights
  }

  /**
   * 生成警告
   */
  private generateWarnings(): LearningInsight[] {
    const insights: LearningInsight[] = []

    // 数据量不足警告
    if (this.historicalRecords.length < 100) {
      insights.push({
        type: 'warning',
        title: '数据量不足',
        description: `当前只有${this.historicalRecords.length}条历史记录，建议收集更多数据以提高模型准确性`,
        impact: 'low',
        confidence: 1.0,
        actionable: true,
        suggestions: ['继续收集历史数据', '使用默认权重', '定期评估模型性能'],
      })
    }

    // 模型性能警告
    const metrics = predictionModel.getMetrics()
    if (metrics.accuracy < 0.6 && metrics.trainingSamples > 100) {
      insights.push({
        type: 'warning',
        title: '模型准确率偏低',
        description: `当前模型准确率为${(metrics.accuracy * 100).toFixed(1)}%，建议重新训练模型`,
        impact: 'medium',
        confidence: 0.8,
        actionable: true,
        suggestions: ['增加训练数据', '调整学习率', '优化特征工程', '重新训练模型'],
      })
    }

    return insights
  }

  /**
   * 获取学习模式
   */
  getPatterns(): LearningPattern[] {
    return Array.from(this.patterns.values()).sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * 获取历史记录
   */
  getHistory(limit?: number): HistoricalRecord[] {
    const records = [...this.historicalRecords].reverse() // 最新的在前
    return limit ? records.slice(0, limit) : records
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalRecords: number
    acceptanceRate: number
    averageScore: number
    patternsCount: number
    modelAccuracy: number
  } {
    const accepted = this.historicalRecords.filter(r => r.accepted).length
    const avgScore =
      this.historicalRecords.length > 0
        ? this.historicalRecords.reduce((sum, r) => sum + r.actualScore, 0) /
          this.historicalRecords.length
        : 0

    return {
      totalRecords: this.historicalRecords.length,
      acceptanceRate: this.historicalRecords.length > 0 ? accepted / this.historicalRecords.length : 0,
      averageScore: avgScore,
      patternsCount: this.patterns.size,
      modelAccuracy: predictionModel.getMetrics().accuracy,
    }
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.historicalRecords = []
    this.patterns.clear()
  }
}

// 导出单例实例
export const learningEngine = new LearningEngine()

// 导出便捷方法
export const recordHistory = (record: Omit<HistoricalRecord, 'id' | 'timestamp'>) =>
  learningEngine.record(record)
export const getInsights = () => learningEngine.generateInsights()
export const getPatterns = () => learningEngine.getPatterns()
export const getStatistics = () => learningEngine.getStatistics()

