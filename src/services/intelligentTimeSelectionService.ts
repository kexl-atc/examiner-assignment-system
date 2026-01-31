/**
 * 智能时间选择服务
 * 实现四阶段智能时间选择策略：初始筛选、优化筛选、无解处理、系统一致性保障
 */

import { dutyRotationService } from './dutyRotationService'
import {
  performanceOptimizationService,
  PerformanceOptimizationService,
} from './performanceOptimizationService'
import { holidayService } from './holidayService'

export interface TimeSelectionRequest {
  students: any[]
  teachers: any[]
  examDates: string[]
  constraints: any
  options: {
    enableInitialFiltering: boolean
    enableOptimizationFiltering: boolean
    enableConflictResolution: boolean
    enableConsistencyCheck: boolean
    maxIterations: number
    qualityThreshold: number
    enablePerformanceOptimization?: boolean
    batchSize?: number
    maxConcurrency?: number
  }
}

// 类型定义
export interface Student {
  id: string
  name: string
  department: string
  group: string
  unavailableDates?: string[] // 学员固定不可用时间
  recommendedExaminer1Dept?: string
  recommendedExaminer2Dept?: string
  recommendedBackupDept?: string
  selectedTimeSlots?: TimeSlot[] // 学员选定的时间段
}

export interface Teacher {
  id: string
  name: string
  department: string
  group: string
  skills: string[]
  workload: number
  consecutiveDays: number
}

export interface TimeSlot {
  date: string
  period: 'morning' | 'afternoon'
  available: boolean
  conflictReason?: string
}

export interface StudentTimePool {
  studentId: string
  initialAvailableSlots: TimeSlot[]
  optimizedAvailableSlots: TimeSlot[]
  finalSelectedSlots: TimeSlot[]
  conflictDetails: ConflictDetail[]
}

export interface ConflictDetail {
  type: 'hard_constraint' | 'soft_constraint' | 'resource_shortage'
  severity: 'high' | 'medium' | 'low'
  description: string
  affectedSlots: string[]
}

export interface TimeSelectionResult {
  success: boolean
  studentTimePools: StudentTimePool[]
  overallQuality: number
  processingStages: ProcessingStage[]
  recommendations: string[]
  fallbackApplied: boolean
  expandedDateRange?: { newStartDate: string; newEndDate: string }
  optimizedStudents?: Student[]
  optimizedExamDates?: string[]
}

export interface ProcessingStage {
  stage:
    | 'initial_filtering'
    | 'optimization_filtering'
    | 'conflict_resolution'
    | 'consistency_check'
  status: 'completed' | 'failed' | 'skipped'
  duration: number
  details: string
  metrics: Record<string, number>
}

export interface ConstraintWeights {
  hardConstraints: {
    weekendExams: number
    holidayExams: number
    dayShiftConflict: number
    studentGroupConflict: number
    departmentMismatch: number
  }
  softConstraints: {
    recommendedDepartment: number
    workloadBalance: number
    consecutiveDays: number
    resourceOptimization: number
  }
}

class IntelligentTimeSelectionService {
  private performanceOptimizer: PerformanceOptimizationService
  private readonly DEFAULT_CONSTRAINT_WEIGHTS: ConstraintWeights = {
    hardConstraints: {
      weekendExams: 1000,
      holidayExams: 1000,
      dayShiftConflict: 5000,
      studentGroupConflict: 5000,
      departmentMismatch: 3000,
    },
    softConstraints: {
      recommendedDepartment: 100,
      workloadBalance: 80,
      consecutiveDays: 60,
      resourceOptimization: 40,
    },
  }

  constructor() {
    this.performanceOptimizer = performanceOptimizationService
  }

