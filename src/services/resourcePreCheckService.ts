/**
 * 资源预检与可行性分析服务
 * 实现文档中要求的资源充足性检查和冲突预判机制
 */

import { dutyRotationService, type DutySchedule } from './dutyRotationService'

export interface ResourceCapacity {
  department: string
  teachers: number
  students: number
  ratio: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  availableTeachers: number // 考虑班组限制后的可用考官数
}

export interface DateCapacity {
  date: string
  availableTeachers: number
  scheduledExams: number
  buffer: number
  utilizationRate: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface ConflictPrediction {
  type: 'same_dept_conflict' | 'group_rotation_conflict' | 'resource_shortage'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  affectedEntities: string[]
  suggestion: string
  date?: string
  department?: string
}

export interface ResourceReport {
  departmentCapacity: ResourceCapacity[]
  dateCapacity: DateCapacity[]
  conflictPredictions: ConflictPrediction[]
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  recommendations: string[]
  feasibilityScore: number // 0-100分
}

export interface OptimizationSuggestion {
  type: 'date_adjustment' | 'resource_reallocation' | 'constraint_relaxation'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  expectedImprovement: number
  implementation: string
}

export class ResourcePreCheckService {
  private readonly RISK_THRESHOLDS = {
    RATIO_HIGH: 2.5, // 学员/考官比例超过2.5为高风险
    RATIO_MEDIUM: 1.8, // 超过1.8为中风险
    UTILIZATION_HIGH: 0.85, // 资源利用率超过85%为高风险
    UTILIZATION_MEDIUM: 0.7, // 超过70%为中风险
    BUFFER_MINIMUM: 0.15, // 最小缓冲比例15%
  }

  /**
   * 执行全面的资源预检
   */
  async performPreCheck(
    students: any[],
    teachers: any[],
    examDates: string[]
  ): Promise<ResourceReport> {
    process.env.NODE_ENV === 'development' && console.log('🔍 开始资源预检分析...')

    // 1. 部门容量分析
    const departmentCapacity = this.analyzeDepartmentCapacity(students, teachers, examDates)

    // 2. 日期容量分析
    const dateCapacity = this.analyzeDateCapacity(students, teachers, examDates)

    // 3. 冲突预判
    const conflictPredictions = this.predictConflicts(students, teachers, examDates)

    // 4. 计算整体风险等级
    const overallRiskLevel = this.calculateOverallRisk(
      departmentCapacity,
      dateCapacity,
      conflictPredictions
    )

    // 5. 生成建议
    const recommendations = this.generateRecommendations(
      departmentCapacity,
      dateCapacity,
      conflictPredictions
    )

    // 6. 计算可行性评分
    const feasibilityScore = this.calculateFeasibilityScore(
      departmentCapacity,
      dateCapacity,
      conflictPredictions
    )

    const report: ResourceReport = {
      departmentCapacity,
      dateCapacity,
      conflictPredictions,
      overallRiskLevel,
      recommendations,
      feasibilityScore,
    }

    process.env.NODE_ENV === 'development' && console.log(
      `📊 资源预检完成，可行性评分: ${feasibilityScore}/100，风险等级: ${overallRiskLevel}`
    )

    return report
  }

  /**
   * 分析各部门资源容量
   */
  private analyzeDepartmentCapacity(
    students: any[],
    teachers: any[],
    examDates: string[]
  ): ResourceCapacity[] {
    const departments = ['一', '二', '三', '四', '五', '六', '七']
    const capacities: ResourceCapacity[] = []

    for (const dept of departments) {
      const deptTeachers = teachers.filter(t => t.department === dept)
      const deptStudents = students.filter(s => s.department === dept)

      // 计算平均可用考官数（考虑班组轮转限制）
      const avgAvailableTeachers = this.calculateAverageAvailableTeachers(deptTeachers, examDates)

      const ratio = deptStudents.length > 0 ? deptStudents.length / avgAvailableTeachers : 0

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
      if (ratio > this.RISK_THRESHOLDS.RATIO_HIGH || avgAvailableTeachers === 0) {
        riskLevel = 'HIGH'
      } else if (ratio > this.RISK_THRESHOLDS.RATIO_MEDIUM) {
        riskLevel = 'MEDIUM'
      } else {
        riskLevel = 'LOW'
      }

      capacities.push({
        department: dept,
        teachers: deptTeachers.length,
        students: deptStudents.length,
        ratio,
        riskLevel,
        availableTeachers: avgAvailableTeachers,
      })
    }

    return capacities
  }

