/**
 * 统一缓存管理器
 * 解决前后端数据不一致问题，确保考官数据同步
 */

import type { Teacher } from '../types'
import { storageService } from './storageService'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  version: string
  source: 'frontend' | 'backend' | 'localStorage'
}

export interface CacheSyncStatus {
  isConsistent: boolean
  conflicts: Array<{
    field: string
    frontendValue: any
    backendValue: any
    teacherId: string
  }>
  lastSyncTime: number
  cacheStats: {
    frontend: number
    backend: number
    localStorage: number
  }
}

/**
 * 统一缓存管理器
 */
export class UnifiedCacheManager {
  private static instance: UnifiedCacheManager
  private teacherCache = new Map<string, CacheEntry<Teacher>>()
  private readonly CACHE_VERSION = '1.0.0'
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟
  private readonly SYNC_INTERVAL = 30 * 1000 // 30秒同步检查

  private syncTimer: number | null = null
  private lastSyncTime = 0

  private constructor() {
    this.startSyncMonitor()
  }

  static getInstance(): UnifiedCacheManager {
    if (!UnifiedCacheManager.instance) {
      UnifiedCacheManager.instance = new UnifiedCacheManager()
    }
    return UnifiedCacheManager.instance
  }

  /**
   * 启动同步监控
   */
  private startSyncMonitor(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
    }

