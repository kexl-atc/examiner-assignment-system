/**
 * 排班约束检查工具
 * 用于在前端独立验证排班结果是否满足所有硬约束
 */

export interface ConstraintViolation {
  constraintId: string
  constraintName: string
  severity: 'hard' | 'soft'
  studentName: string
  examDate: string
  examType: string
  description: string
  details: Record<string, any>
}

export interface ConstraintCheckResult {
  hardViolations: ConstraintViolation[]
  softViolations: ConstraintViolation[]
  summary: {
    totalHardViolations: number
    totalSoftViolations: number
    constraintGroups: Record<string, number>
  }
}

/**
 * 科室名称标准化（与后端保持一致）
 */
function normalizeDepartment(dept: string | null | undefined): string | null {
  if (!dept) return null

  const normalized = dept.trim()

  // 检测非法科室名称（考试科目关键词）
  const illegalKeywords = ['模拟机', '现场', '口试', '理论', '实操', '实践', '笔试']
  for (const keyword of illegalKeywords) {
    if (normalized.includes(keyword)) {
      console.error(
        `🚨 [数据错误] 检测到非法科室名称: "${normalized}" - 这可能是考试科目，不是科室！`
      )
      return null
    }
  }

  // 标准化映射
  if (
    normalized.includes('区域一室') ||
    normalized.includes('一室') ||
    normalized.includes('1室') ||
    normalized.includes('第1科室')
  )
    return '一'
  if (
    normalized.includes('区域二室') ||
    normalized.includes('二室') ||
    normalized.includes('2室') ||
    normalized.includes('第2科室')
  )
    return '二'
  if (
    normalized.includes('区域三室') ||
    normalized.includes('三室') ||
    normalized.includes('3室') ||
    normalized.includes('第3科室')
  )
    return '三'
  if (
    normalized.includes('区域四室') ||
    normalized.includes('四室') ||
    normalized.includes('4室') ||
    normalized.includes('第4科室')
  )
    return '四'
  if (
    normalized.includes('区域五室') ||
    normalized.includes('五室') ||
    normalized.includes('5室') ||
    normalized.includes('第5科室')
  )
    return '五'
  if (
    normalized.includes('区域六室') ||
    normalized.includes('六室') ||
    normalized.includes('6室') ||
    normalized.includes('第6科室')
  )
    return '六'
  if (
    normalized.includes('区域七室') ||
    normalized.includes('七室') ||
    normalized.includes('7室') ||
    normalized.includes('第7科室')
  )
    return '七'
  if (
    normalized.includes('区域八室') ||
    normalized.includes('八室') ||
    normalized.includes('8室') ||
    normalized.includes('第8科室')
  )
    return '八'
  if (
    normalized.includes('区域九室') ||
    normalized.includes('九室') ||
    normalized.includes('9室') ||
    normalized.includes('第9科室')
  )
    return '九'
  if (
    normalized.includes('区域十室') ||
    normalized.includes('十室') ||
    normalized.includes('10室') ||
    normalized.includes('第10科室')
  )
    return '十'

  return normalized
}

/**
 * 检查考官1科室是否有效（与后端逻辑一致）
 */
function isValidExaminer1Department(
  studentDept: string | null,
  examiner1Dept: string | null
): boolean {
  if (!studentDept || !examiner1Dept) return false

  // 同科室
  if (studentDept === examiner1Dept) {
    return true
  }

  // 三室七室互通
  if (
    (studentDept === '三' && examiner1Dept === '七') ||
    (studentDept === '七' && examiner1Dept === '三')
  ) {
    return true
  }

  return false
}

/**
 * 检查排班结果的所有约束违反
 */
