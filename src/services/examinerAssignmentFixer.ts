/**
 * 考官分配修复服务
 * 专门用于修复约束违反问题，确保每个学员都有两名主考官
 */

export interface ExaminerAssignmentFixResult {
  success: boolean
  fixedCount: number
  remainingIssues: number
  details: string[]
  assignments: any[]
}

export class ExaminerAssignmentFixer {
  private normalizeDepartment(dept: string | null | undefined): string {
    if (!dept) return ''
    const normalized = String(dept).trim()

    if (normalized.includes('区域一室') || normalized.includes('一室') || normalized.includes('1室') || normalized.includes('第1科室')) return '一'
    if (normalized.includes('区域二室') || normalized.includes('二室') || normalized.includes('2室') || normalized.includes('第2科室')) return '二'
    if (normalized.includes('区域三室') || normalized.includes('三室') || normalized.includes('3室') || normalized.includes('第3科室')) return '三'
    if (normalized.includes('区域四室') || normalized.includes('四室') || normalized.includes('4室') || normalized.includes('第4科室')) return '四'
    if (normalized.includes('区域五室') || normalized.includes('五室') || normalized.includes('5室') || normalized.includes('第5科室')) return '五'
    if (normalized.includes('区域六室') || normalized.includes('六室') || normalized.includes('6室') || normalized.includes('第6科室')) return '六'
    if (normalized.includes('区域七室') || normalized.includes('七室') || normalized.includes('7室') || normalized.includes('第7科室')) return '七'
    if (normalized.includes('区域八室') || normalized.includes('八室') || normalized.includes('8室') || normalized.includes('第8科室')) return '八'
    if (normalized.includes('区域九室') || normalized.includes('九室') || normalized.includes('9室') || normalized.includes('第9科室')) return '九'
    if (normalized.includes('区域十室') || normalized.includes('十室') || normalized.includes('10室') || normalized.includes('第10科室')) return '十'

    return normalized
  }

  private isValidExaminer1Department(studentDept: string, examiner1Dept: string): boolean {
    if (!studentDept || !examiner1Dept) return false
    if (studentDept === examiner1Dept) return true
    if ((studentDept === '三' && examiner1Dept === '七') || (studentDept === '七' && examiner1Dept === '三')) return true
    return false
  }