  /**
   * 执行智能时间选择
   * @param request 时间选择请求参数
   */
  async executeIntelligentTimeSelection(
    request: TimeSelectionRequest,
    recursionDepth: number = 0
  ): Promise<TimeSelectionResult> {
    const startTime = Date.now()
    process.env.NODE_ENV === 'development' && console.log('🧠 开始智能时间选择流程...')

    // 性能优化预处理
    let optimizedStudents = request.students
    if (request.options.enablePerformanceOptimization && request.students.length > 100) {
      process.env.NODE_ENV === 'development' && console.log(`检测到大规模数据(${request.students.length}名学员)，启用性能优化...`)
      const optimizationResult = await this.performanceOptimizer.optimizeStudentData(
        request.students
      )
      optimizedStudents = optimizationResult
      process.env.NODE_ENV === 'development' && console.log(`性能优化完成，优化了 ${optimizedStudents.length} 名学员数据`)
    }

    const weights = this.mergeConstraintWeights({})
    const result: TimeSelectionResult = {
      success: false,
      studentTimePools: [],
      overallQuality: 0,
      processingStages: [],
      recommendations: [],
      fallbackApplied: false,
    }

    try {
      // 阶段1: 初始筛选阶段
      const stage1Result = await this.performInitialFiltering(
        optimizedStudents,
        request.teachers,
        request.examDates[0],
        request.examDates[request.examDates.length - 1],
        weights
      )
      result.processingStages.push(stage1Result.stage)
      result.studentTimePools = stage1Result.studentTimePools

      if (!stage1Result.success) {
        process.env.NODE_ENV === 'development' && console.log('⚠️ 初始筛选失败，尝试无解处理机制...')
        return await this.handleNoSolutionScenario(
          optimizedStudents,
          request.teachers,
          request.examDates[0],
          request.examDates[request.examDates.length - 1],
          weights,
          result,
          recursionDepth
        )
      }

      // 阶段2: 优化筛选阶段
      const stage2Result = await this.performOptimizationFiltering(
        result.studentTimePools,
        request.teachers,
        weights
      )
      result.processingStages.push(stage2Result.stage)
      result.studentTimePools = stage2Result.studentTimePools

      if (!stage2Result.success) {
        process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('⚠️ 优化筛选失败，尝试降级处理...')
        return await this.handleOptimizationFailure(
          optimizedStudents,
          request.teachers,
          request.examDates[0],
          request.examDates[request.examDates.length - 1],
          weights,
          result
        )
      }

      // 阶段3: 冲突解决和最终选择
      const stage3Result = await this.performConflictResolution(
        result.studentTimePools,
        request.teachers,
        weights
      )
      result.processingStages.push(stage3Result.stage)
      result.studentTimePools = stage3Result.studentTimePools

      // 阶段4: 系统一致性保障
      const stage4Result = await this.performConsistencyCheck(result.studentTimePools, weights)
      result.processingStages.push(stage4Result.stage)

      // 计算整体质量评分
      result.overallQuality = this.calculateOverallQuality(result.studentTimePools)
      result.success = result.overallQuality > 0.6 // 60%质量阈值

      // 生成推荐建议
      result.recommendations = this.generateRecommendations(result)

      // 更新结果中的学员数据为优化后的数据
      result.optimizedStudents = this.updateStudentsWithSelectedTimes(
        optimizedStudents,
        result.studentTimePools
      )
      result.optimizedExamDates = this.extractOptimizedExamDates(result.studentTimePools)

      const processingTime = Date.now() - startTime
      process.env.NODE_ENV === 'development' && console.log(
        `✅ 智能时间选择完成，耗时${processingTime}ms，质量评分${(result.overallQuality * 100).toFixed(1)}%`
      )

      // 性能统计
      if (request.options.enablePerformanceOptimization && request.students.length > 100) {
        process.env.NODE_ENV === 'development' && console.log(
          `📊 性能优化统计: 原始学员${request.students.length}名 -> 优化后${optimizedStudents.length}名`
        )
      }
    } catch (error) {
      console.error('❌ 智能时间选择失败:', error)
      result.success = false
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.recommendations.push(`系统错误: ${errorMsg}`)
    }

    return result
  }

  /**
   * 阶段1: 初始筛选阶段
   * 根据用户指定的日期范围，结合硬性约束条件筛选学员可用时间段
   */
  private async performInitialFiltering(
    students: Student[],
    teachers: Teacher[],
    startDate: string,
    endDate: string,
    weights: ConstraintWeights
  ): Promise<{
    success: boolean
    studentTimePools: StudentTimePool[]
    stage: ProcessingStage
  }> {
    const stageStartTime = Date.now()
    process.env.NODE_ENV === 'development' && console.log('📋 执行初始筛选阶段...')

    const studentTimePools: StudentTimePool[] = []
    let successfulStudents = 0

    // 生成日期范围内的所有可用时间段
    const allTimeSlots = this.generateTimeSlots(startDate, endDate)
    process.env.NODE_ENV === 'development' && console.log(`📅 生成时间段数量: ${allTimeSlots.length}`)

    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const student of students) {
      const studentPool: StudentTimePool = {
        studentId: student.id,
        initialAvailableSlots: [],
        optimizedAvailableSlots: [],
        finalSelectedSlots: [],
        conflictDetails: [],
      }

      // 1. 应用硬性约束条件筛选
      const availableSlots = await this.applyHardConstraints(
        student,
        allTimeSlots,
        weights.hardConstraints
      )

      studentPool.initialAvailableSlots = availableSlots

      // 2. 交叉比对排除重叠时间段
      const nonOverlappingSlots = this.removeOverlappingSlots(availableSlots, studentTimePools)

      studentPool.initialAvailableSlots = nonOverlappingSlots

      if (nonOverlappingSlots.length >= 4) {
        // 每个学员需要2天考试，每天2个时间段
        successfulStudents++
      } else {
        studentPool.conflictDetails.push({
          type: 'hard_constraint',
          severity: 'high',
          description: `可用时间段不足: 需要4个，实际${nonOverlappingSlots.length}个`,
          affectedSlots: nonOverlappingSlots.map(slot => `${slot.date}-${slot.period}`),
        })
      }

      studentTimePools.push(studentPool)
    }

    const stageDuration = Date.now() - stageStartTime
    const successRate = successfulStudents / students.length

    const stage: ProcessingStage = {
      stage: 'initial_filtering',
      status: successRate > 0.8 ? 'completed' : 'failed',
      duration: stageDuration,
      details: `成功筛选${successfulStudents}/${students.length}个学员的初始时间段`,
      metrics: {
        successRate,
        avgAvailableSlots:
          studentTimePools.reduce((sum, pool) => sum + pool.initialAvailableSlots.length, 0) /
          studentTimePools.length,
        totalConflicts: studentTimePools.reduce(
          (sum, pool) => sum + pool.conflictDetails.length,
          0
        ),
      },
    }

    process.env.NODE_ENV === 'development' && console.log(`📋 初始筛选完成: 成功率${(successRate * 100).toFixed(1)}%`)

