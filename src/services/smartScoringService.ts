/**
 * 智能评分系统
 * 实现文档中要求的考官智能评分机制
 */

import { dutyRotationService } from './dutyRotationService'
import { DateUtils as dateUtils } from '../utils/dateUtils'

export interface TeacherScore {
  teacherId: string
  teacherName: string
  baseScore: number
  statusBonus: number
  workloadPenalty: number
  continuityPenalty: number
  availabilityBonus: number
  scarcityPenalty: number
  finalScore: number
  reasoning: string[]
}

export interface ScoringContext {
  examDate: string
  studentDepartment: string
  examType: 'day1' | 'day2'
  isFieldExam: boolean
  currentWorkloadStats: Record<string, number>
  futureSchedule: Record<string, string[]> // teacherId -> dates
  departmentStats: Record<string, { teachers: number; students: number }>
}

export interface ScoringWeights {
  statusWeight: number // 班组状态权重
  workloadWeight: number // 工作量权重
  continuityWeight: number // 连续性权重
  availabilityWeight: number // 可用性权重
  scarcityWeight: number // 稀缺性权重
}

export class SmartScoringService {
  private readonly DEFAULT_WEIGHTS: ScoringWeights = {
    statusWeight: 1.0,
    workloadWeight: 1.2,
    continuityWeight: 1.1,
    availabilityWeight: 0.8,
    scarcityWeight: 0.9,
  }

  private readonly BASE_SCORE = 100