  /**
   * 修复考官分配问题
   * 🔧 修复HC4约束：确保同一考官每天只能监考一名考生
   */
  public fixExaminerAssignments(assignments: any[], teachers: any[]): ExaminerAssignmentFixResult {
    const fixDetails: string[] = []
    let fixedCount = 0
    const fixedAssignments = [...assignments]

    process.env.NODE_ENV === 'development' && console.log('🔧 开始修复考官分配问题...')

    for (let i = 0; i < fixedAssignments.length; i++) {
      const assignment = fixedAssignments[i]
      const studentName = assignment.studentName || assignment.student?.name || '未知学员'
      const examDate = assignment.examDate || assignment.date

      // 检查是否需要修复
      const needsExaminer1 = !assignment.examiner1 || assignment.examiner1 === '未分配'
      const needsExaminer2 = !assignment.examiner2 || assignment.examiner2 === '未分配'
      const hasDuplicateExaminers =
        assignment.examiner1 &&
        assignment.examiner2 &&
        assignment.examiner1.id === assignment.examiner2.id

      if (!needsExaminer1 && !needsExaminer2 && !hasDuplicateExaminers) {
        continue // 该分配无需修复
      }

      process.env.NODE_ENV === 'development' && console.log(`🔍 修复学员 ${studentName} (${examDate}) 的考官分配...`)

      // 获取学员科室
      const studentDept = assignment.student?.department || assignment.studentDepartment
      const normalizedStudentDept = this.normalizeDepartment(studentDept)

      // 分类考官
      const availableTeachers = teachers.filter(t => t.isActive !== false)
      const sameDeptTeachers = availableTeachers.filter(
        t => this.normalizeDepartment(t.department) === normalizedStudentDept
      )
      const diffDeptTeachers = availableTeachers.filter(
        t => this.normalizeDepartment(t.department) !== normalizedStudentDept
      )

      // 修复考官1（优先同科室）
      if (needsExaminer1 || hasDuplicateExaminers) {
        const examiner1 = this.selectBestExaminer1(
          sameDeptTeachers,
          diffDeptTeachers,
          assignment,
          fixedAssignments, // 🔧 传入所有分配以检查HC4约束
          normalizedStudentDept
        )
        if (examiner1) {
          assignment.examiner1 = examiner1
          fixDetails.push(
            `✅ 为${studentName}分配考官1: ${examiner1.name} (${examiner1.department})`
          )
          fixedCount++
        } else {
          fixDetails.push(`❌ 无法为${studentName}分配考官1`)
        }
      }

      // 修复考官2（优先不同科室）
      if (needsExaminer2 || hasDuplicateExaminers) {
        const examiner2 = this.selectBestExaminer2(
          diffDeptTeachers,
          sameDeptTeachers,
          assignment,
          assignment.examiner1,
          fixedAssignments // 🔧 传入所有分配以检查HC4约束
        )
        if (examiner2) {
          assignment.examiner2 = examiner2
          fixDetails.push(
            `✅ 为${studentName}分配考官2: ${examiner2.name} (${examiner2.department})`
          )
          fixedCount++
        } else {
          fixDetails.push(`❌ 无法为${studentName}分配考官2`)
        }
      }
    }

    // 统计剩余问题
    const remainingIssues = fixedAssignments.filter(assignment => {
      const hasExaminer1 = assignment.examiner1 && assignment.examiner1 !== '未分配'
      const hasExaminer2 = assignment.examiner2 && assignment.examiner2 !== '未分配'
      const noDuplicates =
        !assignment.examiner1 ||
        !assignment.examiner2 ||
        assignment.examiner1.id !== assignment.examiner2.id
      return !hasExaminer1 || !hasExaminer2 || !noDuplicates
    }).length

    process.env.NODE_ENV === 'development' && console.log(`🎯 考官分配修复完成: 修复${fixedCount}个问题，剩余${remainingIssues}个问题`)

    return {
      success: remainingIssues === 0,
      fixedCount,
      remainingIssues,
      details: fixDetails,
      assignments: fixedAssignments,
    }
  }

  /**
   * 选择最佳考官1（优先同科室）
   * 🔧 修复HC4约束：考虑同一天考官时间冲突
   */
  private selectBestExaminer1(
    sameDeptTeachers: any[],
    diffDeptTeachers: any[],
    assignment: any,
    allAssignments: any[],
    normalizedStudentDept: string
  ): any | null {
    if (sameDeptTeachers.length === 0) {
      return null
    }

    const validSameDeptTeachers = sameDeptTeachers.filter(t =>
      this.isValidExaminer1Department(normalizedStudentDept, this.normalizeDepartment(t.department))
    )

    if (validSameDeptTeachers.length === 0) {
      return null
    }

    const examiner = this.selectLeastBusyTeacher(validSameDeptTeachers, assignment, allAssignments)
    return examiner || null
  }

