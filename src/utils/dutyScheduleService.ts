/**
 * 考官自动排班系统 - 四班组轮转调度服务
 * 基于文档要求实现的标准四班组轮转算法
 * 基准日期：2025年9月4日（周四）
 */

export interface DutyScheduleInfo {
  date: string
  dayShift: string // 白班班组
  nightShift: string // 晚班班组
  restGroups: string[] // 休息班组
  cyclePosition: number // 循环位置 (0-3)
}

export interface TeacherInfo {
  id: string
  name: string
  department: string // 一、二、三、四、五、六、七
  group: string // 一组、二组、三组、四组、无
  skills: string[]
  workload: number
  consecutiveDays: number
  availability?: {
    [date: string]: {
      morning: boolean
      afternoon: boolean
      evening: boolean
    }
  }
}

export interface ExamAssignment {
  id: string
  studentId: string
  studentName: string
  studentDepartment: string
  examDate: string
  examType: 'day1' | 'day2' // 第一天或第二天
  subjects: string[] // ['现场', '模拟机1'] 或 ['模拟机2', '口试']
  examiner1: string // 同科室考官
  examiner2: string // 不同科室考官
  backupExaminer: string // 备份考官
  location: string
  timeSlot: {
    start: string
    end: string
    period: 'morning' | 'afternoon' | 'evening'
  }
}

/**
 * 计算指定日期的执勤状态
 * 基于文档要求：基准日期2025年9月4日（周四）
 *
 * 轮班规律：
 * - 位置0: 白班-二组，晚班-一组
 * - 位置1: 白班-三组，晚班-二组
 * - 位置2: 白班-四组，晚班-三组
 * - 位置3: 白班-一组，晚班-四组
 */
