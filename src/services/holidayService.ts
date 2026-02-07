/**
 * 节假日服务
 * 提供节假日查询和判断功能
 */

export interface Holiday {
  date: string
  name: string
  type: 'national' | 'workday' // 法定节假日或调休工作日
  description?: string
}

export interface HolidayResponse {
  success: boolean
  holidays: Holiday[]
  workdays: string[]
}

/**
 * 节假日服务类
 */
export class HolidayService {
  private static instance: HolidayService
  private holidayCache: Map<string, Holiday[]> = new Map()
  private workdayCache: Set<string> = new Set()

  // 2025年法定节假日配置（与后端HolidayConfig保持一致）
  private readonly holidays2025: Holiday[] = [
    // 元旦
    { date: '2025-01-01', name: '元旦', type: 'national', description: '元旦节' },

    // 春节假期
    { date: '2025-01-28', name: '春节', type: 'national', description: '除夕' },
    { date: '2025-01-29', name: '春节', type: 'national', description: '春节初一' },
    { date: '2025-01-30', name: '春节', type: 'national', description: '春节初二' },
    { date: '2025-01-31', name: '春节', type: 'national', description: '春节初三' },
    { date: '2025-02-01', name: '春节', type: 'national', description: '春节初四' },
    { date: '2025-02-02', name: '春节', type: 'national', description: '春节初五' },
    { date: '2025-02-03', name: '春节', type: 'national', description: '春节初六' },

    // 清明节
    { date: '2025-04-05', name: '清明节', type: 'national', description: '清明节' },
    { date: '2025-04-06', name: '清明节', type: 'national', description: '清明节假期' },
    { date: '2025-04-07', name: '清明节', type: 'national', description: '清明节假期' },

    // 劳动节
    { date: '2025-05-01', name: '劳动节', type: 'national', description: '劳动节' },
    { date: '2025-05-02', name: '劳动节', type: 'national', description: '劳动节假期' },
    { date: '2025-05-03', name: '劳动节', type: 'national', description: '劳动节假期' },
    { date: '2025-05-04', name: '劳动节', type: 'national', description: '劳动节假期' },
    { date: '2025-05-05', name: '劳动节', type: 'national', description: '劳动节假期' },

    // 端午节（2025年5月31日至6月2日）
    { date: '2025-05-31', name: '端午节', type: 'national', description: '端午节' },
    { date: '2025-06-01', name: '端午节', type: 'national', description: '端午节假期' },
    { date: '2025-06-02', name: '端午节', type: 'national', description: '端午节假期' },

    // 国庆中秋合并放假
    { date: '2025-10-01', name: '国庆节', type: 'national', description: '国庆节' },
    { date: '2025-10-02', name: '国庆节', type: 'national', description: '国庆节假期' },
    { date: '2025-10-03', name: '国庆节', type: 'national', description: '国庆节假期' },
    { date: '2025-10-04', name: '国庆节', type: 'national', description: '国庆节假期' },
    { date: '2025-10-05', name: '国庆节', type: 'national', description: '国庆节假期' },
    { date: '2025-10-06', name: '中秋节', type: 'national', description: '中秋节（与国庆合并）' },
    { date: '2025-10-07', name: '国庆节', type: 'national', description: '国庆节假期' },
    { date: '2025-10-08', name: '国庆节', type: 'national', description: '国庆节假期' },
  ]

