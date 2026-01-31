/**
 * 约束违反检查工具
 * 用于分析排班结果中的软约束违反情况
 */

import { dutyRotationService } from '../services/dutyRotationService'

export interface SoftConstraintViolation {
  constraintId: string
  constraintName: string
  violationCount: number
  penaltyScore: number
  severity: 'low' | 'medium' | 'high'
  violations: ViolationDetail[]
}

export interface ViolationDetail {
  studentName: string
  examDate: string
  description: string
  recommendedFix: string
}

/**
 * 检查软约束违反情况
 */
export class ConstraintViolationChecker {
  /**
   * SC1: 晚班考官优先 (权重: 100)
   */
  static checkNightShiftPriority(assignments: any[], dutySchedule: any): SoftConstraintViolation {
    const violations: ViolationDetail[] = []

    assignments.forEach(assignment => {
      const examDate = assignment.examDate || assignment.date1
      if (!examDate) return

      // 获取当天的晚班组
      const nightShiftGroup = this.getNightShiftGroup(examDate, dutySchedule)

      // 检查考官1
      const examiner1Group = this.extractGroup(assignment.examiner1_1)
      if (examiner1Group && examiner1Group !== nightShiftGroup) {
        violations.push({
          studentName: assignment.student || assignment.studentName,
          examDate: examDate,
          description: `考官1不是晚班（当天晚班：${nightShiftGroup}组，实际：${examiner1Group}组）`,
          recommendedFix: `建议使用${nightShiftGroup}组的考官`,
        })
      }

      // 检查考官2
      const examiner2Group = this.extractGroup(assignment.examiner1_2)
      if (examiner2Group && examiner2Group !== nightShiftGroup) {
        violations.push({
          studentName: assignment.student || assignment.studentName,
          examDate: examDate,
          description: `考官2不是晚班（当天晚班：${nightShiftGroup}组，实际：${examiner2Group}组）`,
          recommendedFix: `建议使用${nightShiftGroup}组的考官`,
        })
      }
    })

    return {
      constraintId: 'SC1',
      constraintName: '晚班考官优先',
      violationCount: violations.length,
      penaltyScore: violations.length * 100,
      severity: violations.length > 5 ? 'high' : violations.length > 2 ? 'medium' : 'low',
      violations,
    }
  }

  /**
   * SC2: 考官2专业匹配 (权重: 90)
   */
  static checkExaminer2ProfessionalMatch(
    assignments: any[],
    studentData: any[]
  ): SoftConstraintViolation {
    const violations: ViolationDetail[] = []

    assignments.forEach(assignment => {
      const studentName = assignment.student || assignment.studentName
      const student = studentData.find(s => s.name === studentName)

      if (!student) return

      // 获取推荐科室池
      const recommendedDepts = this.getRecommendedDepartments(student)

      // 检查考官2科室
      const examiner2Dept = this.extractDepartment(assignment.examiner1_2)

      if (examiner2Dept && !recommendedDepts.includes(examiner2Dept)) {
        violations.push({
          studentName: studentName,
          examDate: assignment.examDate || assignment.date1,
          description: `考官2科室不在推荐池中（推荐：${recommendedDepts.join('、')}，实际：${examiner2Dept}）`,
          recommendedFix: `建议从${recommendedDepts.join('或')}中选择考官2`,
        })
      }
    })

    return {
      constraintId: 'SC2',
      constraintName: '考官2专业匹配',
      violationCount: violations.length,
      penaltyScore: violations.length * 90,
      severity: violations.length > 10 ? 'high' : violations.length > 5 ? 'medium' : 'low',
      violations,
    }
  }

