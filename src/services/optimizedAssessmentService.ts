/**
 * 深度优化的智能评估服务
 * 基于瓶颈分析、精确容量计算和约束预检查的评估算法
 * 
 * 核心算法：
 * 1. 部门级瓶颈分析 - 识别最紧缺的资源
 * 2. 精确可用容量计算 - 基于个体examiner可用日期
 * 3. 约束可行性预检查 - 模拟HC1-HC8约束
 * 4. 智能日期范围推荐 - 保证约束满足的最小日期范围
 */

import type { Teacher, Student, ScheduleConfig } from '../types'
import { normalizeDeptToShort } from '../utils/departmentNormalizer'

// ============================================================================
// 类型定义
// ============================================================================

export interface AssessmentInput {
  students: Student[]
  teachers: Teacher[]
  examDates: Date[]
  unavailableDates: Date[]
  dutySchedule: Map<string, string[]> // 考官ID -> 值班日期列表
  config: ScheduleConfig
}

export interface BottleneckAnalysis {
  department: string
  studentCount: number
  examinerCount: number
  availableExaminerCount: number
  totalExamsNeeded: number
  maxCapacityPerDay: number
  actualAvailableCapacity: number
  utilizationRate: number
  isBottleneck: boolean
  severity: 'critical' | 'high' | 'medium' | 'low'
  requiredDays: number
  availableDays: number
  deficit: number
}

export interface ExaminerAvailability {
  examiner: Teacher
  department: string
  availableDates: Date[]
  availableCount: number
  isAvailableOnWeekend: boolean
  unavailablePeriods: { start: Date; end: Date; reason?: string }[]
  dutyDates: Date[]
  effectiveCapacity: number
}

export interface DateRangeRecommendation {
  recommendedStartDate: Date
  recommendedEndDate: Date
  minRequiredDays: number
  suggestedDays: number
  confidence: number
  reasons: string[]
  departmentSpecificRequirements: Map<string, { minDays: number; suggestedDays: number }>
  status: 'insufficient' | 'suboptimal' | 'good'  // 🔧 新增：推荐状态
}

export interface OptimizedAssessmentResult {
  // 总体评估
  isFeasible: boolean
  overallConfidence: number
  
  // 瓶颈分析
  bottlenecks: BottleneckAnalysis[]
  criticalDepartment: string | null
  
  // 容量分析
  totalExamsNeeded: number
  totalTheoreticalCapacity: number
  totalActualCapacity: number
  capacityUtilization: number
  
  // 考官可用性分析
  examinerAvailabilityMap: Map<string, ExaminerAvailability>
  unavailableExaminers: string[]
  
  // 日期推荐
  dateRecommendation: DateRangeRecommendation
  
  // 详细问题列表
  issues: AssessmentIssue[]
  
  // 优化建议
  suggestions: OptimizationSuggestion[]
}

export interface AssessmentIssue {
  id: string
  type: 'capacity' | 'availability' | 'constraint' | 'resource' | 'date'
  severity: 'critical' | 'high' | 'medium' | 'low'
  department?: string
  message: string
  details: Record<string, any>
  autoResolvable: boolean
  suggestedFix?: string
}

export interface OptimizationSuggestion {
  id: string
  priority: number
  category: 'date_range' | 'resource' | 'constraint' | 'config'
  title: string
  description: string
  expectedImpact: string
  implementationSteps?: string[]
}

// ============================================================================
// 核心评估算法
// ============================================================================

class OptimizedAssessmentService {
  
