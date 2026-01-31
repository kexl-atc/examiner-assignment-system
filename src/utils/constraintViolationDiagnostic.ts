/**
 * 约束违反诊断工具
 * 帮助识别和解决排班约束违反问题
 */

export class ConstraintViolationDiagnostic {
  /**
   * 诊断硬约束违反问题
   */
  static diagnoseHardConstraintViolations(
    assignments: any[],
    teachers: any[],
    dutySchedules: any[]
  ): {
    violations: Array<{
      type: string
      description: string
      affectedAssignments: any[]
      suggestions: string[]
    }>
    summary: {
      totalViolations: number
      criticalIssues: number
      fixableIssues: number
    }
  } {
    const violations: any[] = []

    // HC4: 检查白班考官被分配为考官
    const hc4Violations = this.checkDayShiftExaminerViolations(assignments, dutySchedules)
    if (hc4Violations.length > 0) {
      violations.push({
        type: 'HC4',
        description: '白班考官被分配为考官',
        affectedAssignments: hc4Violations,
        suggestions: ['检查考官班组信息是否正确', '确保轮班数据准确', '调整考官分配逻辑'],
      })
    }

    // HC5: 检查学员白班时间考试
    const hc5Violations = this.checkStudentDayShiftViolations(assignments, dutySchedules)
    if (hc5Violations.length > 0) {
      violations.push({
        type: 'HC5',
        description: '学员在白班时间进行现场考试',
        affectedAssignments: hc5Violations,
        suggestions: ['调整考试日期安排', '检查学员班组信息', '确保现场考试不在白班时间'],
      })
    }

    // HC6: 检查连续两天考试要求
    const hc6Violations = this.checkConsecutiveDaysViolations(assignments)
    if (hc6Violations.length > 0) {
      violations.push({
        type: 'HC6',
        description: '考生未在连续两天完成考试',
        affectedAssignments: hc6Violations,
        suggestions: ['调整考试日期安排', '确保考试在连续两天内完成', '检查值班安排和休息日配置'],
      })
    }

    // HC7: 检查考官2科室匹配
    const hc7Violations = this.checkExaminer2DepartmentViolations(assignments)
    if (hc7Violations.length > 0) {
      violations.push({
        type: 'HC7',
        description: '考官2与学员科室相同',
        affectedAssignments: hc7Violations,
        suggestions: ['确保考官2与学员不同科室', '检查科室分配逻辑', '重新分配考官2'],
      })
    }

    // HC8: 检查备份考官与考官1和考官2不同
    const hc8Violations = this.checkBackupExaminerDifferentViolations(assignments)
    if (hc8Violations.length > 0) {
      violations.push({
        type: 'HC8',
        description: '备份考官与考官1或考官2相同',
        affectedAssignments: hc8Violations,
        suggestions: ['确保备份考官与考官1和考官2都不同', '检查考官分配逻辑', '重新分配备份考官'],
      })
    }

    // 检查考官重复
    const examinerDuplicationViolations = this.checkExaminerDuplicationViolations(assignments)
    if (examinerDuplicationViolations.length > 0) {
      violations.push({
        type: 'EXAMINER_DUPLICATION',
        description: '考官重复分配',
        affectedAssignments: examinerDuplicationViolations,
        suggestions: [
          '检查考官分配逻辑',
          '确保每个考官在同一考试中只担任一个角色',
          '重新分配考官角色',
        ],
      })
    }

    const criticalIssues = violations.filter(v => v.type.startsWith('HC')).length
    const fixableIssues = violations.length

    return {
      violations,
      summary: {
        totalViolations: violations.length,
        criticalIssues,
        fixableIssues,
      },
    }
  }

