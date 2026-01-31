/**
 * HC2硬约束违反检测器
 * 用于检测排班结果中的考官1科室违反情况
 */

export interface HC2Violation {
  学员: string
  学员科室: string
  考试日期: string
  考官1: string
  考官1科室: string
  考官2: string
  考官2科室: string
  违反类型: string
  详细描述: string
}

export class HC2ViolationDetector {
  /**
   * 规范化科室名称
   */
  private static normalizeDepartment(department: string | null | undefined): string | null {
    if (!department) return null

    const normalized = department.trim()

    // 标准化映射
    if (
      normalized.includes('区域一室') ||
      normalized.includes('一室') ||
      normalized.includes('1室')
    )
      return '一'
    if (
      normalized.includes('区域二室') ||
      normalized.includes('二室') ||
      normalized.includes('2室')
    )
      return '二'
    if (
      normalized.includes('区域三室') ||
      normalized.includes('三室') ||
      normalized.includes('3室')
    )
      return '三'
    if (
      normalized.includes('区域四室') ||
      normalized.includes('四室') ||
      normalized.includes('4室')
    )
      return '四'
    if (
      normalized.includes('区域五室') ||
      normalized.includes('五室') ||
      normalized.includes('5室')
    )
      return '五'
    if (
      normalized.includes('区域六室') ||
      normalized.includes('六室') ||
      normalized.includes('6室')
    )
      return '六'
    if (
      normalized.includes('区域七室') ||
      normalized.includes('七室') ||
      normalized.includes('7室')
    )
      return '七'
    if (
      normalized.includes('区域八室') ||
      normalized.includes('八室') ||
      normalized.includes('8室')
    )
      return '八'
    if (
      normalized.includes('区域九室') ||
      normalized.includes('九室') ||
      normalized.includes('9室')
    )
      return '九'
    if (
      normalized.includes('区域十室') ||
      normalized.includes('十室') ||
      normalized.includes('10室')
    )
      return '十'

    // 保留原始值（用于行政班等特殊科室）
    return normalized
  }

  /**
   * 检查考官1是否符合HC2约束
   */
  private static isValidExaminer1Department(studentDept: string, examiner1Dept: string): boolean {
    if (!studentDept || !examiner1Dept) return false

    // 同科室（优先匹配）
    if (studentDept === examiner1Dept) {
      return true
    }

    // 三室七室互通（特殊规则）
    if (
      (studentDept === '三' && examiner1Dept === '七') ||
      (studentDept === '七' && examiner1Dept === '三')
    ) {
      return true
    }

    return false
  }

  /**
   * 检查考官2是否符合约束（不能与学员同科室）
   */
  private static isValidExaminer2Department(studentDept: string, examiner2Dept: string): boolean {
    if (!studentDept || !examiner2Dept) return false

    // 考官2必须与学员不同科室
    return studentDept !== examiner2Dept
  }

  /**
   * 检查两个考官是否来自不同科室
   */
  private static areExaminersDifferent(examiner1Dept: string, examiner2Dept: string): boolean {
    if (!examiner1Dept || !examiner2Dept) return false
    return examiner1Dept !== examiner2Dept
  }

