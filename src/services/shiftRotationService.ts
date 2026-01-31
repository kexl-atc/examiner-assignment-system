/**
 * 四班组轮班制计算服务
 * 与后端DutySchedule.java保持一致的计算逻辑
 */

export interface DutySchedule {
  date: string
  dayShift: string // 白班班组
  nightShift: string // 晚班班组
  restGroups: string[] // 休息班组
  cyclePosition: number // 循环位置 (0-3)
}

export interface Teacher {
  id: string
  name: string
  department: string
  group?: string // 班组：一组、二组、三组、四组、无
  available?: boolean
  currentWorkload?: number
  [key: string]: any
}

// 基准日期：2025年9月4日（周四）
const BASE_DATE = new Date(2025, 8, 4)

function formatLocalIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 🔧 标准化日期输入 - 修复HC3约束检测Bug
 * 
 * 问题：前端可能传递 "12.21" 或 "12-21" 格式的日期，导致解析错误
 * 解决：统一转换为标准的 Date 对象
 */
function normalizeDateInput(date: string | Date): Date {
  // 如果已经是 Date 对象，直接返回
  if (date instanceof Date) {
    if (!isNaN(date.getTime())) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    }
    return date
  }

  // 处理 "MM.DD" 格式 (如 "12.21")
  if (/^\d{1,2}\.\d{1,2}$/.test(date)) {
    const [month, day] = date.split('.')
    const year = new Date().getFullYear()
    const normalized = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10))
    process.env.NODE_ENV === 'development' &&
      console.log(`📅 [日期标准化] "${date}" → "${normalized.toISOString().split('T')[0]}"`)
    return normalized
  }

  // 处理 "MM-DD" 格式 (如 "12-21")
  if (/^\d{1,2}-\d{1,2}$/.test(date)) {
    const [month, day] = date.split('-')
    const year = new Date().getFullYear()
    const normalized = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10))
    process.env.NODE_ENV === 'development' &&
      console.log(`📅 [日期标准化] "${date}" → "${normalized.toISOString().split('T')[0]}"`)
    return normalized
  }

  // 处理 "YYYY-MM-DD" 标准格式
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(date)) {
    const [y, m, d] = date.split('-')
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10))
  }

  // 处理 "MM月DD日" 中文格式
  if (/^\d{1,2}月\d{1,2}日$/.test(date)) {
    const cleaned = date.replace('月', '-').replace('日', '')
    const [month, day] = cleaned.split('-')
    const year = new Date().getFullYear()
    const normalized = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10))
    process.env.NODE_ENV === 'development' &&
      console.log(`📅 [日期标准化] "${date}" → "${normalized.toISOString().split('T')[0]}"`)
    return normalized
  }

  // 兜底：尝试直接解析
  const parsed = new Date(date)
  if (isNaN(parsed.getTime())) {
    console.error(`❌ [日期标准化] 无效的日期格式: "${date}"，使用今天作为降级`)
    return new Date() // 返回今天作为降级
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

/**
 * 计算指定日期的班组轮换状态
 *
 * 轮班规律（基准日期：2025-09-04）:
 * - 位置0: 白班-二组，晚班-一组，休息-三组/四组
 * - 位置1: 白班-三组，晚班-二组，休息-四组/一组
 * - 位置2: 白班-四组，晚班-三组，休息-一组/二组
 * - 位置3: 白班-一组，晚班-四组，休息-二组/三组
 */
export function calculateDutySchedule(date: string | Date): DutySchedule {
  // 🔧 使用标准化函数处理日期输入
  const targetDate = normalizeDateInput(date)

  // 验证日期有效性
  if (isNaN(targetDate.getTime())) {
    console.error(`❌ [执勤计算] 日期无效: ${date}`)
    throw new Error(`Invalid date: ${date}`)
  }

  // 计算天数差
  const daysDiff = Math.floor((targetDate.getTime() - BASE_DATE.getTime()) / (1000 * 60 * 60 * 24))

  // 计算循环位置 (0-3)
  const cyclePosition = ((daysDiff % 4) + 4) % 4

  // 根据循环位置设置值班安排
  const schedules = [
    { dayShift: '二组', nightShift: '一组', restGroups: ['三组', '四组'] },
    { dayShift: '三组', nightShift: '二组', restGroups: ['四组', '一组'] },
    { dayShift: '四组', nightShift: '三组', restGroups: ['一组', '二组'] },
    { dayShift: '一组', nightShift: '四组', restGroups: ['二组', '三组'] },
  ]

  const schedule = schedules[cyclePosition]

  const result = {
    date: formatLocalIsoDate(targetDate),
    cyclePosition,
    dayShift: schedule.dayShift,
    nightShift: schedule.nightShift,
    restGroups: schedule.restGroups,
  }

  // 🔍 添加详细调试日志
  process.env.NODE_ENV === 'development' &&
    console.log(`🔍 [执勤计算] 日期:${result.date}, 位置:${cyclePosition}, 白班:${result.dayShift}, 晚班:${result.nightShift}`)

  return result
}

/**
 * 检查考官在指定日期是否可用
 * HC3: 白班执勤的考官不能参加考试
 */
export function isTeacherAvailable(teacher: Teacher, date: string | Date): boolean {
  // 无班组的考官（行政班）始终可用
  if (!teacher.group || teacher.group === '无') {
    return true
  }

  const schedule = calculateDutySchedule(date)

  // 白班考官不可用
  return teacher.group !== schedule.dayShift
}

/**
 * 获取考官在指定日期的优先级分数
 *
 * 优先级规则：
 * - 晚班: 40分 (SC1: +150分)
 * - 休息第一天: 30分 (SC3: +120分)
 * - 休息第二天: 25分 (SC5: +40分)
 * - 无班组: 20分
 * - 白班: 0分 (不可用)
 */
export function getTeacherPriority(teacher: Teacher, date: string | Date): number {
  // 无班组的考官（行政班）中等优先级
  if (!teacher.group || teacher.group === '无') {
    return 20
  }

  const schedule = calculateDutySchedule(date)

  // 白班不可用
  if (teacher.group === schedule.dayShift) {
    return 0
  }

  // 晚班最高优先级 (SC1: +150分)
  if (teacher.group === schedule.nightShift) {
    return 40
  }

  // 休息班组次高优先级
  if (schedule.restGroups.includes(teacher.group)) {
    // 区分休息第一天和第二天需要额外逻辑
    // 这里简化处理，统一给30分
    return 30
  }

  return 10
}

/**
 * 获取考官在指定日期的班次类型
 */
export function getTeacherShiftType(
  teacher: Teacher,
  date: string | Date
): 'day' | 'night' | 'rest' | 'admin' | 'unknown' {
  if (!teacher.group || teacher.group === '无') {
    return 'admin'
  }

  const schedule = calculateDutySchedule(date)

  if (teacher.group === schedule.dayShift) {
    return 'day'
  }

  if (teacher.group === schedule.nightShift) {
    return 'night'
  }

  if (schedule.restGroups.includes(teacher.group)) {
    return 'rest'
  }

  return 'unknown'
}

/**
 * 获取考官在指定日期的休息日状态
 * 用于SC3和SC5约束
 */
export function getTeacherRestDayStatus(
  teacher: Teacher,
  date: string | Date
): 'first' | 'second' | 'none' {
  if (!teacher.group || teacher.group === '无') {
    return 'none'
  }

  const schedule = calculateDutySchedule(date)

  if (!schedule.restGroups.includes(teacher.group)) {
    return 'none'
  }

  // 判断是休息第一天还是第二天
  // 需要检查前一天的班次
  const prevDate = new Date(typeof date === 'string' ? date : date.toISOString())
  prevDate.setDate(prevDate.getDate() - 1)
  const prevSchedule = calculateDutySchedule(prevDate)

  // 如果前一天也在休息，说明今天是休息第二天
  if (prevSchedule.restGroups.includes(teacher.group)) {
    return 'second'
  }

  // 否则是休息第一天
  return 'first'
}

/**
 * 批量增强考官数据，添加班次相关信息
 */
export function enhanceTeachersWithShiftInfo(teachers: Teacher[], date: string | Date): Teacher[] {
  // #region agent log - 假设C：记录增强前后的可用性变化
  const enhancedList = teachers.map(teacher => {
    const shiftAvailable = isTeacherAvailable(teacher, date)

    // 🔧 修复：只有当考官有班组信息时，才覆盖available字段
    // 否则保留原有的available状态
    const finalAvailable =
      teacher.group && teacher.group !== '无'
        ? shiftAvailable && teacher.available !== false // 班组轮换检查 AND 原有状态
        : teacher.available !== false // 无班组时保留原有状态

    return {
      ...teacher,
      available: finalAvailable,
      shiftType: getTeacherShiftType(teacher, date),
      nightShiftPreferred: getTeacherShiftType(teacher, date) === 'night',
      restDayStatus: getTeacherRestDayStatus(teacher, date),
      priorityScore: getTeacherPriority(teacher, date),
      _originalAvailable: teacher.available, // 保留原始状态用于调试
      _shiftAvailable: shiftAvailable, // 保留班组计算结果用于调试
    }
  })
  
  // 记录可用性变化统计
  const changedCount = enhancedList.filter(t => t.available !== t._originalAvailable).length
  if (changedCount > 0) {
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'shiftRotationService.ts:enhanceTeachersWithShiftInfo',message:'考官可用性增强结果',data:{date:typeof date==='string'?date:date.toISOString().split('T')[0],totalTeachers:teachers.length,changedCount,beforeAvailableCount:teachers.filter(t=>t.available!==false).length,afterAvailableCount:enhancedList.filter(t=>t.available).length,changedTeachers:enhancedList.filter(t=>t.available!==t._originalAvailable).slice(0,5).map(t=>({name:t.name,group:t.group,before:t._originalAvailable,after:t.available,shiftAvailable:t._shiftAvailable}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  }
  // #endregion
  
  return enhancedList
}

/**
 * 获取指定日期范围内的班组轮换信息
 * 用于调试和展示
 */
export function getDutyScheduleRange(
  startDate: string | Date,
  endDate: string | Date
): DutySchedule[] {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  const schedules: DutySchedule[] = []
  const current = new Date(start)

  while (current <= end) {
    schedules.push(calculateDutySchedule(current))
    current.setDate(current.getDate() + 1)
  }

  return schedules
}

/**
 * 格式化班组轮换信息为可读文本
 */
export function formatDutySchedule(schedule: DutySchedule): string {
  return `${schedule.date}: 白班-${schedule.dayShift}, 晚班-${schedule.nightShift}, 休息-${schedule.restGroups.join('/')}`
}

/**
 * 🔧 检查考官是否有白班执勤冲突（HC3）
 * 
 * 增强版：添加详细日志，帮助诊断误报问题
 */
export function hasWhiteShiftConflict(teacher: Teacher, date: string | Date): boolean {
  // 无班组考官（行政班）不受白班限制
  if (!teacher.group || teacher.group === '无') {
    process.env.NODE_ENV === 'development' &&
      console.log(`✅ [HC3检查] ${teacher.name} 无班组，不受白班限制`)
    return false
  }

  const schedule = calculateDutySchedule(date)
  const hasConflict = teacher.group === schedule.dayShift

  // 🔍 详细日志 - 用于诊断HC3误报问题
  if (process.env.NODE_ENV === 'development') {
    const status = hasConflict ? '❌ 冲突' : '✅ 可用'
    console.log(`🔍 [HC3检查] ${status}`, {
      考官: teacher.name,
      班组: teacher.group,
      原始日期: date,
      标准日期: schedule.date,
      循环位置: schedule.cyclePosition,
      白班班组: schedule.dayShift,
      晚班班组: schedule.nightShift,
      休息班组: schedule.restGroups.join('、'),
      判定: `${teacher.group} ${hasConflict ? '==' : '!='} ${schedule.dayShift}`,
    })
  }

  // 如果检测到冲突，输出警告（始终显示）
  if (hasConflict) {
    console.warn(
      `⚠️ [HC3约束] ${teacher.name}(${teacher.group})在${schedule.date}执勤白班，不能担任考官`
    )
  }

  return hasConflict
}

/**
 * 获取考官的冲突信息文本
 */
export function getTeacherConflictInfo(teacher: Teacher, date: string | Date): string | undefined {
  if (hasWhiteShiftConflict(teacher, date)) {
    const schedule = calculateDutySchedule(date)
    return `白班执勤冲突（${schedule.date}执勤白班）`
  }
  return undefined
}