export function checkScheduleConstraints(assignments: any[]): ConstraintCheckResult {
  const hardViolations: ConstraintViolation[] = []
  const softViolations: ConstraintViolation[] = []
  const constraintGroups: Record<string, number> = {}

  // 遍历所有排班记录
  for (const assignment of assignments) {
    const studentName = assignment.studentName || assignment.student?.name || assignment.学员
    const studentDept = normalizeDepartment(
      assignment.studentDepartment || assignment.student?.department || assignment.所属科室
    )
    const examDate = assignment.examDate || assignment.考试日期
    const examType = assignment.examType || assignment.考试类型

    // 检查HC2：考官1与学员同科室
    if (assignment.examiner1 || assignment.考官一) {
      const examiner1Name = assignment.examiner1?.name || assignment.考官一
      const examiner1Dept = normalizeDepartment(
        assignment.examiner1?.department || extractDepartment(examiner1Name)
      )

      if (studentDept !== null && examiner1Dept !== null && !isValidExaminer1Department(studentDept, examiner1Dept)) {
        const violation: ConstraintViolation = {
          constraintId: 'HC2',
          constraintName: '考官1与学员同科室',
          severity: 'hard',
          studentName,
          examDate,
          examType,
          description: `考官1科室不匹配：学员(${studentDept}) vs 考官1(${examiner1Dept})`,
          details: {
            studentDept,
            examiner1Name,
            examiner1Dept,
            examiner1Raw: assignment.examiner1?.department || examiner1Name,
          },
        }
        hardViolations.push(violation)
        constraintGroups['HC2'] = (constraintGroups['HC2'] || 0) + 1

        console.error('🚫 [HC2违反]', violation)
      }
    }

    // 检查HC2：考官2与学员不同科室
    if (assignment.examiner2 || assignment.考官二) {
      const examiner2Name = assignment.examiner2?.name || assignment.考官二
      const examiner2Dept = normalizeDepartment(
        assignment.examiner2?.department || extractDepartment(examiner2Name)
      )

      if (studentDept !== null && examiner2Dept !== null && studentDept === examiner2Dept) {
        const violation: ConstraintViolation = {
          constraintId: 'HC2',
          constraintName: '考官2与学员不同科室',
          severity: 'hard',
          studentName,
          examDate,
          examType,
          description: `考官2与学员同科室：学员(${studentDept}) = 考官2(${examiner2Dept})`,
          details: {
            studentDept,
            examiner2Name,
            examiner2Dept,
            examiner2Raw: assignment.examiner2?.department || examiner2Name,
          },
        }
        hardViolations.push(violation)
        constraintGroups['HC2'] = (constraintGroups['HC2'] || 0) + 1

        console.error('🚫 [HC2违反]', violation)
      }
    }

    // 检查HC7：考官1和考官2不同科室
    if (
      (assignment.examiner1 || assignment.考官一) &&
      (assignment.examiner2 || assignment.考官二)
    ) {
      const examiner1Dept = normalizeDepartment(
        assignment.examiner1?.department || extractDepartment(assignment.考官一)
      )
      const examiner2Dept = normalizeDepartment(
        assignment.examiner2?.department || extractDepartment(assignment.考官二)
      )

      if (examiner1Dept !== null && examiner2Dept !== null && examiner1Dept === examiner2Dept) {
        const violation: ConstraintViolation = {
          constraintId: 'HC7',
          constraintName: '两名考官不同科室',
          severity: 'hard',
          studentName,
          examDate,
          examType,
          description: `考官1和考官2来自同一科室：${examiner1Dept}`,
          details: {
            examiner1Dept,
            examiner2Dept,
          },
        }
        hardViolations.push(violation)
        constraintGroups['HC7'] = (constraintGroups['HC7'] || 0) + 1

        console.error('🚫 [HC7违反]', violation)
      }
    }
  }

  return {
    hardViolations,
    softViolations,
    summary: {
      totalHardViolations: hardViolations.length,
      totalSoftViolations: softViolations.length,
      constraintGroups,
    },
  }
}

/**
 * 从考官名称中提取科室信息（如果名称中包含科室）
 */
function extractDepartment(examinerName: string): string | null {
  if (!examinerName) return null

  // 尝试从名称中提取科室（例如："张三(区域二室)"）
  const match = examinerName.match(/[（(](.+?)[）)]/)
  if (match) {
    return match[1]
  }

  return null
}

/**
 * 打印约束检查结果
 */
export function printConstraintCheckResult(result: ConstraintCheckResult): void {
  process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('='.repeat(80))
  process.env.NODE_ENV === 'development' && console.log('📋 排班约束检查报告')
  console.log('='.repeat(80))

  process.env.NODE_ENV === 'development' && console.log(`\n硬约束违反数量：${result.summary.totalHardViolations}`)
  process.env.NODE_ENV === 'development' && console.log(`软约束违反数量：${result.summary.totalSoftViolations}`)

  if (result.summary.totalHardViolations > 0) {
    process.env.NODE_ENV === 'development' && console.log('\n🚫 硬约束违反详情：')
    console.table(
      result.hardViolations.map(v => ({
        约束: v.constraintName,
        学员: v.studentName,
        日期: v.examDate,
        类型: v.examType,
        描述: v.description,
      }))
    )
  } else {
    process.env.NODE_ENV === 'development' && console.log('\n✅ 所有硬约束均已满足')
  }

  if (Object.keys(result.summary.constraintGroups).length > 0) {
    process.env.NODE_ENV === 'development' && console.log('\n📊 约束违反分布：')
    console.table(result.summary.constraintGroups)
  }

  console.log('='.repeat(80))
}
