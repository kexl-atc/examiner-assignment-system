/**
 * 前端数据显示修复脚本
 * 解决前端显示与后端结果不一致的问题
 */

export class FrontendDisplayFixer {
  /**
   * 修复考官姓名映射问题
   */
  static fixTeacherNameMapping(assignments: any[], teachers: any[]): any[] {
    const teacherMap = new Map()
    teachers.forEach(teacher => {
      if (teacher && teacher.id && teacher.name) {
        teacherMap.set(teacher.id, teacher.name)
      }
    })

    return assignments.map(assignment => {
      const fixed = { ...assignment }

      // 修复考官1姓名
      if (assignment.examiner1) {
        fixed.examiner1 = this.extractTeacherName(assignment.examiner1, teacherMap)
      }

      // 修复考官2姓名
      if (assignment.examiner2) {
        fixed.examiner2 = this.extractTeacherName(assignment.examiner2, teacherMap)
      }

      // 修复备份考官姓名
      if (assignment.backupExaminer) {
        fixed.backupExaminer = this.extractTeacherName(assignment.backupExaminer, teacherMap)
      }

      return fixed
    })
  }

  /**
   * 提取考官姓名的统一方法
   */
  private static extractTeacherName(teacherData: any, teacherMap: Map<string, string>): string {
    if (!teacherData) {
      return '未分配'
    }

    // 如果是Teacher对象
    if (typeof teacherData === 'object' && teacherData !== null) {
      // 优先使用对象的name属性
      if (teacherData.name && typeof teacherData.name === 'string') {
        return teacherData.name.trim()
      }
      // 如果有id，从映射表查找
      if (teacherData.id) {
        return teacherMap.get(teacherData.id) || `考官${teacherData.id}`
      }
    }

    // 如果是字符串
    if (typeof teacherData === 'string') {
      const trimmed = teacherData.trim()
      // 如果是数字ID，从映射表查找
      if (/^\d+$/.test(trimmed)) {
        return teacherMap.get(trimmed) || `考官${trimmed}`
      }
      // 否则认为是姓名
      return trimmed
    }

    return '未知考官'
  }

  /**
   * 修复日期排序问题
   */
  static fixDateSorting(assignments: any[]): any[] {
    return assignments.sort((a, b) => {
      const dateA = new Date(a.examDate)
      const dateB = new Date(b.examDate)
      return dateA.getTime() - dateB.getTime()
    })
  }

  /**
   * 验证排班结果完整性
   */
  static validateScheduleResult(result: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!result || !result.assignments) {
      errors.push('排班结果为空或缺少assignments字段')
      return { isValid: false, errors }
    }

    result.assignments.forEach((assignment: any, index: number) => {
      if (!assignment.studentId || !assignment.studentName) {
        errors.push(`第${index + 1}个assignment缺少学员信息`)
      }

      if (!assignment.examDate) {
        errors.push(`第${index + 1}个assignment缺少考试日期`)
      }

      // 检查考官重复问题
      if (assignment.examiner1 === assignment.examiner2) {
        errors.push(`第${index + 1}个assignment考官1和考官2相同`)
      }

      if (assignment.examiner1 === assignment.backupExaminer) {
        errors.push(`第${index + 1}个assignment考官1和备份考官相同`)
      }

      if (assignment.examiner2 === assignment.backupExaminer) {
        errors.push(`第${index + 1}个assignment考官2和备份考官相同`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 修复排班结果显示问题
   */
  static fixScheduleResultDisplay(result: any, teachers: any[]): any {
    if (!result || !result.assignments) {
      return result
    }

    // 修复考官姓名映射
    const fixedAssignments = this.fixTeacherNameMapping(result.assignments, teachers)

    // 修复日期排序
    const sortedAssignments = this.fixDateSorting(fixedAssignments)

    return {
      ...result,
      assignments: sortedAssignments,
    }
  }

  /**
   * 修复表格数据显示问题
   */
  static fixTableDataDisplay(scheduleResults: any[], teachers: any[]): any[] {
    const teacherMap = new Map()
    teachers.forEach(teacher => {
      if (teacher && teacher.id && teacher.name) {
        teacherMap.set(teacher.id, teacher.name)
      }
    })

    return scheduleResults.map(result => {
      const fixed = { ...result }

      // 修复考官姓名显示
      const fieldsToFix = [
        'examiner1_1',
        'examiner1_2',
        'backup1',
        'examiner2_1',
        'examiner2_2',
        'backup2',
      ]

      fieldsToFix.forEach(field => {
        if (result[field]) {
          fixed[field] = this.extractTeacherName(result[field], teacherMap)
        }
      })

      return fixed
    })
  }

  /**
   * 检查并修复数据一致性
   */
  static checkAndFixDataConsistency(
    backendResult: any,
    frontendDisplay: any[],
    teachers: any[]
  ): {
    isConsistent: boolean
    fixedDisplay: any[]
    issues: string[]
  } {
    const issues: string[] = []
    let isConsistent = true

    // 检查后端结果和前端显示的数据量是否一致
    if (backendResult.assignments && backendResult.assignments.length !== frontendDisplay.length) {
      issues.push(
        `数据量不一致：后端${backendResult.assignments.length}条，前端${frontendDisplay.length}条`
      )
      isConsistent = false
    }

    // 修复前端显示数据
    const fixedDisplay = this.fixTableDataDisplay(frontendDisplay, teachers)

    return {
      isConsistent,
      fixedDisplay,
      issues,
    }
  }
}
