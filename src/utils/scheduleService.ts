// Centralized scheduling service for consistent duty schedule calculation
// across all components in the examiner assignment assistant

// 班次缓存系统
interface ScheduleCache {
  [dateKey: string]: DutySchedule[]
}

const scheduleCache: ScheduleCache = {}
const CACHE_EXPIRY_HOURS = 24 // 缓存24小时
const cacheTimestamps: { [dateKey: string]: number } = {}

// 生成日期键
const getDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// 检查缓存是否有效
const isCacheValid = (dateKey: string): boolean => {
  const timestamp = cacheTimestamps[dateKey]
  if (!timestamp) return false

  const now = Date.now()
  const expiry = timestamp + CACHE_EXPIRY_HOURS * 60 * 60 * 1000
  return now < expiry
}

// 清理过期缓存
const cleanExpiredCache = (): void => {
  const now = Date.now()
  const expiry = CACHE_EXPIRY_HOURS * 60 * 60 * 1000

  Object.keys(cacheTimestamps).forEach(dateKey => {
    if (now - cacheTimestamps[dateKey] > expiry) {
      delete scheduleCache[dateKey]
      delete cacheTimestamps[dateKey]
    }
  })
}

export interface DutySchedule {
  group: string
  status: '白班' | '晚班' | '休息第一天' | '休息第二天'
  cardType: 'duty-morning' | 'duty-evening' | 'duty-rest'
}

// 🆕 考官不可用期类型定义
export interface UnavailablePeriod {
  id: string
  startDate: string // YYYY-MM-DD格式
  endDate: string // YYYY-MM-DD格式
  reason: string // 不可用原因/备注
  createdAt: string // 创建时间
}

export interface Teacher {
  id: string
  name: string
  department: string
  group: string
  shift: string
  status: '可用' | '不可用'
  selected?: boolean
  unavailablePeriods?: UnavailablePeriod[] // 🆕 不可用期列表
}

/**
 * Calculate duty schedule for a specific date based on the 4-group rotation system
 * 【已统一】基准日期：2025年9月4日（与后端DutySchedule.java保持一致）
 * Base schedule: Group 2 (Day), Group 1 (Night), Group 3 (Rest Day 2), Group 4 (Rest Day 1)
 *
 * 轮班规律：
 * - 位置0: 白班-二组，晚班-一组，休息-三组/四组
 * - 位置1: 白班-三组，晚班-二组，休息-四组/一组
 * - 位置2: 白班-四组，晚班-三组，休息-一组/二组
 * - 位置3: 白班-一组，晚班-四组，休息-二组/三组
 *
 * @param date - Target date for calculation
 * @returns Array of duty schedules for all groups
 */
export const calculateDutySchedule = (date: Date): DutySchedule[] => {
  // 生成缓存键
  const dateKey = getDateKey(date)

  // 检查缓存
  if (scheduleCache[dateKey] && isCacheValid(dateKey)) {
    return scheduleCache[dateKey]
  }

  // 清理过期缓存
  cleanExpiredCache()

  // 【已修复】基准日期：2025年9月4日（与后端保持一致）
  // Base schedule: 二组白班、一组晚班、三组/四组休息
  const baseDate = new Date(2025, 8, 4) // 月份从0开始，8表示9月
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  // Calculate days difference from base date
  const daysDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))

  // 4-group rotation cycle (4 days)
  const cyclePosition = ((daysDiff % 4) + 4) % 4

  // Define status rotation cycle: Day -> Night -> Rest Day 1 -> Rest Day 2
  const statusCycle = [
    { status: '白班' as const, cardType: 'duty-morning' as const },
    { status: '晚班' as const, cardType: 'duty-evening' as const },
    { status: '休息第一天' as const, cardType: 'duty-rest' as const },
    { status: '休息第二天' as const, cardType: 'duty-rest' as const },
  ]

  // 【已修复】Base schedule for September 4, 2025
  // 位置0: 二组白班、一组晚班、三组休息（次日）、四组休息（首日）
  const baseSchedule = [
    { group: '一组', status: '晚班' as const, cardType: 'duty-evening' as const },
    { group: '二组', status: '白班' as const, cardType: 'duty-morning' as const },
    { group: '三组', status: '休息第二天' as const, cardType: 'duty-rest' as const },
    { group: '四组', status: '休息第一天' as const, cardType: 'duty-rest' as const },
  ]

  // If it's the base date, return base schedule directly
  if (cyclePosition === 0) {
    // 存储到缓存
    scheduleCache[dateKey] = baseSchedule
    cacheTimestamps[dateKey] = Date.now()
    return baseSchedule
  }

  // Calculate rotated schedule
  const schedule: DutySchedule[] = []

  baseSchedule.forEach(baseItem => {
    // Find base status index in status cycle
    const baseStatusIndex = statusCycle.findIndex(status => status.status === baseItem.status)

    // Calculate new status index (forward rotation)
    const newStatusIndex = (baseStatusIndex + cyclePosition) % 4
    const newStatus = statusCycle[newStatusIndex]

    schedule.push({
      group: baseItem.group,
      status: newStatus.status,
      cardType: newStatus.cardType,
    })
  })

  // 存储到缓存
  scheduleCache[dateKey] = schedule
  cacheTimestamps[dateKey] = Date.now()

  return schedule
}

