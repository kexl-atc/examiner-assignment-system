// 排班结果API服务
import type { ExamAssignment, ConstraintSatisfactionMetrics } from '../types/scheduleTypes'

export interface ScheduleResultResponse {
  examAssignments: ExamAssignment[]
  metrics: ConstraintSatisfactionMetrics
  totalCount: number
  success: boolean
  message?: string
}

export interface ExportScheduleRequest {
  format: 'excel' | 'pdf' | 'csv'
  dateRange?: {
    startDate: string
    endDate: string
  }
  departments?: string[]
  includeViolations?: boolean
}

class ScheduleResultApiService {
  private baseUrl = '/api/schedule-results'

  /**
   * 获取排班结果数据
   */
  async getScheduleResults(params?: {
    department?: string
    dateRange?: string
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: string
  }): Promise<ScheduleResultResponse> {
    try {
      const queryParams = new URLSearchParams()

      if (params?.department) queryParams.append('department', params.department)
      if (params?.dateRange) queryParams.append('dateRange', params.dateRange)
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
      if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
      if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)

      const response = await fetch(`${this.baseUrl}?${queryParams}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('获取排班结果失败:', error)
      throw error
    }
  }

  /**
   * 获取约束满足度指标
   */
  async getConstraintMetrics(): Promise<ConstraintSatisfactionMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('获取约束指标失败:', error)
      throw error
    }
  }

  /**
   * 获取指定日期的考试安排
   */
  async getExamsForDate(date: string): Promise<ExamAssignment[]> {
    try {
      const response = await fetch(`${this.baseUrl}/date/${date}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data.examAssignments || []
    } catch (error) {
      console.error('获取日期考试安排失败:', error)
      throw error
    }
  }

  /**
   * 获取工作负荷分析数据
   */
  async getWorkloadAnalysis(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/workload-analysis`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('获取工作负荷分析失败:', error)
      throw error
    }
  }

  /**
   * 获取约束违反统计
   */
  async getViolationSummary(): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${this.baseUrl}/violation-summary`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('获取违反统计失败:', error)
      throw error
    }
  }

  /**
   * 导出排班结果
   */
  async exportSchedule(request: ExportScheduleRequest): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('导出排班结果失败:', error)
      throw error
    }
  }

  /**
   * 更新考试安排
   */
  async updateExamAssignment(examId: string, updates: Partial<ExamAssignment>): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/exam/${examId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('更新考试安排失败:', error)
      throw error
    }
  }

  /**
   * 删除考试安排
   */
  async deleteExamAssignment(examId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/exam/${examId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('删除考试安排失败:', error)
      throw error
    }
  }

  /**
   * 获取时间轴资源数据
   */
  async getTimelineResources(scale: 'day' | 'week' | 'month'): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/timeline-resources?scale=${scale}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('获取时间轴资源失败:', error)
      throw error
    }
  }

  /**
   * 获取统计图表数据
   */
  async getStatisticsData(): Promise<{
    departmentDistribution: Record<string, number>
    timeDistribution: Record<string, number>
    constraintTrends: Array<{ date: string; satisfaction: number }>
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/statistics`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('获取统计数据失败:', error)
      throw error
    }
  }
}

export const scheduleResultApi = new ScheduleResultApiService()
export default scheduleResultApi
