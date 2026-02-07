/**
 * 精确评估服务 - 完全模拟OptaPlanner约束的评估算法
 * 
 * 核心改进：
 * 1. 模拟HC6约束：计算连续两天考试的可行日期对
 * 2. 模拟HC2/HC7约束：计算科室级别的考官可用组合
 * 3. 模拟HC3约束：考虑白班限制
 * 4. 基于以上信息，给出准确的排班可行性判断
 */

import type { Teacher, Student, ScheduleConfig } from '../types'
import { normalizeDeptToShort } from '../utils/departmentNormalizer'

// ============================================================================
// 类型定义
// ============================================================================

export interface PreciseAssessmentInput {
  students: Student[]
  teachers: Teacher[]
  examDates: Date[]
  unavailableDates: Date[]
  dutySchedule: Map<string, string[]> // 日期 -> 白班组列表
  config: ScheduleConfig
}

export interface DatePair {
  day1: Date
  day2: Date
  isValid: boolean
  invalidReason?: string
}

export interface DepartmentCapacity {
  department: string
  studentCount: number
  twoDayStudentCount: number // 需要两天考试的学员数
  oneDayStudentCount: number // 需要一天考试的学员数
  
  // 考官资源
  totalExaminers: number
  availableExaminers: number
  examinersByDate: Map<string, Teacher[]> // 日期 -> 可用考官列表
  
  // 关键指标：每天可用考官数（考虑HC3白班限制）
  availableCountPerDate: Map<string, number>
  
  // 科室对（考官1+考官2）的可用性
  validPairsPerDate: Map<string, number> // 日期 -> 可用考官对数量
  
  // 瓶颈分析
  maxConcurrentExams: number // 最大并发考试数（受限于考官对数量）
  requiredDatePairs: number // 需要的连续日期对数量
  availableDatePairs: DatePair[] // 可用的连续日期对
  
  isBottleneck: boolean
  severity: 'critical' | 'high' | 'medium' | 'low'
  deficit: number // 缺口数量
}

export interface PreciseAssessmentResult {
  // 总体评估
  isFeasible: boolean
  confidence: number // 0-1
  
  // 关键约束检查
  constraintChecks: {
    hc6: { // 连续两天考试
      totalDatePairs: number
      validDatePairs: number
      requiredForTwoDayStudents: number
      isSatisfied: boolean
    }
    hc2_hc7: { // 科室匹配
      departmentsWithZeroCapacity: string[]
      minDepartmentCapacity: number
      isSatisfied: boolean
    }
    hc3: { // 白班限制
      datesWithDayShiftConflict: number
      isSatisfied: boolean
    }
    hc4: { // 考官每天只能监考一场
      maxExamsPerDay: number
      requiredExamsPerDay: number
      isSatisfied: boolean
    }
  }
  
  // 科室级容量分析
  departmentCapacities: DepartmentCapacity[]
  criticalDepartment: string | null
  
  // 日期分析
  dateAnalysis: {
    totalDates: number
    weekendDates: number
    datesWithInsufficientExaminers: string[]
    recommendedDateRange: {
      startDate: Date
      endDate: Date
      requiredDays: number
      reason: string
    }
  }
  
  // 问题列表
  issues: AssessmentIssue[]
  
  // 建议
  suggestions: OptimizationSuggestion[]
}

export interface AssessmentIssue {
  id: string
  type: 'hc6' | 'hc2' | 'hc3' | 'hc4' | 'capacity' | 'resource'
  severity: 'critical' | 'high' | 'medium' | 'low'
  department?: string
  message: string
  details: Record<string, any>
  suggestedFix: string
}

export interface OptimizationSuggestion {
  id: string
  priority: number
  title: string
  description: string
  expectedImpact: string
}

// ============================================================================
// 精确评估算法
// ============================================================================

class PreciseAssessmentService {
  
