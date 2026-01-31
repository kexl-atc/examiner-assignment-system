/**
 * 🚀 v6.1.3优化: 增强推荐系统
 * 基于机器学习的智能推荐
 */

import { predictionModel, type PredictionFeatures } from './predictionModel'
import { learningEngine } from './learningEngine'
import type { Teacher } from '../../types'

export interface EnhancedRecommendation {
  teacher: Teacher
  score: number
  confidence: number
  mlScore: number // 机器学习预测得分
  traditionalScore: number // 传统规则得分
  reasons: Array<{ type: string; text: string; weight: number }>
  predictions: {
    acceptanceProbability: number
    satisfactionProbability: number
    conflictRisk: number
  }
  metadata: {
    historicalMatches: number
    averageSatisfaction: number
    lastUsed?: string
  }
}

export interface RecommendationContext {
  student: {
    id: string
    name: string
    department: string
    level: string
  }
  examDate: string
  availableTeachers: Teacher[]
  existingAssignments: any[]
  constraints: any
}

/**
 * 增强推荐系统类
 */
class EnhancedRecommendationSystem {
  /**
   * 生成增强推荐
   */
  async generateRecommendations(
    context: RecommendationContext,
    options: {
      maxRecommendations?: number
      minScore?: number
      useML?: boolean
    } = {}
  ): Promise<EnhancedRecommendation[]> {
    const {
      maxRecommendations = 10,
      minScore = 50,
      useML = true,
    } = options

    const recommendations: EnhancedRecommendation[] = []

    for (const teacher of context.availableTeachers) {
      // 传统规则评分
      const traditionalScore = this.calculateTraditionalScore(teacher, context)

      // 机器学习评分
      let mlScore = 50 // 默认分
      if (useML) {
        const features = this.extractFeatures(teacher, context)
        const prediction = predictionModel.predict(features)
        mlScore = prediction.score
      }

      // 综合评分（ML权重60%，传统规则40%）
      const finalScore = mlScore * 0.6 + traditionalScore * 0.4

      if (finalScore >= minScore) {
        const recommendation = await this.buildRecommendation(
          teacher,
          context,
          traditionalScore,
          mlScore,
          finalScore
        )
        recommendations.push(recommendation)
      }
    }

    // 排序并限制数量
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRecommendations)
  }

  /**
   * 计算传统规则评分
   */
  private calculateTraditionalScore(teacher: Teacher, context: RecommendationContext): number {
    let score = 50

    // 科室匹配
    if (teacher.department === context.student.department) {
      score += 20
    }

    // 可用性
    if (this.isTeacherAvailable(teacher, context)) {
      score += 15
    }

    // 工作量（简化版）
    const workload = this.getTeacherWorkload(teacher, context)
    if (workload < 3) {
      score += 10
    } else if (workload > 6) {
      score -= 10
    }

    return Math.min(Math.max(score, 0), 100)
  }

  /**
   * 提取特征
   */
  private extractFeatures(teacher: Teacher, context: RecommendationContext): PredictionFeatures {
    const sameDeptTeachers = context.availableTeachers.filter(
      t => t.department === context.student.department
    )
    const diffDeptTeachers = context.availableTeachers.filter(
      t => t.department !== context.student.department
    )

    const workloads = context.existingAssignments.map(a => {
      // 简化：计算每个考官的工作量
      return 1 // 实际应该从分配中计算
    })

    return {
      studentDepartment: context.student.department,
      studentLevel: context.student.level,
      examDate: context.examDate,
      availableTeachers: context.availableTeachers.length,
      sameDeptTeachers: sameDeptTeachers.length,
      diffDeptTeachers: diffDeptTeachers.length,
      workloadDistribution: workloads,
      historicalAcceptanceRate: this.getHistoricalAcceptanceRate(teacher),
      teacherExperience: new Map([[teacher.id, this.getTeacherExperience(teacher)]]),
      conflictProbability: this.calculateConflictProbability(teacher, context),
    }
  }

  /**
   * 构建推荐对象
   */
  private async buildRecommendation(
    teacher: Teacher,
    context: RecommendationContext,
    traditionalScore: number,
    mlScore: number,
    finalScore: number
  ): Promise<EnhancedRecommendation> {
    const features = this.extractFeatures(teacher, context)
    const prediction = predictionModel.predict(features)

    // 生成原因
    const reasons = this.generateReasons(teacher, context, prediction)

    // 预测概率
    const predictions = {
      acceptanceProbability: this.predictAcceptanceProbability(teacher, context),
      satisfactionProbability: this.predictSatisfactionProbability(teacher, context),
      conflictRisk: features.conflictProbability,
    }

    // 元数据
    const metadata = {
      historicalMatches: this.getHistoricalMatches(teacher, context),
      averageSatisfaction: this.getAverageSatisfaction(teacher),
      lastUsed: this.getLastUsedDate(teacher, context),
    }

    return {
      teacher,
      score: finalScore,
      confidence: prediction.confidence,
      mlScore,
      traditionalScore,
      reasons,
      predictions,
      metadata,
    }
  }

  /**
   * 生成推荐原因
   */
  private generateReasons(
    teacher: Teacher,
    context: RecommendationContext,
    prediction: any
  ): Array<{ type: string; text: string; weight: number }> {
    const reasons: Array<{ type: string; text: string; weight: number }> = []

    // 科室匹配
    if (teacher.department === context.student.department) {
      reasons.push({
        type: 'department_match',
        text: '同科室匹配',
        weight: 0.25,
      })
    }

    // 机器学习预测
    const topFactor = prediction.factors.sort((a: any, b: any) => b.impact - a.impact)[0]
    if (topFactor) {
      reasons.push({
        type: 'ml_prediction',
        text: `ML预测: ${topFactor.name}得分${topFactor.impact.toFixed(2)}`,
        weight: topFactor.weight,
      })
    }

    // 历史匹配
    const historicalMatches = this.getHistoricalMatches(teacher, context)
    if (historicalMatches > 0) {
      reasons.push({
        type: 'historical_match',
        text: `历史匹配${historicalMatches}次`,
        weight: 0.15,
      })
    }

    return reasons
  }

  /**
   * 预测接受概率
   */
  private predictAcceptanceProbability(teacher: Teacher, context: RecommendationContext): number {
    // 基于历史数据预测
    const historicalMatches = this.getHistoricalMatches(teacher, context)
    const acceptanceRate = this.getHistoricalAcceptanceRate(teacher)

    // 综合计算
    let probability = 0.5

    if (historicalMatches > 0) {
      probability += Math.min(historicalMatches / 10, 0.3)
    }

    if (acceptanceRate > 0) {
      probability += acceptanceRate * 0.2
    }

    return Math.min(Math.max(probability, 0), 1)
  }

  /**
   * 预测满意度概率
   */
  private predictSatisfactionProbability(teacher: Teacher, context: RecommendationContext): number {
    const avgSatisfaction = this.getAverageSatisfaction(teacher)
    return avgSatisfaction / 5 // 归一化到0-1
  }

  /**
   * 获取历史匹配次数
   */
  private getHistoricalMatches(teacher: Teacher, context: RecommendationContext): number {
    const history = learningEngine.getHistory(1000)
    return history.filter(
      record =>
        record.features.studentDepartment === context.student.department &&
        record.accepted
    ).length
  }

  /**
   * 获取历史接受率
   */
  private getHistoricalAcceptanceRate(teacher: Teacher): number {
    const history = learningEngine.getHistory(1000)
    const relevant = history.filter(r => r.accepted)
    return relevant.length > 0 ? relevant.length / history.length : 0.5
  }

  /**
   * 获取平均满意度
   */
  private getAverageSatisfaction(teacher: Teacher): number {
    const history = learningEngine.getHistory(1000)
    const withSatisfaction = history.filter(r => r.satisfactionScore !== undefined)
    if (withSatisfaction.length === 0) return 3.5 // 默认值

    return (
      withSatisfaction.reduce((sum, r) => sum + (r.satisfactionScore || 0), 0) /
      withSatisfaction.length
    )
  }

  /**
   * 获取最后使用日期
   */
  private getLastUsedDate(teacher: Teacher, context: RecommendationContext): string | undefined {
    const history = learningEngine.getHistory(1000)
    const relevant = history
      .filter(r => r.accepted)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

    return relevant?.timestamp
  }

  /**
   * 获取考官经验
   */
  private getTeacherExperience(teacher: Teacher): number {
    // 简化：从teacher对象获取或返回默认值
    return (teacher as any).experience || 3
  }

  /**
   * 检查考官可用性
   */
  private isTeacherAvailable(teacher: Teacher, context: RecommendationContext): boolean {
    // 简化：检查是否在可用列表中
    return context.availableTeachers.includes(teacher)
  }

  /**
   * 获取考官工作量
   */
  private getTeacherWorkload(teacher: Teacher, context: RecommendationContext): number {
    // 简化：从现有分配中计算
    return context.existingAssignments.filter(
      a => a.examiner1Name === teacher.name || a.examiner2Name === teacher.name
    ).length
  }

  /**
   * 计算冲突概率
   */
  private calculateConflictProbability(teacher: Teacher, context: RecommendationContext): number {
    // 检查是否已有分配
    const hasConflict = context.existingAssignments.some(
      a =>
        a.examDate === context.examDate &&
        (a.examiner1Name === teacher.name || a.examiner2Name === teacher.name)
    )

    return hasConflict ? 1.0 : 0.0
  }
}

// 导出单例实例
export const enhancedRecommendationSystem = new EnhancedRecommendationSystem()

// 导出便捷方法
export const generateRecommendations = (
  context: RecommendationContext,
  options?: Parameters<typeof enhancedRecommendationSystem.generateRecommendations>[1]
) => enhancedRecommendationSystem.generateRecommendations(context, options)

