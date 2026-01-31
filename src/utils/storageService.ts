/**
 * 存储服务 - 简化的存储接口
 */

import type { Teacher } from '../types'

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
 * 存储服务类 - 提供简化的存储接口
 */
class StorageService {
  /**
   * 加载考官数据
   */
  async loadTeachers(): Promise<Teacher[]> {
    try {
      const data = localStorage.getItem('teachers')
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('加载考官数据失败:', error)
      return []
    }
  }

  /**
   * 保存考官数据
   */
  async saveTeachers(teachers: Teacher[]): Promise<void> {
    try {
      localStorage.setItem('teachers', JSON.stringify(teachers))
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
      const data = localStorage.getItem('scheduleResult')
      return data ? JSON.parse(data) : null
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
    } catch (error) {
      console.error('清除数据失败:', error)
      throw error
    }
  }

  /**
   * 获取存储统计信息
   */
  getStorageStats() {
    return {
      totalItems: localStorage.length,
      usedSpace: JSON.stringify(localStorage).length,
    }
  }
}

// 导出单例实例
export const storageService = new StorageService()

// 默认导出
export default storageService