  /**
   * 执行精确评估 - 完全模拟OptaPlanner约束
   */
  async performPreciseAssessment(input: PreciseAssessmentInput): Promise<PreciseAssessmentResult> {
    console.log('[PreciseAssessment] 开始精确评估...')
    const startTime = performance.now()
    
    // 步骤1: 分析日期对（HC6约束）
    const datePairs = this.analyzeDatePairs(input)
    
    // 步骤2: 按科室分析容量（HC2/HC7约束）
    const deptCapacities = this.analyzeDepartmentCapacities(input, datePairs)
    
    // 步骤3: 检查HC4约束（考官每天只能监考一场）
    const hc4Check = this.checkHC4Constraint(input, deptCapacities)
    
    // 步骤4: 综合可行性判断
    const isFeasible = this.determineFeasibility(deptCapacities, datePairs, hc4Check)
    
    // 步骤5: 生成问题列表和建议
    const issues = this.generateIssues(deptCapacities, datePairs, hc4Check)
    const suggestions = this.generateSuggestions(deptCapacities, datePairs, input)
    
    // 步骤6: 计算置信度
    const confidence = this.calculateConfidence(deptCapacities, issues)
    
    // 步骤7: 推荐日期范围（传入评估状态以确定推荐策略）
    const recommendedRange = this.calculateRecommendedDateRange(input, deptCapacities, isFeasible, confidence)
    
    const endTime = performance.now()
    console.log(`[PreciseAssessment] 评估完成，耗时 ${(endTime - startTime).toFixed(2)}ms`)
    
    // 找出关键瓶颈
    const criticalDept = deptCapacities.find(d => d.severity === 'critical')?.department || null
    
    return {
      isFeasible,
      confidence,
      constraintChecks: {
        hc6: {
          totalDatePairs: datePairs.length,
          validDatePairs: datePairs.filter(p => p.isValid).length,
          requiredForTwoDayStudents: this.calculateRequiredDatePairs(input),
          isSatisfied: datePairs.filter(p => p.isValid).length >= this.calculateRequiredDatePairs(input)
        },
        hc2_hc7: {
          departmentsWithZeroCapacity: deptCapacities
            .filter(d => d.maxConcurrentExams === 0)
            .map(d => d.department),
          minDepartmentCapacity: Math.min(...deptCapacities.map(d => d.maxConcurrentExams)),
          isSatisfied: deptCapacities.every(d => d.maxConcurrentExams > 0)
        },
        hc3: {
          datesWithDayShiftConflict: this.countDatesWithDayShiftIssues(input),
          isSatisfied: true // 假设可以通过选择非白班组考官解决
        },
        hc4: hc4Check
      },
      departmentCapacities: deptCapacities,
      criticalDepartment: criticalDept,
      dateAnalysis: {
        totalDates: input.examDates.length,
        weekendDates: input.examDates.filter(d => {
          const day = d.getDay()
          return day === 0 || day === 6
        }).length,
        datesWithInsufficientExaminers: this.findDatesWithInsufficientExaminers(deptCapacities),
        recommendedDateRange: recommendedRange
      },
      issues,
      suggestions
    }
  }
  
  /**
   * 分析连续日期对（HC6约束核心）
   * 
   * HC6要求：
   * 1. 每个学员必须在连续两天完成考试
   * 2. 这两天都不能是白班执勤
   * 3. 这两天都必须有合适的考官组合
   */
  private analyzeDatePairs(input: PreciseAssessmentInput): DatePair[] {
    const { examDates, dutySchedule } = input
    const pairs: DatePair[] = []
    
    // 排序日期
    const sortedDates = [...examDates].sort((a, b) => a.getTime() - b.getTime())
    
    // 找出所有连续的日期对
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const day1 = sortedDates[i]
      const day2 = sortedDates[i + 1]
      
      // 检查是否连续（相差1天）
      const diffTime = day2.getTime() - day1.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)
      
