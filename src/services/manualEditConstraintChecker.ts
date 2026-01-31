/**
 * 人工修改约束检查服务
 * 提供与后端约束系统一致的前端验证逻辑
 */

import type { Teacher, ScheduleResultRecord } from '../types'
import {
  hasWhiteShiftConflict,
  getTeacherConflictInfo,
  calculateDutySchedule,
} from './shiftRotationService'

export interface ConstraintViolation {
  constraintId: string
  type: 'hard' | 'soft'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  suggestions: string[]
}

import { normalizeDeptToShort } from '../utils/departmentNormalizer'

/**
 * HC2: 检查考官1科室是否与学员匹配
 */
function isValidExaminer1Department(studentDept: string, examiner1Dept: string): boolean {
  // 统一标准化为简写（如 "一", "二"）
  const sDept = normalizeDeptToShort(studentDept)
  const tDept = normalizeDeptToShort(examiner1Dept)

  // 同科室匹配
  if (sDept === tDept) {
    return true
  }

  // 三室七室互通规则
  if (
    (sDept === '三' && tDept === '七') ||
    (sDept === '七' && tDept === '三')
  ) {
    return true
  }

  return false
}

/**
 * 完整的约束检查函数
 */
export function checkManualEditConstraints(
  teacher: Teacher,
  editingField: string,
  editingRecord: ScheduleResultRecord,
  allScheduleRecords: ScheduleResultRecord[],
  availableTeachers?: Teacher[] // 🆕 用于获取其他考官的科室信息
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []

  const studentDept = normalizeDeptToShort(editingRecord.department)
  const teacherDept = normalizeDeptToShort(teacher.department)
  const isDay2Field = editingField.endsWith('_2') || editingField === 'backup2'
  const examDate = isDay2Field ? editingRecord.date2 : editingRecord.date1

  // 🔧 修复：解析字段类型，支持完整字段名
  const isExaminer1 =
    editingField === 'examiner1_1' || editingField === 'examiner2_1' || editingField === 'examiner1'
  const isExaminer2 =
    editingField === 'examiner1_2' || editingField === 'examiner2_2' || editingField === 'examiner2'
  const isBackup =
    editingField === 'backup1' || editingField === 'backup2' || editingField === 'backup'

  process.env.NODE_ENV === 'development' && console.log('🔍 [约束检查] 开始检查:', {
    teacher: teacher.name,
    teacherDept,
    editingField,
    isExaminer1,
    isExaminer2,
    isBackup,
    student: editingRecord.student,
    studentDept,
    examDate,
  })

  // ============================================
  // HC2: 科室匹配规则
  // ============================================
  if (isExaminer1) {
    // 考官1必须与学员同科室（或三七互通）
    if (!isValidExaminer1Department(studentDept, teacherDept)) {
      violations.push({
        constraintId: 'HC2',
        type: 'hard',
        severity: 'high',
        title: 'HC2硬约束违反：考官1科室不匹配',
        description: `考官1必须与学员同科室。学员${editingRecord.student}来自${editingRecord.department}，${teacher.name}来自${teacher.department}`,
        suggestions: [
          `选择${editingRecord.department}的考官`,
          studentDept === '三' ? '或选择区域七室的考官（三七互通）' : '',
          studentDept === '七' ? '或选择区域三室的考官（三七互通）' : '',
        ].filter(s => s),
      })
    }
  } else if (isExaminer2) {
    // 考官2必须与学员不同科室（HC7）
    if (studentDept === teacherDept) {
      violations.push({
        constraintId: 'HC7',
        type: 'hard',
        severity: 'high',
        title: 'HC7硬约束违反：考官2不能与学员同科室',
        description: `考官2必须来自不同科室。学员${editingRecord.student}来自${editingRecord.department}，不能选择同科室的${teacher.name}`,
        suggestions: ['选择其他科室的考官'],
      })
    }
  }

  // ============================================
  // HC7: 考官1和考官2必须来自不同科室（额外检查）
  // ============================================
  if (isExaminer1) {
    // 如果当前记录已有考官2，检查是否同科室
    const currentExaminer2 = isDay2Field
      ? editingRecord.examiner2_2
      : (editingRecord.examiner2_1 || (editingRecord as any).examiner2)
    if (currentExaminer2 && availableTeachers) {
      // 🔧 从availableTeachers中获取考官2的科室信息
      const examiner2Teacher = availableTeachers.find(t => t.name === currentExaminer2)
      if (examiner2Teacher) {
        const examiner2Dept = normalizeDeptToShort(examiner2Teacher.department)
        if (examiner2Dept && teacherDept === examiner2Dept) {
          violations.push({
            constraintId: 'HC7',
            type: 'hard',
            severity: 'high',
            title: 'HC7硬约束违反：考官1和考官2不能同科室',
            description: `考官1 ${teacher.name}(${teacher.department}) 与考官2 ${currentExaminer2}(${examiner2Teacher.department}) 来自同一科室`,
            suggestions: ['选择其他科室的考官作为考官1', '或更换考官2'],
          })
        }
      }
    }
  } else if (isExaminer2) {
    // 如果当前记录已有考官1，检查是否同科室
    const currentExaminer1 = isDay2Field
      ? editingRecord.examiner1_2
      : (editingRecord.examiner1_1 || (editingRecord as any).examiner1)
    if (currentExaminer1 && availableTeachers) {
      // 🔧 从availableTeachers中获取考官1的科室信息
      const examiner1Teacher = availableTeachers.find(t => t.name === currentExaminer1)
      if (examiner1Teacher) {
        const examiner1Dept = normalizeDeptToShort(examiner1Teacher.department)
        if (examiner1Dept && teacherDept === examiner1Dept) {
          violations.push({
            constraintId: 'HC7',
            type: 'hard',
            severity: 'high',
            title: 'HC7硬约束违反：考官1和考官2不能同科室',
            description: `考官2 ${teacher.name}(${teacher.department}) 与考官1 ${currentExaminer1}(${examiner1Teacher.department}) 来自同一科室`,
            suggestions: ['选择其他科室的考官作为考官2', '或更换考官1'],
          })
        }
      }
    }
  }

  // ============================================
  // HC8: 备份考官不能与考官1和考官2是同一人
  // ============================================
  if (isBackup) {
    const currentExaminer1 = isDay2Field
      ? editingRecord.examiner1_2
      : (editingRecord.examiner1_1 || (editingRecord as any).examiner1)
    const currentExaminer2 = isDay2Field
      ? editingRecord.examiner2_2
      : (editingRecord.examiner2_1 || (editingRecord as any).examiner2)

    if (currentExaminer1 === teacher.name) {
      violations.push({
        constraintId: 'HC8',
        type: 'hard',
        severity: 'high',
        title: 'HC8硬约束违反：备份考官不能与考官1是同一人',
        description: `备份考官${teacher.name}不能与考官1${currentExaminer1}是同一人`,
        suggestions: ['选择其他考官作为备份考官'],
      })
    }

    if (currentExaminer2 === teacher.name) {
      violations.push({
        constraintId: 'HC8',
        type: 'hard',
        severity: 'high',
        title: 'HC8硬约束违反：备份考官不能与考官2是同一人',
        description: `备份考官${teacher.name}不能与考官2${currentExaminer2}是同一人`,
        suggestions: ['选择其他考官作为备份考官'],
      })
    }
  } else {
    // 非备份考官：检查是否与同一学员的其他考官角色重复
    const currentExaminers = [
      isDay2Field ? editingRecord.examiner1_2 : editingRecord.examiner1_1,
      isDay2Field ? editingRecord.examiner2_2 : editingRecord.examiner2_1,
      isDay2Field ? editingRecord.backup2 : editingRecord.backup1,
      (editingRecord as any).examiner1,
      (editingRecord as any).examiner2,
      (editingRecord as any).backup,
    ].filter(name => name && name !== (editingRecord as any)[editingField])

    if (currentExaminers.includes(teacher.name)) {
      violations.push({
        constraintId: 'HC8',
        type: 'hard',
        severity: 'high',
        title: 'HC8硬约束违反：考官重复',
        description: `${teacher.name}已担任该学员的其他考官角色`,
        suggestions: ['选择其他考官', '或调整现有角色分配'],
      })
    }
  }

  // ============================================
  // HC8b: 备份考官不能与考官1和考官2同科室 🆕
  // ============================================
  if (isBackup && availableTeachers) {
    const currentExaminer1 = isDay2Field
      ? editingRecord.examiner1_2
      : (editingRecord.examiner1_1 || (editingRecord as any).examiner1)
    const currentExaminer2 = isDay2Field
      ? editingRecord.examiner2_2
      : (editingRecord.examiner2_1 || (editingRecord as any).examiner2)

    // 🔧 从availableTeachers中获取考官1和考官2的科室信息
    const examiner1Teacher = currentExaminer1
      ? availableTeachers.find(t => t.name === currentExaminer1)
      : null
    const examiner2Teacher = currentExaminer2
      ? availableTeachers.find(t => t.name === currentExaminer2)
      : null

    // 检查备份考官是否与考官1同科室
    if (examiner1Teacher) {
      const examiner1Dept = normalizeDeptToShort(examiner1Teacher.department)
      if (examiner1Dept && teacherDept === examiner1Dept) {
        violations.push({
          constraintId: 'HC8b',
          type: 'hard',
          severity: 'high',
          title: 'HC8b硬约束违反：备份考官不能与考官1同科室',
          description: `备份考官${teacher.name}(${teacher.department})与考官1${currentExaminer1}(${examiner1Teacher.department})来自同一科室`,
          suggestions: ['选择其他科室的考官作为备份考官'],
        })
      }
    }

    // 检查备份考官是否与考官2同科室
    if (examiner2Teacher) {
      const examiner2Dept = normalizeDeptToShort(examiner2Teacher.department)
      if (examiner2Dept && teacherDept === examiner2Dept) {
        violations.push({
          constraintId: 'HC8b',
          type: 'hard',
          severity: 'high',
          title: 'HC8b硬约束违反：备份考官不能与考官2同科室',
          description: `备份考官${teacher.name}(${teacher.department})与考官2${currentExaminer2}(${examiner2Teacher.department})来自同一科室`,
          suggestions: ['选择其他科室的考官作为备份考官'],
        })
      }
    }
  }

  // ============================================
  // HC4: 每名考官每天只能监考一名考生（修复：HC5已合并到HC6，应使用HC4）
  // ============================================
  // #region agent log - 假设D：检查HC4约束数据完整性
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manualEditConstraintChecker.ts:HC4Check',message:'HC4约束检查数据',data:{teacherName:teacher.name,examDate,allRecordsCount:allScheduleRecords.length,editingRecordId:editingRecord.id,editingStudent:editingRecord.student},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const sameTeacherSameDay = allScheduleRecords.filter(record => {
    if (record.id === editingRecord.id) return false

    const day1HasTeacher =
      record.date1 === examDate &&
      [record.examiner1_1, record.examiner2_1, record.backup1].includes(teacher.name)

    const day2HasTeacher =
      record.date2 === examDate &&
      [record.examiner1_2, record.examiner2_2, record.backup2].includes(teacher.name)

    const legacyHasTeacher =
      (record as any).examDate === examDate &&
      [(record as any).examiner1, (record as any).examiner2, (record as any).backup].includes(
        teacher.name
      )

    return day1HasTeacher || day2HasTeacher || legacyHasTeacher
  })

  if (sameTeacherSameDay.length > 0) {
    // #region agent log - 假设D：记录HC4冲突详情
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'manualEditConstraintChecker.ts:HC4Conflict',message:'HC4冲突发现',data:{teacherName:teacher.name,examDate,conflictCount:sameTeacherSameDay.length,conflictStudents:sameTeacherSameDay.map(r=>r.student)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    violations.push({
      constraintId: 'HC4',
      type: 'hard',
      severity: 'high',
      title: 'HC4硬约束违反：每名考官每天只能监考一名考生',
      description: `${teacher.name}在${examDate}已担任${sameTeacherSameDay.length}场考试的考官`,
      suggestions: [
        '选择当天没有考试安排的考官',
        `冲突的学员：${sameTeacherSameDay.map(r => r.student).join('、')}`,
      ],
    })
  }

  // ============================================
  // HC3: 白班执勤不能担任考官（除非行政班）
  // ============================================
  // 🆕 使用前端独立的班组轮换计算
  if (hasWhiteShiftConflict(teacher, examDate)) {
    const schedule = calculateDutySchedule(examDate)
    violations.push({
      constraintId: 'HC3',
      type: 'hard',
      severity: 'high',
      title: 'HC3硬约束违反：白班执勤冲突',
      description: `${teacher.name}(${teacher.group})在${examDate}执勤白班(${schedule.dayShift})，不能担任考官`,
      suggestions: [
        '选择非白班执勤的考官',
        `当天白班班组：${schedule.dayShift}`,
        `可选择晚班(${schedule.nightShift})或休息班组(${schedule.restGroups.join('、')})`,
      ],
    })
  } else if ((teacher as any).conflictInfo?.includes('白班执勤')) {
    // 兼容后端传递的conflictInfo
    violations.push({
      constraintId: 'HC3',
      type: 'hard',
      severity: 'high',
      title: 'HC3硬约束违反：白班执勤冲突',
      description: `${teacher.name}在${examDate}执勤白班，不能担任考官`,
      suggestions: ['选择非白班执勤的考官', '或调整考试日期'],
    })
  }

  // ============================================
  // HC9: 考官不可用期检查 🆕 严重遗漏修复
  // ============================================
  const unavailableDates = (teacher as any).unavailableDates || (teacher as any).unavailablePeriods
  if (unavailableDates && unavailableDates.length > 0) {
    try {
      const examDateObj = new Date(examDate + 'T00:00:00')

      for (const period of unavailableDates) {
        if (!period.startDate || !period.endDate) continue

        const startDate = new Date(period.startDate + 'T00:00:00')
        const endDate = new Date(period.endDate + 'T23:59:59')

        // 检查考试日期是否在不可用期内
        if (examDateObj >= startDate && examDateObj <= endDate) {
          violations.push({
            constraintId: 'HC9',
            type: 'hard',
            severity: 'high',
            title: 'HC9硬约束违反：考官不可用',
            description: `${teacher.name}在${examDate}不可用（${period.reason || '未说明原因'}）`,
            suggestions: [
              '选择在此日期可用的考官',
              `不可用期间：${period.startDate} 至 ${period.endDate}`,
              `原因：${period.reason || '未说明'}`,
            ],
          })

          console.warn(
            `🚫 [HC9约束] ${teacher.name}在${examDate}不可用: ${period.startDate}~${period.endDate} (${period.reason})`
          )
          break // 找到一个违反即可
        }
      }
    } catch (error) {
      console.error('HC9约束检查异常:', error)
    }
  }

  return violations
}

/**
 * 检查是否有硬约束违反（阻止保存）
 */
export function hasHardConstraintViolations(violations: ConstraintViolation[]): boolean {
  return violations.some(v => v.type === 'hard')
}

/**
 * 格式化约束违反信息为显示文本
 */
export function formatViolationsForDisplay(violations: ConstraintViolation[]): string {
  const hardViolations = violations.filter(v => v.type === 'hard')
  const softViolations = violations.filter(v => v.type === 'soft')

  let text = ''

  if (hardViolations.length > 0) {
    text += `🚨 硬约束违反 (${hardViolations.length}个):\n\n`
    hardViolations.forEach((v, i) => {
      text += `${i + 1}. ${v.title}\n${v.description}\n\n`
    })
  }

  if (softViolations.length > 0) {
    text += `⚠️ 软约束提示 (${softViolations.length}个):\n\n`
    softViolations.forEach((v, i) => {
      text += `${i + 1}. ${v.title}\n${v.description}\n\n`
    })
  }

  return text
}
