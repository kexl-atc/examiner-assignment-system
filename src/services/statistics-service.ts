import { apiService } from './api-service'
import type {
  WorkloadStatistic,
  HeatmapData,
  DashboardFilter,
  StatisticsResponse,
  ScheduleHistory,
  FileAttachment,
} from '../types/statistics'

export const statisticsService = {
  // 获取工作负载统计数据
  async getWorkloadStatistics(filter: DashboardFilter): Promise<WorkloadStatistic[]> {
    try {
      const response = await apiService.get<WorkloadStatistic[]>('/statistics/workload')
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch workload statistics:', error)
      throw error
    }
  },

  // 获取热力图数据
  async getHeatmapData(filter: DashboardFilter): Promise<HeatmapData[]> {
    try {
      const response = await apiService.get<HeatmapData[]>('/statistics/heatmap')
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error)
      throw error
    }
  },

  // 获取综合统计数据
  async getDashboardData(filter: DashboardFilter): Promise<StatisticsResponse> {
    try {
      const response = await apiService.get<StatisticsResponse>('/statistics/dashboard')
      return response.data as StatisticsResponse
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      throw error
    }
  },

  // 获取排班历史记录
  async getScheduleHistory(): Promise<ScheduleHistory[]> {
    try {
      const response = await apiService.get<ScheduleHistory[]>('/schedules/history')
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch schedule history:', error)
      throw error
    }
  },

  // 上传排班文件
  async uploadScheduleFile(file: File): Promise<FileAttachment> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiService.post<FileAttachment>('/schedules/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data as FileAttachment
    } catch (error) {
      console.error('Failed to upload schedule file:', error)
      throw error
    }
  },

  // 下载排班文件
  async downloadScheduleFile(fileId: string): Promise<Blob> {
    try {
      const response = await apiService.get<Blob>(`/schedules/download/${fileId}`)
      return response.data as Blob
    } catch (error) {
      console.error('Failed to download schedule file:', error)
      throw error
    }
  },

  // 删除排班文件
  async deleteScheduleFile(fileId: string): Promise<void> {
    try {
      await apiService.delete(`/schedules/files/${fileId}`)
    } catch (error) {
      console.error('Failed to delete schedule file:', error)
      throw error
    }
  },

  // 获取文件附件列表
  async getFileAttachments(scheduleId: string): Promise<FileAttachment[]> {
    try {
      const response = await apiService.get<FileAttachment[]>(`/schedules/${scheduleId}/files`)
      return response.data || []
    } catch (error) {
      console.error('Failed to fetch file attachments:', error)
      throw error
    }
  },

  // 导出统计数据
  async exportStatistics(
    filter: DashboardFilter,
    format: 'csv' | 'excel' | 'pdf' = 'csv'
  ): Promise<Blob> {
    try {
      const response = await apiService.get<Blob>('/statistics/export')
      return response.data as Blob
    } catch (error) {
      console.error('Failed to export statistics:', error)
      throw error
    }
  },
}

export default statisticsService
