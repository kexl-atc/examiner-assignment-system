import {
  ExamAssignment,
  TimeDistributionStats,
  TimeConcentrationConstraint,
} from '../types/scheduleTypes'
import { DateUtils as dateUtils } from '../utils/dateUtils'

/**
 * 时间集中度评分服务
 * 实现KIMI文档建议的时间分散约束逻辑
 */

// 默认约束配置
export const DEFAULT_TIME_CONCENTRATION_CONFIG: TimeConcentrationConstraint = {
  enabled: true,
  weight: 60,
  maxDailyExams: 8,
  idealDailyExams: 4,
  penaltyMultiplier: 2.0,
  description: '惩罚考试时间过度集中，促进时间分散',
}

// 时间分散相关常量
const TIME_SPREAD_CONSTANTS = {
  IDEAL_DAILY_VARIANCE: 2.0, // 理想的每日考试数量方差
  MAX_PENALTY_SCORE: 1000, // 最大惩罚分数
  CONCENTRATION_THRESHOLD: 0.7, // 集中度阈值
  BALANCE_BONUS: 50, // 平衡奖励分数
}

/**
 * 计算时间集中度惩罚分数
 * @param assignments 考试分配列表
 * @param config 约束配置
 * @returns 惩罚分数（越高表示时间越集中）
 */
export function calculateTimeConcentrationPenalty(
  assignments: ExamAssignment[],
  config: TimeConcentrationConstraint = DEFAULT_TIME_CONCENTRATION_CONFIG
): number {
  if (!config.enabled || assignments.length === 0) {
    return 0
  }

  const stats = calculateTimeDistributionStats(assignments)

  // 基于标准差的惩罚计算
  const stdDevPenalty = Math.pow(stats.stdDev, 2) * config.penaltyMultiplier

  // 超出理想每日考试数的惩罚
  const excessPenalty = stats.dailyExamCount
    .filter(count => count > config.idealDailyExams)
    .reduce((sum, count) => sum + Math.pow(count - config.idealDailyExams, 2), 0)

  // 超出最大每日考试数的重度惩罚
  const maxExcessPenalty = stats.dailyExamCount
    .filter(count => count > config.maxDailyExams)
    .reduce((sum, count) => sum + Math.pow(count - config.maxDailyExams, 3) * 10, 0)

  const totalPenalty = ((stdDevPenalty + excessPenalty + maxExcessPenalty) * config.weight) / 100

  return Math.min(totalPenalty, TIME_SPREAD_CONSTANTS.MAX_PENALTY_SCORE)
}

/**
 * 计算时间分布统计信息
 * @param assignments 考试分配列表
 * @returns 时间分布统计
 */
export function calculateTimeDistributionStats(
  assignments: ExamAssignment[]
): TimeDistributionStats {
  // 按日期统计考试数量
  const dailyCount = new Map<string, number>()

  assignments.forEach(assignment => {
    const dateKey = dateUtils.toStorageDate(assignment.date)
    dailyCount.set(dateKey, (dailyCount.get(dateKey) || 0) + 1)
  })

  const dailyExamCount = Array.from(dailyCount.values())
  const totalExams = assignments.length
  const activeDays = dailyExamCount.length

  // 计算统计指标
  const avgExamsPerDay = activeDays > 0 ? totalExams / activeDays : 0
  const variance =
    activeDays > 0
      ? dailyExamCount.reduce((sum, count) => sum + Math.pow(count - avgExamsPerDay, 2), 0) /
        activeDays
      : 0
  const stdDev = Math.sqrt(variance)

  // 计算时间集中度评分 (0-100, 越低越好)
  const maxPossibleStdDev = Math.sqrt((totalExams * totalExams) / 4) // 理论最大标准差
  const timeConcentrationScore =
    maxPossibleStdDev > 0 ? Math.min(100, (stdDev / maxPossibleStdDev) * 100) : 0

  return {
    dailyExamCount,
    avgExamsPerDay,
    stdDev,
    variance,
    timeConcentrationScore,
    totalExams,
    activeDays,
    // 向后兼容字段
    standardDeviation: stdDev,
    maxExamsPerDay: dailyExamCount.length > 0 ? Math.max(...dailyExamCount) : 0,
    minExamsPerDay: dailyExamCount.length > 0 ? Math.min(...dailyExamCount) : 0,
    averageExamsPerDay: avgExamsPerDay,
  }
}