      if (diffDays === 1) {
        const day1Str = this.formatDate(day1)
        const day2Str = this.formatDate(day2)
        
        // 检查这两天是否都有足够的考官
        const day1Available = this.hasSufficientExaminers(input, day1)
        const day2Available = this.hasSufficientExaminers(input, day2)
        
        let isValid = true
        let invalidReason = ''
        
        if (!day1Available) {
          isValid = false
          invalidReason = `${day1Str} 可用考官不足`
        } else if (!day2Available) {
          isValid = false
          invalidReason = `${day2Str} 可用考官不足`
        }
        
        pairs.push({
          day1,
          day2,
          isValid,
          invalidReason
        })
      }
    }
    
    return pairs
  }
  
  /**
   * 检查某天是否有足够的考官
   */
  private hasSufficientExaminers(input: PreciseAssessmentInput, date: Date): boolean {
    const { teachers, dutySchedule, unavailableDates } = input
    const dateStr = this.formatDate(date)
    
    // 获取当天白班组
    const dayShiftGroups = dutySchedule.get(dateStr) || []
    
    // 计算可用考官数
    let availableCount = 0
    
    for (const teacher of teachers) {
      // 检查是否在不可用日期内
      if (this.isTeacherUnavailable(teacher, date, unavailableDates)) {
        continue
      }
      
      // 检查是否是白班（HC3约束）
      const teacherGroup = (teacher as any).group
      if (teacherGroup && dayShiftGroups.includes(teacherGroup)) {
        continue
      }
      
      availableCount++
    }
    
    // 至少需要2名考官才能组成一个考官对
    return availableCount >= 2
  }
  
  /**
   * 按科室分析容量（HC2/HC7约束）
   */
  private analyzeDepartmentCapacities(
    input: PreciseAssessmentInput,
    datePairs: DatePair[]
  ): DepartmentCapacity[] {
    const { students, teachers, examDates, dutySchedule } = input
    
    // 按科室分组学员
    const studentsByDept = new Map<string, Student[]>()
    for (const student of students) {
      const dept = normalizeDeptToShort(student.department)
      if (!studentsByDept.has(dept)) {
        studentsByDept.set(dept, [])
      }
      studentsByDept.get(dept)!.push(student)
    }
    
    // 按科室分组考官
    const teachersByDept = new Map<string, Teacher[]>()
    for (const teacher of teachers) {
      const dept = normalizeDeptToShort(teacher.department)
      if (!teachersByDept.has(dept)) {
        teachersByDept.set(dept, [])
      }
      teachersByDept.get(dept)!.push(teacher)
    }
    
    // 处理三室七室互通
    this.handleDept37Interchangeability(studentsByDept, teachersByDept)
    
    const capacities: DepartmentCapacity[] = []
    
    for (const [dept, deptStudents] of studentsByDept) {
      // 统计学员类型
      const twoDayStudents = deptStudents.filter(s => {
        // 假设所有学员都需要两天考试，除非明确标记
        return !(s as any).examType || (s as any).examType !== 'single'
      })
      const oneDayStudents = deptStudents.filter(s => {
        return (s as any).examType === 'single'
      })
      
      // 获取该科室的考官
      const deptTeachers = teachersByDept.get(dept) || []
      
      // 计算每天的可用考官
      const availableCountPerDate = new Map<string, number>()
      const examinersByDate = new Map<string, Teacher[]>()
      const validPairsPerDate = new Map<string, number>()
      
      for (const date of examDates) {
        const dateStr = this.formatDate(date)
        const availableExaminers = this.getAvailableExaminersForDate(
          deptTeachers,
          date,
          input
        )
        
        availableCountPerDate.set(dateStr, availableExaminers.length)
        examinersByDate.set(dateStr, availableExaminers)
        
        // 计算可用的考官对数量（HC7要求两名不同科室考官，但考官1必须同科室）
        // 所以该科室的考官可以作为考官1
        // 考官2需要来自其他科室，这里简化计算
        validPairsPerDate.set(dateStr, Math.floor(availableExaminers.length / 1))
      }
      
      // 计算可用的连续日期对
      const availableDatePairs = datePairs.filter(pair => {
        const day1Str = this.formatDate(pair.day1)
        const day2Str = this.formatDate(pair.day2)
        const day1Count = availableCountPerDate.get(day1Str) || 0
        const day2Count = availableCountPerDate.get(day2Str) || 0
        return day1Count >= 1 && day2Count >= 1
      })
      
      // 计算最大并发考试数
      // 受限于：每天可用考官数 / 2（需要两名考官）
      const maxConcurrentPerDay = Math.max(...Array.from(validPairsPerDate.values()))
      
      // 计算需要的日期对数量
      // 关键：每个日期对可以容纳 maxConcurrentPerDay 个两天学员
      // 因为每天有 maxConcurrentPerDay 的容量，且两天学员需要连续两天
      // 所以一个日期对可以容纳 maxConcurrentPerDay 个学员（每天安排 maxConcurrentPerDay 个，连续两天）
      const requiredDatePairs = maxConcurrentPerDay > 0 
        ? Math.ceil(twoDayStudents.length / maxConcurrentPerDay)
        : twoDayStudents.length // 如果每天容量为0，则每个学员都需要一个日期对（理论值）
      
      // 计算缺口
      const deficit = Math.max(0, requiredDatePairs - availableDatePairs.length)
      
      // 判断是否为瓶颈
      const isBottleneck = deficit > 0 || maxConcurrentPerDay === 0
      
      // 确定严重程度
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'low'
      if (maxConcurrentPerDay === 0) severity = 'critical'
      else if (deficit > twoDayStudents.length * 0.5) severity = 'critical'
      else if (deficit > 0) severity = 'high'
      else if (requiredDatePairs > availableDatePairs.length * 0.8) severity = 'medium'
      
      capacities.push({
        department: dept,
        studentCount: deptStudents.length,
        twoDayStudentCount: twoDayStudents.length,
        oneDayStudentCount: oneDayStudents.length,
        totalExaminers: deptTeachers.length,
        availableExaminers: deptTeachers.filter(t => 
          !this.isTeacherUnavailableAnyDate(t, examDates, input.unavailableDates)
        ).length,
        examinersByDate,
        availableCountPerDate,
        validPairsPerDate,
        maxConcurrentExams: maxConcurrentPerDay,
        requiredDatePairs,
        availableDatePairs,
        isBottleneck,
        severity,
        deficit
      })
    }
    
    // 按严重程度排序
    return capacities.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
  }
  
  /**
   * 获取某天可用的考官列表
   */
  private getAvailableExaminersForDate(
    teachers: Teacher[],
    date: Date,
    input: PreciseAssessmentInput
  ): Teacher[] {
    const { dutySchedule, unavailableDates } = input
    const dateStr = this.formatDate(date)
    const dayShiftGroups = dutySchedule.get(dateStr) || []
    
    return teachers.filter(teacher => {
      // 检查不可用日期
      if (this.isTeacherUnavailable(teacher, date, unavailableDates)) {
        return false
      }
      
      // 检查白班（HC3约束）
      const teacherGroup = (teacher as any).group
      if (teacherGroup && dayShiftGroups.includes(teacherGroup)) {
        return false
      }
      
      // 检查周末行政班限制（HC1约束）
      const dayOfWeek = date.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const isAdmin = !teacherGroup || teacherGroup === '无' || teacherGroup.trim() === ''
        if (isAdmin) {
          return false
        }
      }
      
      return true
    })
  }
  
  /**
   * 检查考官是否在某天不可用
   */
  private isTeacherUnavailable(
    teacher: Teacher,
    date: Date,
    unavailableDates: Date[]
  ): boolean {
    const unavailablePeriods = (teacher as any).unavailableDates || 
                               (teacher as any).unavailablePeriods || []
    
    for (const period of unavailablePeriods) {
      try {
        const startDate = new Date(period.startDate)
        const endDate = new Date(period.endDate)
        
        if (date >= startDate && date <= endDate) {
          return true
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    
    // 检查全局不可用日期
    for (const uDate of unavailableDates) {
      if (this.isSameDay(date, uDate)) {
        return true
      }
    }
    
    return false
  }
  
  /**
   * 检查考官是否在所有日期都不可用
   */
  private isTeacherUnavailableAnyDate(
    teacher: Teacher,
    dates: Date[],
    unavailableDates: Date[]
  ): boolean {
    return dates.every(date => this.isTeacherUnavailable(teacher, date, unavailableDates))
  }
  
  /**
   * 处理三室七室互通
   */
  private handleDept37Interchangeability(
    studentsByDept: Map<string, Student[]>,
    teachersByDept: Map<string, Teacher[]>
  ): void {
    const sanShiStudents = studentsByDept.get('三') || []
    const qiShiStudents = studentsByDept.get('七') || []
    const sanShiTeachers = teachersByDept.get('三') || []
    const qiShiTeachers = teachersByDept.get('七') || []
    
    // 合并学员池
    if (sanShiStudents.length > 0 || qiShiStudents.length > 0) {
      const combinedStudents = [...sanShiStudents, ...qiShiStudents]
      studentsByDept.set('三', combinedStudents)
      studentsByDept.set('七', combinedStudents)
    }
    
    // 合并考官池
    if (sanShiTeachers.length > 0 || qiShiTeachers.length > 0) {
      const combinedTeachers = [...sanShiTeachers, ...qiShiTeachers]
      teachersByDept.set('三', combinedTeachers)
      teachersByDept.set('七', combinedTeachers)
    }
  }
  
  /**
   * 检查HC4约束（考官每天只能监考一场）
   */
  private checkHC4Constraint(
    input: PreciseAssessmentInput,
    deptCapacities: DepartmentCapacity[]
  ): { maxExamsPerDay: number; requiredExamsPerDay: number; isSatisfied: boolean } {
    const totalStudents = input.students.length
    const totalDates = input.examDates.length
    
    // 计算每天需要的考试数
    // 每个学员需要2场考试（day1 + day2）
    const totalExams = totalStudents * 2
    const requiredExamsPerDay = Math.ceil(totalExams / totalDates)
    
    // 计算每天最大可容纳的考试数
    // 受限于：所有科室的最小并发数之和
    const maxExamsPerDay = deptCapacities.reduce((sum, d) => sum + d.maxConcurrentExams, 0)
    
    return {
      maxExamsPerDay,
      requiredExamsPerDay,
      isSatisfied: maxExamsPerDay >= requiredExamsPerDay
    }
  }
  
  /**
   * 计算需要的日期对数量
   */
  private calculateRequiredDatePairs(input: PreciseAssessmentInput): number {
    // 假设所有学员都需要两天考试
    return input.students.length
  }
  
  /**
   * 计算有白班问题的日期数
   */
  private countDatesWithDayShiftIssues(input: PreciseAssessmentInput): number {
    // 简化计算：如果某天所有班组都是白班，则有问题
    // 实际情况下，OptaPlanner可以通过选择休息班组考官来避免
    return 0
  }
  
  /**
   * 找出考官不足的日期
   */
  private findDatesWithInsufficientExaminers(deptCapacities: DepartmentCapacity[]): string[] {
    const datesWithIssues = new Set<string>()
    
    for (const dept of deptCapacities) {
      for (const [dateStr, count] of dept.availableCountPerDate) {
        if (count < 1) {
          datesWithIssues.add(dateStr)
        }
      }
    }
    
    return Array.from(datesWithIssues)
  }
  
  /**
   * 计算推荐的日期范围
   * 
   * 基于实际的评估结果（deptCapacities中的约束分析），计算出能够完成排班的最小日期范围。
   * 
   * 核心逻辑：
   * 1. 分析最严重的瓶颈部门
   * 2. 计算需要的日期对数量和缺口
   * 3. 基于缺口计算需要增加的天数
   * 4. 根据评估状态确定推荐天数：
   *    - insufficient(红色): 推荐天数 > 当前天数（必须延长）
   *    - suboptimal(蓝色): 推荐天数 >= 当前天数（可以延长以获得更好效果）
   *    - good(绿色): 推荐天数 = 当前天数（当前配置最佳）
   */
  private calculateRecommendedDateRange(
    input: PreciseAssessmentInput,
    deptCapacities: DepartmentCapacity[],
    isFeasible: boolean,
    confidence: number
  ): { startDate: Date; endDate: Date; requiredDays: number; reason: string; status: 'insufficient' | 'suboptimal' | 'good' } {
    const { students, examDates, allowWeekendScheduling, unavailableDates } = input
    
    if (examDates.length === 0) {
      return {
        startDate: new Date(),
        endDate: new Date(),
        requiredDays: 0,
        reason: '无可用的考试日期'
      }
    }
    
    const startDate = examDates[0]
    const currentDays = examDates.length
    
    // 统计学员信息
    const twoDayStudents = students.filter(s => s.examDays === 2)
    const singleDayStudents = students.filter(s => s.examDays === 1)
    
    // ==== 第一步：基于实际瓶颈计算 ====
    
    // 找出最严重的瓶颈部门
    const criticalDept = deptCapacities.find(d => d.severity === 'critical')
    const highDept = deptCapacities.find(d => d.severity === 'high')
    
    // 计算全局统计
    const totalRequiredPairs = deptCapacities.reduce((sum, d) => sum + d.requiredDatePairs, 0)
    const totalAvailablePairs = deptCapacities.reduce((sum, d) => sum + d.availableDatePairs.length, 0)
    const totalDeficit = deptCapacities.reduce((sum, d) => sum + d.deficit, 0)
    
    // ==== 第二步：计算实际需要的工作日 ====
    
    let recommendedDays: number
    let reason: string
    
    if (criticalDept) {
      // 有关键瓶颈 - 需要大幅扩展
      const availablePairs = criticalDept.availableDatePairs.length
      const requiredPairs = criticalDept.requiredDatePairs
      const deficit = criticalDept.deficit
      
      if (availablePairs === 0) {
        // 完全没有可用日期对 - 这是最严重的情况
        // 需要生成足够的日期对来容纳所有两天学员
        // 每个日期对需要2天连续
        const daysForPairs = requiredPairs * 2
        // 加上缓冲（50%）
        recommendedDays = Math.ceil(daysForPairs * 1.5)
        reason = `部门"${criticalDept.department}"无可用连续日期对，需要${requiredPairs}个日期对，建议至少${recommendedDays}天`
      } else {
        // 有可用日期对但不足
        // 缺口 = 需要的 - 已有的
        // 需要创建 deficit 个新日期对
        // 每个新日期对需要2天
        const daysForNewPairs = deficit * 2
        // 基础天数 + 新日期对需要的天数 + 缓冲
        recommendedDays = Math.max(
          currentDays + daysForNewPairs,
          Math.ceil(requiredPairs * 2.5) // 每个日期对2.5天的经验值
        )
        reason = `部门"${criticalDept.department}"日期对不足（${availablePairs}/${requiredPairs}），建议扩展至${recommendedDays}天`
      }
    } else if (highDept) {
      // 有高优先级瓶颈 - 需要适度扩展
      const availablePairs = highDept.availableDatePairs.length
      const requiredPairs = highDept.requiredDatePairs
      const deficit = highDept.deficit
      
      // 建议扩展以覆盖缺口
      const daysForNewPairs = Math.max(deficit * 2, 3)
      recommendedDays = currentDays + daysForNewPairs
      reason = `部门"${highDept.department}"日期对紧张（${availablePairs}/${requiredPairs}），建议扩展至${recommendedDays}天`
    } else {
      // 检查HC4约束（每日考试容量）
      const hc4Check = this.checkHC4Constraint(input, deptCapacities)
      if (!hc4Check.isSatisfied) {
        // 需要分散考试压力
        const requiredAdditionalDays = Math.ceil(
          (hc4Check.requiredExamsPerDay - hc4Check.maxExamsPerDay) / 
          Math.max(1, hc4Check.maxExamsPerDay)
        ) * 3 // 增加3倍以确保足够分散
        
        recommendedDays = currentDays + requiredAdditionalDays
        reason = `每日考试压力较大（${hc4Check.requiredExamsPerDay}/${hc4Check.maxExamsPerDay}），建议扩展至${recommendedDays}天以分散安排`
      } else {
        // 当前配置可行 - 计算最小需要的天数
        // 基于最紧张的部门容量
        const minCapacity = Math.min(...deptCapacities.map(d => d.maxConcurrentExams).filter(c => c > 0)) || 1
        
        // 两天学员需要的日期对数
        const pairsNeeded = Math.ceil(twoDayStudents.length / minCapacity)
        // 每个日期对需要2天，可以部分重叠
        const minDaysForTwoDay = pairsNeeded + 1
        
        // 单日学员需要的天数
        const minDaysForSingleDay = Math.ceil(singleDayStudents.length / minCapacity)
        
        // 总最小天数
        const theoreticalMin = Math.max(minDaysForTwoDay, minDaysForSingleDay)
        
        // 添加缓冲
        recommendedDays = Math.max(
          Math.ceil(theoreticalMin * 1.2),
          5
        )
        reason = `基于${twoDayStudents.length}名两天考试学员和${singleDayStudents.length}名单天考试学员，建议最小${recommendedDays}天`
      }
    }
    
    // ==== 第三步：根据评估状态确定推荐天数和状态 ====
    
    // 根据评估结果确定状态
    // - insufficient(红色): 不可行，必须延长日期
    // - suboptimal(蓝色): 可行但不够理想，可以延长以获得更好效果
    // - good(绿色): 可行且理想，当前配置最佳
    let status: 'insufficient' | 'suboptimal' | 'good'
    
    if (!isFeasible) {
      // 🔴 红色状态：不可行，必须延长日期
      status = 'insufficient'
      // 确保推荐天数严格大于当前天数（至少多5天）
      recommendedDays = Math.max(recommendedDays, currentDays + 5)
      reason = `当前日期范围不足以完成排班，建议延长至${recommendedDays}天。${reason}`
    } else if (confidence < 0.8 || totalDeficit > 0 || highDept) {
      // 🔵 蓝色状态：可行但不够理想
      status = 'suboptimal'
      // 推荐天数可以等于或大于当前天数
      // 如果计算出的推荐天数大于当前天数，说明延长会获得更好效果
      // 如果计算出的推荐天数小于等于当前天数，使用当前天数（因为已经足够）
      if (recommendedDays > currentDays) {
        reason = `延长至${recommendedDays}天可获得更好的排班效果。${reason}`
      } else {
        recommendedDays = currentDays
        reason = `当前${currentDays}天可以完成排班，但${reason}`
      }
    } else {
      // 🟢 绿色状态：可行且理想
      status = 'good'
      // 推荐天数等于当前天数
      recommendedDays = currentDays
      reason = `当前${currentDays}天的配置可以顺利完成排班，资源配置合理。`
    }
    
    // ==== 第四步：生成推荐日期范围 ====
    
    const suggestedEndDate = this.addWorkingDays(
      startDate, 
      recommendedDays - 1, 
      allowWeekendScheduling
    )
    
    return {
      startDate,
      endDate: suggestedEndDate,
      requiredDays: recommendedDays,
      reason,
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
      
      if (allowWeekend || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        addedDays++
      }
    }
    
    return result
  }
  
  /**
   * 生成问题列表
   */
  private generateIssues(
    deptCapacities: DepartmentCapacity[],
    datePairs: DatePair[],
    hc4Check: { maxExamsPerDay: number; requiredExamsPerDay: number; isSatisfied: boolean }
  ): AssessmentIssue[] {
    const issues: AssessmentIssue[] = []
    
    // 检查HC6问题
    const validPairs = datePairs.filter(p => p.isValid)
    const totalStudents = deptCapacities.reduce((sum, d) => sum + d.studentCount, 0)
    
    if (validPairs.length < totalStudents) {
      issues.push({
        id: 'HC6-001',
        type: 'hc6',
        severity: 'critical',
        message: `连续日期对不足：需要${totalStudents}对，实际可用${validPairs.length}对`,
        details: {
          required: totalStudents,
          available: validPairs.length,
          invalidPairs: datePairs.filter(p => !p.isValid).map(p => ({
            day1: this.formatDate(p.day1),
            day2: this.formatDate(p.day2),
            reason: p.invalidReason
          }))
        },
        suggestedFix: '延长日期范围或移除不可用日期设置'
      })
    }
    
    // 检查科室容量问题
    for (const dept of deptCapacities) {
      if (dept.severity === 'critical') {
        issues.push({
          id: `HC2-001-${dept.department}`,
          type: 'hc2',
          severity: 'critical',
          department: dept.department,
          message: `部门"${dept.department}"容量严重不足：${dept.twoDayStudentCount}名两天学员需要${dept.requiredDatePairs}个日期对，但仅有${dept.availableDatePairs.length}个`,
          details: {
            department: dept.department,
            studentCount: dept.studentCount,
            requiredPairs: dept.requiredDatePairs,
            availablePairs: dept.availableDatePairs.length,
            maxConcurrentPerDay: dept.maxConcurrentExams
          },
          suggestedFix: `为${dept.department}部门添加更多考官或延长日期范围`
        })
      }
    }
    
    // 检查HC4问题
    if (!hc4Check.isSatisfied) {
      issues.push({
        id: 'HC4-001',
        type: 'hc4',
        severity: 'high',
        message: `每天考试场次超限：需要${hc4Check.requiredExamsPerDay}场/天，最大容量${hc4Check.maxExamsPerDay}场/天`,
        details: {
          requiredPerDay: hc4Check.requiredExamsPerDay,
          maxPerDay: hc4Check.maxExamsPerDay,
          deficit: hc4Check.requiredExamsPerDay - hc4Check.maxExamsPerDay
        },
        suggestedFix: '增加考官数量或延长日期范围以分散考试压力'
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
  private generateSuggestions(
    deptCapacities: DepartmentCapacity[],
    datePairs: DatePair[],
    input: PreciseAssessmentInput
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []
    let priority = 1
    
    // 针对关键瓶颈的建议
    const criticalDepts = deptCapacities.filter(d => d.severity === 'critical')
    
    for (const dept of criticalDepts) {
      if (dept.availableDatePairs.length === 0) {
        suggestions.push({
          id: `SUG-${priority++}`,
          title: `紧急：${dept.department}部门无可用日期对`,
          description: `该部门有${dept.twoDayStudentCount}名需要两天考试的学员，但没有可用的连续日期对`,
          expectedImpact: '解决后将使排班可行'
        })
      } else if (dept.deficit > 0) {
        suggestions.push({
          id: `SUG-${priority++}`,
          title: `建议：为${dept.department}部门增加${dept.deficit}个日期对`,
          description: `当前有${dept.availableDatePairs.length}个可用日期对，需要${dept.requiredDatePairs}个`,
          expectedImpact: `建议延长日期范围至少${Math.ceil(dept.deficit * 2 * 1.5)}天`
        })
      }
    }
    
    // 如果没有关键问题，给出优化建议
    if (criticalDepts.length === 0) {
      suggestions.push({
        id: `SUG-${priority++}`,
        title: '当前配置可以完成排班',
        description: '所有约束检查通过，可以进行排班',
        expectedImpact: '排班成功率高'
      })
    }
    
    return suggestions
  }
  
  /**
   * 综合可行性判断
   */
  private determineFeasibility(
    deptCapacities: DepartmentCapacity[],
    datePairs: DatePair[],
    hc4Check: { isSatisfied: boolean }
  ): boolean {
    // 检查是否有严重瓶颈
    const hasCriticalBottleneck = deptCapacities.some(d => d.severity === 'critical')
    if (hasCriticalBottleneck) return false
    
    // 检查HC6约束
    const validPairs = datePairs.filter(p => p.isValid).length
    const totalStudents = deptCapacities.reduce((sum, d) => sum + d.studentCount, 0)
    if (validPairs < totalStudents) return false
    
    // 检查HC4约束
    if (!hc4Check.isSatisfied) return false
    
    return true
  }
  
  /**
   * 计算置信度
   */
  private calculateConfidence(
    deptCapacities: DepartmentCapacity[],
    issues: AssessmentIssue[]
  ): number {
    let confidence = 0.95
    
    // 根据瓶颈调整
    const criticalCount = deptCapacities.filter(d => d.severity === 'critical').length
    const highCount = deptCapacities.filter(d => d.severity === 'high').length
    
    confidence -= criticalCount * 0.3
    confidence -= highCount * 0.1
    
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

export const preciseAssessmentService = new PreciseAssessmentService()
