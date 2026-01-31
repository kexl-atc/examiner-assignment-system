/**
 * 数据验证服务
 * 用于验证排班数据的完整性和正确性
 */

export interface ValidationError {
  type: 'error' | 'warning'
  code: string
  message: string
  studentId?: string
  studentName?: string
  details?: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  fixedData?: any
}

export class DataValidationService {
  /**
   * 验证排班结果
   */
  static validateScheduleResult(result: any): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    let fixedData = JSON.parse(JSON.stringify(result)) // 深拷贝

    if (!result || !result.assignments) {
      errors.push({
        type: 'error',
        code: 'MISSING_DATA',
        message: '排班结果数据缺失',
      })
      return { isValid: false, errors, warnings }
    }

    // 验证每个分配
    for (let i = 0; i < fixedData.assignments.length; i++) {
      const assignment = fixedData.assignments[i]
      const originalAssignment = result.assignments[i]

      this.validateSingleAssignment(assignment, originalAssignment, errors, warnings, fixedData)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fixedData: errors.length === 0 ? fixedData : result,
    }
  }

  /**
   * 验证单个分配
   */
  private static validateSingleAssignment(
    assignment: any,
    originalAssignment: any,
    errors: ValidationError[],
    warnings: ValidationError[],
    fixedData: any
  ) {
    const studentName = assignment.studentName || '未知学员'
    const studentId = assignment.studentId || assignment.id

    // 检查考官1和考官2是否相同
    if (assignment.examiner1 && assignment.examiner2) {
      const examiner1Name = this.getExaminerName(assignment.examiner1)
      const examiner2Name = this.getExaminerName(assignment.examiner2)

      if (examiner1Name === examiner2Name && examiner1Name !== '未分配') {
        // 先修复：将考官2设为未分配
        console.warn(`🔧 修复数据：${studentName}的重复考官问题`)
        assignment.examiner2 = '未分配'

        // 只添加警告，不添加错误（因为已经修复了）
        warnings.push({
          type: 'warning',
          code: 'DATA_FIXED',
          message: `已修复${studentName}的重复考官问题，考官2已设为未分配`,
          studentId,
          studentName,
          details: { originalExaminer1: examiner1Name, originalExaminer2: examiner2Name },
        })
      }
    }

    // 检查考官分配完整性
    if (!assignment.examiner1 || this.getExaminerName(assignment.examiner1) === '未分配') {
      warnings.push({
        type: 'warning',
        code: 'MISSING_EXAMINER1',
        message: `学员${studentName}缺少考官1`,
        studentId,
        studentName,
      })
    }

    if (!assignment.examiner2 || this.getExaminerName(assignment.examiner2) === '未分配') {
      warnings.push({
        type: 'warning',
        code: 'MISSING_EXAMINER2',
        message: `学员${studentName}缺少考官2`,
        studentId,
        studentName,
      })
    }

    // 检查考试日期
    if (!assignment.examDate) {
      errors.push({
        type: 'error',
        code: 'MISSING_EXAM_DATE',
        message: `学员${studentName}缺少考试日期`,
        studentId,
        studentName,
      })
    }
  }

  /**
   * 获取考官姓名
   */
  private static getExaminerName(examiner: any): string {
    if (!examiner) return '未分配'
    if (typeof examiner === 'string') return examiner
    if (examiner.name) return examiner.name
    return '未分配'
  }

  /**
   * 验证学员数据
   */
  static validateStudentData(students: any[]): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!Array.isArray(students) || students.length === 0) {
      errors.push({
        type: 'error',
        code: 'NO_STUDENTS',
        message: '没有学员数据',
      })
      return { isValid: false, errors, warnings }
    }

    students.forEach((student, index) => {
      if (!student.name || !student.name.trim()) {
        errors.push({
          type: 'error',
          code: 'MISSING_STUDENT_NAME',
          message: `第${index + 1}个学员缺少姓名`,
          studentId: student.id,
        })
      }

      if (!student.department) {
        warnings.push({
          type: 'warning',
          code: 'MISSING_STUDENT_DEPARTMENT',
          message: `学员${student.name || '未知'}缺少科室信息`,
          studentId: student.id,
          studentName: student.name,
        })
      }
    })

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * 验证考官数据
   */
  static validateTeacherData(teachers: any[]): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    if (!Array.isArray(teachers) || teachers.length === 0) {
      errors.push({
        type: 'error',
        code: 'NO_TEACHERS',
        message: '没有考官数据',
      })
      return { isValid: false, errors, warnings }
    }

    const teacherNames = new Set()
    const duplicateNames = new Set()

    teachers.forEach((teacher, index) => {
      if (!teacher.name || !teacher.name.trim()) {
        errors.push({
          type: 'error',
          code: 'MISSING_TEACHER_NAME',
          message: `第${index + 1}个考官缺少姓名`,
        })
        return
      }

      // 检查重名
      if (teacherNames.has(teacher.name)) {
        duplicateNames.add(teacher.name)
      } else {
        teacherNames.add(teacher.name)
      }

      if (!teacher.department) {
        warnings.push({
          type: 'warning',
          code: 'MISSING_TEACHER_DEPARTMENT',
          message: `考官${teacher.name}缺少科室信息`,
        })
      }
    })

    // 报告重名考官
    duplicateNames.forEach(name => {
      warnings.push({
        type: 'warning',
        code: 'DUPLICATE_TEACHER_NAME',
        message: `考官姓名重复: ${name}`,
      })
    })

    return { isValid: errors.length === 0, errors, warnings }
  }

  /**
   * 生成验证报告
   */
  static generateValidationReport(result: ValidationResult): string {
    let report = '=== 数据验证报告 ===\n'

    report += `验证状态: ${result.isValid ? '✅ 通过' : '❌ 失败'}\n`
    report += `错误数量: ${result.errors.length}\n`
    report += `警告数量: ${result.warnings.length}\n\n`

    if (result.errors.length > 0) {
      report += '错误详情:\n'
      result.errors.forEach((error, index) => {
        report += `${index + 1}. [${error.code}] ${error.message}\n`
      })
      report += '\n'
    }

    if (result.warnings.length > 0) {
      report += '警告详情:\n'
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. [${warning.code}] ${warning.message}\n`
      })
    }

    return report
  }
}