/**
 * 检查时间分布是否需要优化
 * @param stats 时间分布统计
 * @param config 约束配置
 * @returns 是否需要优化
 */
export function needsTimeDistributionOptimization(
  stats: TimeDistributionStats,
  config: TimeConcentrationConstraint = DEFAULT_TIME_CONCENTRATION_CONFIG
): boolean {
  // 检查是否有超出最大每日考试数的情况
  const hasExcessiveDaily = stats.dailyExamCount.some(count => count > config.maxDailyExams)

  // 检查时间集中度是否过高
  const isHighlyConcentrated =
    stats.timeConcentrationScore > TIME_SPREAD_CONSTANTS.CONCENTRATION_THRESHOLD * 100

  // 检查标准差是否过大
  const hasHighVariance = stats.stdDev > TIME_SPREAD_CONSTANTS.IDEAL_DAILY_VARIANCE * 2

  return hasExcessiveDaily || isHighlyConcentrated || hasHighVariance
}

/**
 * 生成时间分散优化建议
 * @param stats 时间分布统计
 * @param config 约束配置
 * @returns 优化建议列表
 */
export function generateTimeSpreadingSuggestions(
  stats: TimeDistributionStats,
  config: TimeConcentrationConstraint = DEFAULT_TIME_CONCENTRATION_CONFIG
): string[] {
  const suggestions: string[] = []

  if (stats.dailyExamCount.some(count => count > config.maxDailyExams)) {
    suggestions.push(
      `有${stats.dailyExamCount.filter(c => c > config.maxDailyExams).length}天超出最大每日考试数(${config.maxDailyExams})，建议分散到其他日期`
    )
  }

  if (stats.timeConcentrationScore > 70) {
    suggestions.push('考试时间过度集中，建议增加考试日期或重新分配')
  }

  if (stats.stdDev > TIME_SPREAD_CONSTANTS.IDEAL_DAILY_VARIANCE * 1.5) {
    suggestions.push(
      `每日考试数量差异较大(标准差: ${stats.stdDev.toFixed(2)})，建议平衡各日考试数量`
    )
  }

  if (stats.activeDays < 3 && stats.totalExams > 10) {
    suggestions.push('考试日期过少，建议增加考试日期以分散工作负荷')
  }

  return suggestions
}

/**
 * 计算优化后的预期改善效果
 * @param currentStats 当前统计
 * @param targetDailyLimit 目标每日限制
 * @returns 预期改善的统计信息
 */
export function calculateOptimizationImpact(
  currentStats: TimeDistributionStats,
  targetDailyLimit: number = DEFAULT_TIME_CONCENTRATION_CONFIG.idealDailyExams
): Partial<TimeDistributionStats> {
  const optimalDays = Math.ceil(currentStats.totalExams / targetDailyLimit)
  const optimalAvgPerDay = currentStats.totalExams / optimalDays
  const optimalStdDev = Math.sqrt(
    Array.from({ length: optimalDays }, (_, i) => {
      const dailyCount =
        i < currentStats.totalExams % optimalDays
          ? Math.ceil(optimalAvgPerDay)
          : Math.floor(optimalAvgPerDay)
      return Math.pow(dailyCount - optimalAvgPerDay, 2)
    }).reduce((sum, variance) => sum + variance, 0) / optimalDays
  )

  return {
    activeDays: optimalDays,
    avgExamsPerDay: optimalAvgPerDay,
    stdDev: optimalStdDev,
    timeConcentrationScore: Math.min(
      30,
      (optimalStdDev / currentStats.stdDev) * currentStats.timeConcentrationScore
    ),
  }
}