  /**
   * 分析各日期的资源容量
   */
  private analyzeDateCapacity(
    students: any[],
    teachers: any[],
    examDates: string[]
  ): DateCapacity[] {
    const capacities: DateCapacity[] = []

    for (const date of examDates) {
      // 计算该日期可用考官数
      const availableTeachers = this.calculateAvailableTeachersOnDate(teachers, date)

      // 计算该日期预计考试数量
      const scheduledExams = this.estimateExamsOnDate(students, date)

      // 计算缓冲和利用率
      const utilizationRate = availableTeachers > 0 ? scheduledExams / availableTeachers : 1
      const buffer =
        Math.max(0, availableTeachers - scheduledExams) / Math.max(1, availableTeachers)

      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
      if (
        utilizationRate > this.RISK_THRESHOLDS.UTILIZATION_HIGH ||
        buffer < this.RISK_THRESHOLDS.BUFFER_MINIMUM
      ) {
        riskLevel = 'HIGH'
      } else if (utilizationRate > this.RISK_THRESHOLDS.UTILIZATION_MEDIUM) {
        riskLevel = 'MEDIUM'
      } else {
        riskLevel = 'LOW'
      }

      capacities.push({
        date,
        availableTeachers,
        scheduledExams,
        buffer,
        utilizationRate,
        riskLevel,
      })
    }

    return capacities
  }

  /**
   * 预判潜在冲突
   */
  private predictConflicts(
    students: any[],
    teachers: any[],
    examDates: string[]
  ): ConflictPrediction[] {
    const conflicts: ConflictPrediction[] = []

    // 1. 同科室资源冲突
    conflicts.push(...this.predictSameDeptConflicts(students, teachers, examDates))

    // 2. 班组轮转冲突
    conflicts.push(...this.predictGroupRotationConflicts(students, teachers, examDates))

    // 3. 资源短缺冲突
    conflicts.push(...this.predictResourceShortageConflicts(students, teachers, examDates))

    return conflicts
  }