  /**
   * 选择最佳考官2（优先不同科室，避免与考官1重复）
   * 🔧 修复HC4约束：考虑同一天考官时间冲突
   */
  private selectBestExaminer2(
    diffDeptTeachers: any[],
    sameDeptTeachers: any[],
    assignment: any,
    examiner1: any,
    allAssignments: any[]
  ): any | null {
    const normalizedStudentDept = this.normalizeDepartment(
      assignment.student?.department || assignment.studentDepartment
    )
    const normalizedExaminer1Dept = this.normalizeDepartment(examiner1?.department)

    // 过滤掉考官1
    const examiner1Id = examiner1?.id
    const availableDiffDept = diffDeptTeachers
      .filter(t => t.id !== examiner1Id)
      .filter(t => {
        const dept = this.normalizeDepartment(t.department)
        return dept !== normalizedStudentDept && dept !== normalizedExaminer1Dept
      })
    const availableSameDept = sameDeptTeachers
      .filter(t => t.id !== examiner1Id)
      .filter(t => {
        const dept = this.normalizeDepartment(t.department)
        return dept !== normalizedStudentDept && dept !== normalizedExaminer1Dept
      })

    // 优先选择不同科室考官
    if (availableDiffDept.length > 0) {
      const examiner = this.selectLeastBusyTeacher(availableDiffDept, assignment, allAssignments)
      if (examiner) return examiner
    }

    // 如果没有不同科室考官，选择同科室考官（但不是考官1）
    if (availableSameDept.length > 0) {
      return this.selectLeastBusyTeacher(availableSameDept, assignment, allAssignments)
    }

    return null
  }

  /**
   * 选择工作负荷最轻的考官
   * 🔧 修复HC4约束：严格检查同一天考官时间冲突
   */
  private selectLeastBusyTeacher(
    teachers: any[],
    currentAssignment: any,
    allAssignments: any[]
  ): any | null {
    if (teachers.length === 0) return null

    const examDate = currentAssignment.examDate || currentAssignment.date
    const currentAssignmentId = currentAssignment.id

    // 过滤掉在同一天已有考试安排的考官（HC4约束）
    const availableTeachers = teachers.filter(teacher => {
      // 检查该考官在同一天是否已有考试安排
      const hasConflict = allAssignments.some(otherAssignment => {
        // 跳过当前分配本身
        if (otherAssignment.id === currentAssignmentId) {
          return false
        }

        const otherDate = otherAssignment.examDate || otherAssignment.date

        // 不同日期，无冲突
        if (otherDate !== examDate) {
          return false
        }

        // 同一天，检查该考官是否已被分配
        const examiner1Id = otherAssignment.examiner1?.id || otherAssignment.examiner1
        const examiner2Id = otherAssignment.examiner2?.id || otherAssignment.examiner2
        const backupId = otherAssignment.backupExaminer?.id || otherAssignment.backup

        const teacherId = teacher.id

        // 如果该考官在同一天已担任任何角色，则有冲突
        if (examiner1Id === teacherId || examiner2Id === teacherId || backupId === teacherId) {
          console.warn(`⚠️ [HC4约束] 考官${teacher.name}在${examDate}已有考试安排，跳过`)
          return true
        }

        return false
      })

      return !hasConflict
    })

    if (availableTeachers.length === 0) {
      console.warn(`❌ [HC4约束] 在${examDate}没有可用考官（所有候选考官都有时间冲突）`)
      return null
    }

    // 从可用考官中选择工作负荷最轻的
    // 统计每个考官的总工作量
    const teacherWorkloads = availableTeachers.map(teacher => {
      const workload = allAssignments.filter(assignment => {
        const examiner1Id = assignment.examiner1?.id || assignment.examiner1
        const examiner2Id = assignment.examiner2?.id || assignment.examiner2
        const backupId = assignment.backupExaminer?.id || assignment.backup

        return examiner1Id === teacher.id || examiner2Id === teacher.id || backupId === teacher.id
      }).length

      return { teacher, workload }
    })

    // 按工作负荷排序，选择最轻的
    teacherWorkloads.sort((a, b) => a.workload - b.workload)

    const selected = teacherWorkloads[0].teacher
    process.env.NODE_ENV === 'development' && console.log(
      `✅ [HC4约束] 选择考官${selected.name}（工作量：${teacherWorkloads[0].workload}场）`
    )

    return selected
  }
}

// 导出单例
export const examinerAssignmentFixer = new ExaminerAssignmentFixer()