export const calculateDutySchedule = (targetDate: Date): DutyScheduleInfo => {
  // 基准日期：2025年9月4日（周四）
  const baseDate = new Date(2025, 8, 4) // 月份从0开始，8表示9月

  // 计算天数差
  const daysDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))

  // 计算循环位置 (0-3)
  const cyclePosition = ((daysDiff % 4) + 4) % 4

  // 轮班规律映射
  const rotationPattern = {
    0: { dayShift: '二组', nightShift: '一组' },
    1: { dayShift: '三组', nightShift: '二组' },
    2: { dayShift: '四组', nightShift: '三组' },
    3: { dayShift: '一组', nightShift: '四组' },
  }

  const pattern = rotationPattern[cyclePosition as keyof typeof rotationPattern]

  // 计算休息班组
  const allGroups = ['一组', '二组', '三组', '四组']
  const restGroups = allGroups.filter(
    group => group !== pattern.dayShift && group !== pattern.nightShift
  )

  return {
    date: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`,
    dayShift: pattern.dayShift,
    nightShift: pattern.nightShift,
    restGroups,
    cyclePosition,
  }
}

/**
 * 批量计算多个日期的执勤状态
 */
export const calculateDutyScheduleRange = (startDate: Date, endDate: Date): DutyScheduleInfo[] => {
  const schedules: DutyScheduleInfo[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    schedules.push(calculateDutySchedule(new Date(current)))
    current.setDate(current.getDate() + 1)
  }

  return schedules
}

/**
 * 检查考官在指定日期是否可用（不是白班）
 */
export const isTeacherAvailable = (teacher: TeacherInfo, examDate: Date): boolean => {
  // 无班组的考官始终可用
  if (teacher.group === '无') {
    return true
  }

  const dutySchedule = calculateDutySchedule(examDate)

  // 白班考官不可用作考官
  if (teacher.group === dutySchedule.dayShift) {
    return false
  }

  return true
}

/**
 * 获取考官在指定日期的优先级
 * 晚班 > 休息 > 无班组 > 白班（不可用）
 */
export const getTeacherPriority = (teacher: TeacherInfo, examDate: Date): number => {
  if (teacher.group === '无') {
    return 20 // 无班组考官中等优先级
  }

  const dutySchedule = calculateDutySchedule(examDate)

  if (teacher.group === dutySchedule.dayShift) {
    return 0 // 白班不可用
  }

  if (teacher.group === dutySchedule.nightShift) {
    return 40 // 晚班最高优先级
  }

  if (dutySchedule.restGroups.includes(teacher.group)) {
    return 30 // 休息班组次高优先级
  }

  return 10 // 其他情况
}

/**
 * 验证基准日期的轮班安排
 * 2025年9月4日应该是：白班-二组，晚班-一组
 */
export const validateBaseSchedule = (): boolean => {
  const baseDate = new Date(2025, 8, 4) // 2025年9月4日
  const schedule = calculateDutySchedule(baseDate)

  const expected = {
    dayShift: '二组',
    nightShift: '一组',
    cyclePosition: 0,
  }

  const isValid =
    schedule.dayShift === expected.dayShift &&
    schedule.nightShift === expected.nightShift &&
    schedule.cyclePosition === expected.cyclePosition

  if (!isValid) {
    console.error('基准日期验证失败:', {
      expected,
      actual: {
        dayShift: schedule.dayShift,
        nightShift: schedule.nightShift,
        cyclePosition: schedule.cyclePosition,
      },
    })
  }

  return isValid
}

/**
 * 获取指定日期范围内的工作日（排除周末）
 */
export const getWorkdaysInRange = (startDate: Date, endDate: Date): Date[] => {
  const workdays: Date[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    // 排除周末（0=周日，6=周六）
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workdays.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  return workdays
}

/**
 * 扩展工作日范围直到满足所需天数
 */
export const extendWorkdaysIfNeeded = (startDate: Date, requiredDays: number): Date[] => {
  const workdays: Date[] = []
  const current = new Date(startDate)

  while (workdays.length < requiredDays) {
    const dayOfWeek = current.getDay()
    // 排除周末
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workdays.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  return workdays
}

/**
 * 调试函数：打印指定日期范围的轮班安排
 */
export const debugScheduleRange = (startDate: Date, days: number = 7): void => {
  process.env.NODE_ENV === 'development' && console.log(`\n=== 值班安排调试信息 (${days}天) ===`)

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + i)

    const schedule = calculateDutySchedule(currentDate)
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayName = ['日', '一', '二', '三', '四', '五', '六'][currentDate.getDay()]

    process.env.NODE_ENV === 'development' && console.log(`${dateStr} (周${dayName}): 白班-${schedule.dayShift}, 夜班-${schedule.nightShift}`)
  }

  process.env.NODE_ENV === 'development' && console.log('=== 调试信息结束 ===\n')
}

// 验证轮转逻辑
const validateRotation = (): void => {
  process.env.NODE_ENV === 'development' && console.log('\n=== 轮转逻辑验证 ===')

  const validationDate = new Date(2025, 8, 4)
  const schedule1 = calculateDutySchedule(validationDate)

  validationDate.setDate(validationDate.getDate() + 4) // 4天后应该回到相同状态
  const schedule2 = calculateDutySchedule(validationDate)

  if (schedule1.dayShift === schedule2.dayShift && schedule1.nightShift === schedule2.nightShift) {
    process.env.NODE_ENV === 'development' && console.log('✅ 4天轮转周期验证通过')
  } else {
    process.env.NODE_ENV === 'development' && console.log('❌ 4天轮转周期验证失败')
    process.env.NODE_ENV === 'development' && console.log('第1天:', schedule1)
    process.env.NODE_ENV === 'development' && console.log('第5天:', schedule2)
  }

  process.env.NODE_ENV === 'development' && console.log('=== 验证结束 ===\n')
}

// 导出验证函数，确保算法正确性
export const runValidation = (): boolean => {
  process.env.NODE_ENV === 'development' && console.log('开始验证四班组轮转算法...')

  // 验证基准日期
  const baseValid = validateBaseSchedule()
  process.env.NODE_ENV === 'development' && console.log('基准日期验证:', baseValid ? '通过' : '失败')

  // 验证循环性
  const testDate = new Date(2025, 8, 4)
  const schedule1 = calculateDutySchedule(testDate)

  testDate.setDate(testDate.getDate() + 4) // 4天后应该回到相同状态
  const schedule2 = calculateDutySchedule(testDate)

  const cycleValid =
    schedule1.dayShift === schedule2.dayShift && schedule1.nightShift === schedule2.nightShift

  process.env.NODE_ENV === 'development' && console.log('循环性验证:', cycleValid ? '通过' : '失败')

  return baseValid && cycleValid
}
