/**
 * 统一存储服务 - 提供统一的数据存储接口
 */

import type { Teacher } from '../types'

// 扩展考官类型
export interface ExtendedTeacher extends Teacher {
  createdAt?: string
  updatedAt?: string
}

// 存储配置接口
export interface UnifiedStorageConfig {
  environment: 'web' | 'node' | 'hybrid'
  primary: 'localStorage' | 'sessionStorage' | 'indexedDB'
  fallback?: 'localStorage' | 'sessionStorage'
  enableCache?: boolean
  cacheTimeout?: number
}

// 存储统计信息
export interface StorageStats {
  environment: string
  primary: string
  cacheHits: number
  cacheMisses: number
  cacheHitRate: string
  avgResponseTime: number
  dataSize: string
}

// 排班结果记录接口
export interface ScheduleResultRecord {
  id: string
  title: string
  result: any
  displayData?: any[]
  metadata?: {
    studentCount: number
    teacherCount: number
    dateRange: string
    constraints?: any
    studentList?: any[]
    teacherList?: any[]
  }
  timestamp: string
}

/**
 * 统一存储服务类
 */
class UnifiedStorageService {
  private config: UnifiedStorageConfig
  private cache: Map<string, any> = new Map()
  private stats: StorageStats
  private initialized = false

  constructor() {
    this.config = {
      environment: 'web',
      primary: 'localStorage',
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5分钟
    }

    this.stats = {
      environment: 'web',
      primary: 'localStorage',
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: '0%',
      avgResponseTime: 0,
      dataSize: '0 B',
    }
  }

  /**
   * 初始化存储服务
   */
  async init(config?: Partial<UnifiedStorageConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    this.stats.environment = this.config.environment
    this.stats.primary = this.config.primary

    this.initialized = true
    process.env.NODE_ENV === 'development' && console.log('统一存储服务初始化完成', this.config)
  }

  /**
   * 加载考官数据
   */
  async loadTeachers(): Promise<ExtendedTeacher[]> {
    const startTime = Date.now()

    try {
      // 检查缓存
      if (this.config.enableCache && this.cache.has('teachers')) {
        this.stats.cacheHits++
        this.updateCacheHitRate()
        return this.cache.get('teachers')
      }

      this.stats.cacheMisses++

      const data = localStorage.getItem('teachers')
      const teachers: ExtendedTeacher[] = data ? JSON.parse(data) : []

      // 缓存数据
      if (this.config.enableCache) {
        this.cache.set('teachers', teachers)
      }

      this.updateCacheHitRate()
      this.updateResponseTime(Date.now() - startTime)

      return teachers
    } catch (error) {
      console.error('加载考官数据失败:', error)
      return []
    }
  }

  /**
   * 保存考官数据
   */
  async saveTeachers(teachers: ExtendedTeacher[]): Promise<void> {
    const startTime = Date.now()

    try {
      // 添加时间戳
      const teachersWithTimestamp = teachers.map(teacher => ({
        ...teacher,
        updatedAt: new Date().toISOString(),
      }))

      localStorage.setItem('teachers', JSON.stringify(teachersWithTimestamp))

      // 更新缓存
      if (this.config.enableCache) {
        this.cache.set('teachers', teachersWithTimestamp)
      }

      this.updateResponseTime(Date.now() - startTime)
      this.updateDataSize()
    } catch (error) {
      console.error('保存考官数据失败:', error)
      throw error
    }
  }

  /**
   * 保存排班结果
   */
  async saveScheduleResult(result: ScheduleResultRecord): Promise<void> {
    try {
      localStorage.setItem('scheduleResult', JSON.stringify(result))

      // 更新缓存
      if (this.config.enableCache) {
        this.cache.set('scheduleResult', result)
      }

      this.updateDataSize()
    } catch (error) {
      console.error('保存排班结果失败:', error)
      throw error
    }
  }

  /**
   * 加载最新的排班结果
   */
  async loadLatestScheduleResult(): Promise<ScheduleResultRecord | null> {
    try {
      // 检查缓存
      if (this.config.enableCache && this.cache.has('scheduleResult')) {
        this.stats.cacheHits++
        this.updateCacheHitRate()
        return this.cache.get('scheduleResult')
      }

      this.stats.cacheMisses++

      const data = localStorage.getItem('scheduleResult')
      const result = data ? JSON.parse(data) : null

      // 缓存数据
      if (this.config.enableCache && result) {
        this.cache.set('scheduleResult', result)
      }

      this.updateCacheHitRate()

      return result
    } catch (error) {
      console.error('加载最新排班结果失败:', error)
      return null
    }
  }

  /**
   * 清除所有数据
   */
  async clearAllData(): Promise<void> {
    try {
      localStorage.clear()
      this.cache.clear()
      this.resetStats()
    } catch (error) {
      console.error('清除数据失败:', error)
      throw error
    }
  }

  /**
   * 获取存储统计信息
   */
  getStorageStats(): StorageStats {
    return { ...this.stats }
  }

  /**
   * 更新缓存命中率
   */
  private updateCacheHitRate(): void {
    const total = this.stats.cacheHits + this.stats.cacheMisses
    if (total > 0) {
      this.stats.cacheHitRate = `${Math.round((this.stats.cacheHits / total) * 100)}%`
    }
  }

  /**
   * 更新响应时间
   */
  private updateResponseTime(responseTime: number): void {
    this.stats.avgResponseTime = Math.round((this.stats.avgResponseTime + responseTime) / 2)
  }

  /**
   * 更新数据大小
   */
  private updateDataSize(): void {
    try {
      const size = JSON.stringify(localStorage).length
      this.stats.dataSize = this.formatBytes(size)
    } catch (error) {
      this.stats.dataSize = '未知'
    }
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 重置统计信息
   */
  private resetStats(): void {
    this.stats.cacheHits = 0
    this.stats.cacheMisses = 0
    this.stats.cacheHitRate = '0%'
    this.stats.avgResponseTime = 0
    this.stats.dataSize = '0 B'
  }
}

// 导出单例实例
export const unifiedStorageService = new UnifiedStorageService()

// 为了向后兼容，导出 storageService 别名
export const storageService = unifiedStorageService

// 默认导出
export default unifiedStorageService