  /**
   * 执行深度优化的可行性评估
   */
  async performAssessment(input: AssessmentInput): Promise<OptimizedAssessmentResult> {
    const startTime = performance.now()
    
    // 步骤1: 计算精确考官可用性
    const examinerAvailabilityMap = this.calculateExaminerAvailability(input)
    
    // 步骤2: 部门级瓶颈分析
    const bottlenecks = this.analyzeBottlenecks(input, examinerAvailabilityMap)
    const criticalDepartment = bottlenecks.find(b => b.isBottleneck)?.department || null
    
    // 步骤3: 精确容量计算
    const capacityAnalysis = this.calculatePreciseCapacity(input, examinerAvailabilityMap, bottlenecks)
    
    // 步骤4: 日期范围推荐
    const dateRecommendation = this.generateDateRecommendation(input, bottlenecks, capacityAnalysis)
    
    // 步骤5: 约束预检查
    const issues = this.performConstraintPreCheck(input, examinerAvailabilityMap, bottlenecks)
    
    // 步骤6: 生成优化建议
    const suggestions = this.generateOptimizationSuggestions(input, bottlenecks, issues)
    
    // 步骤7: 综合可行性判断
    const isFeasible = this.determineFeasibility(bottlenecks, issues, capacityAnalysis)
    
    const endTime = performance.now()
    console.log(`[OptimizedAssessment] 评估完成，耗时 ${(endTime - startTime).toFixed(2)}ms`)
    
    return {
      isFeasible,
      overallConfidence: this.calculateOverallConfidence(bottlenecks, issues),
      bottlenecks,
      criticalDepartment,
      ...capacityAnalysis,
      examinerAvailabilityMap,
      unavailableExaminers: Array.from(examinerAvailabilityMap.values())
        .filter(ea => ea.availableCount === 0)
        .map(ea => ea.examiner.name),
      dateRecommendation,
      issues,
      suggestions
    }
  }
  
  /**
   * 计算每个考官的精确可用性
   * 考虑：不可用日期、值班日期、周末可用性
   */
  private calculateExaminerAvailability(input: AssessmentInput): Map<string, ExaminerAvailability> {
    const availabilityMap = new Map<string, ExaminerAvailability>()
    const { examDates, unavailableDates, dutySchedule } = input
    
    for (const teacher of input.teachers) {
      const dept = normalizeDeptToShort(teacher.department)
      const dutyDates = dutySchedule.get(teacher.id) || []
      
      // 解析考官不可用期
      const unavailablePeriods = this.parseUnavailablePeriods(teacher)
      
      // 计算可用日期
      const availableDates: Date[] = []
      let isAvailableOnWeekend = false
      
      for (const date of examDates) {
        const dateStr = this.formatDate(date)
        const dayOfWeek = date.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        
        // 检查是否是全局不可用日期
        if (unavailableDates.some(ud => this.isSameDay(ud, date))) {
          continue
        }
        
        // 检查是否在考官不可用期内
        const isInUnavailablePeriod = unavailablePeriods.some(period => 
          date >= period.start && date <= period.end
        )
        if (isInUnavailablePeriod) {
          continue
        }
        
        // 检查是否是值班日期（值班当天不可用）
        if (dutyDates.includes(dateStr)) {
          continue
        }
        
        // 检查周末约束（HC1）
        if (isWeekend) {
          const isAdminTeacher = !teacher.group || teacher.group === '无' || teacher.group.trim() === ''
          if (isAdminTeacher) {
            continue // 行政班考官周末不可用
          }
          isAvailableOnWeekend = true
        }
        
        availableDates.push(date)
      }
      
      // 计算有效容量
      const effectiveCapacity = this.calculateExaminerEffectiveCapacity(teacher, availableDates)
      
      availabilityMap.set(teacher.id, {
        examiner: teacher,
        department: dept,
        availableDates,
        availableCount: availableDates.length,
        isAvailableOnWeekend,
        unavailablePeriods,
        dutyDates: dutyDates.map(d => new Date(d)),
        effectiveCapacity
      })
    }
    
    return availabilityMap
  }
  
  /**
   * 解析考官不可用期
   */
  private parseUnavailablePeriods(teacher: Teacher): { start: Date; end: Date; reason?: string }[] {
    const periods: { start: Date; end: Date; reason?: string }[] = []
    
    const unavailableData = (teacher as any).unavailableDates || (teacher as any).unavailablePeriods
    
    if (Array.isArray(unavailableData)) {
      for (const period of unavailableData) {
        try {
          if (period.startDate && period.endDate) {
            periods.push({
              start: new Date(period.startDate),
              end: new Date(period.endDate),
              reason: period.reason
            })
          }
        } catch (e) {
          console.warn(`解析考官 ${teacher.name} 的不可用期失败:`, e)
        }
      }
    }
    
    return periods
  }
  