  /**
   * SC11: 日期分配均衡 (权重: 50)
   */
  static checkDateDistribution(assignments: any[]): SoftConstraintViolation {
    const violations: ViolationDetail[] = []
    const dateCount = new Map<string, string[]>()

    // 统计每个日期的学员数
    assignments.forEach(assignment => {
      const examDate = assignment.examDate || assignment.date1
      const studentName = assignment.student || assignment.studentName

      if (!examDate || !studentName) return

      if (!dateCount.has(examDate)) {
        dateCount.set(examDate, [])
      }
      dateCount.get(examDate)!.push(studentName)
    })

    // 检查是否有日期学员数过多（超过2个）
    dateCount.forEach((students, date) => {
      if (students.length > 2) {
        violations.push({
          studentName: students.join('、'),
          examDate: date,
          description: `该日期学员过多（${students.length}名，超标${students.length - 2}名）`,
          recommendedFix: `建议将部分学员分散到其他日期`,
        })
      }
    })

    return {
      constraintId: 'SC11',
      constraintName: '日期分配均衡',
      violationCount: violations.length,
      penaltyScore: violations.reduce((sum, v) => {
        const overCount = parseInt(v.description.match(/超标(\d+)名/)?.[1] || '0')
        return sum + overCount * 50
      }, 0),
      severity: violations.length > 3 ? 'high' : violations.length > 1 ? 'medium' : 'low',
      violations,
    }
  }

  /**
   * SC10: 工作量均衡 (权重: 10)
   */
  static checkWorkloadBalance(assignments: any[], teachers: any[]): SoftConstraintViolation {
    const violations: ViolationDetail[] = []
    const workloadMap = new Map<string, number>()

    // 统计每名考官的监考次数
    assignments.forEach(assignment => {
      const examiner1 = this.extractName(assignment.examiner1_1)
      const examiner2 = this.extractName(assignment.examiner1_2)
      const backup = this.extractName(assignment.backup1)

      if (examiner1) workloadMap.set(examiner1, (workloadMap.get(examiner1) || 0) + 1)
      if (examiner2) workloadMap.set(examiner2, (workloadMap.get(examiner2) || 0) + 1)
      if (backup) workloadMap.set(backup, (workloadMap.get(backup) || 0) + 1)
    })

    // 计算平均工作量
    const workloads = Array.from(workloadMap.values())
    const avgWorkload = workloads.reduce((a, b) => a + b, 0) / workloads.length
    const maxWorkload = Math.max(...workloads)
    const minWorkload = Math.min(...workloads)

    // 工作量差距过大（最大-最小 > 5）
    if (maxWorkload - minWorkload > 5) {
      const overloadedTeachers: string[] = []
      const underloadedTeachers: string[] = []

      workloadMap.forEach((count, teacher) => {
        if (count >= avgWorkload + 3) {
          overloadedTeachers.push(`${teacher}(${count}次)`)
        }
        if (count <= avgWorkload - 3) {
          underloadedTeachers.push(`${teacher}(${count}次)`)
        }
      })

      if (overloadedTeachers.length > 0 || underloadedTeachers.length > 0) {
        violations.push({
          studentName: '整体统计',
          examDate: '全部',
          description: `工作量不均衡（平均${avgWorkload.toFixed(1)}次，最大${maxWorkload}次，最小${minWorkload}次）
            负载过重：${overloadedTeachers.join('、') || '无'}
            负载过轻：${underloadedTeachers.join('、') || '无'}`,
          recommendedFix: '建议调整分配，使各考官工作量更均衡',
        })
      }
    }

    return {
      constraintId: 'SC10',
      constraintName: '工作量均衡',
      violationCount: violations.length,
      penaltyScore: violations.length * 10,
      severity:
        maxWorkload - minWorkload > 8 ? 'high' : maxWorkload - minWorkload > 5 ? 'medium' : 'low',
      violations,
    }
  }

  /**
   * 综合检查所有软约束
   */
  static checkAllSoftConstraints(
    assignments: any[],
    studentData: any[],
    teachers: any[],
    dutySchedule?: any
  ): SoftConstraintViolation[] {
    const results: SoftConstraintViolation[] = []

    // SC1: 晚班优先
    if (dutySchedule) {
      results.push(this.checkNightShiftPriority(assignments, dutySchedule))
    }

    // SC2: 考官2专业匹配
    results.push(this.checkExaminer2ProfessionalMatch(assignments, studentData))

    // SC11: 日期均衡
    results.push(this.checkDateDistribution(assignments))

    // SC10: 工作量均衡
    results.push(this.checkWorkloadBalance(assignments, teachers))

    // 按违反次数排序
    return results.sort((a, b) => b.violationCount - a.violationCount)
  }