/**
 * Get duty schedule for today
 * @returns Today's duty schedule
 */
export const getTodayDutySchedule = (): DutySchedule[] => {
  return calculateDutySchedule(new Date())
}

/**
 * Get duty schedule for a specific group on a specific date
 * @param date - Target date
 * @param group - Group name (一组, 二组, 三组, 四组)
 * @returns Duty schedule for the specified group
 */
export const getGroupDutySchedule = (date: Date, group: string): DutySchedule | null => {
  const schedule = calculateDutySchedule(date)
  return schedule.find(duty => duty.group === group) || null
}

/**
 * Update teacher's shift based on their group and current date
 * @param teacher - Teacher object to update
 * @param date - Date for calculation (defaults to today)
 * @returns Updated teacher object
 */
export const updateTeacherShift = (teacher: Teacher, date: Date = new Date()): Teacher => {
  // 🔧 特殊处理行政班：行政班不参与轮班，固定显示"行政班"
  if (teacher.group === '行政班') {
    return {
      ...teacher,
      shift: '行政班',
    }
  }

  const groupSchedule = getGroupDutySchedule(date, teacher.group)

  return {
    ...teacher,
    shift: groupSchedule ? groupSchedule.status : '未排班',
  }
}

/**
 * Get schedule statistics for a date range
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Schedule statistics
 */
export const getScheduleStats = (startDate: Date, endDate: Date) => {
  const stats = {
    totalDays: 0,
    groupStats: {
      一组: { 白班: 0, 晚班: 0, 休息第一天: 0, 休息第二天: 0 },
      二组: { 白班: 0, 晚班: 0, 休息第一天: 0, 休息第二天: 0 },
      三组: { 白班: 0, 晚班: 0, 休息第一天: 0, 休息第二天: 0 },
      四组: { 白班: 0, 晚班: 0, 休息第一天: 0, 休息第二天: 0 },
    },
  }

  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const schedule = calculateDutySchedule(currentDate)
    stats.totalDays++

    schedule.forEach(duty => {
      stats.groupStats[duty.group as keyof typeof stats.groupStats][duty.status]++
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return stats
}

/**
 * 获取缓存统计信息
 * @returns 缓存统计数据
 */
export const getCacheStats = () => {
  const totalCached = Object.keys(scheduleCache).length
  const validCached = Object.keys(scheduleCache).filter(dateKey => isCacheValid(dateKey)).length
  const expiredCached = totalCached - validCached

  return {
    totalCached,
    validCached,
    expiredCached,
    cacheHitRate: totalCached > 0 ? ((validCached / totalCached) * 100).toFixed(2) + '%' : '0%',
  }
}

/**
 * 手动清理所有缓存
 */
export const clearAllCache = (): void => {
  Object.keys(scheduleCache).forEach(key => {
    delete scheduleCache[key]
  })
  Object.keys(cacheTimestamps).forEach(key => {
    delete cacheTimestamps[key]
  })
}

/**
 * 预加载指定日期范围的班次信息到缓存
 * @param startDate 开始日期
 * @param endDate 结束日期
 */
export const preloadScheduleCache = (startDate: Date, endDate: Date): void => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  while (start <= end) {
    calculateDutySchedule(new Date(start))
    start.setDate(start.getDate() + 1)
  }
}
