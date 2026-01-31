import { ExamAssignment, TimeDistributionStats } from '../types/scheduleTypes'
import {
  calculateTimeDistributionStats,
  needsTimeDistributionOptimization,
} from './timeConcentrationService'
import { DateUtils as dateUtils } from '../utils/dateUtils'

/**
 * TimeSpreadingMove邻域操作服务
 * 实现时间分散的局部搜索移动操作，改善考试时间分布
 */

export interface TimeSpreadingMove {
  type: 'MOVE_TO_LESS_BUSY_DAY' | 'SWAP_BETWEEN_DAYS' | 'REDISTRIBUTE_PEAK_DAY'
  sourceAssignmentId: string
  targetDate?: Date
  swapAssignmentId?: string
  description: string
  expectedImprovement: number
}

export interface MoveEvaluationResult {
  move: TimeSpreadingMove
  currentScore: number
  newScore: number
  improvement: number
  feasible: boolean
  constraints: string[]
}

/**
 * 时间分散移动生成器
 */
export class TimeSpreadingMoveGenerator {
  /**
   * 生成所有可能的时间分散移动
   * @param assignments 当前考试分配
   * @param availableDates 可用日期列表
   * @returns 可能的移动操作列表
   */
  generateMoves(assignments: ExamAssignment[], availableDates: Date[]): TimeSpreadingMove[] {
    const moves: TimeSpreadingMove[] = []
    const stats = calculateTimeDistributionStats(assignments)

    if (!needsTimeDistributionOptimization(stats)) {
      return moves // 不需要优化
    }

    // 1. 生成移动到较空闲日期的操作
    moves.push(...this.generateMoveToLessBusyDayMoves(assignments, availableDates, stats))

    // 2. 生成日期间交换操作
    moves.push(...this.generateSwapBetweenDaysMoves(assignments, stats))

    // 3. 生成高峰日重分布操作
    moves.push(...this.generateRedistributePeakDayMoves(assignments, availableDates, stats))

    return moves
  }

  /**
   * 生成移动到较空闲日期的操作
   */
  private generateMoveToLessBusyDayMoves(
    assignments: ExamAssignment[],
    availableDates: Date[],
    stats: TimeDistributionStats
  ): TimeSpreadingMove[] {
    const moves: TimeSpreadingMove[] = []

    // 找出考试数量最多的日期
    const dailyAssignments = this.groupAssignmentsByDate(assignments)
    const busyDates = Object.entries(dailyAssignments)
      .filter(([_, dayAssignments]) => dayAssignments.length > stats.avgExamsPerDay * 1.2)
      .sort(([_, a], [__, b]) => b.length - a.length)

    // 找出考试数量较少的日期
    const lessBusyDates = availableDates.filter(date => {
      const dateKey = dateUtils.toStorageDate(date)
      const count = dailyAssignments[dateKey]?.length || 0
      return count < stats.avgExamsPerDay * 0.8
    })

    // 为繁忙日期的考试生成移动操作
    busyDates.slice(0, 3).forEach(([busyDateKey, dayAssignments]) => {
      dayAssignments.slice(0, Math.min(3, dayAssignments.length)).forEach(assignment => {
        lessBusyDates.slice(0, 2).forEach(targetDate => {
          const expectedImprovement = this.calculateMoveImprovement(
            assignment,
            targetDate,
            assignments,
            stats
          )

          if (expectedImprovement > 0) {
            moves.push({
              type: 'MOVE_TO_LESS_BUSY_DAY',
              sourceAssignmentId: assignment.id,
              targetDate,
              description: `将考试从繁忙日期(${busyDateKey})移动到较空闲日期(${dateUtils.toStorageDate(targetDate)})`,
              expectedImprovement,
            })
          }
        })
      })
    })

    return moves
  }

  /**
   * 生成日期间交换操作
   */
  private generateSwapBetweenDaysMoves(
    assignments: ExamAssignment[],
    stats: TimeDistributionStats
  ): TimeSpreadingMove[] {
    const moves: TimeSpreadingMove[] = []
    const dailyAssignments = this.groupAssignmentsByDate(assignments)

    const dates = Object.keys(dailyAssignments)

    // 找出不平衡的日期对
    for (let i = 0; i < dates.length - 1; i++) {
      for (let j = i + 1; j < dates.length; j++) {
        const date1 = dates[i]
        const date2 = dates[j]
        const count1 = dailyAssignments[date1].length
        const count2 = dailyAssignments[date2].length

        // 如果两个日期的考试数量差异较大，考虑交换
        if (Math.abs(count1 - count2) >= 2) {
          const busyDate = count1 > count2 ? date1 : date2
          const lessBusyDate = count1 > count2 ? date2 : date1
          const busyAssignments = dailyAssignments[busyDate]
          const lessBusyAssignments = dailyAssignments[lessBusyDate]

          // 选择合适的考试进行交换
          if (busyAssignments.length > 0 && lessBusyAssignments.length > 0) {
            const busyAssignment = busyAssignments[0]
            const lessBusyAssignment = lessBusyAssignments[0]

            const expectedImprovement = this.calculateSwapImprovement(
              busyAssignment,
              lessBusyAssignment,
              assignments,
              stats
            )

            if (expectedImprovement > 0) {
              moves.push({
                type: 'SWAP_BETWEEN_DAYS',
                sourceAssignmentId: busyAssignment.id,
                swapAssignmentId: lessBusyAssignment.id,
                description: `交换${busyDate}和${lessBusyDate}的考试以平衡负荷`,
                expectedImprovement,
              })
            }
          }
        }
      }
    }

    return moves
  }

