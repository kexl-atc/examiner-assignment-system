/**
 * 历史排班管理服务
 * 负责管理排班快照的保存、查询、删除等操作
 */

import type {
  ScheduleSnapshot,
  ScheduleResultRecord,
  ManualEditInfo,
  ScheduleSnapshotQuery,
  ScheduleSnapshotListResponse,
} from '../types/index'

// 获取后端API基础URL
const getBaseURL = async () => {
  // @ts-ignore - electronAPI是在Electron环境中动态注入的
  if (window.electronAPI && window.electronAPI.isElectron) {
    try {
      const port = await window.electronAPI.getBackendPort()
      return `http://127.0.0.1:${port}`
    } catch (error) {
      console.warn('Failed to get backend port, using relative path:', error)
      // 降级方案：使用相对路径
      return ''
    }
  }
  // Web环境：使用相对路径，让HTTP服务器代理处理
  // 🔧 修复：统一使用相对路径，无论是Vite开发服务器还是SimpleHttpServer都能正确代理
  return ''
}

class ScheduleHistoryService {
  private baseUrl: string | null = null

  private async getBaseUrl(): Promise<string> {
    if (!this.baseUrl) {
      this.baseUrl = await getBaseURL()
    }
    return this.baseUrl
  }

  /**
   * 保存排班快照（完整版本）
   * @param name 快照名称
   * @param description 快照描述
   * @param scheduleData 排班结果数据
   * @param constraintConfig 约束配置
   * @param studentList 学员完整数据（可选）
   * @param teacherList 教师完整数据（可选，包含不可用时间）
   * @param examDates 考试日期范围（可选）
   */
  async saveSnapshot(
    name: string,
    description: string,
    scheduleData: ScheduleResultRecord[],
    constraintConfig?: any,
    studentList?: any[],
    teacherList?: any[],
    examDates?: string[]
  ): Promise<ScheduleSnapshot> {
    try {
      // 计算元数据，包含扩展信息
      const metadata = this.calculateMetadata(scheduleData, constraintConfig)

      // 添加扩展元数据
      if (studentList) {
        metadata.studentList = studentList
      }
      if (teacherList) {
        // 确保保存教师的不可用时间
        metadata.teacherList = teacherList.map((teacher: any) => ({
          id: teacher.id,
          name: teacher.name,
          department: teacher.department,
          group: teacher.group,
          shift: teacher.shift,
          status: teacher.status,
          workload: teacher.workload,
          consecutiveDays: teacher.consecutiveDays,
          unavailablePeriods: teacher.unavailablePeriods || [], // 重要：保存不可用时间
          availability: teacher.availability,
        }))
      }
      if (examDates) {
        metadata.examDates = examDates
      }

      const snapshot: Omit<ScheduleSnapshot, 'id' | 'createdAt'> = {
        name,
        description,
        scheduleData,
        metadata,
      }

      const baseUrl = await this.getBaseUrl()
      const url = `${baseUrl}/api/schedule-snapshots`
      const requestBody = JSON.stringify(snapshot)
      const bodySize = new Blob([requestBody]).size
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'scheduleHistoryService.ts:95',
          message: 'Saving snapshot - request details',
          data: {
            url,
            method: 'POST',
            bodySize,
            snapshotName: snapshot.name,
            scheduleDataCount: snapshot.scheduleData?.length || 0,
            hasMetadata: !!snapshot.metadata
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'snapshot-save',
          hypothesisId: 'A'
        })
      }).catch(() => {})
      // #endregion
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      })

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'scheduleHistoryService.ts:103',
          message: 'Snapshot save response received',
          data: {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            contentType: response.headers.get('content-type')
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'snapshot-save',
          hypothesisId: 'A'
        })
      }).catch(() => {})
      // #endregion

      if (!response.ok) {
        const errorText = await response.text()
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'scheduleHistoryService.ts:110',
            message: 'Snapshot save failed',
            data: {
              status: response.status,
              statusText: response.statusText,
              errorText: errorText.substring(0, 500)
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'snapshot-save',
            hypothesisId: 'A'
          })
        }).catch(() => {})
        // #endregion
        throw new Error(`保存失败: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`)
      }

      const result = await response.json()
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'scheduleHistoryService.ts:125',
          message: 'Snapshot save success',
          data: {
            snapshotId: result.id,
            snapshotName: result.name
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'snapshot-save',
          hypothesisId: 'A'
        })
      }).catch(() => {})
      // #endregion
      process.env.NODE_ENV === 'development' && console.log('✅ 排班快照保存成功（含学员、教师数据）:', {
        id: result.id,
        name: result.name,
        students: metadata.studentList?.length || 0,
        teachers: metadata.teacherList?.length || 0,
        unavailablePeriodsCount:
          metadata.teacherList?.reduce(
            (sum: number, t: any) => sum + (t.unavailablePeriods?.length || 0),
            0
          ) || 0,
      })
      return result
    } catch (error) {
      console.error('❌ 保存排班快照失败:', error)
      throw error
    }
  }

  /**
   * 获取历史排班列表
   */
  async getSnapshotList(query?: ScheduleSnapshotQuery): Promise<ScheduleSnapshotListResponse> {
    try {
      const params = new URLSearchParams()

      if (query?.page) params.append('page', query.page.toString())
      if (query?.pageSize) params.append('pageSize', query.pageSize.toString())
      if (query?.sortBy) params.append('sortBy', query.sortBy)
      if (query?.sortOrder) params.append('sortOrder', query.sortOrder)
      if (query?.nameFilter) params.append('nameFilter', query.nameFilter)
      if (query?.startDate) params.append('startDate', query.startDate)
      if (query?.endDate) params.append('endDate', query.endDate)

      const response = await fetch(
        `${await this.getBaseUrl()}/api/schedule-snapshots?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error(`查询失败: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('❌ 获取历史排班列表失败:', error)
      throw error
    }
  }

  /**
   * 获取单个排班快照
   */
  async getSnapshot(id: string | number): Promise<ScheduleSnapshot> {
    try {
      const response = await fetch(`${await this.getBaseUrl()}/api/schedule-snapshots/${id}`)

      if (!response.ok) {
        throw new Error(`查询失败: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('❌ 获取排班快照失败:', error)
      throw error
    }
  }

  /**
   * 删除排班快照
   */
  async deleteSnapshot(id: string | number): Promise<void> {
    try {
      const response = await fetch(`${await this.getBaseUrl()}/api/schedule-snapshots/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`删除失败: ${response.statusText}`)
      }

      process.env.NODE_ENV === 'development' && console.log('✅ 排班快照删除成功')
    } catch (error) {
      console.error('❌ 删除排班快照失败:', error)
      throw error
    }
  }

  /**
   * 更新排班快照（用于保存人工修改）
   */
  async updateSnapshot(
    id: string | number,
    scheduleData: ScheduleResultRecord[],
    constraintConfig?: any
  ): Promise<ScheduleSnapshot> {
    try {
      const metadata = this.calculateMetadata(scheduleData, constraintConfig)

      const response = await fetch(`${await this.getBaseUrl()}/api/schedule-snapshots/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleData,
          metadata,
        }),
      })

      if (!response.ok) {
        throw new Error(`更新失败: ${response.statusText}`)
      }

      const result = await response.json()
      process.env.NODE_ENV === 'development' && console.log('✅ 排班快照更新成功:', result)
      return result
    } catch (error) {
      console.error('❌ 更新排班快照失败:', error)
      throw error
    }
  }

  /**
   * 记录人工修改
   */
  recordManualEdit(
    record: ScheduleResultRecord,
    field: string,
    oldValue: string,
    newValue: string,
    conflictLevel?: 'none' | 'info' | 'warning' | 'error'
  ): ScheduleResultRecord {
    if (!record.manualEdits) {
      record.manualEdits = []
    }

    const edit: ManualEditInfo = {
      field,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      conflictLevel: conflictLevel || 'none',
    }

    record.manualEdits.push(edit)
    return record
  }

  /**
   * 批量删除旧快照
   */
  async batchDeleteSnapshots(ids: (string | number)[]): Promise<void> {
    try {
      const response = await fetch(`${await this.getBaseUrl()}/api/schedule-snapshots/batch-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      })

      if (!response.ok) {
        throw new Error(`批量删除失败: ${response.statusText}`)
      }

      process.env.NODE_ENV === 'development' && console.log('✅ 批量删除排班快照成功')
    } catch (error) {
      console.error('❌ 批量删除排班快照失败:', error)
      throw error
    }
  }

  /**
   * 获取存储空间统计
   */
  async getStorageStatistics(): Promise<{
    totalSnapshots: number
    totalSize: number
    oldestSnapshot: string
    newestSnapshot: string
  }> {
    try {
      const response = await fetch(`${await this.getBaseUrl()}/api/schedule-snapshots/statistics`)

      if (!response.ok) {
        throw new Error(`查询失败: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('❌ 获取存储统计失败:', error)
      throw error
    }
  }

  /**
   * 计算排班元数据
   */
  private calculateMetadata(scheduleData: ScheduleResultRecord[], constraintConfig?: any): any {
    // 提取学员和考官信息
    const students = new Set<string>()
    const teachers = new Set<string>()
    const dates: string[] = []
    let manualEditCount = 0
    let autoAssignedCount = 0

    scheduleData.forEach(record => {
      students.add(record.student)

      // 收集所有考官
      ;[
        record.examiner1_1,
        record.examiner1_2,
        record.backup1,
        record.examiner2_1,
        record.examiner2_2,
        record.backup2,
      ].forEach(teacher => {
        if (teacher && teacher !== '-' && teacher !== '未分配') {
          teachers.add(teacher)
        }
      })

      // 收集日期
      if (record.date1) dates.push(record.date1)
      if (record.date2) dates.push(record.date2)

      // 统计修改次数
      if (record.manualEdits && record.manualEdits.length > 0) {
        manualEditCount += record.manualEdits.length
      } else {
        autoAssignedCount++
      }
    })

    // 排序日期
    dates.sort()

    return {
      totalStudents: students.size,
      totalTeachers: teachers.size,
      dateRange: {
        start: dates[0] || '',
        end: dates[dates.length - 1] || '',
      },
      constraintConfig,
      manualEditCount,
      autoAssignedCount,
      studentList: undefined as any[] | undefined,
      teacherList: undefined as any[] | undefined,
      examDates: undefined as string[] | undefined,
    }
  }

  /**
   * 检查是否需要清理提醒
   * 返回：{ needsCleanup: boolean, snapshotCount: number, oldestDate: string }
   */
  async checkCleanupNeeded(): Promise<{
    needsCleanup: boolean
    snapshotCount: number
    oldestSnapshot?: ScheduleSnapshot
    recommendedDeleteCount: number
  }> {
    try {
      const stats = await this.getStorageStatistics()

      // 如果快照数量超过50个，建议清理
      const needsCleanup = stats.totalSnapshots > 50

      // 获取最老的快照
      let oldestSnapshot: ScheduleSnapshot | undefined
      if (needsCleanup) {
        const list = await this.getSnapshotList({
          page: 0,
          pageSize: 1,
          sortBy: 'createdAt',
          sortOrder: 'asc',
        })
        oldestSnapshot = list.snapshots[0]
      }

      // 建议删除超过3个月的快照
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const allSnapshots = await this.getSnapshotList({
        page: 0,
        pageSize: 1000,
      })

      const recommendedDeleteCount = allSnapshots.snapshots.filter(
        s => new Date(s.createdAt) < threeMonthsAgo
      ).length

      return {
        needsCleanup,
        snapshotCount: stats.totalSnapshots,
        oldestSnapshot,
        recommendedDeleteCount,
      }
    } catch (error) {
      console.error('❌ 检查清理需求失败:', error)
      return {
        needsCleanup: false,
        snapshotCount: 0,
        recommendedDeleteCount: 0,
      }
    }
  }

  /**
   * 导出排班快照为Excel
   */
  async exportSnapshotToExcel(snapshot: ScheduleSnapshot): Promise<Blob> {
    try {
      const response = await fetch(
        `${await this.getBaseUrl()}/api/schedule-snapshots/${snapshot.id}/export`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `导出失败: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('❌ 导出排班快照失败:', error)
      throw error
    }
  }
}

// 导出单例
export const scheduleHistoryService = new ScheduleHistoryService()
export default scheduleHistoryService
