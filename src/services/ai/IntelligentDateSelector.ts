/**
 * 智能日期选择器 v2.0
 * 基于多维度评估选择最优考试日期组合
 * 实现约束传播和前瞻性评估
 */

import { dutyRotationService } from '../dutyRotationService'
import { holidayService } from '../holidayService'
import { constraintWeightSyncService, type NormalizedWeights } from '../constraintWeightSyncService'
import { performanceOptimizationService } from '../performanceOptimizationService'

export interface DateSelectionStrategy {
  resourceAvailability: number // 资源可用性 (权重: 0.25)
  workloadBalance: number // 工作量均衡度 (权重: 0.2)
  conflictProbability: number // 冲突概率 (权重: 0.15)
  futureFlexibility: number // 未来灵活性 (权重: 0.1)
  consecutiveWorkStress: number // 连续工作压力 (权重: 0.2) - 避免4天连续
  recommendedMatch: number // 🆕 推荐科室匹配 (权重: 0.1) - SC2/SC4
}

export interface DatePair {
  date1: string
  date2: string
  score: number
  evaluation: DateSelectionStrategy
  metadata: {
    alternativeDates: DatePair[]
    riskFactors: string[]
    confidence: number
    strategy?: string // ✨ 生成策略：consecutive | weekly | biweekly
  }
}

export interface DateSelectionContext {
  availableDates: string[]
  existingAssignments: any[]
  teacherWorkloads: Map<string, number>
  dutySchedules: Map<string, any>
  constraints: any
}

export interface DateSelectionResult {
  success: boolean
  selectedPair: DatePair | null
  alternatives: DatePair[]
  reasoning: string
  processingTime: number
  cacheHits: number
}

export class IntelligentDateSelector {
  private readonly WINDOW_SIZE = 10 // 搜索窗口大小
  private readonly LOOKAHEAD_DAYS = 3 // 前瞻天数
  private readonly MIN_CONFIDENCE = 0.7 // 最低置信度
  private readonly CACHE_TTL = 300000 // 缓存5分钟

  // 评估权重配置 - 🔧 动态从后端同步（优先级1实施）
  private WEIGHTS: NormalizedWeights = {
    resourceAvailability: 0.25, // 默认值，将被动态权重覆盖
    workloadBalance: 0.2,
    conflictProbability: 0.15,
    futureFlexibility: 0.1,
    consecutiveWorkStress: 0.2,
    recommendedMatch: 0.1,
  }

  // 权重是否已加载
  private weightsLoaded = false

  // 缓存管理
  private evaluationCache = new Map<string, any>()
  private cacheHits = 0

  constructor(
    private config: {
      enableParallelEvaluation: boolean
      enableCaching: boolean
      maxCandidates: number
    } = {
      enableParallelEvaluation: true,
      enableCaching: true,
      maxCandidates: 20,
    }
  ) {}