  /**
   * 生成高峰日重分布操作
   */
  private generateRedistributePeakDayMoves(
    assignments: ExamAssignment[],
    availableDates: Date[],
    stats: TimeDistributionStats
  ): TimeSpreadingMove[] {
    const moves: TimeSpreadingMove[] = []
    const dailyAssignments = this.groupAssignmentsByDate(assignments)

    // 找出考试数量超过理想值的日期
    const peakDates = Object.entries(dailyAssignments)
      .filter(([_, dayAssignments]) => dayAssignments.length > stats.avgExamsPerDay * 1.5)
      .sort(([_, a], [__, b]) => b.length - a.length)

    peakDates.slice(0, 2).forEach(([peakDateKey, peakAssignments]) => {
      // 选择可以重分布的考试
      const redistributableAssignments = peakAssignments.slice(
        0,
        Math.floor(peakAssignments.length * 0.3)
      )

      redistributableAssignments.forEach(assignment => {
        const expectedImprovement = this.calculateRedistributionImprovement(
          assignment,
          availableDates,
          assignments,
          stats
        )

        if (expectedImprovement > 0) {
          moves.push({
            type: 'REDISTRIBUTE_PEAK_DAY',
            sourceAssignmentId: assignment.id,
            description: `从高峰日期(${peakDateKey})重分布考试以改善时间分散性`,
            expectedImprovement,
          })
        }
      })
    })

    return moves
  }

  /**
   * 按日期分组考试分配
   */
  private groupAssignmentsByDate(assignments: ExamAssignment[]): Record<string, ExamAssignment[]> {
    const grouped: Record<string, ExamAssignment[]> = {}

    assignments.forEach(assignment => {
      const dateKey = dateUtils.toStorageDate(assignment.date)
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(assignment)
    })

    return grouped
  }

  /**
   * 计算移动操作的改善程度
   */
  private calculateMoveImprovement(
    assignment: ExamAssignment,
    targetDate: Date,
    allAssignments: ExamAssignment[],
    currentStats: TimeDistributionStats
  ): number {
    // 模拟移动后的分配
    const newAssignments = allAssignments.map(a =>
      a.id === assignment.id ? { ...a, date: targetDate } : a
    )

    const newStats = calculateTimeDistributionStats(newAssignments)

    // 计算标准差的改善
    const stdDevImprovement = currentStats.stdDev - newStats.stdDev

    // 计算时间集中度评分的改善
    const concentrationImprovement =
      currentStats.timeConcentrationScore - newStats.timeConcentrationScore

    return stdDevImprovement * 10 + concentrationImprovement
  }

  /**
   * 计算交换操作的改善程度
   */
  private calculateSwapImprovement(
    assignment1: ExamAssignment,
    assignment2: ExamAssignment,
    allAssignments: ExamAssignment[],
    currentStats: TimeDistributionStats
  ): number {
    // 模拟交换后的分配
    const newAssignments = allAssignments.map(a => {
      if (a.id === assignment1.id) return { ...a, date: assignment2.date }
      if (a.id === assignment2.id) return { ...a, date: assignment1.date }
      return a
    })

    const newStats = calculateTimeDistributionStats(newAssignments)

    const stdDevImprovement = currentStats.stdDev - newStats.stdDev
    const concentrationImprovement =
      currentStats.timeConcentrationScore - newStats.timeConcentrationScore

    return stdDevImprovement * 10 + concentrationImprovement
  }

  /**
   * 计算重分布操作的改善程度
   */
  private calculateRedistributionImprovement(
    assignment: ExamAssignment,
    availableDates: Date[],
    allAssignments: ExamAssignment[],
    currentStats: TimeDistributionStats
  ): number {
    // 找到最佳的重分布目标日期
    let bestImprovement = 0

    availableDates.forEach(targetDate => {
      const improvement = this.calculateMoveImprovement(
        assignment,
        targetDate,
        allAssignments,
        currentStats
      )
      bestImprovement = Math.max(bestImprovement, improvement)
    })

    return bestImprovement
  }
}

/**
 * 时间分散移动评估器
 */