  // 2026年法定节假日配置
  private readonly holidays2026: Holiday[] = [
    // 元旦
    { date: '2026-01-01', name: '元旦', type: 'national', description: '元旦节' },

    // 春节假期（2026年2月15日-23日，共9天）
    { date: '2026-02-15', name: '春节', type: 'national', description: '春节假期第一天' },
    { date: '2026-02-16', name: '春节', type: 'national', description: '除夕' },
    { date: '2026-02-17', name: '春节', type: 'national', description: '春节初一' },
    { date: '2026-02-18', name: '春节', type: 'national', description: '春节初二' },
    { date: '2026-02-19', name: '春节', type: 'national', description: '春节初三' },
    { date: '2026-02-20', name: '春节', type: 'national', description: '春节初四' },
    { date: '2026-02-21', name: '春节', type: 'national', description: '春节初五' },
    { date: '2026-02-22', name: '春节', type: 'national', description: '春节初六' },
    { date: '2026-02-23', name: '春节', type: 'national', description: '春节假期最后一天' },

    // 清明节（2026年4月5日）
    { date: '2026-04-05', name: '清明节', type: 'national', description: '清明节' },
    { date: '2026-04-06', name: '清明节', type: 'national', description: '清明节假期' },
    { date: '2026-04-07', name: '清明节', type: 'national', description: '清明节假期' },

    // 劳动节
    { date: '2026-05-01', name: '劳动节', type: 'national', description: '劳动节' },
    { date: '2026-05-02', name: '劳动节', type: 'national', description: '劳动节假期' },
    { date: '2026-05-03', name: '劳动节', type: 'national', description: '劳动节假期' },
    { date: '2026-05-04', name: '劳动节', type: 'national', description: '劳动节假期' },
    { date: '2026-05-05', name: '劳动节', type: 'national', description: '劳动节假期' },

    // 端午节（2026年6月19日）
    { date: '2026-06-19', name: '端午节', type: 'national', description: '端午节' },
    { date: '2026-06-20', name: '端午节', type: 'national', description: '端午节假期' },
    { date: '2026-06-21', name: '端午节', type: 'national', description: '端午节假期' },

    // 中秋节（2026年9月25日）
    { date: '2026-09-25', name: '中秋节', type: 'national', description: '中秋节' },
    { date: '2026-09-26', name: '中秋节', type: 'national', description: '中秋节假期' },
    { date: '2026-09-27', name: '中秋节', type: 'national', description: '中秋节假期' },

    // 国庆节
    { date: '2026-10-01', name: '国庆节', type: 'national', description: '国庆节' },
    { date: '2026-10-02', name: '国庆节', type: 'national', description: '国庆节假期' },
    { date: '2026-10-03', name: '国庆节', type: 'national', description: '国庆节假期' },
    { date: '2026-10-04', name: '国庆节', type: 'national', description: '国庆节假期' },
    { date: '2026-10-05', name: '国庆节', type: 'national', description: '国庆节假期' },
    { date: '2026-10-06', name: '国庆节', type: 'national', description: '国庆节假期' },
    { date: '2026-10-07', name: '国庆节', type: 'national', description: '国庆节假期' },
  ]

  // 2025年调休工作日
  private readonly workdays2025: string[] = [
    '2025-01-26', // 春节调休
    '2025-02-08', // 春节调休
    '2025-04-27', // 劳动节调休
    '2025-09-28', // 国庆节调休
    '2025-10-11', // 国庆节调休
  ]

  // 2026年调休工作日（预估，待官方通知确认）
  private readonly workdays2026: string[] = [
    // 注：2026年春节假期为2月15日-23日，原调休日已取消
    // '2026-02-15', // 已取消（现为假期）
    // '2026-02-23', // 已取消（现为假期）
    '2026-04-26', // 劳动节调休（预估）
    '2026-09-27', // 国庆节调休（预估）
    '2026-10-10', // 国庆节调休（预估）
  ]

  private constructor() {
    this.initializeCache()
  }

  public static getInstance(): HolidayService {
    if (!HolidayService.instance) {
      HolidayService.instance = new HolidayService()
    }
    return HolidayService.instance
  }

  /**
   * 初始化缓存
   */
  private initializeCache(): void {
    // 缓存2025年节假日
    this.holidayCache.set('2025', this.holidays2025)
    // 缓存2026年节假日
    this.holidayCache.set('2026', this.holidays2026)

    // 缓存调休工作日
    this.workdays2025.forEach(date => {
      this.workdayCache.add(date)
    })
    this.workdays2026.forEach(date => {
      this.workdayCache.add(date)
    })
  }