  /**
   * 生成违反报告
   */
  static generateReport(violations: SoftConstraintViolation[]): string {
    let report = '## 📊 软约束违反分析报告\n\n'

    const totalViolations = violations.reduce((sum, v) => sum + v.violationCount, 0)
    const totalPenalty = violations.reduce((sum, v) => sum + v.penaltyScore, 0)

    report += `**总体情况**: 发现 ${totalViolations} 处违反，总扣分 ${totalPenalty} 分\n\n`
    report += '---\n\n'

    violations.forEach((violation, index) => {
      if (violation.violationCount === 0) return

      const severityEmoji =
        violation.severity === 'high' ? '🔴' : violation.severity === 'medium' ? '🟡' : '🟢'

      report += `### ${severityEmoji} ${index + 1}. ${violation.constraintName} (${violation.constraintId})\n\n`
      report += `- **违反次数**: ${violation.violationCount} 次\n`
      report += `- **扣分**: -${violation.penaltyScore} 分\n`
      report += `- **严重程度**: ${violation.severity}\n\n`

      if (violation.violations.length > 0) {
        report += '**详细情况**:\n\n'
        violation.violations.slice(0, 5).forEach((detail, i) => {
          report += `${i + 1}. **${detail.studentName}** (${detail.examDate})\n`
          report += `   - ${detail.description}\n`
          report += `   - 💡 ${detail.recommendedFix}\n\n`
        })

        if (violation.violations.length > 5) {
          report += `   _还有 ${violation.violations.length - 5} 处类似违反..._\n\n`
        }
      }

      report += '---\n\n'
    })

    return report
  }

  // ========== 辅助方法 ==========

  private static getNightShiftGroup(date: string, dutySchedule: any): string {
    // 使用统一的 dutyRotationService，与后端算法保持一致
    const schedule = dutyRotationService.calculateDutySchedule(date)
    return schedule.nightShift
  }

  private static extractGroup(teacherInfo: string): string | null {
    if (!teacherInfo) return null
    const match = teacherInfo.match(/[一二三四]组/)
    return match ? match[0] : null
  }

  private static extractDepartment(teacherInfo: string): string | null {
    if (!teacherInfo) return null
    const match = teacherInfo.match(/区域([一二三四五六七])室/)
    return match ? match[1] : null
  }

  private static extractName(teacherInfo: string): string | null {
    if (!teacherInfo) return null
    // 假设格式为 "姓名(科室)" 或 "姓名"
    const match = teacherInfo.match(/^([^(]+)/)
    return match ? match[1].trim() : null
  }

  private static getRecommendedDepartments(student: any): string[] {
    const recommendedDepts: string[] = []

    // 从学员数据中获取推荐科室
    if (student.examiner1RecommendedDepts) {
      recommendedDepts.push(
        ...student.examiner1RecommendedDepts.split(/[,，、]/).map((d: string) => d.trim())
      )
    }
    if (student.examiner2RecommendedDepts) {
      recommendedDepts.push(
        ...student.examiner2RecommendedDepts.split(/[,，、]/).map((d: string) => d.trim())
      )
    }

    // 去重
    return Array.from(new Set(recommendedDepts))
  }
}

/**
 * 在控制台输出违反报告
 */
export function logViolationReport(violations: SoftConstraintViolation[]) {
  const report = ConstraintViolationChecker.generateReport(violations)
  process.env.NODE_ENV === 'development' && console.log(report)

  // 同时输出结构化数据供进一步分析
  console.table(
    violations.map(v => ({
      约束名称: v.constraintName,
      违反次数: v.violationCount,
      扣分: v.penaltyScore,
      严重程度: v.severity,
    }))
  )
}