export class TimeSpreadingMoveEvaluator {
  /**
   * 评估移动操作的可行性和效果
   * @param move 移动操作
   * @param assignments 当前考试分配
   * @returns 评估结果
   */
  evaluateMove(move: TimeSpreadingMove, assignments: ExamAssignment[]): MoveEvaluationResult {
    const currentStats = calculateTimeDistributionStats(assignments)
    const currentScore = this.calculateTimeSpreadingScore(currentStats)

    // 模拟执行移动操作
    const newAssignments = this.simulateMove(move, assignments)
    const newStats = calculateTimeDistributionStats(newAssignments)
    const newScore = this.calculateTimeSpreadingScore(newStats)

    const improvement = newScore - currentScore
    const feasible = this.checkMoveFeasibility(move, assignments)
    const constraints = this.getConstraintViolations(move, assignments)

    return {
      move,
      currentScore,
      newScore,
      improvement,
      feasible,
      constraints,
    }
  }

  /**
   * 计算时间分散评分
   */
  private calculateTimeSpreadingScore(stats: TimeDistributionStats): number {
    // 评分越高表示时间分散性越好
    const stdDevScore = Math.max(0, 100 - stats.stdDev * 10)
    const concentrationScore = 100 - stats.timeConcentrationScore

    return (stdDevScore + concentrationScore) / 2
  }

  /**
   * 模拟执行移动操作
   */
  private simulateMove(move: TimeSpreadingMove, assignments: ExamAssignment[]): ExamAssignment[] {
    switch (move.type) {
      case 'MOVE_TO_LESS_BUSY_DAY':
        return assignments.map(a =>
          a.id === move.sourceAssignmentId && move.targetDate ? { ...a, date: move.targetDate } : a
        )

      case 'SWAP_BETWEEN_DAYS':
        if (!move.swapAssignmentId) return assignments

        const sourceAssignment = assignments.find(a => a.id === move.sourceAssignmentId)
        const swapAssignment = assignments.find(a => a.id === move.swapAssignmentId)

        if (!sourceAssignment || !swapAssignment) return assignments

        return assignments.map(a => {
          if (a.id === move.sourceAssignmentId) return { ...a, date: swapAssignment.date }
          if (a.id === move.swapAssignmentId) return { ...a, date: sourceAssignment.date }
          return a
        })

      case 'REDISTRIBUTE_PEAK_DAY':
        // 简化实现：移动到第一个可用的较空闲日期
        const dailyCount = new Map<string, number>()
        assignments.forEach((a: ExamAssignment) => {
          const dateKey = dateUtils.toStorageDate(a.date)
          dailyCount.set(dateKey, (dailyCount.get(dateKey) || 0) + 1)
        })

        const avgCount = assignments.length / dailyCount.size
        const targetDate = Array.from(dailyCount.entries())
          .filter(([_, count]) => count < avgCount)
          .sort(([_, a], [__, b]) => a - b)[0]

        if (targetDate) {
          const newDate = new Date(targetDate[0])
          return assignments.map(a =>
            a.id === move.sourceAssignmentId ? { ...a, date: newDate } : a
          )
        }

        return assignments

      default:
        return assignments
    }
  }

  /**
   * 检查移动操作的可行性
   */
  private checkMoveFeasibility(move: TimeSpreadingMove, assignments: ExamAssignment[]): boolean {
    // 基本可行性检查
    const sourceAssignment = assignments.find(a => a.id === move.sourceAssignmentId)
    if (!sourceAssignment) return false

    // 检查目标日期是否为工作日（简化检查）
    if (move.targetDate) {
      const dayOfWeek = move.targetDate.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) return false // 周末不可行
    }

    // 检查交换操作的可行性
    if (move.type === 'SWAP_BETWEEN_DAYS' && move.swapAssignmentId) {
      const swapAssignment = assignments.find(a => a.id === move.swapAssignmentId)
      if (!swapAssignment) return false
    }

    return true
  }

  /**
   * 获取约束违反情况
   */
  private getConstraintViolations(
    move: TimeSpreadingMove,
    assignments: ExamAssignment[]
  ): string[] {
    const violations: string[] = []

    // 检查是否违反每日考试数量限制
    const newAssignments = this.simulateMove(move, assignments)
    const dailyCount = new Map<string, number>()

    newAssignments.forEach((a: ExamAssignment) => {
      const dateKey = a.date.toISOString().split('T')[0]
      dailyCount.set(dateKey, (dailyCount.get(dateKey) || 0) + 1)
    })

    dailyCount.forEach((count, date) => {
      if (count > 8) {
        // 假设每日最大考试数为8
        violations.push(`${date}日考试数量超限(${count}场)`)
      }
    })

    return violations
  }
}

// 导出默认实例
export const timeSpreadingMoveGenerator = new TimeSpreadingMoveGenerator()
export const timeSpreadingMoveEvaluator = new TimeSpreadingMoveEvaluator()