  /**
   * 计算考官的智能评分
   */
  calculateTeacherScore(
    teacher: any,
    context: ScoringContext,
    weights: ScoringWeights = this.DEFAULT_WEIGHTS
  ): TeacherScore {
    const reasoning: string[] = []
    let score = this.BASE_SCORE

    // 1. 状态加分
    const statusBonus = this.calculateStatusBonus(teacher, context, reasoning)
    score += statusBonus * weights.statusWeight

    // 2. 工作量扣分
    const workloadPenalty = this.calculateWorkloadPenalty(teacher, context, reasoning)
    score -= workloadPenalty * weights.workloadWeight

    // 3. 连续工作扣分
    const continuityPenalty = this.calculateContinuityPenalty(teacher, context, reasoning)
    score -= continuityPenalty * weights.continuityWeight

    // 4. 未来可用性调整
    const availabilityBonus = this.calculateAvailabilityBonus(teacher, context, reasoning)
    score += availabilityBonus * weights.availabilityWeight

    // 5. 稀缺资源保护
    const scarcityPenalty = this.calculateScarcityPenalty(teacher, context, reasoning)
    score -= scarcityPenalty * weights.scarcityWeight

    const finalScore = Math.max(0, score)

    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      baseScore: this.BASE_SCORE,
      statusBonus,
      workloadPenalty,
      continuityPenalty,
      availabilityBonus,
      scarcityPenalty,
      finalScore,
      reasoning,
    }
  }

  /**
   * 批量计算候选考官评分
   */
  scoreTeacherCandidates(
    candidates: any[],
    context: ScoringContext,
    weights?: ScoringWeights
  ): TeacherScore[] {
    return candidates
      .map(teacher => this.calculateTeacherScore(teacher, context, weights))
      .sort((a, b) => b.finalScore - a.finalScore)
  }

  /**
   * 计算状态加分
   */
  private calculateStatusBonus(teacher: any, context: ScoringContext, reasoning: string[]): number {
    const teacherGroup = teacher.group

    // 无班组考官固定加分
    if (!teacherGroup || teacherGroup === '无' || teacherGroup === '') {
      reasoning.push('无班组考官，机动性强 (+20分)')
      return 20
    }

    const dutySchedule = dutyRotationService.calculateDutySchedule(context.examDate)

    // 晚班考官最高优先级
    if (teacherGroup === dutySchedule.nightShift) {
      reasoning.push(`${context.examDate}执勤晚班，优先安排 (+40分)`)
      return 40
    }

    // 休息班组次优先级
    if (dutySchedule.restGroups.includes(teacherGroup)) {
      reasoning.push(`${context.examDate}休息班组，可优先安排 (+30分)`)
      return 30
    }

    // 白班考官不能担任考官（应该在候选阶段就被过滤）
    if (teacherGroup === dutySchedule.dayShift) {
      reasoning.push(`${context.examDate}执勤白班，不能担任考官 (-100分)`)
      return -100
    }

    reasoning.push('普通状态 (+0分)')
    return 0
  }

  /**
   * 计算工作量扣分
   */
  private calculateWorkloadPenalty(
    teacher: any,
    context: ScoringContext,
    reasoning: string[]
  ): number {
    const currentWorkload = context.currentWorkloadStats[teacher.id] || 0

    if (currentWorkload === 0) {
      reasoning.push('当前无工作量 (+0分)')
      return 0
    }

    const penalty = currentWorkload * 10
    reasoning.push(`当前工作量${currentWorkload}次，负载扣分 (-${penalty}分)`)

    return penalty
  }

  /**
   * 计算连续工作扣分
   */
  private calculateContinuityPenalty(
    teacher: any,
    context: ScoringContext,
    reasoning: string[]
  ): number {
    const consecutiveDays = this.calculateConsecutiveDays(teacher, context)

    if (consecutiveDays === 0) {
      reasoning.push('无连续工作 (+0分)')
      return 0
    }

    const penalty = consecutiveDays * 15
    reasoning.push(`连续工作${consecutiveDays}天，疲劳扣分 (-${penalty}分)`)

    return penalty
  }

  /**
   * 计算未来可用性加分
   */
  private calculateAvailabilityBonus(
    teacher: any,
    context: ScoringContext,
    reasoning: string[]
  ): number {
    const futureAvailability = this.calculateFutureAvailability(teacher, context)

    if (futureAvailability < 0.3) {
      reasoning.push(`未来可用性低(${(futureAvailability * 100).toFixed(1)}%)，优先使用 (+25分)`)
      return 25
    }

    if (futureAvailability > 0.8) {
      reasoning.push(`未来可用性高(${(futureAvailability * 100).toFixed(1)}%)，可适当保留 (-5分)`)
      return -5
    }

    reasoning.push(`未来可用性适中(${(futureAvailability * 100).toFixed(1)}%) (+0分)`)
    return 0
  }

  /**
   * 计算稀缺资源扣分
   */
  private calculateScarcityPenalty(
    teacher: any,
    context: ScoringContext,
    reasoning: string[]
  ): number {
    const isScarceDept = this.isScarceDepartment(teacher.department, context)
    const isKeyTeacher = this.isKeyTeacher(teacher, context)

    if (isScarceDept && isKeyTeacher) {
      reasoning.push(`稀缺科室关键考官，保护使用 (-30分)`)
      return 30
    }

    if (isScarceDept) {
      reasoning.push(`稀缺科室考官，适度保护 (-15分)`)
      return 15
    }

    if (isKeyTeacher) {
      reasoning.push(`关键考官，适度保护 (-10分)`)
      return 10
    }

    reasoning.push('普通考官 (+0分)')
    return 0
  }

  /**
   * 计算连续工作天数
   */
  private calculateConsecutiveDays(teacher: any, context: ScoringContext): number {
    const teacherSchedule = context.futureSchedule[teacher.id] || []
    const examDate = new Date(context.examDate)

    let consecutiveDays = 0

    // 向前检查连续天数
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(examDate)
      checkDate.setDate(checkDate.getDate() - i)
      const checkDateStr = dateUtils.toStorageDate(checkDate)

      if (teacherSchedule.includes(checkDateStr)) {
        consecutiveDays++
      } else {
        break
      }
    }

    return consecutiveDays
  }

  /**
   * 计算未来可用性
   */
  private calculateFutureAvailability(teacher: any, context: ScoringContext): number {
    const teacherSchedule = context.futureSchedule[teacher.id] || []
    const examDate = new Date(context.examDate)

    // 检查未来7天的可用性
    let availableDays = 0
    const totalDays = 7

    for (let i = 1; i <= totalDays; i++) {
      const checkDate = new Date(examDate)
      checkDate.setDate(checkDate.getDate() + i)
      const checkDateStr = dateUtils.toStorageDate(checkDate)

      // 检查是否已安排工作
      const hasWork = teacherSchedule.includes(checkDateStr)

      // 检查是否可以担任考官（考虑班组轮转）
      const canBeExaminer = dutyRotationService.canTeacherBeExaminer(teacher.group, checkDateStr)

      if (!hasWork && canBeExaminer) {
        availableDays++
      }
    }

    return availableDays / totalDays
  }

  /**
   * 判断是否为稀缺科室
   */
  private isScarceDepartment(department: string, context: ScoringContext): boolean {
    // 三室和七室为稀缺科室
    if (['三', '七'].includes(department)) {
      return true
    }

    // 检查科室考官/学员比例
    const deptStats = context.departmentStats[department]
    if (deptStats && deptStats.teachers > 0) {
      const ratio = deptStats.students / deptStats.teachers
      return ratio > 2.0 // 比例超过2:1认为稀缺
    }

    return false
  }

  /**
   * 判断是否为关键考官
   */
  private isKeyTeacher(teacher: any, context: ScoringContext): boolean {
    // 无班组考官通常是关键考官（机动性强）
    if (!teacher.group || teacher.group === '无' || teacher.group === '') {
      return true
    }

    // 检查是否为科室内少数考官
    const deptStats = context.departmentStats[teacher.department]
    if (deptStats && deptStats.teachers <= 2) {
      return true
    }

    return false
  }

  /**
   * 生成评分报告
   */
  generateScoringReport(
    scores: TeacherScore[],
    context: ScoringContext
  ): {
    summary: {
      totalCandidates: number
      averageScore: number
      scoreRange: { min: number; max: number }
      recommendedTeacher: TeacherScore | null
    }
    distribution: {
      excellent: TeacherScore[] // 90+
      good: TeacherScore[] // 70-89
      fair: TeacherScore[] // 50-69
      poor: TeacherScore[] // <50
    }
    insights: string[]
  } {
    const totalCandidates = scores.length
    const averageScore = scores.reduce((sum, s) => sum + s.finalScore, 0) / totalCandidates
    const scoreRange = {
      min: Math.min(...scores.map(s => s.finalScore)),
      max: Math.max(...scores.map(s => s.finalScore)),
    }
    const recommendedTeacher = scores.length > 0 ? scores[0] : null

    const distribution = {
      excellent: scores.filter(s => s.finalScore >= 90),
      good: scores.filter(s => s.finalScore >= 70 && s.finalScore < 90),
      fair: scores.filter(s => s.finalScore >= 50 && s.finalScore < 70),
      poor: scores.filter(s => s.finalScore < 50),
    }

    const insights: string[] = []

    if (distribution.excellent.length === 0) {
      insights.push('⚠️ 无优秀候选人，可能需要放宽约束或调整日期')
    }

    if (distribution.poor.length > totalCandidates * 0.5) {
      insights.push('⚠️ 超过50%候选人评分较低，建议检查资源配置')
    }

    if (recommendedTeacher && recommendedTeacher.finalScore < 60) {
      insights.push('⚠️ 推荐考官评分偏低，排班质量可能受影响')
    }

    return {
      summary: {
        totalCandidates,
        averageScore,
        scoreRange,
        recommendedTeacher,
      },
      distribution,
      insights,
    }
  }

  /**
   * 优化评分权重
   */
  optimizeWeights(
    historicalData: Array<{
      context: ScoringContext
      selectedTeacher: any
      outcome: 'success' | 'conflict' | 'suboptimal'
    }>
  ): ScoringWeights {
    // 基于历史数据优化权重（简化实现）
    const optimizedWeights = { ...this.DEFAULT_WEIGHTS }

    const successfulCases = historicalData.filter(d => d.outcome === 'success')
    const conflictCases = historicalData.filter(d => d.outcome === 'conflict')

    // 如果冲突案例较多，增加状态权重
    if (conflictCases.length > successfulCases.length * 0.2) {
      optimizedWeights.statusWeight *= 1.2
    }

    // 如果工作量不均衡问题较多，增加工作量权重
    const workloadIssues = historicalData.filter(
      d => d.outcome === 'suboptimal' && d.context.currentWorkloadStats[d.selectedTeacher.id] > 3
    )

    if (workloadIssues.length > 0) {
      optimizedWeights.workloadWeight *= 1.3
    }

    return optimizedWeights
  }
}

// 创建单例实例
export const smartScoringService = new SmartScoringService()
