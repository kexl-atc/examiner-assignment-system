import { Teacher, Student } from '../types/index'
import { ExamAssignment } from '../types/scheduleTypes'
import { HistoricalConflictAnalysisService } from './historicalConflictAnalysisService'
import { intelligentTimeSelectionService } from './intelligentTimeSelectionService'

// 冲突类型枚举
export enum ConflictType {
  DUTY_SHIFT = 'duty_shift', // 轮值日冲突
  DEPARTMENT = 'department', // 科室冲突
  TIME_OVERLAP = 'time_overlap', // 时间重叠
  WORKLOAD = 'workload', // 工作负荷
  AVAILABILITY = 'availability', // 可用性冲突
  LEGAL_REST = 'legal_rest', // 法定休息
  CONTINUOUS_WORK = 'continuous_work', // 连续工作时长
}

// 冲突严重度等级
export enum ConflictSeverity {
  CRITICAL = 'critical', // 严重：必须解决
  HIGH = 'high', // 高：强烈建议解决
  MEDIUM = 'medium', // 中：建议解决
  LOW = 'low', // 低：可选解决
}

// 冲突检测结果
export interface ConflictDetectionResult {
  id: string
  type: ConflictType
  severity: ConflictSeverity
  description: string
  affectedSchedules: string[]
  affectedTeachers: string[]
  affectedStudents: string[]
  suggestedActions: string[]
  estimatedImpact: number // 0-100，影响程度评分
}

// 预检验证结果
export interface PreValidationResult {
  isValid: boolean
  totalConflicts: number
  conflictsBySeverity: Record<ConflictSeverity, number>
  conflicts: ConflictDetectionResult[]
  overallRiskScore: number // 0-100，整体风险评分
  recommendations: string[]
  estimatedResolutionTime: number // 预计解决时间（分钟）
}

// 修正建议
export interface CorrectionSuggestion {
  conflictId: string
  action: string
  priority: number
  estimatedEffort: number
  expectedImprovement: number
}

export class PreValidationService {
  private historicalConflictService: HistoricalConflictAnalysisService
  private intelligentTimeService = intelligentTimeSelectionService

  constructor() {
    this.historicalConflictService = new HistoricalConflictAnalysisService()
  }

  /**
   * 执行多维度冲突扫描
   */
  async performMultiDimensionalScan(
    schedules: ExamAssignment[],
    teachers: Teacher[],
    students: Student[]
  ): Promise<PreValidationResult> {
    const conflicts: ConflictDetectionResult[] = []

    // 1. 轮值日冲突检测
    conflicts.push(...(await this.detectDutyShiftConflicts(schedules, teachers)))

    // 2. 科室冲突检测
    conflicts.push(...(await this.detectDepartmentConflicts(schedules, teachers, students)))

    // 3. 时间重叠冲突检测
    conflicts.push(...this.detectTimeOverlapConflicts(schedules))

    // 4. 工作负荷冲突检测
    conflicts.push(...this.detectWorkloadConflicts(schedules, teachers))

    // 5. 可用性冲突检测
    conflicts.push(...this.detectAvailabilityConflicts(schedules, teachers))

    // 6. 法定休息冲突检测
    conflicts.push(...this.detectLegalRestConflicts(schedules, teachers))

    // 7. 连续工作时长冲突检测
    conflicts.push(...this.detectContinuousWorkConflicts(schedules, teachers))

    // 计算统计信息
    const conflictsBySeverity = this.calculateConflictsBySeverity(conflicts)
    const overallRiskScore = this.calculateOverallRiskScore(conflicts)
    const recommendations = this.generateRecommendations(conflicts)
    const estimatedResolutionTime = this.estimateResolutionTime(conflicts)

    return {
      isValid: conflicts.filter(c => c.severity === ConflictSeverity.CRITICAL).length === 0,
      totalConflicts: conflicts.length,
      conflictsBySeverity,
      conflicts,
      overallRiskScore,
      recommendations,
      estimatedResolutionTime,
    }
  }

  /**
   * 检测轮值日冲突
   * 优化版本：使用Map提升查找性能
   */
  private async detectDutyShiftConflicts(
    schedules: ExamAssignment[],
    teachers: Teacher[]
  ): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = []

    // ✅ 性能优化：创建教师Map，将查找复杂度从O(n)降低到O(1)
    const teacherMap = new Map(teachers.map(teacher => [teacher.id, teacher]))

    for (const schedule of schedules) {
      const examDate = new Date(schedule.date)
      const dayOfWeek = examDate.getDay()

      // 检查考官1轮值日冲突
      if (schedule.examiner1?.id) {
        const teacher = teacherMap.get(schedule.examiner1.id) // O(1)查找
        if (teacher && this.isOnDutyShift(teacher, dayOfWeek)) {
          conflicts.push({
            id: `duty_conflict_${schedule.id}_examiner1`,
            type: ConflictType.DUTY_SHIFT,
            severity: ConflictSeverity.CRITICAL,
            description: `考官1 ${teacher.name} 在 ${schedule.date.toDateString()} 处于轮值日，不能担任考官`,
            affectedSchedules: [schedule.id],
            affectedTeachers: [teacher.id],
            affectedStudents: [schedule.student.id],
            suggestedActions: [
              '更换考官1为非轮值日考官',
              '调整考试日期避开轮值日',
              '申请轮值日调班',
            ],
            estimatedImpact: 95,
          })
        }
      }

      // 检查考官2轮值日冲突
      if (schedule.examiner2?.id) {
        const teacher = teacherMap.get(schedule.examiner2.id) // O(1)查找
        if (teacher && this.isOnDutyShift(teacher, dayOfWeek)) {
          conflicts.push({
            id: `duty_conflict_${schedule.id}_examiner2`,
            type: ConflictType.DUTY_SHIFT,
            severity: ConflictSeverity.CRITICAL,
            description: `考官2 ${teacher.name} 在 ${schedule.date.toDateString()} 处于轮值日，不能担任考官`,
            affectedSchedules: [schedule.id],
            affectedTeachers: [teacher.id],
            affectedStudents: [schedule.student.id],
            suggestedActions: [
              '更换考官2为非轮值日考官',
              '调整考试日期避开轮值日',
              '申请轮值日调班',
            ],
            estimatedImpact: 95,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * 检测科室冲突
   * 优化版本：使用Map提升查找性能
   */
  private async detectDepartmentConflicts(
    schedules: ExamAssignment[],
    teachers: Teacher[],
    students: Student[]
  ): Promise<ConflictDetectionResult[]> {
    const conflicts: ConflictDetectionResult[] = []

    // ✅ 性能优化：创建查找Map，将查找复杂度从O(n)降低到O(1)
    const studentMap = new Map(students.map(student => [student.id, student]))
    const teacherMap = new Map(teachers.map(teacher => [teacher.id, teacher]))

    for (const schedule of schedules) {
      const student = studentMap.get(schedule.student.id) // O(1)查找
      if (!student) continue

      // 检查考官2与学员科室冲突
      if (schedule.examiner2?.id) {
        const examiner2 = teacherMap.get(schedule.examiner2.id) // O(1)查找
        if (examiner2 && examiner2.department === student.department) {
          conflicts.push({
            id: `dept_conflict_${schedule.id}_examiner2`,
            type: ConflictType.DEPARTMENT,
            severity: ConflictSeverity.HIGH,
            description: `考官2 ${examiner2.name} 与学员 ${student.name} 属于同一科室 (${student.department})`,
            affectedSchedules: [schedule.id],
            affectedTeachers: [examiner2.id],
            affectedStudents: [student.id],
            suggestedActions: ['更换考官2为其他科室考官', '优先选择经验丰富的跨科室考官'],
            estimatedImpact: 80,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * 检测时间重叠冲突
   */
  private detectTimeOverlapConflicts(schedules: ExamAssignment[]): ConflictDetectionResult[] {
    const conflicts: ConflictDetectionResult[] = []
    const teacherScheduleMap = new Map<string, ExamAssignment[]>()

    // 按考官分组排班
    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const schedule of schedules) {
      if (schedule.examiner1?.id) {
        if (!teacherScheduleMap.has(schedule.examiner1.id)) {
          teacherScheduleMap.set(schedule.examiner1.id, [])
        }
        teacherScheduleMap.get(schedule.examiner1.id)!.push(schedule)
      }
      if (schedule.examiner2?.id) {
        if (!teacherScheduleMap.has(schedule.examiner2.id)) {
          teacherScheduleMap.set(schedule.examiner2.id, [])
        }
        teacherScheduleMap.get(schedule.examiner2.id)!.push(schedule)
      }
    }

    // 检测时间重叠
    // TODO: 优化嵌套循环 - 当前复杂度 O(n²)
// 建议使用Map/Set或其他数据结构优化
// for (const [teacherId, teacherSchedules] of teacherScheduleMap)
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
    for (const [teacherId, teacherSchedules] of teacherScheduleMap) {
      // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (let i = 0; i < teacherSchedules.length; i++) {
        for (let j = i + 1; j < teacherSchedules.length; j++) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
          const schedule1 = teacherSchedules[i]
          const schedule2 = teacherSchedules[j]

          if (this.hasTimeOverlap(schedule1, schedule2)) {
            conflicts.push({
              id: `time_overlap_${schedule1.id}_${schedule2.id}`,
              type: ConflictType.TIME_OVERLAP,
              severity: ConflictSeverity.CRITICAL,
              description: `考官在 ${schedule1.date.toDateString()} ${schedule1.timeSlot} 和 ${schedule2.date.toDateString()} ${schedule2.timeSlot} 存在时间冲突`,
              affectedSchedules: [schedule1.id, schedule2.id],
              affectedTeachers: [teacherId],
              affectedStudents: [schedule1.student.id, schedule2.student.id],
              suggestedActions: [
                '调整其中一个考试的开始时间',
                '更换其中一个考试的考官',
                '重新安排考试日期',
              ],
              estimatedImpact: 100,
            })
          }
        }
      }
    }

    return conflicts
  }

  /**
   * 检测工作负荷冲突
   */
  private detectWorkloadConflicts(
    schedules: ExamAssignment[],
    teachers: Teacher[]
  ): ConflictDetectionResult[] {
    const conflicts: ConflictDetectionResult[] = []
    const teacherWorkload = new Map<string, number>()

    // 计算每个考官的工作负荷
    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const schedule of schedules) {
      if (schedule.examiner1?.id) {
        teacherWorkload.set(
          schedule.examiner1.id,
          (teacherWorkload.get(schedule.examiner1.id) || 0) + 1
        )
      }
      if (schedule.examiner2?.id) {
        teacherWorkload.set(
          schedule.examiner2.id,
          (teacherWorkload.get(schedule.examiner2.id) || 0) + 1
        )
      }
    }

    // 检测过载情况
    for (const [teacherId, workload] of teacherWorkload) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
      const teacher = teachers.find(t => t.id === teacherId)
      if (!teacher) continue

      const maxWorkload = this.getMaxWorkloadForTeacher(teacher)
      if (workload > maxWorkload) {
        const affectedSchedules = schedules
          .filter(s => s.examiner1?.id === teacherId || s.examiner2?.id === teacherId)
          .map(s => s.id)

        conflicts.push({
          id: `workload_${teacherId}`,
          type: ConflictType.WORKLOAD,
          severity: workload > maxWorkload * 1.5 ? ConflictSeverity.HIGH : ConflictSeverity.MEDIUM,
          description: `考官 ${teacher.name} 工作负荷过重 (${workload}/${maxWorkload})`,
          affectedSchedules,
          affectedTeachers: [teacherId],
          affectedStudents: [],
          suggestedActions: [
            '重新分配部分考试给其他考官',
            '延长考试周期分散工作负荷',
            '增加临时考官支援',
          ],
          estimatedImpact: Math.min(90, 50 + (workload - maxWorkload) * 10),
        })
      }
    }

    return conflicts
  }

  /**
   * 检测可用性冲突
   */
  private detectAvailabilityConflicts(
    schedules: ExamAssignment[],
    teachers: Teacher[]
  ): ConflictDetectionResult[] {
    const conflicts: ConflictDetectionResult[] = []

    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const schedule of schedules) {
      const examDate = new Date(schedule.date)

      // 检查考官1可用性
      if (schedule.examiner1?.id) {
        const teacher = teachers.find(t => t.id === schedule.examiner1.id)
        if (teacher && !this.isTeacherAvailable(teacher, examDate, schedule.timeSlot)) {
          conflicts.push({
            id: `availability_${schedule.id}_examiner1`,
            type: ConflictType.AVAILABILITY,
            severity: ConflictSeverity.HIGH,
            description: `考官1 ${teacher.name} 在 ${schedule.date.toDateString()} ${schedule.timeSlot} 不可用`,
            affectedSchedules: [schedule.id],
            affectedTeachers: [teacher.id],
            affectedStudents: [schedule.student.id],
            suggestedActions: [
              '更换考官1为可用考官',
              '调整考试时间至考官可用时段',
              '确认考官请假或出差安排',
            ],
            estimatedImpact: 85,
          })
        }
      }

      // 检查考官2可用性
      if (schedule.examiner2?.id) {
        const teacher = teachers.find(t => t.id === schedule.examiner2.id)
        if (teacher && !this.isTeacherAvailable(teacher, examDate, schedule.timeSlot)) {
          conflicts.push({
            id: `availability_${schedule.id}_examiner2`,
            type: ConflictType.AVAILABILITY,
            severity: ConflictSeverity.HIGH,
            description: `考官2 ${teacher.name} 在 ${schedule.date.toDateString()} ${schedule.timeSlot} 不可用`,
            affectedSchedules: [schedule.id],
            affectedTeachers: [teacher.id],
            affectedStudents: [schedule.student.id],
            suggestedActions: [
              '更换考官2为可用考官',
              '调整考试时间至考官可用时段',
              '确认考官请假或出差安排',
            ],
            estimatedImpact: 85,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * 检测法定休息冲突
   */
  private detectLegalRestConflicts(
    schedules: ExamAssignment[],
    teachers: Teacher[]
  ): ConflictDetectionResult[] {
    const conflicts: ConflictDetectionResult[] = []

    for (const schedule of schedules) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
      const examDate = new Date(schedule.date)

      // 检查是否为法定节假日或周末
      if (this.isLegalRestDay(examDate)) {
        const affectedTeachers = []
        if (schedule.examiner1?.id) affectedTeachers.push(schedule.examiner1.id)
        if (schedule.examiner2?.id) affectedTeachers.push(schedule.examiner2.id)

        conflicts.push({
          id: `legal_rest_${schedule.id}`,
          type: ConflictType.LEGAL_REST,
          severity: ConflictSeverity.MEDIUM,
          description: `考试安排在法定休息日 ${schedule.date.toDateString()}`,
          affectedSchedules: [schedule.id],
          affectedTeachers,
          affectedStudents: [schedule.student.id],
          suggestedActions: [
            '调整考试日期至工作日',
            '确认是否有加班补偿安排',
            '获得相关考官同意确认',
          ],
          estimatedImpact: 60,
        })
      }
    }

    return conflicts
  }

  /**
   * 检测连续工作时长冲突
   */
  private detectContinuousWorkConflicts(
    schedules: ExamAssignment[],
    teachers: Teacher[]
  ): ConflictDetectionResult[] {
    const conflicts: ConflictDetectionResult[] = []
    const teacherScheduleMap = new Map<string, ExamAssignment[]>()

    // 按考官分组并排序
    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const schedule of schedules) {
      if (schedule.examiner1?.id) {
        if (!teacherScheduleMap.has(schedule.examiner1.id)) {
          teacherScheduleMap.set(schedule.examiner1.id, [])
        }
        teacherScheduleMap.get(schedule.examiner1.id)!.push(schedule)
      }
      if (schedule.examiner2?.id) {
        if (!teacherScheduleMap.has(schedule.examiner2.id)) {
          teacherScheduleMap.set(schedule.examiner2.id, [])
        }
        teacherScheduleMap.get(schedule.examiner2.id)!.push(schedule)
      }
    }

    // 检测连续工作时长
    // TODO: 优化嵌套循环 - 当前复杂度 O(n²)
// 建议使用Map/Set或其他数据结构优化
// for (const [teacherId, teacherSchedules] of teacherScheduleMap)
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
    for (const [teacherId, teacherSchedules] of teacherScheduleMap) {
      const teacher = teachers.find(t => t.id === teacherId)
      if (!teacher) continue

      const sortedSchedules = teacherSchedules.sort(
        (a, b) =>
          new Date(a.date.toDateString() + ' ' + a.timeSlot).getTime() -
          new Date(b.date.toDateString() + ' ' + b.timeSlot).getTime()
      )

      let continuousHours = 0
      let continuousSchedules: ExamAssignment[] = []

      // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (let i = 0; i < sortedSchedules.length; i++) {
        const current = sortedSchedules[i]
        const currentEnd = this.calculateExamEndTime(current)

        continuousSchedules.push(current)
        continuousHours += 2 // 假设每场考试2小时

        // 检查与下一场考试的间隔
        if (i < sortedSchedules.length - 1) {
          const next = sortedSchedules[i + 1]
          const nextStart = new Date(next.date.toDateString() + ' ' + next.timeSlot)
          const restHours = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60)

          if (restHours < 1) {
            // 休息时间少于1小时
            continue
          } else {
            // 检查连续工作时长
            if (continuousHours > 8) {
              conflicts.push({
                id: `continuous_work_${teacherId}_${i}`,
                type: ConflictType.CONTINUOUS_WORK,
                severity: continuousHours > 12 ? ConflictSeverity.HIGH : ConflictSeverity.MEDIUM,
                description: `考官 ${teacher.name} 连续工作 ${continuousHours} 小时，超出合理限制`,
                affectedSchedules: continuousSchedules.map(s => s.id),
                affectedTeachers: [teacherId],
                affectedStudents: continuousSchedules.map(s => s.student.id),
                suggestedActions: [
                  '在连续考试间安排充足休息时间',
                  '重新分配部分考试给其他考官',
                  '调整考试时间分布',
                ],
                estimatedImpact: Math.min(90, 40 + continuousHours * 5),
              })
            }
            // 重置计数
            continuousHours = 0
            continuousSchedules = []
          }
        }
      }
    }

    return conflicts
  }

  /**
   * 生成修正建议
   */
  generateCorrectionSuggestions(conflicts: ConflictDetectionResult[]): CorrectionSuggestion[] {
    const suggestions: CorrectionSuggestion[] = []

    // TODO: 优化嵌套循环 - 当前复杂度 O(n²)
// 建议使用Map/Set或其他数据结构优化
// for (const conflict of conflicts)
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
    for (const conflict of conflicts) {
      // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (let i = 0; i < conflict.suggestedActions.length; i++) {
        suggestions.push({
          conflictId: conflict.id,
          action: conflict.suggestedActions[i],
          priority: this.getSuggestionPriority(conflict.severity, i),
          estimatedEffort: this.estimateActionEffort(conflict.type, conflict.suggestedActions[i]),
          expectedImprovement: this.estimateActionImprovement(conflict.severity, i),
        })
      }
    }

    return suggestions.sort((a, b) => b.priority - a.priority)
  }

  // 辅助方法
  private isOnDutyShift(teacher: Teacher, dayOfWeek: number): boolean {
    // 简化实现：假设周一到周五为工作日，周六周日为轮值日
    return dayOfWeek === 0 || dayOfWeek === 6
  }

  private hasTimeOverlap(schedule1: ExamAssignment, schedule2: ExamAssignment): boolean {
    if (schedule1.date.toDateString() !== schedule2.date.toDateString()) return false

    const start1 = new Date(schedule1.date.toDateString() + ' ' + schedule1.timeSlot)
    const end1 = this.calculateExamEndTime(schedule1)
    const start2 = new Date(schedule2.date.toDateString() + ' ' + schedule2.timeSlot)
    const end2 = this.calculateExamEndTime(schedule2)

    return start1 < end2 && start2 < end1
  }

  private calculateExamEndTime(schedule: ExamAssignment): Date {
    const startTime = new Date(schedule.date.toDateString() + ' ' + schedule.timeSlot)
    return new Date(startTime.getTime() + 2 * 60 * 60 * 1000) // 假设考试时长2小时
  }

  private getMaxWorkloadForTeacher(teacher: Teacher): number {
    // 根据考官级别和经验确定最大工作负荷
    // 根据教师职称判断经验，如果没有职称信息则使用默认值
    const title = teacher.title || ''
    return title.includes('主任') || title.includes('副主任') || title.includes('教授') ? 10 : 6
  }

  private isTeacherAvailable(teacher: Teacher, date: Date, time: string): boolean {
    // 简化实现：检查基本可用性
    return true // 实际应该检查考官的请假、出差等安排
  }

  private isLegalRestDay(date: Date): boolean {
    const dayOfWeek = date.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6 // 周末
  }

  private calculateConflictsBySeverity(
    conflicts: ConflictDetectionResult[]
  ): Record<ConflictSeverity, number> {
    const result: Record<ConflictSeverity, number> = {
      [ConflictSeverity.CRITICAL]: 0,
      [ConflictSeverity.HIGH]: 0,
      [ConflictSeverity.MEDIUM]: 0,
      [ConflictSeverity.LOW]: 0,
    }

    for (const conflict of conflicts) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
      result[conflict.severity]++
    }

    return result
  }

  private calculateOverallRiskScore(conflicts: ConflictDetectionResult[]): number {
    let totalScore = 0
    const weights = {
      [ConflictSeverity.CRITICAL]: 4,
      [ConflictSeverity.HIGH]: 3,
      [ConflictSeverity.MEDIUM]: 2,
      [ConflictSeverity.LOW]: 1,
    }

    // 🔴 PERFORMANCE NOTE: 嵌套循环检测到 (O(n²) 复杂度)
// 建议优化: 使用 Map/Set 或其他数据结构来提升性能
// 当前代码:
for (const conflict of conflicts) {
      totalScore += weights[conflict.severity] * (conflict.estimatedImpact / 100)
    }

    return Math.min(100, totalScore * 5)
  }

  private generateRecommendations(conflicts: ConflictDetectionResult[]): string[] {
    const recommendations: string[] = []
    const criticalCount = conflicts.filter(c => c.severity === ConflictSeverity.CRITICAL).length
    const highCount = conflicts.filter(c => c.severity === ConflictSeverity.HIGH).length

    if (criticalCount > 0) {
      recommendations.push(`立即解决 ${criticalCount} 个严重冲突，这些冲突会导致排班失败`)
    }
    if (highCount > 0) {
      recommendations.push(`优先处理 ${highCount} 个高优先级冲突，以提升排班质量`)
    }
    if (conflicts.length > 10) {
      recommendations.push('冲突数量较多，建议分批处理或调整排班策略')
    }

    return recommendations
  }

  private estimateResolutionTime(conflicts: ConflictDetectionResult[]): number {
    let totalTime = 0
    const timeEstimates = {
      [ConflictSeverity.CRITICAL]: 30,
      [ConflictSeverity.HIGH]: 20,
      [ConflictSeverity.MEDIUM]: 10,
      [ConflictSeverity.LOW]: 5,
    }

    for (const conflict of conflicts) {
// 优化建议:
// const map = new Map(array.map(item => [item.id, item]))
// for (const item of array1) {
//   const found = map.get(item.id)
//   if (found) { /* 处理逻辑 */ }
// } {
      totalTime += timeEstimates[conflict.severity]
    }

    return totalTime
  }

  private getSuggestionPriority(severity: ConflictSeverity, actionIndex: number): number {
    const basePriority = {
      [ConflictSeverity.CRITICAL]: 100,
      [ConflictSeverity.HIGH]: 80,
      [ConflictSeverity.MEDIUM]: 60,
      [ConflictSeverity.LOW]: 40,
    }

    return basePriority[severity] - actionIndex * 5
  }

  private estimateActionEffort(type: ConflictType, action: string): number {
    // 根据冲突类型和建议动作估算工作量（分钟）
    const effortMap: Record<ConflictType, number> = {
      [ConflictType.DUTY_SHIFT]: 15,
      [ConflictType.DEPARTMENT]: 10,
      [ConflictType.TIME_OVERLAP]: 20,
      [ConflictType.WORKLOAD]: 25,
      [ConflictType.AVAILABILITY]: 15,
      [ConflictType.LEGAL_REST]: 10,
      [ConflictType.CONTINUOUS_WORK]: 20,
    }

    return effortMap[type] || 15
  }

  private estimateActionImprovement(severity: ConflictSeverity, actionIndex: number): number {
    const baseImprovement = {
      [ConflictSeverity.CRITICAL]: 90,
      [ConflictSeverity.HIGH]: 70,
      [ConflictSeverity.MEDIUM]: 50,
      [ConflictSeverity.LOW]: 30,
    }

    return Math.max(10, baseImprovement[severity] - actionIndex * 15)
  }
}