    return {
      success: successRate > 0.8,
      studentTimePools,
      stage,
    }
  }

  /**
   * 生成指定日期范围内的所有时间段
   */
  private generateTimeSlots(startDate: string, endDate: string): TimeSlot[] {
    const slots: TimeSlot[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    process.env.NODE_ENV === 'development' && console.log(`📅 时间段生成: ${startDate} 到 ${endDate}`)
    process.env.NODE_ENV === 'development' && console.log(`📅 开始日期对象: ${start.toISOString()}, 结束日期对象: ${end.toISOString()}`)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// }; date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]

      // 排除周末
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        process.env.NODE_ENV === 'development' && console.log(`📅 添加工作日时间段: ${dateStr} (周${date.getDay()})`)
        slots.push(
          {
            date: dateStr,
            period: 'morning',
            available: true,
          },
          {
            date: dateStr,
            period: 'afternoon',
            available: true,
          }
        )
      }
    }

    return slots
  }

  /**
   * 应用硬性约束条件筛选时间段
   */
  private async applyHardConstraints(
    student: Student,
    timeSlots: TimeSlot[],
    hardConstraints: ConstraintWeights['hardConstraints']
  ): Promise<TimeSlot[]> {
    const availableSlots: TimeSlot[] = []

    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const slot of timeSlots) {
      let isAvailable = true
      let conflictReason = ''

      // 1. 检查学员固定不可用时间
      if (student.unavailableDates?.includes(slot.date)) {
        isAvailable = false
        conflictReason = '学员固定不可用时间'
      }

      // 2. 检查轮值冲突 (HC5: 学员不能在本班组白班时考试)
      if (isAvailable) {
        const dutyInfo = dutyRotationService.calculateDutySchedule(slot.date)
        if (dutyInfo && dutyInfo.dayShift === student.group) {
          isAvailable = false
          conflictReason = `学员班组${student.group}在${slot.date}值白班`
        }
      }

      // 3. 检查节假日约束
      if (isAvailable && this.isHoliday(slot.date)) {
        isAvailable = false
        conflictReason = '节假日不安排考试'
      }

      if (isAvailable) {
        availableSlots.push({ ...slot, available: true })
      } else {
        availableSlots.push({ ...slot, available: false, conflictReason })
      }
    }

    return availableSlots.filter(slot => slot.available)
  }

  /**
   * 交叉比对排除重叠时间段
   * 优化版本：使用单次循环收集所有已占用时间段
   */
  private removeOverlappingSlots(
    candidateSlots: TimeSlot[],
    existingPools: StudentTimePool[]
  ): TimeSlot[] {
    const usedSlots = new Set<string>()

    // ✅ 性能优化：使用单次循环替代嵌套循环
    // 时间复杂度从 O(n*m) 降低到 O(n+m)
    for (const pool of existingPools) {
      for (const slot of pool.initialAvailableSlots) {
        usedSlots.add(`${slot.date}-${slot.period}`)
      }
    }

    // 过滤掉重叠的时间段
    return candidateSlots.filter(slot => {
      const slotKey = `${slot.date}-${slot.period}`
      return !usedSlots.has(slotKey)
    })
  }

  /**
   * 检查是否为节假日
   */
  private isHoliday(date: string): boolean {
    // 使用统一的节假日服务，确保数据一致性
    return holidayService.isHoliday(date)
  }

  /**
   * 合并约束权重配置
   */
  private mergeConstraintWeights(partial: Partial<ConstraintWeights>): ConstraintWeights {
    return {
      hardConstraints: {
        ...this.DEFAULT_CONSTRAINT_WEIGHTS.hardConstraints,
        ...partial.hardConstraints,
      },
      softConstraints: {
        ...this.DEFAULT_CONSTRAINT_WEIGHTS.softConstraints,
        ...partial.softConstraints,
      },
    }
  }

  /**
   * 阶段2: 优化筛选阶段
   * 在初级时间选择池基础上，应用软性约束条件进行二次筛选
   */
  private async performOptimizationFiltering(
    studentTimePools: StudentTimePool[],
    teachers: Teacher[],
    weights: ConstraintWeights
  ): Promise<{
    success: boolean
    studentTimePools: StudentTimePool[]
    stage: ProcessingStage
  }> {
    const stageStartTime = Date.now()
    process.env.NODE_ENV === 'development' && console.log('🔧 执行优化筛选阶段...')

    let successfulOptimizations = 0
    const optimizedPools: StudentTimePool[] = []

    for (const pool of studentTimePools) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
      const optimizedPool = { ...pool }

      // 1. 应用软性约束条件评分
      const scoredSlots = await this.applySoftConstraints(
        pool.initialAvailableSlots,
        pool.studentId,
        teachers,
        weights.softConstraints
      )

      // 2. 按评分排序，选择最优时间段
      const sortedSlots = scoredSlots.sort((a, b) => b.score - a.score)

      // 3. 选择最优的4个时间段（2天考试）
      const selectedSlots = this.selectOptimalTimeSlots(sortedSlots)

      optimizedPool.optimizedAvailableSlots = selectedSlots.map(item => item.slot)

      // 4. 再次进行学员间时间重叠计算
      const finalSlots = this.resolveInterStudentConflicts(
        optimizedPool.optimizedAvailableSlots,
        optimizedPools
      )

      optimizedPool.optimizedAvailableSlots = finalSlots

      if (finalSlots.length >= 4) {
        successfulOptimizations++
      } else {
        optimizedPool.conflictDetails.push({
          type: 'soft_constraint',
          severity: 'medium',
          description: `优化筛选后可用时间段不足: 需要4个，实际${finalSlots.length}个`,
          affectedSlots: finalSlots.map(slot => `${slot.date}-${slot.period}`),
        })
      }

      optimizedPools.push(optimizedPool)
    }

    const stageDuration = Date.now() - stageStartTime
    const optimizationRate = successfulOptimizations / studentTimePools.length

    const stage: ProcessingStage = {
      stage: 'optimization_filtering',
      status: optimizationRate > 0.7 ? 'completed' : 'failed',
      duration: stageDuration,
      details: `成功优化${successfulOptimizations}/${studentTimePools.length}个学员的时间选择`,
      metrics: {
        optimizationRate,
        avgOptimizedSlots:
          optimizedPools.reduce((sum, pool) => sum + pool.optimizedAvailableSlots.length, 0) /
          optimizedPools.length,
        qualityImprovement: this.calculateQualityImprovement(studentTimePools, optimizedPools),
      },
    }

    process.env.NODE_ENV === 'development' && console.log(`🔧 优化筛选完成: 优化率${(optimizationRate * 100).toFixed(1)}%`)

    return {
      success: optimizationRate > 0.7,
      studentTimePools: optimizedPools,
      stage,
    }
  }

  /**
   * 应用软性约束条件评分
   */
  private async applySoftConstraints(
    timeSlots: TimeSlot[],
    studentId: string,
    teachers: Teacher[],
    softConstraints: ConstraintWeights['softConstraints']
  ): Promise<Array<{ slot: TimeSlot; score: number; reasons: string[] }>> {
    const scoredSlots: Array<{ slot: TimeSlot; score: number; reasons: string[] }> = []

    // 获取学员信息
    const student = await this.getStudentById(studentId)
    if (!student) {
      return timeSlots.map(slot => ({ slot, score: 0, reasons: ['学员信息未找到'] }))
    }

    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const slot of timeSlots) {
      let score = 100 // 基础分数
      const reasons: string[] = []

      // 1. 推荐科室匹配度评分
      const deptScore = this.calculateDepartmentMatchScore(
        slot,
        student,
        teachers,
        softConstraints.recommendedDepartment
      )
      score += deptScore.score
      reasons.push(...deptScore.reasons)

      // 2. 工作负载平衡评分
      const workloadScore = this.calculateWorkloadBalanceScore(
        slot,
        teachers,
        softConstraints.workloadBalance
      )
      score += workloadScore.score
      reasons.push(...workloadScore.reasons)

      // 3. 连续天数优化评分
      const consecutiveScore = this.calculateConsecutiveDaysScore(
        slot,
        softConstraints.consecutiveDays
      )
      score += consecutiveScore.score
      reasons.push(...consecutiveScore.reasons)

      // 4. 资源优化评分
      const resourceScore = this.calculateResourceOptimizationScore(
        slot,
        student,
        teachers,
        softConstraints.resourceOptimization
      )
      score += resourceScore.score
      reasons.push(...resourceScore.reasons)

      scoredSlots.push({ slot, score, reasons })
    }

    return scoredSlots
  }

  /**
   * 选择最优时间段组合
   */
  private selectOptimalTimeSlots(
    scoredSlots: Array<{ slot: TimeSlot; score: number; reasons: string[] }>
  ): Array<{ slot: TimeSlot; score: number; reasons: string[] }> {
    // 确保选择的时间段能组成2天完整的考试安排
    const selectedSlots: Array<{ slot: TimeSlot; score: number; reasons: string[] }> = []
    const usedDates = new Set<string>()

    // 按日期分组
    const slotsByDate = new Map<
      string,
      Array<{ slot: TimeSlot; score: number; reasons: string[] }>
    >()
    for (const item of scoredSlots) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
      const date = item.slot.date
      if (!slotsByDate.has(date)) {
        slotsByDate.set(date, [])
      }
      slotsByDate.get(date)!.push(item)
    }

    // 选择评分最高的2天，每天2个时间段
    const dateScores = Array.from(slotsByDate.entries())
      .map(([date, slots]) => ({
        date,
        totalScore: slots.reduce((sum, item) => sum + item.score, 0),
        slots: slots.sort((a, b) => b.score - a.score),
      }))
      .sort((a, b) => b.totalScore - a.totalScore)

    // 选择前2天
    for (let i = 0; i < Math.min(2, dateScores.length); i++) {
      const daySlots = dateScores[i].slots
      // 每天选择上午和下午各一个时间段
      const morningSlot = daySlots.find(item => item.slot.period === 'morning')
      const afternoonSlot = daySlots.find(item => item.slot.period === 'afternoon')

      if (morningSlot) selectedSlots.push(morningSlot)
      if (afternoonSlot) selectedSlots.push(afternoonSlot)
    }

    return selectedSlots
  }

  /**
   * 解决学员间时间冲突
   * 优化版本：使用更高效的集合操作
   */
  private resolveInterStudentConflicts(
    candidateSlots: TimeSlot[],
    existingPools: StudentTimePool[]
  ): TimeSlot[] {
    const occupiedSlots = new Set<string>()

    // ✅ 性能优化：使用flatMap替代嵌套循环收集占用时间段
    // 时间复杂度优化，代码更简洁
    const allOccupiedSlots = existingPools.flatMap(pool => pool.optimizedAvailableSlots)
    allOccupiedSlots.forEach(slot => {
      occupiedSlots.add(`${slot.date}-${slot.period}`)
    })

    // ✅ 性能优化：使用单次过滤操作，直接返回冲突-free的时间段
    return candidateSlots.filter(slot => {
      const slotKey = `${slot.date}-${slot.period}`
      return !occupiedSlots.has(slotKey)
    })
  }

  /**
   * 阶段3: 无解处理机制
   * 当出现学员无可用时间时的解决方案
   */
  private async handleNoSolutionScenario(
    students: Student[],
    teachers: Teacher[],
    startDate: string,
    endDate: string,
    weights: ConstraintWeights,
    result: TimeSelectionResult,
    recursionDepth: number = 0
  ): Promise<TimeSelectionResult> {
    process.env.NODE_ENV === 'development' && console.log('🔄 启动无解处理机制...')

    // 方案A: 逐步降低约束条件权重
    const relaxedWeights = this.relaxConstraintWeights(weights, 0.7) // 降低30%权重
    process.env.NODE_ENV === 'development' && console.log('📉 尝试降低约束权重重新筛选...')

    const relaxedRequest = {
      students,
      teachers,
      examDates: [startDate, endDate],
      constraints: relaxedWeights,
      options: {
        enableInitialFiltering: true,
        enableOptimizationFiltering: true,
        enableConflictResolution: true,
        enableConsistencyCheck: true,
        maxIterations: 3,
        qualityThreshold: 0.7,
      },
    }
    const relaxedResult = await this.executeIntelligentTimeSelection(
      relaxedRequest,
      recursionDepth + 1
    )

    if (relaxedResult.success) {
      relaxedResult.fallbackApplied = true
      relaxedResult.recommendations.push('已降低约束条件权重以获得可行解')
      return relaxedResult
    }

    // 方案B: 提示用户扩大日期范围
    process.env.NODE_ENV === 'development' && console.log('📅 建议扩大日期选择范围...')
    const expandedDateRange = this.calculateExpandedDateRange(startDate, endDate)

    result.recommendations.push(
      `当前日期范围内无法找到可行解，建议扩大到${expandedDateRange.newStartDate}至${expandedDateRange.newEndDate}`
    )
    result.expandedDateRange = expandedDateRange

    // 方案C: 在扩展范围内重新执行（模拟用户授权）
    process.env.NODE_ENV === 'development' && console.log('🔄 在扩展日期范围内重新执行筛选...')
    const expandedRequest = {
      students,
      teachers,
      examDates: [expandedDateRange.newStartDate, expandedDateRange.newEndDate],
      constraints: relaxedWeights,
      options: {
        enableInitialFiltering: true,
        enableOptimizationFiltering: true,
        enableConflictResolution: true,
        enableConsistencyCheck: true,
        maxIterations: 3,
        qualityThreshold: 0.7,
      },
    }
    const expandedResult = await this.executeIntelligentTimeSelection(
      expandedRequest,
      recursionDepth + 1
    )

    if (expandedResult.success) {
      expandedResult.fallbackApplied = true
      expandedResult.expandedDateRange = expandedDateRange
      expandedResult.recommendations.push('已扩大日期范围并降低约束权重获得可行解')
      return expandedResult
    }

    // 所有方案都失败
    result.success = false
    result.recommendations.push('所有备选方案均无法找到可行解，请检查约束条件或增加可用资源')
    return result
  }

  /**
   * 放松约束权重
   */
  private relaxConstraintWeights(weights: ConstraintWeights, factor: number): ConstraintWeights {
    return {
      hardConstraints: {
        weekendExams: weights.hardConstraints.weekendExams,
        holidayExams: weights.hardConstraints.holidayExams,
        dayShiftConflict: weights.hardConstraints.dayShiftConflict,
        studentGroupConflict: weights.hardConstraints.studentGroupConflict,
        departmentMismatch: Math.floor(weights.hardConstraints.departmentMismatch * factor),
      },
      softConstraints: {
        recommendedDepartment: Math.floor(weights.softConstraints.recommendedDepartment * factor),
        workloadBalance: Math.floor(weights.softConstraints.workloadBalance * factor),
        consecutiveDays: Math.floor(weights.softConstraints.consecutiveDays * factor),
        resourceOptimization: Math.floor(weights.softConstraints.resourceOptimization * factor),
      },
    }
  }

  /**
   * 计算扩展的日期范围
   */
  private calculateExpandedDateRange(
    startDate: string,
    endDate: string
  ): { newStartDate: string; newEndDate: string } {
    const start = new Date(startDate)
    const end = new Date(endDate)

    // 向前扩展7天，向后扩展7天
    const newStart = new Date(start)
    newStart.setDate(start.getDate() - 7)

    const newEnd = new Date(end)
    newEnd.setDate(end.getDate() + 7)

    return {
      newStartDate: newStart.toISOString().split('T')[0],
      newEndDate: newEnd.toISOString().split('T')[0],
    }
  }

  /**
   * 处理优化筛选失败
   */
  private async handleOptimizationFailure(
    students: Student[],
    teachers: Teacher[],
    startDate: string,
    endDate: string,
    weights: ConstraintWeights,
    result: TimeSelectionResult
  ): Promise<TimeSelectionResult> {
    console.log('⚠️ 优化筛选失败，尝试降级处理...')

    // 降级到仅使用硬约束
    const hardOnlyWeights: ConstraintWeights = {
      hardConstraints: weights.hardConstraints,
      softConstraints: {
        recommendedDepartment: 0,
        workloadBalance: 0,
        consecutiveDays: 0,
        resourceOptimization: 0,
      },
    }

    // 重新执行初始筛选
    const fallbackResult = await this.performInitialFiltering(
      students,
      teachers,
      startDate,
      endDate,
      hardOnlyWeights
    )

    if (fallbackResult.success) {
      result.studentTimePools = fallbackResult.studentTimePools
      result.processingStages.push(fallbackResult.stage)
      result.fallbackApplied = true
      result.recommendations.push('已降级为仅使用硬约束条件的基础排班')
      return result
    }

    // 如果连硬约束都无法满足，启动无解处理机制
    return await this.handleNoSolutionScenario(
      students,
      teachers,
      startDate,
      endDate,
      weights,
      result,
      0
    )
  }

  /**
   * 阶段3: 冲突解决和最终选择
   */
  private async performConflictResolution(
    studentTimePools: StudentTimePool[],
    teachers: Teacher[],
    weights: ConstraintWeights
  ): Promise<{
    success: boolean
    studentTimePools: StudentTimePool[]
    stage: ProcessingStage
  }> {
    const stageStartTime = Date.now()
    process.env.NODE_ENV === 'development' && console.log('🔧 执行冲突解决阶段...')

    const resolvedPools: StudentTimePool[] = []
    let successfulResolutions = 0

    for (const pool of studentTimePools) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
      const resolvedPool = { ...pool }

      // 从优化后的时间段中选择最终的考试时间
      const finalSlots = this.selectFinalExamSlots(
        pool.optimizedAvailableSlots,
        pool.studentId,
        teachers
      )

      resolvedPool.finalSelectedSlots = finalSlots

      if (finalSlots.length >= 4) {
        successfulResolutions++
      } else {
        resolvedPool.conflictDetails.push({
          type: 'resource_shortage',
          severity: 'high',
          description: `最终时间段选择不足: 需要4个，实际${finalSlots.length}个`,
          affectedSlots: finalSlots.map(slot => `${slot.date}-${slot.period}`),
        })
      }

      resolvedPools.push(resolvedPool)
    }


    const stageDuration = Date.now() - stageStartTime
    const resolutionRate = successfulResolutions / studentTimePools.length

    const stage: ProcessingStage = {
      stage: 'conflict_resolution',
      status: resolutionRate > 0.8 ? 'completed' : 'failed',
      duration: stageDuration,
      details: `成功解决${successfulResolutions}/${studentTimePools.length}个学员的时间冲突`,
      metrics: {
        resolutionRate,
        avgFinalSlots:
          resolvedPools.reduce((sum, pool) => sum + pool.finalSelectedSlots.length, 0) /
          resolvedPools.length,
        totalConflicts: resolvedPools.reduce((sum, pool) => sum + pool.conflictDetails.length, 0),
      },
    }

    process.env.NODE_ENV === 'development' && console.log(`🔧 冲突解决完成: 成功率${(resolutionRate * 100).toFixed(1)}%`)

    return {
      success: resolutionRate > 0.8,
      studentTimePools: resolvedPools,
      stage,
    }
  }

  /**
   * 选择最终考试时间段
   */
  private selectFinalExamSlots(
    availableSlots: TimeSlot[],
    studentId: string,
    teachers: Teacher[]
  ): TimeSlot[] {
    // 确保选择2天，每天上午和下午各一个时间段
    const slotsByDate = new Map<string, TimeSlot[]>()

    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const slot of availableSlots) {
      if (!slotsByDate.has(slot.date)) {
        slotsByDate.set(slot.date, [])
      }
      slotsByDate.get(slot.date)!.push(slot)
    }

    const finalSlots: TimeSlot[] = []
    const sortedDates = Array.from(slotsByDate.keys()).sort()

    // 选择前2天
    for (let i = 0; i < Math.min(2, sortedDates.length); i++) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// }; i++) {
      const dateSlots = slotsByDate.get(sortedDates[i])!

      // 优先选择上午和下午时间段
      const morningSlot = dateSlots.find(slot => slot.period === 'morning')
      const afternoonSlot = dateSlots.find(slot => slot.period === 'afternoon')

      if (morningSlot) finalSlots.push(morningSlot)
      if (afternoonSlot) finalSlots.push(afternoonSlot)
    }

    return finalSlots
  }

  /**
   * 阶段4: 系统一致性保障
   */
  private async performConsistencyCheck(
    studentTimePools: StudentTimePool[],
    weights: ConstraintWeights
  ): Promise<{ stage: ProcessingStage }> {
    const stageStartTime = Date.now()
    process.env.NODE_ENV === 'development' && console.log('✅ 执行系统一致性检查...')

    const consistencyIssues: string[] = []

    // 1. 检查约束权重一致性
    const weightConsistency = this.validateConstraintWeights(weights)
    if (!weightConsistency.isValid) {
      consistencyIssues.push(...weightConsistency.issues)
    }

    // 2. 检查时间重叠判断一致性
    const overlapConsistency = this.validateTimeOverlapLogic(studentTimePools)
    if (!overlapConsistency.isValid) {
      consistencyIssues.push(...overlapConsistency.issues)
    }

    // 3. 检查数据同步一致性
    const syncConsistency = this.validateDataSynchronization(studentTimePools)
    if (!syncConsistency.isValid) {
      consistencyIssues.push(...syncConsistency.issues)
    }

    const stageDuration = Date.now() - stageStartTime
    const isConsistent = consistencyIssues.length === 0

    const stage: ProcessingStage = {
      stage: 'consistency_check',
      status: isConsistent ? 'completed' : 'failed',
      duration: stageDuration,
      details: isConsistent ? '系统一致性检查通过' : `发现${consistencyIssues.length}个一致性问题`,
      metrics: {
        consistencyScore: isConsistent ? 1.0 : Math.max(0, 1 - consistencyIssues.length * 0.1),
        issueCount: consistencyIssues.length,
        weightValidation: weightConsistency.isValid ? 1 : 0,
        overlapValidation: overlapConsistency.isValid ? 1 : 0,
        syncValidation: syncConsistency.isValid ? 1 : 0,
      },
    }

    if (!isConsistent) {
      console.warn('⚠️ 一致性检查发现问题:', consistencyIssues)
    } else {
      process.env.NODE_ENV === 'development' && console.log('✅ 系统一致性检查通过')
    }

    return { stage }
  }

  /**
   * 验证约束权重一致性
   */
  private validateConstraintWeights(weights: ConstraintWeights): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    // 检查硬约束权重是否合理
    if (weights.hardConstraints.dayShiftConflict < 1000) {
      issues.push('白班冲突约束权重过低，可能导致违反硬约束')
    }

    if (weights.hardConstraints.studentGroupConflict < 1000) {
      issues.push('学员班组冲突约束权重过低，可能导致违反硬约束')
    }

    // 检查软约束权重比例
    const totalSoftWeight = Object.values(weights.softConstraints).reduce((sum, w) => sum + w, 0)
    if (totalSoftWeight > 500) {
      issues.push('软约束总权重过高，可能影响硬约束的优先级')
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }

  /**
   * 验证时间重叠判断逻辑一致性
   */
  private validateTimeOverlapLogic(studentTimePools: StudentTimePool[]): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []
    const usedSlots = new Set<string>()

    // TODO: 优化嵌套循环 - 当前复杂度 O(n²)