  /**
   * 检测单个排班记录的HC2违反
   */
  static detectViolationInRecord(record: any, teachers: any[]): HC2Violation[] {
    const violations: HC2Violation[] = []
    const studentDept = this.normalizeDepartment(record.department)

    if (!studentDept) {
      console.warn(`学员 ${record.student} 没有科室信息`)
      return violations
    }

    // 检查第一天
    if (record.examiner1_1) {
      const teacher1 = teachers.find(t => t.name === record.examiner1_1)
      const teacher2 = teachers.find(t => t.name === record.examiner1_2)

      const examiner1Dept = this.normalizeDepartment(teacher1?.department)
      const examiner2Dept = this.normalizeDepartment(teacher2?.department)

      if (examiner1Dept && !this.isValidExaminer1Department(studentDept, examiner1Dept)) {
        violations.push({
          学员: record.student,
          学员科室: studentDept,
          考试日期: record.date1,
          考官1: record.examiner1_1,
          考官1科室: examiner1Dept,
          考官2: record.examiner1_2 || '未分配',
          考官2科室: examiner2Dept || '未知',
          违反类型: 'HC2-考官1科室不匹配',
          详细描述: `学员来自"${studentDept}"室，考官1来自"${examiner1Dept}"室，违反HC2约束（考官1必须与学员同科室或三七互通）`,
        })
      }

      if (examiner2Dept && !this.isValidExaminer2Department(studentDept, examiner2Dept)) {
        violations.push({
          学员: record.student,
          学员科室: studentDept,
          考试日期: record.date1,
          考官1: record.examiner1_1,
          考官1科室: examiner1Dept || '未知',
          考官2: record.examiner1_2,
          考官2科室: examiner2Dept,
          违反类型: 'HC2-考官2与学员同科室',
          详细描述: `学员来自"${studentDept}"室，考官2来自"${examiner2Dept}"室，违反HC2约束（考官2必须与学员不同科室）`,
        })
      }

      if (
        examiner1Dept &&
        examiner2Dept &&
        !this.areExaminersDifferent(examiner1Dept, examiner2Dept)
      ) {
        violations.push({
          学员: record.student,
          学员科室: studentDept,
          考试日期: record.date1,
          考官1: record.examiner1_1,
          考官1科室: examiner1Dept,
          考官2: record.examiner1_2,
          考官2科室: examiner2Dept,
          违反类型: 'HC2-两考官同科室',
          详细描述: `考官1和考官2都来自"${examiner1Dept}"室，违反HC2约束（两名考官必须来自不同科室）`,
        })
      }
    }

    // 检查第二天
    if (record.examiner2_1) {
      const teacher1 = teachers.find(t => t.name === record.examiner2_1)
      const teacher2 = teachers.find(t => t.name === record.examiner2_2)

      const examiner1Dept = this.normalizeDepartment(teacher1?.department)
      const examiner2Dept = this.normalizeDepartment(teacher2?.department)

      if (examiner1Dept && !this.isValidExaminer1Department(studentDept, examiner1Dept)) {
        violations.push({
          学员: record.student,
          学员科室: studentDept,
          考试日期: record.date2,
          考官1: record.examiner2_1,
          考官1科室: examiner1Dept,
          考官2: record.examiner2_2 || '未分配',
          考官2科室: examiner2Dept || '未知',
          违反类型: 'HC2-考官1科室不匹配',
          详细描述: `学员来自"${studentDept}"室，考官1来自"${examiner1Dept}"室，违反HC2约束（考官1必须与学员同科室或三七互通）`,
        })
      }

      if (examiner2Dept && !this.isValidExaminer2Department(studentDept, examiner2Dept)) {
        violations.push({
          学员: record.student,
          学员科室: studentDept,
          考试日期: record.date2,
          考官1: record.examiner2_1,
          考官1科室: examiner1Dept || '未知',
          考官2: record.examiner2_2,
          考官2科室: examiner2Dept,
          违反类型: 'HC2-考官2与学员同科室',
          详细描述: `学员来自"${studentDept}"室，考官2来自"${examiner2Dept}"室，违反HC2约束（考官2必须与学员不同科室）`,
        })
      }

      if (
        examiner1Dept &&
        examiner2Dept &&
        !this.areExaminersDifferent(examiner1Dept, examiner2Dept)
      ) {
        violations.push({
          学员: record.student,
          学员科室: studentDept,
          考试日期: record.date2,
          考官1: record.examiner2_1,
          考官1科室: examiner1Dept,
          考官2: record.examiner2_2,
          考官2科室: examiner2Dept,
          违反类型: 'HC2-两考官同科室',
          详细描述: `考官1和考官2都来自"${examiner1Dept}"室，违反HC2约束（两名考官必须来自不同科室）`,
        })
      }
    }

    return violations
  }

  /**
   * 检测所有排班结果的HC2违反
   */
  static detectAllViolations(scheduleResults: any[], teachers: any[]): HC2Violation[] {
    const allViolations: HC2Violation[] = []

    scheduleResults.forEach(record => {
      const violations = this.detectViolationInRecord(record, teachers)
      allViolations.push(...violations)
    })

    return allViolations
  }

  /**
   * 生成HC2违反报告
   */
  static generateViolationReport(violations: HC2Violation[]): string {
    if (violations.length === 0) {
      return '✅ 没有发现HC2约束违反'
    }

    let report = `🚫 发现 ${violations.length} 个HC2约束违反：\n\n`

    violations.forEach((v, index) => {
      report += `${index + 1}. ${v.学员}（${v.学员科室}室）- ${v.考试日期}\n`
      report += `   违反类型: ${v.违反类型}\n`
      report += `   考官1: ${v.考官1}（${v.考官1科室}室）\n`
      report += `   考官2: ${v.考官2}（${v.考官2科室}室）\n`
      report += `   详情: ${v.详细描述}\n\n`
    })

    return report
  }

  /**
   * 获取修复建议
   */
  static getFixSuggestions(violation: HC2Violation, teachers: any[]): string[] {
    const suggestions: string[] = []
    const studentDept = violation.学员科室

    // 查找符合条件的考官
    const validExaminer1s = teachers.filter(t => {
      const dept = this.normalizeDepartment(t.department)
      return dept && this.isValidExaminer1Department(studentDept, dept)
    })

    if (validExaminer1s.length > 0) {
      suggestions.push(
        `建议将考官1更换为以下考官之一：${validExaminer1s.map(t => `${t.name}（${t.department}）`).join(', ')}`
      )
    } else {
      suggestions.push(`⚠️ 警告：没有找到符合"${studentDept}"室要求的考官1候选人！`)
    }

    return suggestions
  }
}

// 导出单例
export const hc2ViolationDetector = new HC2ViolationDetector()