  /**
   * 选择最优考试日期对
   */
  async selectOptimalDates(
    student: any,
    teachers: any[],
    context: DateSelectionContext
  ): Promise<DateSelectionResult> {
    const startTime = performance.now()
    this.cacheHits = 0

    // 🆕 优先级1：动态加载约束权重
    if (!this.weightsLoaded) {
      try {
        const normalizedWeights = await constraintWeightSyncService.getNormalizedWeights()
        this.WEIGHTS = normalizedWeights
        this.weightsLoaded = true
        process.env.NODE_ENV === 'development' && console.log('✅ 约束权重已从后端同步')
      } catch (error) {
        console.warn('⚠️ 约束权重同步失败，使用默认权重:', error)
      }
    }

    try {
      process.env.NODE_ENV === 'development' && console.log(`🎯 为学员 ${student.name} 选择最优考试日期...`)

      // 步骤1: 生成候选日期窗口
      const candidateWindows = this.generateCandidateWindows(
        context.availableDates,
        student,
        context.constraints
      )

      if (candidateWindows.length === 0) {
        return {
          success: false,
          selectedPair: null,
          alternatives: [],
          reasoning: '没有可用的日期组合满足基本约束条件',
          processingTime: performance.now() - startTime,
          cacheHits: this.cacheHits,
        }
      }

      process.env.NODE_ENV === 'development' && console.log(`📊 初步生成了 ${candidateWindows.length} 个候选日期窗口`)

      // 🆕 优先级2：应用增强硬约束过滤
      const validatedWindows = candidateWindows.filter(window => {
        const validation = this.validateHardConstraints(window, student, teachers, context)
        if (!validation.valid) {
          process.env.NODE_ENV === 'development' && console.log(`🚫 ${validation.reason}`)
          return false
        }
        return true
      })

      if (validatedWindows.length === 0) {
        return {
          success: false,
          selectedPair: null,
          alternatives: [],
          reasoning: `原有 ${candidateWindows.length} 个候选窗口均违反硬约束（HC2/HC4/HC7），无可用日期`,
          processingTime: performance.now() - startTime,
          cacheHits: this.cacheHits,
        }
      }

      process.env.NODE_ENV === 'development' && console.log(
        `✅ 硬约束过滤后保留 ${validatedWindows.length} 个有效窗口 (过滤率: ${((1 - validatedWindows.length / candidateWindows.length) * 100).toFixed(1)}%)`
      )

      // 步骤2: 并行评估或串行评估（使用过滤后的窗口）
      const evaluations = this.config.enableParallelEvaluation
        ? await this.parallelEvaluateWindows(validatedWindows, student, teachers, context)
        : await this.sequentialEvaluateWindows(validatedWindows, student, teachers, context)

      // 步骤3: 智能选择最优方案
      const bestSelection = this.selectBestWindow(evaluations, context.constraints)

      // 步骤4: 生成替代方案
      const alternatives = evaluations
        .filter(e => e.pair !== bestSelection.selectedPair)
        .sort((a, b) => b.pair.score - a.pair.score)
        .slice(0, 3)
        .map(e => e.pair)

      const processingTime = performance.now() - startTime
      process.env.NODE_ENV === 'development' && console.log(
        `✅ 日期选择完成，耗时: ${processingTime.toFixed(2)}ms，缓存命中: ${this.cacheHits}`
      )

      return {
        success: true,
        selectedPair: bestSelection.selectedPair,
        alternatives,
        reasoning: bestSelection.reasoning,
        processingTime,
        cacheHits: this.cacheHits,
      }
    } catch (error) {
      console.error('❌ 智能日期选择失败:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)

      return {
        success: false,
        selectedPair: null,
        alternatives: [],
        reasoning: `日期选择失败: ${errorMsg}`,
        processingTime: performance.now() - startTime,
        cacheHits: this.cacheHits,
      }
    }
  }

  /**
   * 生成候选日期窗口
   */
  private generateCandidateWindows(
    availableDates: string[],
    student: any,
    constraints: any
  ): DatePair[] {
    const windows: DatePair[] = []
    const sortedDates = [...availableDates].sort()

    // ✨ 生成多样化的日期对组合
    // 策略1: 连续两天（传统方式）
    // 策略2: 间隔1周左右（分散负载）
    // 策略3: 间隔2周左右（最大化分散）

    const totalDates = sortedDates.length

    // 策略1: 连续或相邻的工作日（offset 1-3天）
    for (let i = 0; i < totalDates; i++) {
      const date1 = sortedDates[i]

      for (let offset = 1; offset <= 3 && i + offset < totalDates; offset++) {
        const date2 = sortedDates[i + offset]
        if (this.isValidDatePair(date1, date2, student, constraints)) {
          windows.push(this.createDatePair(date1, date2, 'consecutive'))
        }
      }
    }

    // 策略2: 周间隔（offset 5-10天）
    for (let i = 0; i < totalDates - 5; i++) {
      const date1 = sortedDates[i]

      for (let offset = 5; offset <= 10 && i + offset < totalDates; offset++) {
        const date2 = sortedDates[i + offset]
        if (this.isValidDatePair(date1, date2, student, constraints)) {
          windows.push(this.createDatePair(date1, date2, 'weekly'))
        }
      }
    }

    // 策略3: 双周间隔（offset 12-16天）
    if (totalDates >= 14) {
      // 至少需要14天才能有双周间隔
      for (let i = 0; i < totalDates - 12; i++) {
        const date1 = sortedDates[i]

        for (let offset = 12; offset <= 16 && i + offset < totalDates; offset++) {
          const date2 = sortedDates[i + offset]
          if (this.isValidDatePair(date1, date2, student, constraints)) {
            windows.push(this.createDatePair(date1, date2, 'biweekly'))
          }
        }
      }
    }

    // 去重（可能有相同的日期对从不同策略生成）
    const uniqueWindows = this.deduplicateWindows(windows)

    process.env.NODE_ENV === 'development' && console.log(
      `📊 生成候选窗口: 连续=${windows.filter(w => w.metadata.strategy === 'consecutive').length}, 周间隔=${windows.filter(w => w.metadata.strategy === 'weekly').length}, 双周=${windows.filter(w => w.metadata.strategy === 'biweekly').length}, 去重后=${uniqueWindows.length}`
    )

    // 限制候选数量（优先保留多样化的选项）
    return this.prioritizeWindows(uniqueWindows).slice(0, this.config.maxCandidates)
  }

  /**
   * 创建日期对对象
   */
  private createDatePair(date1: string, date2: string, strategy: string): DatePair {
    return {
      date1,
      date2,
      score: 0, // 稍后计算
      evaluation: {
        resourceAvailability: 0,
        workloadBalance: 0,
        conflictProbability: 0,
        futureFlexibility: 0,
        consecutiveWorkStress: 0,
        recommendedMatch: 0,
      },
      metadata: {
        alternativeDates: [],
        riskFactors: [],
        confidence: 0,
        strategy, // 记录生成策略
      },
    }
  }

  /**
   * 去重日期对
   */
  private deduplicateWindows(windows: DatePair[]): DatePair[] {
    const seen = new Set<string>()
    return windows.filter(w => {
      const key = `${w.date1}-${w.date2}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  /**
   * 优先保留多样化的窗口
   */
  private prioritizeWindows(windows: DatePair[]): DatePair[] {
    // 按策略分组，确保每种策略都有代表
    const consecutive = windows.filter(w => w.metadata.strategy === 'consecutive')
    const weekly = windows.filter(w => w.metadata.strategy === 'weekly')
    const biweekly = windows.filter(w => w.metadata.strategy === 'biweekly')

    // 交错混合，保证多样性
    const result: DatePair[] = []
    const maxLen = Math.max(consecutive.length, weekly.length, biweekly.length)

    for (let i = 0; i < maxLen; i++) {
      if (i < consecutive.length) result.push(consecutive[i])
      if (i < weekly.length) result.push(weekly[i])
      if (i < biweekly.length) result.push(biweekly[i])
    }

    return result
  }

  /**
   * 并行评估窗口
   */
  private async parallelEvaluateWindows(
    windows: DatePair[],
    student: any,
    teachers: any[],
    context: DateSelectionContext
  ): Promise<{ pair: DatePair; reasoning: string }[]> {
    const evaluationPromises = windows.map(window =>
      this.evaluateWindow(window, student, teachers, context)
    )

    const results = await Promise.all(evaluationPromises)
    return results.map((evaluation, index) => ({
      pair: { ...windows[index], ...evaluation },
      reasoning: this.generateReasoningForWindow(windows[index], evaluation),
    }))
  }

  /**
   * 串行评估窗口
   */
  private async sequentialEvaluateWindows(
    windows: DatePair[],
    student: any,
    teachers: any[],
    context: DateSelectionContext
  ): Promise<{ pair: DatePair; reasoning: string }[]> {
    const results = []

    for (const window of windows) {
      const evaluation = await this.evaluateWindow(window, student, teachers, context)
      results.push({
        pair: { ...window, ...evaluation },
        reasoning: this.generateReasoningForWindow(window, evaluation),
      })
    }

    return results
  }

  /**
   * 评估单个日期窗口
   */
  private async evaluateWindow(
    window: DatePair,
    student: any,
    teachers: any[],
    context: DateSelectionContext
  ): Promise<{ score: number; evaluation: DateSelectionStrategy; metadata: any }> {
    const cacheKey = `${window.date1}-${window.date2}-${student.id}`

    // 检查缓存
    if (this.config.enableCaching && this.evaluationCache.has(cacheKey)) {
      const cached = this.evaluationCache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        this.cacheHits++
        return cached.result
      }
    }

    try {
      // 1. 评估资源可用性
      const resourceScore = await this.evaluateResourceAvailability(
        window,
        student,
        teachers,
        context
      )

      // 2. 评估工作量平衡
      const balanceScore = await this.evaluateWorkloadBalance(window, teachers, context)

      // 3. 评估冲突概率
      const conflictScore = await this.evaluateConflictProbability(window, student, context)

      // 4. 评估未来灵活性
      const flexibilityScore = await this.evaluateFutureFlexibility(window, context)

      // 5. 评估连续工作压力
      const consecutiveWorkStressScore = this.evaluateConsecutiveWorkStress(
        window,
        teachers,
        student
      )

      // 6. 🆕 优化3：评估推荐科室匹配度
      const recommendedMatchScore = this.evaluateRecommendedMatch(
        window,
        student,
        teachers,
        context
      )

      const evaluation: DateSelectionStrategy = {
        resourceAvailability: resourceScore,
        workloadBalance: balanceScore,
        conflictProbability: 1 - conflictScore, // 转换为正向评分
        futureFlexibility: flexibilityScore,
        consecutiveWorkStress: consecutiveWorkStressScore,
        recommendedMatch: recommendedMatchScore, // 🆕 添加推荐匹配
      }

      // 计算综合评分
      const totalScore =
        evaluation.resourceAvailability * this.WEIGHTS.resourceAvailability +
        evaluation.workloadBalance * this.WEIGHTS.workloadBalance +
        evaluation.conflictProbability * this.WEIGHTS.conflictProbability +
        evaluation.futureFlexibility * this.WEIGHTS.futureFlexibility +
        evaluation.consecutiveWorkStress * this.WEIGHTS.consecutiveWorkStress +
        evaluation.recommendedMatch * this.WEIGHTS.recommendedMatch // 🆕 添加推荐匹配权重

      const metadata = {
        alternativeDates: [],
        riskFactors: this.identifyRiskFactors(window, evaluation),
        confidence: this.calculateConfidence(evaluation),
      }

      const result = { score: totalScore, evaluation, metadata }

      // 更新缓存
      if (this.config.enableCaching) {
        this.evaluationCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
        })
      }

      return result
    } catch (error) {
      console.error(`❌ 评估窗口失败 ${window.date1}-${window.date2}:`, error)

      return {
        score: 0,
        evaluation: {
          resourceAvailability: 0,
          workloadBalance: 0,
          conflictProbability: 1,
          futureFlexibility: 0,
          consecutiveWorkStress: 0,
          recommendedMatch: 0, // 🆕 添加推荐匹配默认值
        },
        metadata: {
          alternativeDates: [],
          riskFactors: [`评估失败: ${error instanceof Error ? error.message : String(error)}`],
          confidence: 0,
        },
      }
    }
  }

  /**
   * 评估资源可用性（含考官优先级）
   */
  private async evaluateResourceAvailability(
    window: DatePair,
    student: any,
    teachers: any[],
    context: DateSelectionContext
  ): Promise<number> {
    try {
      // 获取两天的值班安排
      const dutySchedule1 = await dutyRotationService.calculateDutySchedule(window.date1)
      const dutySchedule2 = await dutyRotationService.calculateDutySchedule(window.date2)

      // 计算可用考官数量
      const availableTeachers1 = this.getAvailableTeachers(teachers, dutySchedule1, window.date1)
      const availableTeachers2 = this.getAvailableTeachers(teachers, dutySchedule2, window.date2)

      // 🆕 优化2：考虑考官优先级权重（SC1/SC3/SC5/SC7）
      const weightedAvailability1 = this.calculateWeightedAvailability(
        availableTeachers1,
        student,
        dutySchedule1,
        window.date1
      )
      const weightedAvailability2 = this.calculateWeightedAvailability(
        availableTeachers2,
        student,
        dutySchedule2,
        window.date2
      )

      // 返回两天的最小值（瓶颈原则）
      const finalScore = Math.min(weightedAvailability1, weightedAvailability2)

      process.env.NODE_ENV === 'development' && console.log(
        `📊 资源可用性评分：${window.date1}=${weightedAvailability1.toFixed(2)}, ${window.date2}=${weightedAvailability2.toFixed(2)}, 最终=${finalScore.toFixed(2)}`
      )

      return finalScore
    } catch (error) {
      console.error('评估资源可用性失败:', error)
      return 0.1 // 默认低分
    }
  }

  /**
   * 🆕 优化2：计算加权可用性（考虑考官优先级）
   * 包含SC13: 限制行政班担任主考官的惩罚
   */
  private calculateWeightedAvailability(
    teachers: any[],
    student: any,
    dutySchedule: any,
    date: string
  ): number {
    if (teachers.length === 0) return 0

    let totalWeight = 0
    let sameDeptWeightedCount = 0
    let diffDeptWeightedCount = 0
    let adminTeacherCount = 0 // 🆕 SC13: 统计行政班考官数量

    for (const teacher of teachers) {
      // 计算考官优先级权重
      const priorityWeight = this.calculateTeacherPriorityWeight(teacher, dutySchedule, date)

      // 🆕 SC13: 统计行政班考官（将用于惩罚）
      // 🔧 修复：行政班考官判断（group为null、"无"或空）
      if (!teacher.group || teacher.group === '无' || teacher.group.trim() === '') {
        adminTeacherCount++
      }

      // 按科室分类加权统计
      if (teacher.department === student.department) {
        sameDeptWeightedCount += priorityWeight
      } else {
        diffDeptWeightedCount += priorityWeight
      }

      totalWeight += priorityWeight
    }

    // 计算资源充足度（需要同科室1人，异科室1人，备用1人）
    // 使用加权数量进行评估
    const sameDeptScore = Math.min(sameDeptWeightedCount, 1.5) / 1.5 // 最多1.5倍权重
    const diffDeptScore = Math.min(diffDeptWeightedCount, 3.0) / 3.0 // 最多3.0倍权重（2人 × 1.5）

    // 综合评分
    let baseScore = sameDeptScore * 0.4 + diffDeptScore * 0.6

    // 🆕 SC13: 如果同科室考官中行政班比例过高，施加轻微惩罚
    // 这样可以优先选择非行政班考官担任主考官
    const sameDeptTeachers = teachers.filter(t => t.department === student.department)
    if (sameDeptTeachers.length > 0) {
      // 🔧 修复：行政班考官判断（group为null、"无"或空）
      const adminRatio =
        sameDeptTeachers.filter(t => !t.group || t.group === '无' || t.group.trim() === '').length /
        sameDeptTeachers.length

      // 行政班比例超过50%时，施加小幅惩罚
      if (adminRatio > 0.5) {
        const penalty = (adminRatio - 0.5) * 0.1 // 最多减少5%分数
        baseScore = baseScore * (1 - penalty)

        process.env.NODE_ENV === 'development' && console.log(
          `⚠️ SC13惩罚: ${date}同科室行政班比例${(adminRatio * 100).toFixed(0)}%，减分${(penalty * 100).toFixed(1)}%`
        )
      }
    }

    return baseScore
  }

  /**
   * 🆕 优化2：计算考官优先级权重
   * SC1: 夜班 (1.5倍)
   * SC3: 休息第一天 (1.3倍)
   * SC5: 休息第二天 (1.2倍)
   * SC7: 行政班 (1.1倍)
   * 基础: 1.0倍
   */
  private calculateTeacherPriorityWeight(teacher: any, dutySchedule: any, date: string): number {
    const teacherGroup = teacher.group

    // 行政班考官（SC7）
    // 🔧 修复：行政班考官判断（group为null、"无"或空）
    if (!teacherGroup || teacherGroup === '无' || teacherGroup.trim() === '') {
      return 1.1
    }

    // 非四班组考官，基础权重
    if (!teacherGroup) {
      return 1.0
    }

    // 检查是否为夜班（SC1 - 最高优先级）
    if (dutySchedule.nightShift === teacherGroup) {
      return 1.5
    }

    // 检查是否为休息日
    const restGroups = dutySchedule.restGroups || []
    if (restGroups.includes(teacherGroup)) {
      // 判断是休息第一天还是第二天
      // 这里简化处理：如果是休息组，给予1.3倍权重（假设为休息第一天）
      // 实际可以通过检查前一天的值班情况来精确判断
      return 1.3 // SC3: 休息第一天
    }

    // 白班考官，不可用
    if (dutySchedule.dayShift === teacherGroup) {
      return 0 // 白班执勤，不可用
    }

    // 默认基础权重
    return 1.0
  }

  /**
   * 评估工作量平衡（SC10/SC12）
   * SC10: 考官1工作量均衡
   * SC12: 备份考官工作量均衡
   */
  private async evaluateWorkloadBalance(
    window: DatePair,
    teachers: any[],
    context: DateSelectionContext
  ): Promise<number> {
    try {
      // 计算当前工作量分布
      const workloads = Array.from(context.teacherWorkloads.values())

      if (workloads.length === 0) return 1.0

      // 计算工作量标准差（主要考官）
      const mean = workloads.reduce((sum, w) => sum + w, 0) / workloads.length
      const variance =
        workloads.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / workloads.length
      const stdDev = Math.sqrt(variance)

      // 标准差越小，平衡度越高
      const maxStdDev = mean * 0.5 // 假设最大标准差为均值的50%
      const mainBalanceScore = Math.max(0, 1 - stdDev / maxStdDev)

      // 🆕 SC12: 评估备份考官工作量均衡
      // 统计备份考官的工作量（从已有分配中提取）
      const backupWorkloads = new Map<string, number>()
      for (const assignment of context.existingAssignments) {
        if (assignment.backupExaminerName) {
          const current = backupWorkloads.get(assignment.backupExaminerName) || 0
          backupWorkloads.set(assignment.backupExaminerName, current + 1)
        }
      }

      let backupBalanceScore = 1.0
      if (backupWorkloads.size > 0) {
        const backupWorkloadValues = Array.from(backupWorkloads.values())
        const backupMean =
          backupWorkloadValues.reduce((sum, w) => sum + w, 0) / backupWorkloadValues.length
        const backupVariance =
          backupWorkloadValues.reduce((sum, w) => sum + Math.pow(w - backupMean, 2), 0) /
          backupWorkloadValues.length
        const backupStdDev = Math.sqrt(backupVariance)

        const maxBackupStdDev = backupMean * 0.5
        backupBalanceScore = Math.max(0, 1 - backupStdDev / maxBackupStdDev)
      }

      // 综合评分：主考官工作量70%，备份考官工作量30%
      const finalScore = mainBalanceScore * 0.7 + backupBalanceScore * 0.3

      process.env.NODE_ENV === 'development' && console.log(
        `📊 工作量平衡评分: 主考官=${mainBalanceScore.toFixed(2)}, 备份考官=${backupBalanceScore.toFixed(2)}, 综合=${finalScore.toFixed(2)}`
      )

      return finalScore
    } catch (error) {
      console.error('评估工作量平衡失败:', error)
      return 0.5 // 默认中等分
    }
  }

  /**
   * 评估冲突概率
   */
  private async evaluateConflictProbability(
    window: DatePair,
    student: any,
    context: DateSelectionContext
  ): Promise<number> {
    try {
      let conflictRisk = 0

      // 检查日期冲突
      const existingDates = context.existingAssignments
        .filter(a => a.studentId !== student.id)
        .map(a => [a.examDate1, a.examDate2])
        .flat()

      const dateConflictCount1 = existingDates.filter(d => d === window.date1).length
      const dateConflictCount2 = existingDates.filter(d => d === window.date2).length

      // 日期使用频率越高，冲突风险越大
      const maxDateUsage = Math.max(dateConflictCount1, dateConflictCount2)
      const dateRisk = Math.min(maxDateUsage / Math.max(context.existingAssignments.length, 1), 1)

      conflictRisk += dateRisk * 0.6

      // 检查节假日冲突
      if (holidayService.isHoliday(window.date1) || holidayService.isHoliday(window.date2)) {
        conflictRisk += 0.3
      }

      // 检查周末冲突
      const date1Obj = new Date(window.date1)
      const date2Obj = new Date(window.date2)
      if (
        date1Obj.getDay() === 0 ||
        date1Obj.getDay() === 6 ||
        date2Obj.getDay() === 0 ||
        date2Obj.getDay() === 6
      ) {
        conflictRisk += 0.1
      }

      return Math.min(conflictRisk, 1)
    } catch (error) {
      console.error('评估冲突概率失败:', error)
      return 0.8 // 默认高风险
    }
  }

  /**
   * 评估未来灵活性（SC11）
   * SC11: 日期分配均衡 - 避免过多学员集中在同一天
   */
  private async evaluateFutureFlexibility(
    window: DatePair,
    context: DateSelectionContext
  ): Promise<number> {
    try {
      // 🆕 SC11: 统计每个日期的使用频率
      const dateUsageCount = new Map<string, number>()

      for (const assignment of context.existingAssignments) {
        // 统计第一天考试日期
        if (assignment.examDate1) {
          const count1 = dateUsageCount.get(assignment.examDate1) || 0
          dateUsageCount.set(assignment.examDate1, count1 + 1)
        }
        // 统计第二天考试日期
        if (assignment.examDate2) {
          const count2 = dateUsageCount.get(assignment.examDate2) || 0
          dateUsageCount.set(assignment.examDate2, count2 + 1)
        }
      }

      // 计算当前日期对的使用频率
      const date1Usage = dateUsageCount.get(window.date1) || 0
      const date2Usage = dateUsageCount.get(window.date2) || 0
      const avgUsage =
        dateUsageCount.size > 0
          ? Array.from(dateUsageCount.values()).reduce((sum, c) => sum + c, 0) / dateUsageCount.size
          : 0

      // 计算日期分配均衡度
      // 使用频率越接近平均值，分数越高
      const date1Deviation = avgUsage > 0 ? Math.abs(date1Usage - avgUsage) / avgUsage : 0
      const date2Deviation = avgUsage > 0 ? Math.abs(date2Usage - avgUsage) / avgUsage : 0
      const avgDeviation = (date1Deviation + date2Deviation) / 2

      // 偏差越小，分数越高
      const dateBalanceScore = Math.max(0, 1 - avgDeviation)

      // 原有的未来灵活性评估逻辑
      const originalFlexibilityScore = this.evaluateOriginalFlexibility(window, context)

      // 综合评分：日期均衡60%，原有灵活性40%
      const finalScore = dateBalanceScore * 0.6 + originalFlexibilityScore * 0.4

      process.env.NODE_ENV === 'development' && console.log(
        `📊 未来灵活性评分: 日期均衡=${dateBalanceScore.toFixed(2)} (${window.date1}用${date1Usage}次,${window.date2}用${date2Usage}次,平均${avgUsage.toFixed(1)}次), 原有灵活性=${originalFlexibilityScore.toFixed(2)}, 综合=${finalScore.toFixed(2)}`
      )

      return finalScore
    } catch (error) {
      console.error('评估未来灵活性失败:', error)
      return 0.5 // 默认中等分
    }
  }

  /**
   * 原有的未来灵活性评估逻辑
   */
  private evaluateOriginalFlexibility(window: DatePair, context: DateSelectionContext): number {
    try {
      // 计算选择该窗口后剩余的可选日期数量
      const usedDates = new Set([window.date1, window.date2])
      const remainingDates = context.availableDates.filter(d => !usedDates.has(d))

      // 灵活性 = 剩余日期数 / 总可用日期数
      const flexibilityRatio = remainingDates.length / context.availableDates.length

      // 简化处理：直接返回灵活性比率（移除异步调用以提高性能）
      return flexibilityRatio
    } catch (error) {
      console.error('评估原有灵活性失败:', error)
      return 0.3 // 默认低灵活性
    }
  }

  /**
   * 🆕 评估连续工作压力
   * 检测日期组合是否会导致考官连续工作（特别是4天连续）
   */
  private evaluateConsecutiveWorkStress(
    datePair: { date1: string; date2: string },
    teachers: any[],
    student: any
  ): number {
    let totalStress = 0
    let evaluatedTeachers = 0

    // 针对每个可能的考官评估压力
    for (const teacher of teachers) {
      // 🔧 修复：行政班考官判断（group为null、"无"或空）
      if (!teacher.group || teacher.group === '无' || teacher.group.trim() === '') {
        continue // 行政班不参与四班组轮转，跳过
      }

      const stress = this.calculateTeacherWorkStress(teacher, datePair.date1, datePair.date2)

      totalStress += stress
      evaluatedTeachers++
    }

    if (evaluatedTeachers === 0) {
      return 100 // 没有四班组考官，无压力
    }

    // 计算平均压力并转换为0-100分数（分数越高越好）
    const averageStress = totalStress / evaluatedTeachers

    // 压力等级转换为分数
    // 0分 (无压力) → 100分
    // 50分 (极高压力) → 0分
    // 15分 (高压力) → 70分
    // 2分 (中等压力) → 96分
    const score = Math.max(0, 100 - averageStress * 2)

    process.env.NODE_ENV === 'development' && console.log(
      `📊 日期组合 ${datePair.date1} + ${datePair.date2} 连续工作压力评分: ${score.toFixed(1)}/100 (压力值: ${averageStress.toFixed(1)})`
    )

    return score
  }

  /**
   * 🆕 计算单个考官的工作压力
   * 检测：晚班 → 考试 → 考试 → 早班 (4天连续)
   */
  private calculateTeacherWorkStress(teacher: any, date1: string, date2: string): number {
    const teacherGroup = teacher.group

    // 计算前一天和后一天的日期
    const date1Obj = new Date(date1)
    const date2Obj = new Date(date2)

    const preDayDate = new Date(date1Obj)
    preDayDate.setDate(preDayDate.getDate() - 1)
    const preDayDateStr = preDayDate.toISOString().split('T')[0]

    const postDayDate = new Date(date2Obj)
    postDayDate.setDate(postDayDate.getDate() + 1)
    const postDayDateStr = postDayDate.toISOString().split('T')[0]

    // 获取值班信息
    const preDaySchedule = dutyRotationService.calculateDutySchedule(preDayDateStr)
    const postDaySchedule = dutyRotationService.calculateDutySchedule(postDayDateStr)

    const isPreDayNightShift = teacherGroup === preDaySchedule.nightShift
    const isPostDayDayShift = teacherGroup === postDaySchedule.dayShift

    // 🔴 最严重：晚班 → 考试 → 考试 → 早班（4天连续）
    if (isPreDayNightShift && isPostDayDayShift) {
      process.env.NODE_ENV === 'development' && console.log(
        `🚨 考官 ${teacher.name} (${teacherGroup}): 检测到4天连续工作! ${preDayDateStr}晚班 → ${date1}考试 → ${date2}考试 → ${postDayDateStr}早班`
      )
      return 50 // 极高压力
    }

    // 🟠 严重：晚班 → 考试 → 考试 或 考试 → 考试 → 早班（3天连续）
    if (isPreDayNightShift || isPostDayDayShift) {
      const pattern = isPreDayNightShift ? '晚班→考试→考试' : '考试→考试→早班'
      process.env.NODE_ENV === 'development' && console.log(`⚠️ 考官 ${teacher.name} (${teacherGroup}): 检测到3天连续工作模式: ${pattern}`)
      return 15 // 高压力
    }

    // 🟡 一般：仅连续两天考试
    return 2 // 中等压力
  }

  /**
   * 🆕 优化3：评估推荐科室匹配度（SC2/SC4/SC9）
   * 检查推荐的考官2科室和备份科室的可用考官数量
   * SC9: 三七室互通 - 三科和七科可互相担任考官
   */
  private evaluateRecommendedMatch(
    window: DatePair,
    student: any,
    teachers: any[],
    context: DateSelectionContext
  ): number {
    try {
      // 获取学员推荐的科室
      let recommendedExaminer2Dept = student.recommendedExaminer2Dept
      let recommendedBackupDept = student.recommendedBackupDept

      // 🆕 SC9: 三七室互通逻辑
      const studentDept = student.department
      if (studentDept === '三科' || studentDept === '七科') {
        // 如果学员是三科，七科考官也可以作为推荐科室
        // 如果学员是七科，三科考官也可以作为推荐科室
        const interchangeableDept = studentDept === '三科' ? '七科' : '三科'

        // 如果没有指定推荐科室，自动添加互通科室
        if (!recommendedExaminer2Dept && !recommendedBackupDept) {
          recommendedExaminer2Dept = interchangeableDept
          process.env.NODE_ENV === 'development' && console.log(
            `🔄 SC9三七室互通: 为${studentDept}学员自动添加${interchangeableDept}作为推荐科室`
          )
        }
      }

      if (!recommendedExaminer2Dept && !recommendedBackupDept) {
        return 100 // 没有推荐科室要求，满分
      }

      // 获取两天的值班安排
      const dutySchedule1 = dutyRotationService.calculateDutySchedule(window.date1)
      const dutySchedule2 = dutyRotationService.calculateDutySchedule(window.date2)

      // 计算可用考官
      const availableTeachers1 = this.getAvailableTeachers(teachers, dutySchedule1, window.date1)
      const availableTeachers2 = this.getAvailableTeachers(teachers, dutySchedule2, window.date2)

      let matchScore = 0
      let totalWeight = 0

      // 评估考官2推荐科室匹配（SC2权重90，占比60%）
      if (recommendedExaminer2Dept) {
        // 🆕 SC9: 考虑三七室互通
        const interchangeableDepts = this.getInterchangeableDepts(recommendedExaminer2Dept)
        const examiner2Count1 = availableTeachers1.filter(t =>
          interchangeableDepts.includes(t.department)
        ).length
        const examiner2Count2 = availableTeachers2.filter(t =>
          interchangeableDepts.includes(t.department)
        ).length

        const examiner2Match = Math.min(examiner2Count1, 1) + Math.min(examiner2Count2, 1)
        matchScore += (examiner2Match / 2) * 0.6 // 最多2分，占60%
        totalWeight += 0.6
      }

      // 评估备份考官推荐科室匹配（SC4权重70，占比40%）
      if (recommendedBackupDept) {
        // 🆕 SC9: 考虑三七室互通
        const interchangeableBackupDepts = this.getInterchangeableDepts(recommendedBackupDept)
        const backupCount1 = availableTeachers1.filter(t =>
          interchangeableBackupDepts.includes(t.department)
        ).length
        const backupCount2 = availableTeachers2.filter(t =>
          interchangeableBackupDepts.includes(t.department)
        ).length

        const backupMatch = Math.min(backupCount1, 1) + Math.min(backupCount2, 1)
        matchScore += (backupMatch / 2) * 0.4 // 最多2分，占40%
        totalWeight += 0.4
      }

      // 归一化到0-100分
      const finalScore = totalWeight > 0 ? (matchScore / totalWeight) * 100 : 100

      process.env.NODE_ENV === 'development' && console.log(
        `📊 推荐科室匹配评分：${window.date1}-${window.date2} = ${finalScore.toFixed(1)}/100 (考官2科室:${recommendedExaminer2Dept || '无'}, 备份科室:${recommendedBackupDept || '无'})`
      )

      return finalScore
    } catch (error) {
      console.error('评估推荐科室匹配失败:', error)
      return 50 // 默认中等分
    }
  }

  /**
   * 🆕 SC9: 获取可互通的科室列表（三七室互通）
   */
  private getInterchangeableDepts(department: string): string[] {
    if (department === '三科') {
      return ['三科', '七科']
    } else if (department === '七科') {
      return ['三科', '七科']
    }
    return [department]
  }

  /**
   * 获取可用考官列表
   */
  private getAvailableTeachers(teachers: any[], dutySchedule: any, date: string): any[] {
    return teachers.filter(teacher => {
      // 检查是否在白班值班
      if (dutySchedule.dayShift && dutySchedule.dayShift.includes(teacher.group)) {
        return false
      }

      // 检查考官可用性
      if (teacher.availability && teacher.availability[date]) {
        const dayAvailability = teacher.availability[date]
        return dayAvailability.morning || dayAvailability.afternoon || dayAvailability.evening
      }

      return true // 默认可用
    })
  }

  /**
   * 验证日期对的有效性
   */
  private isValidDatePair(date1: string, date2: string, student: any, constraints: any): boolean {
    // ✅ 遵守HC6硬约束：学员必须在连续两天完成考试
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const dayDiff = Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))

    // HC6硬约束：只允许连续两天（间隔1天）
    if (dayDiff !== 1) return false

    // 检查是否为工作日
    if (!holidayService.isWorkingDay(date1) || !holidayService.isWorkingDay(date2)) {
      return false
    }

    // 🆕 优化1：检查学员是否在考试日执勤白班（HC6硬约束）
    const studentGroup = student.group
    if (studentGroup && studentGroup !== '行政班') {
      try {
        const duty1 = dutyRotationService.calculateDutySchedule(date1)
        const duty2 = dutyRotationService.calculateDutySchedule(date2)

        // 如果学员在任一考试日执勤白班，则该日期对不可用
        if (duty1.dayShift === studentGroup || duty2.dayShift === studentGroup) {
          process.env.NODE_ENV === 'development' && console.log(
            `❌ 日期对 ${date1}-${date2} 被过滤：学员 ${student.name} (${studentGroup}) 在考试日执勤白班`
          )
          return false
        }
      } catch (error) {
        console.warn(`⚠️ 检查学员白班执勤失败:`, error)
        // 出错时保守处理，允许该日期对
      }
    }

    // 检查其他约束
    if (constraints && constraints.noWeekendExam) {
      if (d1.getDay() === 0 || d1.getDay() === 6 || d2.getDay() === 0 || d2.getDay() === 6) {
        return false
      }
    }

    return true
  }

  /**
   * 🆕 优先级2：增强硬约束检查
   * 在生成候选窗口后、评估前，再次验证硬约束
   */
  private validateHardConstraints(
    window: DatePair,
    student: any,
    teachers: any[],
    context: DateSelectionContext
  ): { valid: boolean; reason?: string } {
    try {
      // HC2检查：确保有同科室考官可用
      const sameDeptTeachers = this.getAvailableTeachersForDate(
        teachers,
        window.date1,
        window.date2,
        student.department,
        true
      )
      if (sameDeptTeachers.length === 0) {
        return {
          valid: false,
          reason: `HC2违反: 无同科室(${student.department})考官可用于 ${window.date1}-${window.date2}`,
        }
      }

      // HC7检查：确保有异科室考官可用
      const diffDeptTeachers = this.getAvailableTeachersForDate(
        teachers,
        window.date1,
        window.date2,
        student.department,
        false
      )
      if (diffDeptTeachers.length === 0) {
        return {
          valid: false,
          reason: `HC7违反: 无异科室考官可用于 ${window.date1}-${window.date2}`,
        }
      }

      // HC4检查：检查是否有考官在这两天已有其他分配
      const conflicts = this.checkTeacherDateConflicts(
        window.date1,
        window.date2,
        context.existingAssignments
      )
      if (conflicts.length > 0) {
        return {
          valid: false,
          reason: `HC4违反: 考官 ${conflicts.join(', ')} 在 ${window.date1} 或 ${window.date2} 已有分配`,
        }
      }

      return { valid: true }
    } catch (error) {
      console.warn(`⚠️ 硬约束验证异常:`, error)
      // 出错时保守处理，允许通过
      return { valid: true }
    }
  }

  /**
   * 获取指定日期对可用的考官（按科室过滤）
   */
  private getAvailableTeachersForDate(
    teachers: any[],
    date1: string,
    date2: string,
    studentDept: string,
    sameDept: boolean
  ): any[] {
    try {
      const duty1 = dutyRotationService.calculateDutySchedule(date1)
      const duty2 = dutyRotationService.calculateDutySchedule(date2)

      return teachers.filter(teacher => {
        // 科室过滤
        const deptMatch = sameDept
          ? teacher.department === studentDept
          : teacher.department !== studentDept

        if (!deptMatch) return false

        // 检查考官是否在这两天执勤白班
        const teacherGroup = teacher.group
        // 🔧 修复：行政班考官判断（group为null、"无"或空）
        if (!teacherGroup || teacherGroup === '无' || teacherGroup.trim() === '') {
          return true // 行政班或无班组信息的考官可用
        }

        // 白班执勤的考官不可用
        const onDayShift1 = duty1.dayShift === teacherGroup
        const onDayShift2 = duty2.dayShift === teacherGroup

        return !onDayShift1 && !onDayShift2
      })
    } catch (error) {
      console.warn('获取可用考官失败:', error)
      return []
    }
  }

  /**
   * 检查考官在指定日期的分配冲突
   */
  private checkTeacherDateConflicts(
    date1: string,
    date2: string,
    existingAssignments: any[]
  ): string[] {
    const conflicts = new Set<string>()

    for (const assignment of existingAssignments) {
      // 检查是否有考官在这两天已被分配
      if (
        assignment.examDate1 === date1 ||
        assignment.examDate1 === date2 ||
        assignment.examDate2 === date1 ||
        assignment.examDate2 === date2
      ) {
        // 记录冲突的考官
        if (assignment.examiner1Name) conflicts.add(assignment.examiner1Name)
        if (assignment.examiner2Name) conflicts.add(assignment.examiner2Name)
        if (assignment.backupExaminerName) conflicts.add(assignment.backupExaminerName)
      }
    }

    return Array.from(conflicts)
  }

  /**
   * 选择最佳窗口
   */
  private selectBestWindow(
    evaluations: { pair: DatePair; reasoning: string }[],
    constraints: any
  ): { selectedPair: DatePair | null; reasoning: string } {
    if (evaluations.length === 0) {
      return {
        selectedPair: null,
        reasoning: '没有可用的日期窗口',
      }
    }

    // 按评分排序
    const sortedEvaluations = evaluations
      .filter(e => e.pair.metadata.confidence >= this.MIN_CONFIDENCE)
      .sort((a, b) => b.pair.score - a.pair.score)

    if (sortedEvaluations.length === 0) {
      // 如果没有高置信度的选择，选择评分最高的
      const bestLowConfidence = evaluations.sort((a, b) => b.pair.score - a.pair.score)[0]
      return {
        selectedPair: bestLowConfidence.pair,
        reasoning: `${bestLowConfidence.reasoning} (低置信度选择)`,
      }
    }

    return {
      selectedPair: sortedEvaluations[0].pair,
      reasoning: sortedEvaluations[0].reasoning,
    }
  }

  /**
   * 生成窗口推理说明
   */
  private generateReasoningForWindow(window: DatePair, evaluation: any): string {
    const { evaluation: scores } = evaluation
    const reasons = []

    if (scores.resourceAvailability > 0.8) {
      reasons.push('资源充足')
    } else if (scores.resourceAvailability < 0.3) {
      reasons.push('资源紧张')
    }

    if (scores.workloadBalance > 0.7) {
      reasons.push('工作量均衡')
    }

    if (scores.conflictProbability > 0.8) {
      reasons.push('冲突风险低')
    } else if (scores.conflictProbability < 0.3) {
      reasons.push('存在冲突风险')
    }

    if (scores.futureFlexibility > 0.6) {
      reasons.push('未来灵活性好')
    }

    if (scores.consecutiveWorkStress > 0.8) {
      reasons.push('连续工作压力小')
    } else if (scores.consecutiveWorkStress < 0.3) {
      reasons.push('存在连续工作压力')
    }

    const reasonText = reasons.length > 0 ? reasons.join('，') : '综合评估结果'

    return `${window.date1}至${window.date2}：${reasonText}（评分：${evaluation.score.toFixed(2)}）`
  }

  /**
   * 识别风险因素
   */
  private identifyRiskFactors(window: DatePair, evaluation: DateSelectionStrategy): string[] {
    const risks = []

    if (evaluation.resourceAvailability < 0.3) {
      risks.push('考官资源不足')
    }

    if (evaluation.workloadBalance < 0.4) {
      risks.push('工作量不均衡')
    }

    if (evaluation.conflictProbability < 0.3) {
      risks.push('存在日期冲突')
    }

    if (evaluation.futureFlexibility < 0.3) {
      risks.push('未来选择受限')
    }

    if (evaluation.consecutiveWorkStress > 0.7) {
      risks.push('存在连续工作压力')
    }

    return risks
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(evaluation: DateSelectionStrategy): number {
    const scores = Object.values(evaluation)
    const minScore = Math.min(...scores)
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length

    // 置信度 = 最低分 * 0.4 + 平均分 * 0.6
    return minScore * 0.4 + avgScore * 0.6
  }

  /**
   * 评估未来可用性
   */
  private async assessFutureAvailability(futureDates: string[]): Promise<number> {
    if (futureDates.length === 0) return 0

    let availabilitySum = 0

    for (const date of futureDates) {
      if (holidayService.isWorkingDay(date)) {
        availabilitySum += 1
      } else {
        availabilitySum += 0.3 // 非工作日降低可用性
      }
    }

    return availabilitySum / futureDates.length
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.evaluationCache.clear()
    process.env.NODE_ENV === 'development' && console.log('🧹 智能日期选择器缓存已清理')
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.evaluationCache.size,
      hitRate: this.cacheHits / (this.cacheHits + this.evaluationCache.size) || 0,
    }
  }
}

// 导出单例实例
export const intelligentDateSelector = new IntelligentDateSelector()
