/**
 * 排班数据验证脚本
 * 在排班前验证数据完整性，避免硬约束违反
 */

export class SchedulingDataValidator {
  /**
   * 验证考官数据完整性
   */
  static validateTeachers(teachers: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    teachers.forEach((teacher, index) => {
      if (!teacher.id) {
        errors.push(`考官${index + 1}缺少ID`)
      }
      if (!teacher.name) {
        errors.push(`考官${index + 1}缺少姓名`)
      }
      if (!teacher.department) {
        errors.push(`考官${index + 1}缺少科室信息`)
      }
      if (!teacher.group) {
        errors.push(`考官${index + 1}缺少班组信息`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 验证学员数据完整性
   */
  static validateStudents(students: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    students.forEach((student, index) => {
      if (!student.id) {
        errors.push(`学员${index + 1}缺少ID`)
      }
      if (!student.name) {
        errors.push(`学员${index + 1}缺少姓名`)
      }
      if (!student.department) {
        errors.push(`学员${index + 1}缺少科室信息`)
      }
      if (!student.group) {
        errors.push(`学员${index + 1}缺少班组信息`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 验证科室考官数量是否充足
   */
  static validateDepartmentTeacherCount(
    students: any[],
    teachers: any[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const departmentCounts: { [key: string]: number } = {}

    // 统计每个科室的考官数量
    teachers.forEach(teacher => {
      const dept = teacher.department
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1
    })

    // 统计每个科室的学员数量
    const studentCounts: { [key: string]: number } = {}
    students.forEach(student => {
      const dept = student.department
      studentCounts[dept] = (studentCounts[dept] || 0) + 1
    })

    // 检查每个科室是否有足够的考官
    Object.keys(studentCounts).forEach(dept => {
      const studentCount = studentCounts[dept]
      const teacherCount = departmentCounts[dept] || 0

      // 每个学员需要2个考官，所以需要至少2倍数量的考官
      if (teacherCount < studentCount * 2) {
        errors.push(
          `科室 ${dept} 考官数量不足：需要至少 ${studentCount * 2} 名，实际只有 ${teacherCount} 名`
        )
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 验证轮班数据完整性
   */
  static validateDutySchedules(dutySchedules: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    dutySchedules.forEach((schedule, index) => {
      if (!schedule.date) {
        errors.push(`轮班${index + 1}缺少日期`)
      }
      if (!schedule.dayShift) {
        errors.push(`轮班${index + 1}缺少白班班组`)
      }
      if (!schedule.nightShift) {
        errors.push(`轮班${index + 1}缺少晚班班组`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 综合验证所有数据
   */
  static validateAllData(
    students: any[],
    teachers: any[],
    dutySchedules: any[]
  ): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const allErrors: string[] = []
    const warnings: string[] = []

    // 验证考官数据
    const teacherValidation = this.validateTeachers(teachers)
    allErrors.push(...teacherValidation.errors)

    // 验证学员数据
    const studentValidation = this.validateStudents(students)
    allErrors.push(...studentValidation.errors)

    // 验证轮班数据
    const dutyValidation = this.validateDutySchedules(dutySchedules)
    allErrors.push(...dutyValidation.errors)

    // 验证科室考官数量
    const departmentValidation = this.validateDepartmentTeacherCount(students, teachers)
    allErrors.push(...departmentValidation.errors)

    // 检查是否有重复的考官ID
    const teacherIds = teachers.map(t => t.id).filter(id => id)
    const uniqueTeacherIds = new Set(teacherIds)
    if (teacherIds.length !== uniqueTeacherIds.size) {
      allErrors.push('存在重复的考官ID')
    }

    // 检查是否有重复的学员ID
    const studentIds = students.map(s => s.id).filter(id => id)
    const uniqueStudentIds = new Set(studentIds)
    if (studentIds.length !== uniqueStudentIds.size) {
      allErrors.push('存在重复的学员ID')
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings,
    }
  }
}