  /**
   * 获取指定年份的节假日
   */
  public getHolidays(year: number): Holiday[] {
    const yearStr = year.toString()
    return this.holidayCache.get(yearStr) || []
  }

  /**
   * 判断指定日期是否为节假日
   */
  public isHoliday(date: string): boolean {
    const year = new Date(date).getFullYear()
    const holidays = this.getHolidays(year)
    return holidays.some(holiday => holiday.date === date)
  }

  /**
   * 获取指定日期的节假日信息
   */
  public getHolidayInfo(date: string): Holiday | null {
    const year = new Date(date).getFullYear()
    const holidays = this.getHolidays(year)
    return holidays.find(holiday => holiday.date === date) || null
  }

  /**
   * 判断指定日期是否为调休工作日
   */
  public isWorkday(date: string): boolean {
    return this.workdayCache.has(date)
  }

  /**
   * 判断指定日期是否为工作日
   * 考虑周末、节假日和调休
   */
  public isWorkingDay(date: string): boolean {
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay() // 0=周日, 6=周六

    // 如果是调休工作日，则为工作日
    if (this.isWorkday(date)) {
      return true
    }

    // 如果是节假日，则不是工作日
    if (this.isHoliday(date)) {
      return false
    }

    // 如果是周末，则不是工作日
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false
    }

    // 其他情况为工作日
    return true
  }

  /**
   * 获取日期范围内的所有节假日
   */
  public getHolidaysInRange(startDate: string, endDate: string): Holiday[] {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const result: Holiday[] = []

    const current = new Date(start)
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      const holidayInfo = this.getHolidayInfo(dateStr)
      if (holidayInfo) {
        result.push(holidayInfo)
      }
      current.setDate(current.getDate() + 1)
    }

    return result
  }

  /**
   * 获取节假日违反提示信息
   */
  public getHolidayViolationMessage(date: string): string {
    const holidayInfo = this.getHolidayInfo(date)
    if (!holidayInfo) {
      return `${date} 不是节假日`
    }

    return `不能在${holidayInfo.name}（${date}）安排考试，这是国家法定节假日。`
  }

  /**
   * 获取多个日期的节假日违反提示
   */
  public getMultipleHolidayViolationMessage(dates: string[]): string {
    const violations = dates
      .filter(date => this.isHoliday(date))
      .map(date => {
        const holidayInfo = this.getHolidayInfo(date)
        return `${date}（${holidayInfo?.name || '节假日'}）`
      })

    if (violations.length === 0) {
      return ''
    }

    if (violations.length === 1) {
      return `不能在${violations[0]}安排考试，这是国家法定节假日。`
    }

    return `不能在以下日期安排考试，这些都是国家法定节假日：${violations.join('、')}。`
  }

  /**
   * 从后端API获取节假日数据（预留接口）
   */
  public async fetchHolidaysFromAPI(year: number): Promise<HolidayResponse> {
    try {
      // 这里可以调用后端API获取节假日数据
      // const response = await fetch(`/api/holidays?year=${year}`)
      // const data = await response.json()

      // 目前返回本地数据
      const workdays = year === 2025 ? this.workdays2025 : year === 2026 ? this.workdays2026 : []
      return {
        success: true,
        holidays: this.getHolidays(year),
        workdays: workdays,
      }
    } catch (error) {
      console.error('获取节假日数据失败:', error)
      return {
        success: false,
        holidays: [],
        workdays: [],
      }
    }
  }
}

// 导出单例实例
export const holidayService = HolidayService.getInstance()

// 导出便捷方法
export const isHoliday = (date: string): boolean => holidayService.isHoliday(date)
export const getHolidayInfo = (date: string): Holiday | null => holidayService.getHolidayInfo(date)
export const isWorkingDay = (date: string): boolean => holidayService.isWorkingDay(date)
export const getHolidayViolationMessage = (date: string): string =>
  holidayService.getHolidayViolationMessage(date)
