/**
 * 排班冲突检测器
 * 专门用于检测和修复HC4约束违反：同一考官在同一天被分配到多场考试
 */

export interface ConflictDetectionResult {
  hasConflicts: boolean
  conflicts: ScheduleConflict[]
  summary: string
}

export interface ScheduleConflict {
  date: string
  examinerName: string
  examinerRole: string[] // 考官角色：examiner1, examiner2, backup
  students: string[] // 涉及的学员
  assignmentIds: string[] // 涉及的分配ID
}

export interface FixResult {
  success: boolean
  fixedConflicts: number
  remainingConflicts: number
  details: string[]
  updatedAssignments: any[]
}

export class ScheduleConflictDetector {
  /**
   * 检测HC4约束违反：同一考官在同一天被分配到多场考试
   */
  public detectTimeConflicts(assignments: any[]): ConflictDetectionResult {
    process.env.NODE_ENV === 'development' && console.log('🔍 开始检测HC4约束违反（同一考官同一天多场考试）...')

    const conflicts: ScheduleConflict[] = []

    // 按日期分组
    const dateGroups = new Map<string, any[]>()
    assignments.forEach(assignment => {
      const date = assignment.examDate || assignment.date
      if (!date) return

      if (!dateGroups.has(date)) {
        dateGroups.set(date, [])
      }
      dateGroups.get(date)!.push(assignment)
    })

    // 检查每一天的考官分配
    for (const [date, dateAssignments] of dateGroups) {
      // 统计每个考官在这一天的分配情况
      const examinerAssignments = new Map<
        string,
        {
          roles: Set<string>
          students: string[]
          assignmentIds: string[]
        }
      >()

      dateAssignments.forEach(assignment => {
        const studentName = assignment.studentName || assignment.student?.name || '未知学员'
        const assignmentId = assignment.id

        // 检查考官1
        const examiner1 = this.getExaminerInfo(assignment.examiner1)
        if (examiner1) {
          this.addExaminerAssignment(
            examinerAssignments,
            examiner1,
            'examiner1',
            studentName,
            assignmentId
          )
        }

        // 检查考官2
        const examiner2 = this.getExaminerInfo(assignment.examiner2)
        if (examiner2) {
          this.addExaminerAssignment(
            examinerAssignments,
            examiner2,
            'examiner2',
            studentName,
            assignmentId
          )
        }

        // 检查备份考官
        const backup = this.getExaminerInfo(assignment.backupExaminer || assignment.backup)
        if (backup) {
          this.addExaminerAssignment(
            examinerAssignments,
            backup,
            'backup',
            studentName,
            assignmentId
          )
        }
      })

      // 找出有冲突的考官（在同一天有多个分配）
      for (const [examinerName, info] of examinerAssignments) {
        if (info.assignmentIds.length > 1) {
          // 发现冲突！
          conflicts.push({
            date,
            examinerName,
            examinerRole: Array.from(info.roles),
            students: info.students,
            assignmentIds: info.assignmentIds,
          })

          console.error(
            `🚫 [HC4违反] ${examinerName}在${date}被分配到${info.assignmentIds.length}场考试：` +
              `${info.students.join('、')}`
          )
        }
      }
    }

    const summary =
      conflicts.length === 0
        ? '✅ 未检测到HC4约束违反'
        : `❌ 检测到${conflicts.length}个HC4约束违反`

    process.env.NODE_ENV === 'development' && console.log(summary)

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      summary,
    }
  }

  /**
   * 自动修复HC4约束违反
   * 策略：保留第一个分配，将后续冲突的分配设为"未分配"
   */
  public autoFixTimeConflicts(assignments: any[], teachers: any[]): FixResult {
    process.env.NODE_ENV === 'development' && console.log('🔧 开始自动修复HC4约束违反...')

    const fixDetails: string[] = []
    let fixedConflicts = 0
    const updatedAssignments = JSON.parse(JSON.stringify(assignments)) // 深拷贝

    // 先检测冲突
    const detection = this.detectTimeConflicts(updatedAssignments)

    if (!detection.hasConflicts) {
      return {
        success: true,
        fixedConflicts: 0,
        remainingConflicts: 0,
        details: ['无需修复，未检测到冲突'],
        updatedAssignments,
      }
    }

    // 处理每个冲突
    for (const conflict of detection.conflicts) {
      process.env.NODE_ENV === 'development' && console.log(`🔧 修复冲突：${conflict.examinerName}在${conflict.date}的多场考试`)

      // 按分配ID排序，保留第一个
      const sortedIds = conflict.assignmentIds.sort()
      const keepId = sortedIds[0]
      const removeIds = sortedIds.slice(1)

      // 从后续分配中移除该考官
      for (const assignmentId of removeIds) {
        const assignment = updatedAssignments.find((a: any) => a.id === assignmentId)
        if (!assignment) continue

        const studentName = assignment.studentName || assignment.student?.name || '未知学员'
        let removedRole = ''

        // 检查该考官在哪个角色
        const examiner1Info = this.getExaminerInfo(assignment.examiner1)
        const examiner2Info = this.getExaminerInfo(assignment.examiner2)
        const backupInfo = this.getExaminerInfo(assignment.backupExaminer || assignment.backup)

        if (examiner1Info === conflict.examinerName) {
          assignment.examiner1 = '未分配'
          removedRole = '考官1'
        }
        if (examiner2Info === conflict.examinerName) {
          assignment.examiner2 = '未分配'
          removedRole = removedRole ? `${removedRole}、考官2` : '考官2'
        }
        if (backupInfo === conflict.examinerName) {
          if (assignment.backupExaminer) assignment.backupExaminer = null
          if (assignment.backup) assignment.backup = '未分配'
          removedRole = removedRole ? `${removedRole}、备份考官` : '备份考官'
        }

        fixDetails.push(
          `✅ 从${studentName}(${conflict.date})的${removedRole}中移除${conflict.examinerName}`
        )
        fixedConflicts++
      }
    }

    // 再次检测是否还有冲突
    const finalDetection = this.detectTimeConflicts(updatedAssignments)

    process.env.NODE_ENV === 'development' && console.log(
      `🎯 修复完成：修复${fixedConflicts}个冲突，剩余${finalDetection.conflicts.length}个冲突`
    )

    return {
      success: !finalDetection.hasConflicts,
      fixedConflicts,
      remainingConflicts: finalDetection.conflicts.length,
      details: fixDetails,
      updatedAssignments,
    }
  }

  /**
   * 生成冲突报告
   */
  public generateConflictReport(conflicts: ScheduleConflict[]): string {
    if (conflicts.length === 0) {
      return '✅ 未检测到HC4约束违反\n'
    }

    let report = `❌ 检测到${conflicts.length}个HC4约束违反：\n\n`

    conflicts.forEach((conflict, index) => {
      report += `${index + 1}. 考官：${conflict.examinerName}\n`
      report += `   日期：${conflict.date}\n`
      report += `   涉及学员：${conflict.students.join('、')}\n`
      report += `   考官角色：${conflict.examinerRole.join('、')}\n`
      report += `   冲突数量：${conflict.assignmentIds.length}场考试\n\n`
    })

    return report
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取考官信息（统一处理对象和字符串格式）
   */
  private getExaminerInfo(examiner: any): string | null {
    if (!examiner) return null
    if (examiner === '未分配') return null

    if (typeof examiner === 'string') {
      return examiner === '未分配' ? null : examiner
    }

    if (typeof examiner === 'object') {
      const name = examiner.name || examiner.id
      return name === '未分配' ? null : name
    }

    return null
  }

  /**
   * 添加考官分配记录
   */
  private addExaminerAssignment(
    map: Map<string, { roles: Set<string>; students: string[]; assignmentIds: string[] }>,
    examinerName: string,
    role: string,
    studentName: string,
    assignmentId: string
  ): void {
    if (!map.has(examinerName)) {
      map.set(examinerName, {
        roles: new Set(),
        students: [],
        assignmentIds: [],
      })
    }

    const info = map.get(examinerName)!
    info.roles.add(role)
    info.students.push(studentName)
    info.assignmentIds.push(assignmentId)
  }
}

// 导出单例
export const scheduleConflictDetector = new ScheduleConflictDetector()