  /**
   * 预判同科室资源冲突
   */
  private predictSameDeptConflicts(
    students: any[],
    teachers: any[],
    examDates: string[]
  ): ConflictPrediction[] {
    const conflicts: ConflictPrediction[] = []

    // 按科室和日期统计学员数量
    const deptDateStats: Record<string, Record<string, number>> = {}

    for (const student of students) {
      const dept = student.department
      // 假设学员在连续两天考试
      for (const date of examDates.slice(0, 2)) {
        if (!deptDateStats[dept]) deptDateStats[dept] = {}
        if (!deptDateStats[dept][date]) deptDateStats[dept][date] = 0
        deptDateStats[dept][date]++
      }
    }

    // 检查是否超过科室考官容量
    for (const dept in deptDateStats) {
      const deptTeachers = teachers.filter(t => t.department === dept)

      for (const date in deptDateStats[dept]) {
        const studentsOnDate = deptDateStats[dept][date]
        const availableTeachers = this.calculateAvailableTeachersOnDate(
          deptTeachers.filter(t => t.department === dept),
          date
        )

        if (studentsOnDate > availableTeachers) {
          conflicts.push({
            type: 'same_dept_conflict',
            severity: 'HIGH',
            description: `${dept}室在${date}需要${studentsOnDate}名考官1，但只有${availableTeachers}名可用考官`,
            affectedEntities: [`${dept}室`, date],
            suggestion: '考虑调整考试日期或启用跨科室支援',
            date,
            department: dept,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * 预判班组轮转冲突
   */
  private predictGroupRotationConflicts(
    students: any[],
    teachers: any[],
    examDates: string[]
  ): ConflictPrediction[] {
    const conflicts: ConflictPrediction[] = []

    for (const date of examDates) {
      const dutySchedule = dutyRotationService.calculateDutySchedule(date)

      // 检查白班考官占比
      const dayShiftTeachers = teachers.filter(t => t.group === dutySchedule.dayShift)
      const totalTeachers = teachers.length
      const unavailableRatio = dayShiftTeachers.length / totalTeachers

      if (unavailableRatio > 0.4) {
        conflicts.push({
          type: 'group_rotation_conflict',
          severity: 'HIGH',
          description: `${date}有${(unavailableRatio * 100).toFixed(1)}%的考官执勤白班，可用考官严重不足`,
          affectedEntities: [date, dutySchedule.dayShift],
          suggestion: '考虑调整考试日期或增加无班组考官',
        })
      } else if (unavailableRatio > 0.25) {
        conflicts.push({
          type: 'group_rotation_conflict',
          severity: 'MEDIUM',
          description: `${date}有${(unavailableRatio * 100).toFixed(1)}%的考官执勤白班，资源相对紧张`,
          affectedEntities: [date, dutySchedule.dayShift],
          suggestion: '优先使用晚班和休息班组考官',
        })
      }

      // 检查学员现场考试约束
      const fieldExamStudents = students.filter(
        s => s.group === dutySchedule.dayShift && this.isFieldExamDate(s, date)
      )

      if (fieldExamStudents.length > 0) {
        conflicts.push({
          type: 'group_rotation_conflict',
          severity: 'HIGH',
          description: `${date}有${fieldExamStudents.length}名${dutySchedule.dayShift}学员无法进行现场考试`,
          affectedEntities: fieldExamStudents.map(s => s.name),
          suggestion: '调整这些学员的考试日期',
        })
      }
    }

    return conflicts
  }

  /**
   * 预判资源短缺冲突
   */
  private predictResourceShortageConflicts(
    students: any[],
    teachers: any[],
    examDates: string[]
  ): ConflictPrediction[] {
    const conflicts: ConflictPrediction[] = []

    // 检查特殊科室（三室、七室）
    const specialDepts = ['三', '七']

    for (const dept of specialDepts) {
      const deptTeachers = teachers.filter(t => t.department === dept)
      const deptStudents = students.filter(s => s.department === dept)

      if (deptTeachers.length < 2 && deptStudents.length > 0) {
        conflicts.push({
          type: 'resource_shortage',
          severity: 'HIGH',
          description: `${dept}室考官不足（${deptTeachers.length}名），无法满足${deptStudents.length}名学员的考试需求`,
          affectedEntities: [`${dept}室`],
          suggestion: '启用三室/七室互借机制或跨科室支援',
          department: dept,
        })
      }
    }

    return conflicts
  }

  /**
   * 计算平均可用考官数（考虑班组轮转）
   */
  private calculateAverageAvailableTeachers(teachers: any[], examDates: string[]): number {
    if (examDates.length === 0) return teachers.length

    let totalAvailable = 0

    for (const date of examDates) {
      totalAvailable += this.calculateAvailableTeachersOnDate(teachers, date)
    }

    return totalAvailable / examDates.length
  }

  /**
   * 计算指定日期的可用考官数
   */
  private calculateAvailableTeachersOnDate(teachers: any[], date: string): number {
    return teachers.filter(teacher => dutyRotationService.canTeacherBeExaminer(teacher.group, date))
      .length
  }

  /**
   * 估算指定日期的考试数量
   */
  private estimateExamsOnDate(students: any[], date: string): number {
    // 简化估算：假设学员平均分布在考试日期中
    // 每个学员需要2天考试，每天需要3名考官
    return (students.length * 2 * 3) / 2 // 粗略估算
  }

  /**
   * 判断是否为现场考试日期
   */
  private isFieldExamDate(student: any, date: string): boolean {
    // 简化判断：假设第一天为现场考试
    return true // 实际应根据学员的考试安排判断
  }

  /**
   * 计算整体风险等级
   */
  private calculateOverallRisk(
    departmentCapacity: ResourceCapacity[],
    dateCapacity: DateCapacity[],
    conflicts: ConflictPrediction[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    const highRiskDepts = departmentCapacity.filter(d => d.riskLevel === 'HIGH').length
    const highRiskDates = dateCapacity.filter(d => d.riskLevel === 'HIGH').length
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'HIGH').length

    if (highRiskDepts > 2 || highRiskDates > 1 || highSeverityConflicts > 0) {
      return 'HIGH'
    }

    const mediumRiskDepts = departmentCapacity.filter(d => d.riskLevel === 'MEDIUM').length
    const mediumRiskDates = dateCapacity.filter(d => d.riskLevel === 'MEDIUM').length
    const mediumSeverityConflicts = conflicts.filter(c => c.severity === 'MEDIUM').length

    if (mediumRiskDepts > 1 || mediumRiskDates > 2 || mediumSeverityConflicts > 1) {
      return 'MEDIUM'
    }

    return 'LOW'
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    departmentCapacity: ResourceCapacity[],
    dateCapacity: DateCapacity[],
    conflicts: ConflictPrediction[]
  ): string[] {
    const recommendations: string[] = []

    // 基于部门容量的建议
    const highRiskDepts = departmentCapacity.filter(d => d.riskLevel === 'HIGH')
    if (highRiskDepts.length > 0) {
      recommendations.push(
        `高风险科室：${highRiskDepts.map(d => d.department).join('、')}，建议增加考官或启用跨科室支援`
      )
    }

    // 基于日期容量的建议
    const highRiskDates = dateCapacity.filter(d => d.riskLevel === 'HIGH')
    if (highRiskDates.length > 0) {
      recommendations.push(
        `高风险日期：${highRiskDates.map(d => d.date).join('、')}，建议调整考试安排或延长考试周期`
      )
    }

    // 基于冲突的建议
    const uniqueSuggestions = [...new Set(conflicts.map(c => c.suggestion))]
    recommendations.push(...uniqueSuggestions)

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push('资源配置良好，可以正常进行排班')
    }

    return recommendations
  }

  /**
   * 计算可行性评分
   */
  private calculateFeasibilityScore(
    departmentCapacity: ResourceCapacity[],
    dateCapacity: DateCapacity[],
    conflicts: ConflictPrediction[]
  ): number {
    let score = 100

    // 部门风险扣分
    const highRiskDepts = departmentCapacity.filter(d => d.riskLevel === 'HIGH').length
    const mediumRiskDepts = departmentCapacity.filter(d => d.riskLevel === 'MEDIUM').length
    score -= highRiskDepts * 20 + mediumRiskDepts * 10

    // 日期风险扣分
    const highRiskDates = dateCapacity.filter(d => d.riskLevel === 'HIGH').length
    const mediumRiskDates = dateCapacity.filter(d => d.riskLevel === 'MEDIUM').length
    score -= highRiskDates * 15 + mediumRiskDates * 8

    // 冲突扣分
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'HIGH').length
    const mediumSeverityConflicts = conflicts.filter(c => c.severity === 'MEDIUM').length
    score -= highSeverityConflicts * 25 + mediumSeverityConflicts * 12

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 生成优化建议
   */
  generateOptimizationSuggestions(resourceReport: ResourceReport): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = []

    // 基于风险等级生成建议
    if (resourceReport.overallRiskLevel === 'HIGH') {
      suggestions.push({
        type: 'constraint_relaxation',
        priority: 'HIGH',
        description: '建议放宽部分软约束以提高排班成功率',
        expectedImprovement: 30,
        implementation: '将threeExaminers设为false，允许2名考官配置',
      })
    }

    // 基于冲突类型生成建议
    const resourceShortages = resourceReport.conflictPredictions.filter(
      c => c.type === 'resource_shortage'
    )
    if (resourceShortages.length > 0) {
      suggestions.push({
        type: 'resource_reallocation',
        priority: 'HIGH',
        description: '启用跨科室支援机制',
        expectedImprovement: 25,
        implementation: '允许三室/七室互借，启用无班组考官',
      })
    }

    return suggestions
  }
}

// 创建单例实例
export const resourcePreCheckService = new ResourcePreCheckService()