  /**
   * 检查HC4约束违反
   */
  private static checkDayShiftExaminerViolations(assignments: any[], dutySchedules: any[]): any[] {
    const violations: any[] = []
    const dutyMap = new Map()

    dutySchedules.forEach(schedule => {
      dutyMap.set(schedule.date, schedule)
    })

    assignments.forEach(assignment => {
      const duty = dutyMap.get(assignment.examDate)
      if (!duty) return

      const dayShiftGroup = duty.dayShift

      // 检查考官1
      if (assignment.examiner1 && assignment.examiner1.group === dayShiftGroup) {
        violations.push({
          assignment,
          examiner: assignment.examiner1,
          role: '考官1',
          issue: '白班考官被分配为考官',
        })
      }

      // 检查考官2
      if (assignment.examiner2 && assignment.examiner2.group === dayShiftGroup) {
        violations.push({
          assignment,
          examiner: assignment.examiner2,
          role: '考官2',
          issue: '白班考官被分配为考官',
        })
      }

      // 检查备份考官
      if (assignment.backupExaminer && assignment.backupExaminer.group === dayShiftGroup) {
        violations.push({
          assignment,
          examiner: assignment.backupExaminer,
          role: '备份考官',
          issue: '白班考官被分配为考官',
        })
      }
    })

    return violations
  }

  /**
   * 检查HC5约束违反
   */
  private static checkStudentDayShiftViolations(assignments: any[], dutySchedules: any[]): any[] {
    const violations: any[] = []
    const dutyMap = new Map()

    dutySchedules.forEach(schedule => {
      dutyMap.set(schedule.date, schedule)
    })

    assignments.forEach(assignment => {
      // 只检查现场考试（第一天）
      if (!assignment.isDay1Exam || !assignment.hasFieldExam) return

      const duty = dutyMap.get(assignment.examDate)
      if (!duty) return

      if (assignment.student.group === duty.dayShift) {
        violations.push({
          assignment,
          student: assignment.student,
          issue: '学员在白班时间进行现场考试',
        })
      }
    })

    return violations
  }

  /**
   * 检查HC6约束违反 - 连续两天考试要求
   */
  private static checkConsecutiveDaysViolations(assignments: any[]): any[] {
    const violations: any[] = []

    // 按学员分组
    const studentAssignments = new Map<string, any[]>()
    assignments.forEach(assignment => {
      if (!assignment.student || !assignment.examDate) return

      const studentId = assignment.student.id || assignment.student.name
      if (!studentAssignments.has(studentId)) {
        studentAssignments.set(studentId, [])
      }
      studentAssignments.get(studentId)!.push(assignment)
    })

    // 检查每个学员的考试日期连续性
    studentAssignments.forEach((studentExams, studentId) => {
      if (studentExams.length < 2) return // 只有一次考试，无需检查

      // 获取所有考试日期并排序
      const examDates = studentExams
        .map(exam => new Date(exam.examDate))
        .sort((a, b) => a.getTime() - b.getTime())

      const firstDate = examDates[0]
      const lastDate = examDates[examDates.length - 1]

      // 检查是否在连续两天内
      const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff > 1) {
        violations.push({
          assignment: studentExams[0],
          student: studentExams[0].student,
          examDates: examDates,
          daysDiff: daysDiff,
          issue: `考试跨度${daysDiff}天，超过连续两天要求`,
        })
      }
    })