    this.syncTimer = window.setInterval(async () => {
      try {
        await this.performSyncCheck()
      } catch (error) {
        console.error('🚨 缓存同步检查失败:', error)
      }
    }, this.SYNC_INTERVAL)
  }

  /**
   * 执行同步检查
   */
  private async performSyncCheck(): Promise<void> {
    const status = await this.checkSyncStatus()

    if (!status.isConsistent) {
      console.warn('⚠️ 检测到考官数据不一致:', status.conflicts)
      await this.resolveConflicts(status.conflicts)
    }
  }

  /**
   * 设置考官数据（统一入口）
   */
  async setTeachers(
    teachers: Teacher[],
    source: 'frontend' | 'backend' = 'frontend'
  ): Promise<void> {
    process.env.NODE_ENV === 'development' && console.log(`📝 设置考官数据 (来源: ${source})，数量: ${teachers.length}`)

    const timestamp = Date.now()

    // 更新内存缓存
    teachers.forEach(teacher => {
      this.teacherCache.set(teacher.id, {
        data: teacher,
        timestamp,
        version: this.CACHE_VERSION,
        source,
      })
    })

    // 同步到localStorage
    try {
      await storageService.saveTeachers(teachers)
      process.env.NODE_ENV === 'development' && console.log('✅ 考官数据已同步到localStorage')
    } catch (error) {
      console.error('❌ 同步到localStorage失败:', error)
    }

    this.lastSyncTime = timestamp
  }

  /**
   * 获取考官数据（统一出口）
   */
  async getTeachers(): Promise<Teacher[]> {
    // 1. 优先从内存缓存获取
    const memoryTeachers = Array.from(this.teacherCache.values())
      .filter(entry => this.isCacheValid(entry))
      .map(entry => entry.data)

    if (memoryTeachers.length > 0) {
      process.env.NODE_ENV === 'development' && console.log(`📦 从内存缓存获取考官数据: ${memoryTeachers.length}名`)
      return memoryTeachers
    }

    // 2. 从localStorage获取
    try {
      const storedTeachers = await storageService.loadTeachers()
      if (storedTeachers.length > 0) {
        process.env.NODE_ENV === 'development' && console.log(`💾 从localStorage获取考官数据: ${storedTeachers.length}名`)

        // 更新内存缓存
        await this.setTeachers(storedTeachers, 'frontend')
        return storedTeachers
      }
    } catch (error) {
      console.error('❌ 从localStorage加载失败:', error)
    }

    // 3. 返回空数组（需要重新加载）
    console.warn('⚠️ 未找到缓存的考官数据，需要重新加载')
    return []
  }

  /**
   * 获取单个考官
   */
  getTeacher(teacherId: string): Teacher | null {
    const entry = this.teacherCache.get(teacherId)

    if (entry && this.isCacheValid(entry)) {
      return entry.data
    }

    return null
  }

  /**
   * 更新单个考官
   */
  async updateTeacher(teacher: Teacher): Promise<void> {
    process.env.NODE_ENV === 'development' && console.log(`🔄 更新考官数据: ${teacher.name} (${teacher.id})`)

    this.teacherCache.set(teacher.id, {
      data: teacher,
      timestamp: Date.now(),
      version: this.CACHE_VERSION,
      source: 'frontend',
    })

    // 同步到localStorage
    const allTeachers = await this.getTeachers()
    const updatedTeachers = allTeachers.map(t => (t.id === teacher.id ? teacher : t))
    await storageService.saveTeachers(updatedTeachers)
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(entry: CacheEntry<any>): boolean {
    const now = Date.now()
    return now - entry.timestamp < this.CACHE_TTL
  }

  /**
   * 检查同步状态
   */
  async checkSyncStatus(): Promise<CacheSyncStatus> {
    const memoryTeachers = Array.from(this.teacherCache.values()).map(e => e.data)
    const storedTeachers = await storageService.loadTeachers()

    const conflicts: CacheSyncStatus['conflicts'] = []

    // 检查数据一致性
    for (const memoryTeacher of memoryTeachers) {
      const storedTeacher = storedTeachers.find(t => t.id === memoryTeacher.id)

      if (storedTeacher) {
        // 检查关键字段是否一致
        const fieldsToCheck = ['name', 'department', 'group', 'workload', 'consecutiveDays']

        for (const field of fieldsToCheck) {
          if (memoryTeacher[field as keyof Teacher] !== storedTeacher[field as keyof Teacher]) {
            conflicts.push({
              field,
              frontendValue: memoryTeacher[field as keyof Teacher],
              backendValue: storedTeacher[field as keyof Teacher],
              teacherId: memoryTeacher.id,
            })
          }
        }
      }
    }

    return {
      isConsistent: conflicts.length === 0,
      conflicts,
      lastSyncTime: this.lastSyncTime,
      cacheStats: {
        frontend: memoryTeachers.length,
        backend: 0, // 需要从API获取
        localStorage: storedTeachers.length,
      },
    }
  }

  /**
   * 解决冲突
   */
  private async resolveConflicts(conflicts: CacheSyncStatus['conflicts']): Promise<void> {
    process.env.NODE_ENV === 'development' && console.log('🔧 开始解决缓存冲突...')

    const teachersToUpdate = new Map<string, Teacher>()

    for (const conflict of conflicts) {
      const teacher = this.getTeacher(conflict.teacherId)
      if (teacher) {
        // 优先使用前端数据（最新的用户操作）
        teachersToUpdate.set(conflict.teacherId, teacher)
        process.env.NODE_ENV === 'development' && console.log(`📝 冲突解决: ${teacher.name}.${conflict.field} = ${conflict.frontendValue}`)
      }
    }

    // 批量更新localStorage
    if (teachersToUpdate.size > 0) {
      const allTeachers = await this.getTeachers()
      const updatedTeachers = allTeachers.map(
        teacher => teachersToUpdate.get(teacher.id) || teacher
      )

      await storageService.saveTeachers(updatedTeachers)
      process.env.NODE_ENV === 'development' && console.log(`✅ 已解决 ${conflicts.length} 个缓存冲突`)
    }
  }

  /**
   * 强制同步
   */
  async forceSync(): Promise<void> {
    process.env.NODE_ENV === 'development' && console.log('🔄 执行强制同步...')

    const memoryTeachers = Array.from(this.teacherCache.values()).map(e => e.data)

    if (memoryTeachers.length > 0) {
      await storageService.saveTeachers(memoryTeachers)
      this.lastSyncTime = Date.now()
      process.env.NODE_ENV === 'development' && console.log('✅ 强制同步完成')
    }
  }

  /**
   * 清除所有缓存
   */
  async clearCache(): Promise<void> {
    process.env.NODE_ENV === 'development' && console.log('🗑️ 清除所有缓存...')

    this.teacherCache.clear()
    await storageService.clearAllData()
    this.lastSyncTime = 0

    process.env.NODE_ENV === 'development' && console.log('✅ 缓存清除完成')
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    memorySize: number
    lastSyncTime: number
    cacheHitRate: number
  } {
    return {
      memorySize: this.teacherCache.size,
      lastSyncTime: this.lastSyncTime,
      cacheHitRate: 0, // 需要实现命中率统计
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }

    this.teacherCache.clear()
  }
}

// 导出单例实例
export const cacheManager = UnifiedCacheManager.getInstance()

// 导出便捷函数
export const getTeachers = () => cacheManager.getTeachers()
export const setTeachers = (teachers: Teacher[], source?: 'frontend' | 'backend') =>
  cacheManager.setTeachers(teachers, source)
export const getTeacher = (id: string) => cacheManager.getTeacher(id)
export const updateTeacher = (teacher: Teacher) => cacheManager.updateTeacher(teacher)
export const checkCacheSync = () => cacheManager.checkSyncStatus()
export const forceSync = () => cacheManager.forceSync()
export const clearCache = () => cacheManager.clearCache()