// 建议使用Map/Set或其他数据结构优化
// // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const pool of studentTimePools) {
      for (const slot of pool.finalSelectedSlots) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
        const slotKey = `${slot.date}-${slot.period}`
        if (usedSlots.has(slotKey)) {
          issues.push(`时间段冲突: ${slotKey} 被多个学员占用`)
        }
        usedSlots.add(slotKey)
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }

  /**
   * 验证数据同步一致性
   */
  private validateDataSynchronization(studentTimePools: StudentTimePool[]): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const pool of studentTimePools) {
      // 检查数据完整性
      if (!pool.studentId) {
        issues.push('学员ID缺失')
      }

      if (pool.finalSelectedSlots.length === 0 && pool.conflictDetails.length === 0) {
        issues.push(`学员${pool.studentId}既无最终时间段也无冲突详情`)
      }

      // 检查时间段数据格式
      for (const slot of pool.finalSelectedSlots) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
        if (!slot.date || !slot.period) {
          issues.push(`学员${pool.studentId}的时间段数据格式不完整`)
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }

  /**
   * 计算整体质量评分
   */
  private calculateOverallQuality(studentTimePools: StudentTimePool[]): number {
    if (studentTimePools.length === 0) return 0

    let totalScore = 0
    let validPools = 0

    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const pool of studentTimePools) {
      if (pool.finalSelectedSlots.length > 0) {
        validPools++

        // 基础分数：有最终时间段
        let poolScore = 0.6

        // 时间段完整性加分
        if (pool.finalSelectedSlots.length >= 4) {
          poolScore += 0.3
        } else {
          poolScore += (pool.finalSelectedSlots.length / 4) * 0.3
        }

        // 冲突数量扣分
        const conflictPenalty = Math.min(pool.conflictDetails.length * 0.05, 0.2)
        poolScore -= conflictPenalty

        // 时间段质量加分（连续性、合理性）
        const qualityBonus = this.calculateTimeSlotQuality(pool.finalSelectedSlots)
        poolScore += qualityBonus * 0.1

        totalScore += Math.max(0, Math.min(1, poolScore))
      }
    }

    return validPools > 0 ? totalScore / validPools : 0
  }

  /**
   * 计算时间段质量
   */
  private calculateTimeSlotQuality(slots: TimeSlot[]): number {
    if (slots.length === 0) return 0

    let quality = 0
    const dates = [...new Set(slots.map(slot => slot.date))].sort()

    // 检查日期连续性
    if (dates.length === 2) {
      const date1 = new Date(dates[0])
      const date2 = new Date(dates[1])
      const dayDiff = Math.abs((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))

      if (dayDiff === 1) {
        quality += 0.5 // 连续两天加分
      } else if (dayDiff <= 3) {
        quality += 0.3 // 间隔较短加分
      }
    }

    // 检查时间段完整性（每天上午下午都有）
    for (const date of dates) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
      const daySlots = slots.filter(slot => slot.date === date)
      const hasMorning = daySlots.some(slot => slot.period === 'morning')
      const hasAfternoon = daySlots.some(slot => slot.period === 'afternoon')

      if (hasMorning && hasAfternoon) {
        quality += 0.25 // 每天完整加分
      }
    }


    return Math.min(1, quality)
  }

  /**
   * 生成推荐建议
   */
  private generateRecommendations(result: TimeSelectionResult): string[] {
    const recommendations: string[] = []

    // 基于整体质量评分生成建议
    if (result.overallQuality >= 0.9) {
      recommendations.push('排班质量优秀，所有学员都获得了理想的考试时间安排')
    } else if (result.overallQuality >= 0.7) {
      recommendations.push('排班质量良好，大部分学员获得了合适的考试时间安排')
    } else if (result.overallQuality >= 0.5) {
      recommendations.push('排班质量一般，建议检查约束条件或扩大时间范围')
    } else {
      recommendations.push('排班质量较差，建议重新评估约束条件和资源配置')
    }

    // 基于处理阶段生成建议
    const failedStages = result.processingStages.filter(stage => stage.status === 'failed')
    if (failedStages.length > 0) {
      recommendations.push(`发现${failedStages.length}个阶段执行失败，建议检查相关配置`)
    }

    // 基于冲突详情生成建议
    const totalConflicts = result.studentTimePools.reduce(
      (sum, pool) => sum + pool.conflictDetails.length,
      0
    )
    if (totalConflicts > 0) {
      recommendations.push(`发现${totalConflicts}个冲突，建议优化约束条件或增加可用时间段`)
    }

    // 基于回退机制生成建议
    if (result.fallbackApplied) {
      recommendations.push('已应用回退机制，建议在条件允许时重新执行完整流程')
    }

    return recommendations
  }

  /**
   * 计算质量改进程度
   */
  private calculateQualityImprovement(
    initialPools: StudentTimePool[],
    optimizedPools: StudentTimePool[]
  ): number {
    const initialAvg =
      initialPools.reduce((sum, pool) => sum + pool.initialAvailableSlots.length, 0) /
      initialPools.length

    const optimizedAvg =
      optimizedPools.reduce((sum, pool) => sum + pool.optimizedAvailableSlots.length, 0) /
      optimizedPools.length

    return optimizedAvg / Math.max(initialAvg, 1)
  }

  /**
   * 获取学员信息（模拟方法）
   */
  private async getStudentById(studentId: string): Promise<Student | null> {
    // 实际实现中应该从数据库或服务中获取
    // 这里返回模拟数据
    return {
      id: studentId,
      name: `学员${studentId}`,
      department: '内科',
      group: 'A组',
      recommendedExaminer1Dept: '内科',
      recommendedExaminer2Dept: '外科',
    }
  }

  /**
   * 计算科室匹配度评分
   */
  private calculateDepartmentMatchScore(
    slot: TimeSlot,
    student: Student,
    teachers: Teacher[],
    weight: number
  ): { score: number; reasons: string[] } {
    const reasons: string[] = []
    let score = 0

    // 检查该时间段是否有推荐科室的考官可用
    const availableTeachers = teachers.filter(
      teacher =>
        teacher.department === student.recommendedExaminer1Dept ||
        teacher.department === student.recommendedExaminer2Dept ||
        teacher.department === student.recommendedBackupDept
    )

    if (availableTeachers.length > 0) {
      score += weight * 0.8
      reasons.push(`推荐科室考官可用: ${availableTeachers.length}人`)
    } else {
      score -= weight * 0.5
      reasons.push('推荐科室考官不可用')
    }

    return { score, reasons }
  }

  /**
   * 计算工作负载平衡评分
   */
  private calculateWorkloadBalanceScore(
    slot: TimeSlot,
    teachers: Teacher[],
    weight: number
  ): { score: number; reasons: string[] } {
    const reasons: string[] = []
    let score = 0

    // 计算该时间段考官工作负载分布
    const avgWorkload = teachers.reduce((sum, t) => sum + t.workload, 0) / teachers.length
    const lightWorkloadTeachers = teachers.filter(t => t.workload < avgWorkload * 0.8)

    if (lightWorkloadTeachers.length > 0) {
      score += weight * 0.6
      reasons.push(`有${lightWorkloadTeachers.length}个轻负载考官可用`)
    } else {
      score -= weight * 0.3
      reasons.push('所有考官负载较重')
    }

    return { score, reasons }
  }

  /**
   * 计算连续天数优化评分
   */
  private calculateConsecutiveDaysScore(
    slot: TimeSlot,
    weight: number
  ): { score: number; reasons: string[] } {
    const reasons: string[] = []
    let score = 0

    // 检查是否为工作日中间时段（避免周一周五）
    const date = new Date(slot.date)
    const dayOfWeek = date.getDay()

    if (dayOfWeek >= 2 && dayOfWeek <= 4) {
      // 周二到周四
      score += weight * 0.4
      reasons.push('工作日中间时段，连续性较好')
    } else {
      score -= weight * 0.2
      reasons.push('周初或周末时段，连续性一般')
    }

    return { score, reasons }
  }

  /**
   * 计算资源优化评分
   */
  private calculateResourceOptimizationScore(
    slot: TimeSlot,
    student: Student,
    teachers: Teacher[],
    weight: number
  ): { score: number; reasons: string[] } {
    const reasons: string[] = []
    let score = 0

    // 检查资源利用效率
    const suitableTeachers = teachers.filter(
      teacher =>
        teacher.skills.includes(student.department) || teacher.department === student.department
    )

    if (suitableTeachers.length >= 3) {
      score += weight * 0.7
      reasons.push(`充足的专业考官资源: ${suitableTeachers.length}人`)
    } else if (suitableTeachers.length >= 2) {
      score += weight * 0.4
      reasons.push(`基本的专业考官资源: ${suitableTeachers.length}人`)
    } else {
      score -= weight * 0.3
      reasons.push('专业考官资源不足')
    }

    return { score, reasons }
  }

  /**
   * 根据选定的时间段更新学员信息
   */
  private updateStudentsWithSelectedTimes(
    students: Student[],
    studentTimePools: StudentTimePool[]
  ): Student[] {
    const updatedStudents = [...students]

    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const pool of studentTimePools) {
      const studentIndex = updatedStudents.findIndex(s => s.id === pool.studentId)
      if (studentIndex !== -1 && pool.finalSelectedSlots.length > 0) {
        updatedStudents[studentIndex] = {
          ...updatedStudents[studentIndex],
          selectedTimeSlots: pool.finalSelectedSlots,
        }
      }
    }

    return updatedStudents
  }

  /**
   * 提取优化后的考试日期
   * 优化版本：使用flatMap一次性提取所有日期
   */
  private extractOptimizedExamDates(studentTimePools: StudentTimePool[]): string[] {
    // ✅ 性能优化：使用flatMap一次性提取所有日期，避免嵌套循环
    const allDates = studentTimePools.flatMap(pool => pool.finalSelectedSlots.map(slot => slot.date))

    // 使用Set去重并转换为排序数组
    return Array.from(new Set(allDates)).sort()
  }
}

export const intelligentTimeSelectionService = new IntelligentTimeSelectionService()
