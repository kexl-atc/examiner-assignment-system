/**
 * 统一日期处理工具类
 * 用于解决系统中日期格式不一致的问题
 */

export class DateUtils {
  /**
   * 将日期转换为标准存储格式 (YYYY-MM-DD)
   * @param date 日期对象
   * @returns 标准存储格式的日期字符串
   */
  static toStorageDate(date: Date): string {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  /**
   * 解析日期字符串为Date对象
   * @param dateStr 日期字符串
   * @returns Date对象
   */
  static parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    
    // 如果已经是标准格式，直接解析
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    
    // 尝试直接解析
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  
  /**
   * 将各种日期格式统一转换为标准YYYY-MM-DD格式
   * @param date 日期字符串或Date对象
   * @returns 标准格式的日期字符串
   */
  static toStandardDate(date: string | Date): string {
    if (!date) return '';
    
    // 如果是Date对象，直接转换
    if (date instanceof Date) {
      return this.toStorageDate(date);
    }
    
    const dateStr = String(date).trim();
    
    // 处理MM.DD格式 (如 "12.21")
    if (/^\d{1,2}\.\d{1,2}$/.test(dateStr)) {
      const [month, day] = dateStr.split('.');
      const year = new Date().getFullYear();
      // 如果月份小于当前月份，可能是下一年
      const adjustedYear = parseInt(month) < new Date().getMonth() + 1 ? year + 1 : year;
      return `${adjustedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // 处理MM-DD格式 (如 "12-21")
    if (/^\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const [month, day] = dateStr.split('-');
      const year = new Date().getFullYear();
      // 如果月份小于当前月份，可能是下一年
      const adjustedYear = parseInt(month) < new Date().getMonth() + 1 ? year + 1 : year;
      return `${adjustedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // 处理YYYYMMDD格式 (如 "20231221")
    if (/^\d{8}$/.test(dateStr)) {
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    
    // 处理已存在的YYYY-MM-DD格式
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    
    // 处理"MM月DD日"中文格式
    if (/^\d{1,2}月\d{1,2}日$/.test(dateStr)) {
      const cleaned = dateStr.replace('月', '-').replace('日', '');
      const [month, day] = cleaned.split('-');
      const year = new Date().getFullYear();
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // 尝试直接解析
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return this.toStorageDate(parsed);
    }
    
    // 如果所有方法都失败，抛出错误
    throw new Error(`无法识别的日期格式: ${dateStr}`);
  }
  
  /**
   * 将标准日期格式转换为显示用的MM.DD格式
   * @param date 标准格式的日期字符串或Date对象
   * @returns 显示格式的日期字符串
   */
  static toDisplayDate(date: string | Date): string {
    const standard = this.toStandardDate(date);
    if (!standard) return '';
    const [, month, day] = standard.split('-');
    return `${month}.${day}`;
  }
  
  /**
   * 获取指定日期的下一天
   * @param date 日期字符串或Date对象
   * @returns 下一天的标准格式日期字符串
   */
  static getNextDay(date: string | Date): string {
    const standard = this.toStandardDate(date);
    if (!standard) return '';
    
    const dateObj = new Date(standard);
    dateObj.setDate(dateObj.getDate() + 1);
    return this.toStorageDate(dateObj);
  }
  
  /**
   * 获取指定日期的上一天
   * @param date 日期字符串或Date对象
   * @returns 上一天的标准格式日期字符串
   */
  static getPreviousDay(date: string | Date): string {
    const standard = this.toStandardDate(date);
    if (!standard) return '';
    
    const dateObj = new Date(standard);
    dateObj.setDate(dateObj.getDate() - 1);
    return this.toStorageDate(dateObj);
  }
  
  /**
   * 比较两个日期是否相等
   * @param date1 第一个日期
   * @param date2 第二个日期
   * @returns 是否相等
   */
  static isSameDay(date1: string | Date, date2: string | Date): boolean {
    try {
      const standard1 = this.toStandardDate(date1);
      const standard2 = this.toStandardDate(date2);
      return standard1 === standard2;
    } catch (error) {
      console.error('日期比较失败:', error);
      return false;
    }
  }
  
  /**
   * 检查日期是否在指定范围内
   * @param date 要检查的日期
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 是否在范围内
   */
  static isDateInRange(date: string | Date, startDate: string | Date, endDate: string | Date): boolean {
    try {
      const target = this.toStandardDate(date);
      const start = this.toStandardDate(startDate);
      const end = this.toStandardDate(endDate);
      
      return target >= start && target <= end;
    } catch (error) {
      console.error('日期范围检查失败:', error);
      return false;
    }
  }
  
  /**
   * 格式化日期为中文格式 (YYYY年MM月DD日)
   * @param date 日期字符串或Date对象
   * @returns 中文格式的日期字符串
   */
  static toChineseDate(date: string | Date): string {
    const standard = this.toStandardDate(date);
    if (!standard) return '';
    
    const [year, month, day] = standard.split('-');
    return `${year}年${parseInt(month)}月${parseInt(day)}日`;
  }
  
  /**
   * 获取日期的星期几
   * @param date 日期字符串或Date对象
   * @returns 星期几的中文名称
   */
  static getDayOfWeek(date: string | Date): string {
    const standard = this.toStandardDate(date);
    if (!standard) return '';
    
    const dateObj = new Date(standard);
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return days[dateObj.getDay()];
  }
  
  /**
   * 获取日期的星期几索引 (0-6, 0代表周日)
   * @param date 日期字符串或Date对象
   * @returns 星期几的索引
   */
  static getDayOfWeekIndex(date: string | Date): number {
    const standard = this.toStandardDate(date);
    if (!standard) return -1;
    
    const dateObj = new Date(standard);
    return dateObj.getDay();
  }
  
  /**
   * 计算两个日期之间的天数差
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 天数差
   */
  static getDaysDifference(startDate: string | Date, endDate: string | Date): number {
    try {
      const start = this.toStandardDate(startDate);
      const end = this.toStandardDate(endDate);
      
      const startObj = new Date(start);
      const endObj = new Date(end);
      
      // 计算毫秒差并转换为天数
      const diffTime = Math.abs(endObj.getTime() - startObj.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('日期差计算失败:', error);
      return 0;
    }
  }
  
  /**
   * 比较两个日期的先后顺序
   * @param date1 第一个日期
   * @param date2 第二个日期
   * @returns 1: date1 > date2, 0: date1 = date2, -1: date1 < date2
   */
  static compareDates(date1: string | Date, date2: string | Date): number {
    try {
      const standard1 = this.toStandardDate(date1);
      const standard2 = this.toStandardDate(date2);
      
      if (standard1 > standard2) return 1;
      if (standard1 < standard2) return -1;
      return 0;
    } catch (error) {
      console.error('日期比较失败:', error);
      return 0;
    }
  }
  
  /**
   * 检查日期是否在过去
   * @param date 要检查的日期
   * @returns 是否在过去
   */
  static isDateInPast(date: string | Date): boolean {
    try {
      const target = this.toStandardDate(date);
      const today = this.toStandardDate(new Date());
      return target < today;
    } catch (error) {
      console.error('日期检查失败:', error);
      return false;
    }
  }
  
  /**
   * 获取指定天数前的日期
   * @param days 天数
   * @param baseDate 基准日期，默认为当前日期
   * @returns 指定天数前的标准格式日期字符串
   */
  static getDaysAgo(days: number, baseDate?: Date): string {
    const date = baseDate || new Date();
    date.setDate(date.getDate() - days);
    return this.toStorageDate(date);
  }
  
  /**
   * 将日期转换为日期时间字符串 (YYYY-MM-DD HH:mm:ss)
   * @param date 日期对象
   * @returns 日期时间字符串
   */
  static toDateTimeString(date: Date): string {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
  
  /**
   * 将日期转换为时间字符串 (HH:mm)
   * @param date 日期对象
   * @returns 时间字符串
   */
  static toTimeString(date: Date): string {
    if (!date) return '';
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  }
  
  /**
   * 为日期添加指定月份
   * @param date 基准日期
   * @param months 要添加的月份数，可以为负数
   * @returns 新的Date对象
   */
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    const monthsToAdd = parseInt(months.toString(), 10);
    result.setMonth(result.getMonth() + monthsToAdd);
    return result;
  }
  
  /**
   * 获取月份的第一天
   * @param date 基准日期
   * @returns 月份第一天的Date对象
   */
  static getStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  
  /**
   * 获取月份的最后一天
   * @param date 基准日期
   * @returns 月份最后一天的Date对象
   */
  static getEndOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
  
  /**
   * 获取下个月的第一天
   * @param date 基准日期
   * @returns 下个月第一天的Date对象
   */
  static getStartOfNextMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }
  
  /**
   * 获取一天的开始时间（00:00:00）
   * @param date 基准日期
   * @returns 一天开始时间的Date对象
   */
  static getStartOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }
}