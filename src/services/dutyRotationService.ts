/**
 * 四班组轮转服务
 * 实现文档中要求的四班组轮班制度计算逻辑
 */

export interface DutySchedule {
  date: string
  dayShift: string
  nightShift: string
  restGroups: string[]
  cyclePosition: number
}

export interface GroupStatus {
  group: string
  status: 'day_shift' | 'night_shift' | 'rest'
  canBeExaminer: boolean
  priority: number // 1=最高优先级(晚班), 2=次优先级(休息), 3=最低优先级(其他)
}

export class DutyRotationService {
  // 基准日期：2025年9月4日（周四）
  private readonly BASE_DATE = '2025-09-04'

  // 四班组轮转模式
  private readonly ROTATION_PATTERN: Record<number, { dayShift: string; nightShift: string }> = {
    0: { dayShift: '二组', nightShift: '一组' },
    1: { dayShift: '三组', nightShift: '二组' },
    2: { dayShift: '四组', nightShift: '三组' },
    3: { dayShift: '一组', nightShift: '四组' },
  }

  private readonly ALL_GROUPS = ['一组', '二组', '三组', '四组']

  // 宽松解析：支持 "10.10" / "10-10" / "10/10" / Date / yyyy-MM-dd
  private normalizeDateToIso(input: string | Date): string {
    if (!input) return ''
    if (input instanceof Date && !isNaN(input.getTime())) {
      const y = input.getFullYear()
      const m = String(input.getMonth() + 1).padStart(2, '0')
      const d = String(input.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    const raw = String(input).trim()
    // 已是 yyyy-MM-dd
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) {
      const [y, mm, dd] = raw.split('-')
      return `${y}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    }
    // 允许 10.10 / 10-10 / 10/10
    const s = raw.replace(/\//g, '-').replace(/\./g, '-')
    if (/^\d{1,2}-\d{1,2}$/.test(s)) {
      const baseYear = new Date(this.BASE_DATE).getFullYear()
      const [mm, dd] = s.split('-')
      return `${baseYear}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    }
    return raw
  }

  private parseIsoToLocalDate(isoDateStr: string): Date {
    const parts = isoDateStr.split('-')
    if (parts.length !== 3) {
      return new Date(isoDateStr)
    }
    const [y, m, d] = parts
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10))
  }

  /**
   * 计算指定日期的班组执勤状态
   */
  calculateDutySchedule(dateStr: string): DutySchedule {
    // 验证输入
    if (!dateStr) {
      throw new Error('日期字符串不能为空')
    }

    const isoDateStr = this.normalizeDateToIso(dateStr)
    const targetDate = this.parseIsoToLocalDate(isoDateStr)

    // 验证日期有效性
    if (isNaN(targetDate.getTime())) {
      throw new Error(`无效的日期格式: ${dateStr}`)
    }

    const baseDate = this.parseIsoToLocalDate(this.BASE_DATE)

    // 计算天数差
    const daysDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))

    // 计算循环位置
    const cyclePosition = ((daysDiff % 4) + 4) % 4 // 确保非负数

    // 验证 cyclePosition 在有效范围内
    if (cyclePosition < 0 || cyclePosition > 3) {
      console.error(`无效的循环位置: ${cyclePosition}，日期: ${dateStr}，天数差: ${daysDiff}`)
      throw new Error(`计算出的循环位置超出范围: ${cyclePosition}`)
    }

    const pattern = this.ROTATION_PATTERN[cyclePosition]

    // 验证 pattern 存在
    if (!pattern) {
      throw new Error(`无法找到循环位置 ${cyclePosition} 对应的轮班模式`)
    }

    const restGroups = this.ALL_GROUPS.filter(
      group => group !== pattern.dayShift && group !== pattern.nightShift
    )

    return {
      date: isoDateStr,
      dayShift: pattern.dayShift,
      nightShift: pattern.nightShift,
      restGroups,
      cyclePosition,
    }
  }

  /**
   * 批量计算多个日期的执勤状态
   */
  calculateDutyScheduleRange(startDate: string, endDate: string): DutySchedule[] {
    const schedules: DutySchedule[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      schedules.push(this.calculateDutySchedule(dateStr))
    }

    return schedules
  }

  /**
   * 获取指定日期各班组的状态和优先级
   */
  getGroupStatuses(dateStr: string): GroupStatus[] {
    const dutySchedule = this.calculateDutySchedule(dateStr)
    const statuses: GroupStatus[] = []

    for (const group of this.ALL_GROUPS) {
      let status: 'day_shift' | 'night_shift' | 'rest'
      let canBeExaminer: boolean
      let priority: number

      if (group === dutySchedule.dayShift) {
        status = 'day_shift'
        canBeExaminer = false // 白班不能担任考官
        priority = 4 // 最低优先级
      } else if (group === dutySchedule.nightShift) {
        status = 'night_shift'
        canBeExaminer = true
        priority = 1 // 最高优先级
      } else {
        status = 'rest'
        canBeExaminer = true
        priority = 2 // 次优先级
      }

      statuses.push({
        group,
        status,
        canBeExaminer,
        priority,
      })
    }

    return statuses
  }

  /**
   * 检查考官在指定日期是否可以担任考官
   */
  canTeacherBeExaminer(teacherGroup: string, examDate: string): boolean {
    // 无班组考官始终可以担任考官
    if (!teacherGroup || teacherGroup === '无' || teacherGroup === '') {
      return true
    }

    const dutySchedule = this.calculateDutySchedule(examDate)

    // 白班考官不能担任考官
    return teacherGroup !== dutySchedule.dayShift
  }

  /**
   * 获取考官在指定日期的优先级
   */
  getTeacherPriority(teacherGroup: string, examDate: string): number {
    // 无班组考官有固定优先级
    if (!teacherGroup || teacherGroup === '无' || teacherGroup === '') {
      return 3 // 中等优先级
    }

    const groupStatuses = this.getGroupStatuses(examDate)
    const groupStatus = groupStatuses.find(gs => gs.group === teacherGroup)

    return groupStatus ? groupStatus.priority : 4
  }

  /**
   * 检查学员现场考试的班组约束
   * HC5: 学员进行现场考试时，不能安排在学员本班组执勤白班的时间
   */
  canStudentTakeFieldExam(studentGroup: string, examDate: string): boolean {
    const dutySchedule = this.calculateDutySchedule(examDate)

    // 学员班组执勤白班时，不能进行现场考试
    return studentGroup !== dutySchedule.dayShift
  }

  /**
   * 生成执勤状态报告
   */
  generateDutyReport(
    startDate: string,
    endDate: string
  ): {
    schedules: DutySchedule[]
    summary: {
      totalDays: number
      workdaysOnly: DutySchedule[]
      groupWorkload: Record<string, { dayShifts: number; nightShifts: number; restDays: number }>
    }
  } {
    const schedules = this.calculateDutyScheduleRange(startDate, endDate)

    // 过滤工作日
    const workdaysOnly = schedules.filter(schedule => {
      const date = new Date(schedule.date)
      const dayOfWeek = date.getDay()
      return dayOfWeek >= 1 && dayOfWeek <= 5 // 周一到周五
    })

    // 统计各班组工作量
    const groupWorkload: Record<
      string,
      { dayShifts: number; nightShifts: number; restDays: number }
    > = {}

    for (const group of this.ALL_GROUPS) {
      groupWorkload[group] = { dayShifts: 0, nightShifts: 0, restDays: 0 }
    }

    for (const schedule of workdaysOnly) {
      groupWorkload[schedule.dayShift].dayShifts++
      groupWorkload[schedule.nightShift].nightShifts++

      for (const restGroup of schedule.restGroups) {
        groupWorkload[restGroup].restDays++
      }
    }

    return {
      schedules,
      summary: {
        totalDays: schedules.length,
        workdaysOnly,
        groupWorkload,
      },
    }
  }

  /**
   * 验证轮转计算的正确性
   */
  validateRotation(): {
    isValid: boolean
    issues: string[]
  } {
    const issues: string[] = []

    // 验证基本轮转逻辑
    const validationCases = [
      { date: '2025-09-04', expected: { dayShift: '二组', nightShift: '一组' } },
      { date: '2025-09-05', expected: { dayShift: '三组', nightShift: '二组' } },
      { date: '2025-09-06', expected: { dayShift: '四组', nightShift: '三组' } },
      { date: '2025-09-07', expected: { dayShift: '一组', nightShift: '四组' } },
      { date: '2025-09-08', expected: { dayShift: '二组', nightShift: '一组' } },
    ]

    for (const validationCase of validationCases) {
      const actual = this.calculateDutySchedule(validationCase.date)
      const match =
        actual.dayShift === validationCase.expected.dayShift &&
        actual.nightShift === validationCase.expected.nightShift

      if (!match) {
        issues.push(
          `日期${validationCase.date}轮转计算错误: 期望${JSON.stringify(validationCase.expected)}, 实际${JSON.stringify({ dayShift: actual.dayShift, nightShift: actual.nightShift })}`
        )
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }
}

// 创建单例实例
export const dutyRotationService = new DutyRotationService()