    return violations
  }

  /**
   * 检查考官1科室匹配（原HC6逻辑，现在移到其他约束）
   */
  private static checkExaminer1DepartmentViolations(assignments: any[]): any[] {
    const violations: any[] = []

    assignments.forEach(assignment => {
      if (!assignment.examiner1 || !assignment.student) return

      const studentDept = assignment.student.department
      const examinerDept = assignment.examiner1.department

      // 检查同科室
      if (studentDept === examinerDept) return

      // 检查三室七室互借
      if (
        (studentDept === '三' && examinerDept === '七') ||
        (studentDept === '七' && examinerDept === '三')
      ) {
        return
      }

      violations.push({
        assignment,
        student: assignment.student,
        examiner: assignment.examiner1,
        issue: '考官1与学员科室不匹配',
      })
    })

    return violations
  }

  /**
   * 检查HC7约束违反
   */
  private static checkExaminer2DepartmentViolations(assignments: any[]): any[] {
    const violations: any[] = []

    assignments.forEach(assignment => {
      if (!assignment.examiner2 || !assignment.student) return

      const studentDept = assignment.student.department
      const examinerDept = assignment.examiner2.department

      // 检查是否同科室
      if (studentDept === examinerDept) {
        violations.push({
          assignment,
          student: assignment.student,
          examiner: assignment.examiner2,
          issue: '考官2与学员科室相同',
        })
      }
    })

    return violations
  }

  /**
   * 检查HC8约束违反 - 备份考官与考官1和考官2不同
   */
  private static checkBackupExaminerDifferentViolations(assignments: any[]): any[] {
    const violations: any[] = []

    assignments.forEach(assignment => {
      if (!assignment.backupExaminer || !assignment.examiner1 || !assignment.examiner2) return

      const backupId = assignment.backupExaminer.id
      const examiner1Id = assignment.examiner1.id
      const examiner2Id = assignment.examiner2.id

      // 检查备份考官是否与考官1或考官2相同
      if (backupId === examiner1Id || backupId === examiner2Id) {
        violations.push({
          assignment,
          student: assignment.student,
          examiner: assignment.backupExaminer,
          issue: '备份考官与考官1或考官2相同',
        })
      }
    })

    return violations
  }

  /**
   * 检查考官重复分配违反
   */
  private static checkExaminerDuplicationViolations(assignments: any[]): any[] {
    const violations: any[] = []

    assignments.forEach(assignment => {
      const examiners = [
        { role: '考官1', examiner: assignment.examiner1 },
        { role: '考官2', examiner: assignment.examiner2 },
        { role: '备份考官', examiner: assignment.backupExaminer },
      ].filter(e => e.examiner)

      // 检查是否有重复的考官
      for (let i = 0; i < examiners.length; i++) {
        for (let j = i + 1; j < examiners.length; j++) {
          if (examiners[i].examiner.id === examiners[j].examiner.id) {
            violations.push({
              assignment,
              examiner1: examiners[i],
              examiner2: examiners[j],
              issue: '同一考官担任多个角色',
            })
          }
        }
      }
    })

    return violations
  }

  /**
   * 生成诊断报告
   */
  static generateDiagnosticReport(
    assignments: any[],
    teachers: any[],
    dutySchedules: any[]
  ): string {
    const diagnostic = this.diagnoseHardConstraintViolations(assignments, teachers, dutySchedules)

    let report = '# 排班约束违反诊断报告\n\n'
    report += `**生成时间**: ${new Date().toLocaleString()}\n\n`
    report += `**总违反数**: ${diagnostic.summary.totalViolations}\n`
    report += `**关键问题**: ${diagnostic.summary.criticalIssues}\n`
    report += `**可修复问题**: ${diagnostic.summary.fixableIssues}\n\n`

    if (diagnostic.violations.length === 0) {
      report += ' 未发现约束违反问题\n'
      return report
    }

    diagnostic.violations.forEach((violation, index) => {
      report += `## ${index + 1}. ${violation.type} - ${violation.description}\n\n`
      report += `**影响考试数**: ${violation.affectedAssignments.length}\n\n`

      if (violation.affectedAssignments.length > 0) {
        report += '**受影响的考试**:\n'
        violation.affectedAssignments.forEach((assignment, i) => {
          report += `- ${i + 1}. 学员: ${assignment.assignment?.student?.name || '未知'}, 日期: ${assignment.assignment?.examDate || '未知'}\n`
        })
        report += '\n'
      }

      report += '**修复建议**:\n'
      violation.suggestions.forEach((suggestion, i) => {
        report += `${i + 1}. ${suggestion}\n`
      })
      report += '\n'
    })

    return report
  }
}