  /**
   * 计算单个考官的有效容量（考虑工作量限制）
   */
  private calculateExaminerEffectiveCapacity(teacher: Teacher, availableDates: Date[]): number {
    // 默认每天最多监考的考试数
    const maxExamsPerDay = 11 // 与后端配置一致
    
    // 获取考官工作量限制
    const workloadLimit = (teacher as any).maxWorkload || maxExamsPerDay
    
    // 有效容量 = 可用日期数 × 每天最大监考数
    return availableDates.length * Math.min(workloadLimit, maxExamsPerDay)
  }
  
  /**
   * 部门级瓶颈分析
   * 识别最紧缺的资源（限制整个排班的部门）
   */
  private analyzeBottlenecks(
    input: AssessmentInput,
    availabilityMap: Map<string, ExaminerAvailability>
  ): BottleneckAnalysis[] {
    const { students, teachers, examDates, config } = input
    
    // 按部门统计学生和考官
    const deptStats = new Map<string, {
      students: Student[]
      examiners: Teacher[]
      availableExaminers: ExaminerAvailability[]
    }>()
    
    // 初始化部门统计
    for (const student of students) {
      const dept = normalizeDeptToShort(student.department)
      if (!deptStats.has(dept)) {
        deptStats.set(dept, { students: [], examiners: [], availableExaminers: [] })
      }
      deptStats.get(dept)!.students.push(student)
    }
    
    for (const teacher of teachers) {
      const dept = normalizeDeptToShort(teacher.department)
      if (!deptStats.has(dept)) {
        deptStats.set(dept, { students: [], examiners: [], availableExaminers: [] })
      }
      deptStats.get(dept)!.examiners.push(teacher)
      
      const availability = availabilityMap.get(teacher.id)
      if (availability && availability.availableCount > 0) {
        deptStats.get(dept)!.availableExaminers.push(availability)
      }
    }
    
    // 处理三室七室互通
    this.handleDept37Interchangeability(deptStats)
    
    // 计算每个部门的瓶颈指标
    const bottlenecks: BottleneckAnalysis[] = []
    const maxExamsPerDay = config.constraints.maxExamsPerDay || 11
    const workDays = examDates.length
    
    for (const [dept, stats] of deptStats) {
      const studentCount = stats.students.length
      const examinerCount = stats.examiners.length
      const availableExaminerCount = stats.availableExaminers.length
      
      // 需要的考试总数（每名学生2场考试）
      const totalExamsNeeded = studentCount * 2
      
      // 理论最大容量
      const maxCapacityPerDay = examinerCount * maxExamsPerDay
      
      // 实际可用容量（基于考官可用日期）
      const actualAvailableCapacity = stats.availableExaminers.reduce(
        (sum, ea) => sum + ea.effectiveCapacity, 0
      )
      
      // 利用率
      const utilizationRate = actualAvailableCapacity > 0 
        ? totalExamsNeeded / actualAvailableCapacity 
        : Infinity
      
      // 需要的天数
      const requiredDays = Math.ceil(totalExamsNeeded / maxExamsPerDay / Math.max(availableExaminerCount, 1))
      
      // 判断是否为瓶颈
      const isBottleneck = utilizationRate > 0.8 || availableExaminerCount === 0 || requiredDays > workDays
      
      // 严重程度
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'low'
      if (availableExaminerCount === 0) severity = 'critical'
      else if (utilizationRate > 1.2) severity = 'critical'
      else if (utilizationRate > 0.9) severity = 'high'
      else if (utilizationRate > 0.8) severity = 'medium'
      
      // 计算缺口
      const deficit = Math.max(0, totalExamsNeeded - actualAvailableCapacity)
      
      bottlenecks.push({
        department: dept,
        studentCount,
        examinerCount,
        availableExaminerCount,
        totalExamsNeeded,
        maxCapacityPerDay,
        actualAvailableCapacity,
        utilizationRate: Math.min(utilizationRate, 999),
        isBottleneck,
        severity,
        requiredDays,
        availableDays: workDays,
        deficit
      })
    }
    
    // 按严重程度排序
    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return b.utilizationRate - a.utilizationRate
    })
  }
  
  /**
   * 处理三室七室互通
   */
  private handleDept37Interchangeability(
    deptStats: Map<string, { students: Student[]; examiners: Teacher[]; availableExaminers: ExaminerAvailability[] }>
  ): void {
    const sanShi = deptStats.get('三')
    const qiShi = deptStats.get('七')
    
    if (sanShi && qiShi) {
      // 合并可用考官池
      const combinedExaminers = [...sanShi.availableExaminers, ...qiShi.availableExaminers]
      
      // 重新分配给两个部门
      sanShi.availableExaminers = combinedExaminers
      qiShi.availableExaminers = combinedExaminers
    }
  }
  
  /**
   * 精确容量计算
   */
  private calculatePreciseCapacity(
    input: AssessmentInput,
    availabilityMap: Map<string, ExaminerAvailability>,
    bottlenecks: BottleneckAnalysis[]
  ): {
    totalExamsNeeded: number
    totalTheoreticalCapacity: number
    totalActualCapacity: number
    capacityUtilization: number
  } {
    const { students } = input
    
    const totalExamsNeeded = students.length * 2
    
    // 理论容量 = 所有考官 × 所有日期 × 每天最大监考数
    const totalDates = input.examDates.length
    const maxExamsPerDay = input.config.constraints.maxExamsPerDay || 11
    const totalTheoreticalCapacity = input.teachers.length * totalDates * maxExamsPerDay
    
    // 实际容量 = 所有可用考官的有效容量之和
    const totalActualCapacity = Array.from(availabilityMap.values())
      .reduce((sum, ea) => sum + ea.effectiveCapacity, 0)
    
    // 容量利用率
    const capacityUtilization = totalActualCapacity > 0 
      ? totalExamsNeeded / totalActualCapacity 
      : 0
    
    return {
      totalExamsNeeded,
      totalTheoreticalCapacity,
      totalActualCapacity,
      capacityUtilization: Math.min(capacityUtilization, 1)
    }
  }
  
  /**
   * 生成智能日期范围推荐
   * 
   * 🔧 新逻辑（基于用户建议）：
   * - 🔴 insufficient(红色): 有 critical/high 瓶颈，不可行，推荐天数 > 当前天数
   * - 🔵 suboptimal(蓝色): 有 medium 瓶颈或置信度<0.8，可行但不理想，推荐天数 >= 当前天数
   * - 🟢 good(绿色): 无瓶颈且置信度>=0.8，可行且理想，推荐天数 = 当前天数
   */
  private generateDateRecommendation(
    input: AssessmentInput,
    bottlenecks: BottleneckAnalysis[],
    capacityAnalysis: { totalExamsNeeded: number; totalActualCapacity: number }
  ): DateRangeRecommendation {
    const { examDates, students, config } = input
    const currentDays = examDates.length
    
    if (currentDays === 0) {
      return this.createEmptyRecommendation()
    }
    
    const maxExamsPerDay = config.constraints.maxExamsPerDay || 11
    const minExamsPerDay = Math.ceil(capacityAnalysis.totalExamsNeeded / currentDays)
    
    // 计算每个部门需要的日期
    const deptRequirements = new Map<string, { minDays: number; suggestedDays: number }>()
    let maxRequiredDays = 0
    
    for (const bottleneck of bottlenecks) {
      const { department, totalExamsNeeded, availableExaminerCount } = bottleneck
      
      if (availableExaminerCount === 0) {
        deptRequirements.set(department, { minDays: Infinity, suggestedDays: Infinity })
        continue
      }
      
      const minDays = Math.ceil(totalExamsNeeded / maxExamsPerDay)
      const suggestedDays = Math.ceil(totalExamsNeeded / (maxExamsPerDay * 0.7))
      
      deptRequirements.set(department, { minDays, suggestedDays })
      maxRequiredDays = Math.max(maxRequiredDays, minDays)
    }
    
    // 计算全局最小需要天数
    const globalMinDays = Math.ceil(students.length * 2 / (input.teachers.length * maxExamsPerDay * 0.8))
    const theoreticalMinDays = Math.max(globalMinDays, maxRequiredDays)
    
    // 按严重程度分类瓶颈
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical')
    const highBottlenecks = bottlenecks.filter(b => b.severity === 'high')
    const mediumBottlenecks = bottlenecks.filter(b => b.severity === 'medium')
    
    const hasCriticalBottleneck = criticalBottlenecks.length > 0
    const hasHighBottleneck = highBottlenecks.length > 0
    const hasMediumBottleneck = mediumBottlenecks.length > 0
    
    // 计算基础置信度
    const baseConfidence = this.calculateDateRecommendationConfidence(bottlenecks, theoreticalMinDays, currentDays)
    
    // 生成原因
    const reasons: string[] = []
    
    // 🔴 红色状态：有 critical/high 瓶颈，不可行
    if (hasCriticalBottleneck || hasHighBottleneck) {
      if (criticalBottlenecks.length > 0) {
        const topBottleneck = criticalBottlenecks[0]
        reasons.push(`部门"${topBottleneck.department}"资源严重不足，无法完成排班`)
      }
      if (highBottlenecks.length > 0) {
        const topBottleneck = highBottlenecks[0]
        reasons.push(`部门"${topBottleneck.department}"资源紧张，需要更多日期`)
      }
    } else if (hasMediumBottleneck) {
      // 🔵 蓝色状态：有 medium 瓶颈
      const topBottleneck = mediumBottlenecks[0]
      reasons.push(`部门"${topBottleneck.department}"资源略显紧张`)
    }
    
    if (minExamsPerDay > maxExamsPerDay * 0.6) {
      reasons.push(`每天需要安排约${minExamsPerDay}场考试，接近容量上限${maxExamsPerDay}场`)
    }
    
    if (reasons.length === 0) {
      reasons.push('当前配置资源充足，可以顺利完成排班')
    }
    
    // ===== 根据状态确定推荐天数 =====
    let recommendedDays: number
    let status: 'insufficient' | 'suboptimal' | 'good'
    let confidence: number
    
    if (hasCriticalBottleneck || hasHighBottleneck) {
      // 🔴 红色状态：不可行，必须延长日期
      status = 'insufficient'
      // 推荐天数必须严格大于当前天数（至少多5天或20%，取较大值）
      const minExtension = Math.max(5, Math.ceil(currentDays * 0.2))
      recommendedDays = Math.max(
        theoreticalMinDays,
        currentDays + minExtension,
        Math.ceil(currentDays * 1.3)
      )
      confidence = Math.max(0.3, baseConfidence - 0.4)
      reasons.unshift(`⚠️ 当前日期范围不足以完成排班，建议延长至${recommendedDays}天`)
      
    } else if (hasMediumBottleneck || baseConfidence < 0.8) {
      // 🔵 蓝色状态：可行但不理想
      status = 'suboptimal'
      // 推荐天数可以等于或大于当前天数
      if (theoreticalMinDays > currentDays) {
        // 计算出的需求大于当前，建议延长
        recommendedDays = theoreticalMinDays
        reasons.unshift(`💡 延长至${recommendedDays}天可获得更好的排班效果`)
      } else {
        // 当前天数已经足够，但不够理想
        recommendedDays = currentDays
        reasons.unshift(`💡 当前${currentDays}天可以完成排班，但延长日期可获得更好效果`)
      }
      confidence = baseConfidence
      
    } else {
      // 🟢 绿色状态：可行且理想
      status = 'good'
      // 推荐天数等于当前天数
      recommendedDays = currentDays
      confidence = Math.min(0.95, baseConfidence + 0.1)
      reasons.unshift(`✅ 当前${currentDays}天的配置可以顺利完成排班，资源配置合理`)
    }
    
    // 确保推荐天数不小于当前天数（安全兜底）
    recommendedDays = Math.max(recommendedDays, currentDays)
    
    // 建议开始日期
    const recommendedStartDate = examDates[0]
    
    // 建议结束日期（基于推荐天数计算）
    const suggestedEndDate = this.addWorkingDays(
      recommendedStartDate,
      recommendedDays - 1,
      false // 不考虑周末，因为返回的已经是工作日
    )
    
    return {
      recommendedStartDate,
      recommendedEndDate: suggestedEndDate,
      minRequiredDays: maxRequiredDays,
      suggestedDays: recommendedDays,
      confidence,
      reasons,
      departmentSpecificRequirements: deptRequirements,
      status
    }
  }
  
  /**
   * 添加工作日到日期
   */
  private addWorkingDays(startDate: Date, days: number, allowWeekend: boolean): Date {
    const result = new Date(startDate)
    let addedDays = 0
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1)
      const dayOfWeek = result.getDay()
      
      // 0=周日, 6=周六
      if (allowWeekend || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        addedDays++
      }
    }
    
    return result
  }
  
  /**
   * 创建空的日期推荐
   */
  private createEmptyRecommendation(): DateRangeRecommendation {
    return {
      recommendedStartDate: new Date(),
      recommendedEndDate: new Date(),
      minRequiredDays: 0,
      suggestedDays: 0,
      confidence: 0,
      reasons: ['无可用的考试日期'],
      departmentSpecificRequirements: new Map(),
      status: 'insufficient'  // 无日期时为红色状态
    }
  }
  
  /**
   * 计算日期推荐置信度
   */
  private calculateDateRecommendationConfidence(
    bottlenecks: BottleneckAnalysis[],
    recommendedDays: number,
    availableDays: number
  ): number {
    let confidence = 0.9
    
    // 根据瓶颈调整置信度
    const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length
    const highCount = bottlenecks.filter(b => b.severity === 'high').length
    
    confidence -= criticalCount * 0.3
    confidence -= highCount * 0.15
    
    // 根据推荐天数与可用天数的比例调整
    if (recommendedDays > availableDays * 0.9) {
      confidence -= 0.1
    }
    
    return Math.max(0, Math.min(1, confidence))
  }
  
  /**
   * 约束预检查
   */
  private performConstraintPreCheck(
    input: AssessmentInput,
    availabilityMap: Map<string, ExaminerAvailability>,
    bottlenecks: BottleneckAnalysis[]
  ): AssessmentIssue[] {
    const issues: AssessmentIssue[] = []
    
    // HC1: 周末约束检查
    const weekendDates = input.examDates.filter(d => {
      const day = d.getDay()
      return day === 0 || day === 6
    })
    
    if (weekendDates.length > 0) {
      const weekendAvailableCount = Array.from(availabilityMap.values())
        .filter(ea => ea.isAvailableOnWeekend).length
      
      if (weekendAvailableCount === 0 && weekendDates.length > 0) {
        issues.push({
          id: 'HC1-001',
          type: 'constraint',
          severity: 'critical',
          message: '选择的工作日包含周末，但没有可用考官（行政班考官周末不可用）',
          details: { weekendDates, weekendAvailableCount },
          autoResolvable: false,
          suggestedFix: '移除周末日期或添加非行政班考官'
        })
      }
    }
    
    // HC2/HC7: 部门资源检查
    for (const bottleneck of bottlenecks) {
      if (bottleneck.availableExaminerCount === 0) {
        issues.push({
          id: 'HC2-001',
          type: 'resource',
          severity: 'critical',
          department: bottleneck.department,
          message: `部门"${bottleneck.department}"没有可用考官`,
          details: {
            department: bottleneck.department,
            studentCount: bottleneck.studentCount,
            totalExamsNeeded: bottleneck.totalExamsNeeded
          },
          autoResolvable: false,
          suggestedFix: `为${bottleneck.department}添加可用考官或调整学生分配`
        })
      } else if (bottleneck.utilizationRate > 1) {
        issues.push({
          id: 'CAP-001',
          type: 'capacity',
          severity: 'critical',
          department: bottleneck.department,
          message: `部门"${bottleneck.department}"容量不足（需要${bottleneck.totalExamsNeeded}场，实际容量${bottleneck.actualAvailableCapacity}场）`,
          details: {
            department: bottleneck.department,
            required: bottleneck.totalExamsNeeded,
            available: bottleneck.actualAvailableCapacity,
            deficit: bottleneck.deficit
          },
          autoResolvable: false,
          suggestedFix: `增加${bottleneck.department}的考官数量或延长日期范围`
        })
      }
    }
    
    // 检查是否有任何考官可用
    const totalAvailableExaminers = Array.from(availabilityMap.values())
      .filter(ea => ea.availableCount > 0).length
    
    if (totalAvailableExaminers === 0) {
      issues.push({
        id: 'RES-001',
        type: 'resource',
        severity: 'critical',
        message: '当前配置中没有可用考官',
        details: { totalExaminers: input.teachers.length },
        autoResolvable: false,
        suggestedFix: '检查考官不可用日期配置，或添加更多考官'
      })
    }
    
    return issues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }
  
  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(
    input: AssessmentInput,
    bottlenecks: BottleneckAnalysis[],
    issues: AssessmentIssue[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    let priority = 1
    
    // 针对关键瓶颈的建议
    for (const bottleneck of bottlenecks.filter(b => b.isBottleneck)) {
      if (bottleneck.availableExaminerCount === 0) {
        suggestions.push({
          id: `SUG-${priority}`,
          priority: priority++,
          category: 'resource',
          title: `为${bottleneck.department}添加考官`,
          description: `部门"${bottleneck.department}"有${bottleneck.studentCount}名学生但没有可用考官`,
          expectedImpact: '解决硬约束违反，使排班可行',
          implementationSteps: [
            `检查${bottleneck.department}考官的不可用日期配置`,
            '确认是否有考官可以调整不可用期',
            '考虑从其他部门调配考官（如果允许）'
          ]
        })
      } else if (bottleneck.utilizationRate > 0.9) {
        suggestions.push({
          id: `SUG-${priority}`,
          priority: priority++,
          category: 'date_range',
          title: `延长${bottleneck.department}的考试日期范围`,
          description: `部门"${bottleneck.department}"利用率过高（${(bottleneck.utilizationRate * 100).toFixed(1)}%）`,
          expectedImpact: '降低容量压力，提高排班成功率',
          implementationSteps: [
            `当前需要${bottleneck.requiredDays}个工作日`,
            `建议至少安排${Math.ceil(bottleneck.requiredDays * 1.3)}个工作日`,
            '优先安排在考官可用性高的日期'
          ]
        })
      }
    }
    
    // 通用建议
    const criticalIssues = issues.filter(i => i.severity === 'critical')
    if (criticalIssues.length === 0) {
      suggestions.push({
        id: `SUG-${priority}`,
        priority: priority++,
        category: 'config',
        title: '当前配置良好',
        description: '资源充足，可以顺利进行排班',
        expectedImpact: '排班成功率高'
      })
    }
    
    return suggestions
  }
  
  /**
   * 综合可行性判断
   */
  private determineFeasibility(
    bottlenecks: BottleneckAnalysis[],
    issues: AssessmentIssue[],
    capacityAnalysis: { totalExamsNeeded: number; totalActualCapacity: number }
  ): boolean {
    // 检查关键问题
    const hasCriticalIssues = issues.some(i => i.severity === 'critical')
    if (hasCriticalIssues) return false
    
    // 检查关键瓶颈
    const hasCriticalBottlenecks = bottlenecks.some(b => b.severity === 'critical')
    if (hasCriticalBottlenecks) return false
    
    // 检查总体容量
    if (capacityAnalysis.totalExamsNeeded > capacityAnalysis.totalActualCapacity * 1.1) {
      return false // 总需求超过总容量的110%
    }
    
    return true
  }
  
  /**
   * 计算总体置信度
   */
  private calculateOverallConfidence(
    bottlenecks: BottleneckAnalysis[],
    issues: AssessmentIssue[]
  ): number {
    let confidence = 0.95
    
    // 根据瓶颈调整
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical').length
    const highBottlenecks = bottlenecks.filter(b => b.severity === 'high').length
    
    confidence -= criticalBottlenecks * 0.3
    confidence -= highBottlenecks * 0.1
    
    // 根据问题调整
    const criticalIssues = issues.filter(i => i.severity === 'critical').length
    confidence -= criticalIssues * 0.25
    
    return Math.max(0, Math.min(1, confidence))
  }
  
  // ============================================================================
  // 辅助方法
  // ============================================================================
  
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }
  
  private isSameDay(date1: Date, date2: Date): boolean {
    return this.formatDate(date1) === this.formatDate(date2)
  }
}

// ============================================================================
// 导出实例
// ============================================================================

export const optimizedAssessmentService = new OptimizedAssessmentService()

// 导出类型
export type {
  OptimizedAssessmentResult as OptimizedAssessmentResultType,
  BottleneckAnalysis as BottleneckAnalysisType,
  DateRangeRecommendation as DateRangeRecommendationType
}
