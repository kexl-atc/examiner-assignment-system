/**
 * 约束违反报告API服务
 * 提供约束违反报告生成、修复建议和交互式修复功能
 */

import apiService from './api-service'

// 获取API基础URL（动态适配Electron和Web环境）
const getApiBaseUrl = async () => {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
    try {
      const port = await (window as any).electronAPI.getBackendPort()
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

export interface ViolationDetail {
  id: string
  constraintType: 'HARD' | 'SOFT'
  constraintName: string
  violationType: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
  affectedEntity: string
  entityId: string
  details: Record<string, any>
}

export interface RepairSuggestion {
  id: string
  violationId: string
  constraintType: 'HARD' | 'SOFT'
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
  repairType: string
  actions: string[]
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH'
  parameters?: Record<string, any>
}

export interface ViolationStatistics {
  totalViolations: number
  totalHardViolations: number
  totalSoftViolations: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  constraintViolationCounts: Record<string, number>
}

export interface ConstraintViolationReport {
  scheduleId: string
  generatedAt: string
  hardConstraintViolations: ViolationDetail[]
  softConstraintViolations: ViolationDetail[]
  statistics: ViolationStatistics
  repairSuggestions: RepairSuggestion[]
  overallScore: number
}

export interface ManualRepairRequest {
  violationId: string
  solution: string
  repairType: string
  estimatedEffort: string
}

export interface RepairResult {
  success: boolean
  message: string
  affectedViolations: string[]
  newViolations?: ViolationDetail[]
  updatedScore?: number
}

export interface BatchRepairRequest {
  violationIds: string[]
  repairType: 'AUTO' | 'MANUAL'
  parameters?: Record<string, any>
}

export interface RepairProgress {
  taskId: string
  status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  progress: number
  message: string
  processedCount: number
  totalCount: number
  results?: RepairResult[]
}

/**
 * 约束违反报告API服务类
 */
class ConstraintViolationReportApiService {
  /**
   * 生成约束违反报告
   */
  async generateReport(scheduleId: string): Promise<{ data: ConstraintViolationReport }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduleId }),
      })
      return await response.json()
    } catch (error) {
      console.error('生成约束违反报告失败:', error)
      throw error
    }
  }

  /**
   * 获取现有报告
   */
  async getReport(scheduleId: string): Promise<{ data: ConstraintViolationReport }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/report/${scheduleId}`)
      return await response.json()
    } catch (error) {
      console.error('获取约束违反报告失败:', error)
      throw error
    }
  }

  /**
   * 获取违反详情
   */
  async getViolationDetail(violationId: string): Promise<{ data: ViolationDetail }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/violation/${violationId}`)
      return await response.json()
    } catch (error) {
      console.error('获取违反详情失败:', error)
      throw error
    }
  }

  /**
   * 获取修复建议
   */
  async getRepairSuggestions(violationId: string): Promise<{ data: RepairSuggestion[] }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(
        `${baseUrl}/api/constraint-violations/repair-suggestions/${violationId}`
      )
      return await response.json()
    } catch (error) {
      console.error('获取修复建议失败:', error)
      throw error
    }
  }

  /**
   * 应用自动修复
   */
  async applyAutoRepair(violationId: string): Promise<{ data: RepairResult }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/auto-repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ violationId }),
      })
      return await response.json()
    } catch (error) {
      console.error('应用自动修复失败:', error)
      throw error
    }
  }

  /**
   * 应用修复建议
   */
  async applySuggestion(
    suggestionId: string,
    parameters?: Record<string, any>
  ): Promise<{ data: RepairResult }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/apply-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suggestionId, parameters }),
      })
      return await response.json()
    } catch (error) {
      console.error('应用修复建议失败:', error)
      throw error
    }
  }

  /**
   * 提交手动修复方案
   */
  async submitManualRepair(request: ManualRepairRequest): Promise<{ data: RepairResult }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/manual-repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })
      return await response.json()
    } catch (error) {
      console.error('提交手动修复方案失败:', error)
      throw error
    }
  }

  /**
   * 批量修复
   */
  async batchRepair(request: BatchRepairRequest): Promise<{ data: { taskId: string } }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/batch-repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })
      return await response.json()
    } catch (error) {
      console.error('批量修复失败:', error)
      throw error
    }
  }

  /**
   * 获取批量修复进度
   */
  async getBatchRepairProgress(taskId: string): Promise<{ data: RepairProgress }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(
        `${baseUrl}/api/constraint-violations/batch-repair-progress/${taskId}`
      )
      return await response.json()
    } catch (error) {
      console.error('获取批量修复进度失败:', error)
      throw error
    }
  }

  /**
   * 验证修复结果
   */
  async validateRepairResult(scheduleId: string): Promise<{ data: ConstraintViolationReport }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/validate-repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduleId }),
      })
      return await response.json()
    } catch (error) {
      console.error('验证修复结果失败:', error)
      throw error
    }
  }

  /**
   * 导出报告
   */
  async exportReport(scheduleId: string, format: 'JSON' | 'PDF' | 'EXCEL' = 'JSON'): Promise<Blob> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(
        `${baseUrl}/api/constraint-violations/export/${scheduleId}?format=${format}`
      )
      return await response.blob()
    } catch (error) {
      console.error('导出报告失败:', error)
      throw error
    }
  }

  /**
   * 获取约束统计信息
   */
  async getConstraintStatistics(scheduleId: string): Promise<{ data: ViolationStatistics }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/statistics/${scheduleId}`)
      return await response.json()
    } catch (error) {
      console.error('获取约束统计信息失败:', error)
      throw error
    }
  }

  /**
   * 获取修复历史
   */
  async getRepairHistory(scheduleId: string): Promise<{ data: RepairResult[] }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(
        `${baseUrl}/api/constraint-violations/repair-history/${scheduleId}`
      )
      return await response.json()
    } catch (error) {
      console.error('获取修复历史失败:', error)
      throw error
    }
  }

  /**
   * 撤销修复操作
   */
  async undoRepair(repairId: string): Promise<{ data: RepairResult }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/undo-repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repairId }),
      })
      return await response.json()
    } catch (error) {
      console.error('撤销修复操作失败:', error)
      throw error
    }
  }

  /**
   * 预览修复效果
   */
  async previewRepair(
    violationId: string,
    suggestionId?: string
  ): Promise<{
    data: {
      previewReport: ConstraintViolationReport
      changes: Array<{
        type: 'ADD' | 'REMOVE' | 'MODIFY'
        entity: string
        description: string
      }>
    }
  }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/preview-repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ violationId, suggestionId }),
      })
      return await response.json()
    } catch (error) {
      console.error('预览修复效果失败:', error)
      throw error
    }
  }

  /**
   * 获取修复建议的详细参数
   */
  async getSuggestionParameters(suggestionId: string): Promise<{
    data: {
      parameters: Array<{
        name: string
        type: string
        description: string
        required: boolean
        defaultValue?: any
        options?: any[]
      }>
    }
  }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(
        `${baseUrl}/api/constraint-violations/suggestion-parameters/${suggestionId}`
      )
      return await response.json()
    } catch (error) {
      console.error('获取修复建议参数失败:', error)
      throw error
    }
  }

  /**
   * 搜索类似违反
   */
  async searchSimilarViolations(violationId: string): Promise<{ data: ViolationDetail[] }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/similar/${violationId}`)
      return await response.json()
    } catch (error) {
      console.error('搜索类似违反失败:', error)
      throw error
    }
  }

  /**
   * 获取约束违反趋势
   */
  async getViolationTrends(
    scheduleId: string,
    timeRange: string = '7d'
  ): Promise<{
    data: {
      trends: Array<{
        date: string
        totalViolations: number
        hardViolations: number
        softViolations: number
        score: number
      }>
      summary: {
        averageScore: number
        improvementRate: number
        mostCommonViolationType: string
      }
    }
  }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(
        `${baseUrl}/api/constraint-violations/trends/${scheduleId}?timeRange=${timeRange}`
      )
      return await response.json()
    } catch (error) {
      console.error('获取约束违反趋势失败:', error)
      throw error
    }
  }

  /**
   * 生成修复报告
   */
  async generateRepairReport(scheduleId: string): Promise<{
    data: {
      reportId: string
      summary: {
        totalRepairs: number
        successfulRepairs: number
        failedRepairs: number
        scoreImprovement: number
      }
      details: RepairResult[]
    }
  }> {
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/api/constraint-violations/repair-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduleId }),
      })
      return await response.json()
    } catch (error) {
      console.error('生成修复报告失败:', error)
      throw error
    }
  }
}

// 创建服务实例
export const constraintViolationReportApi = new ConstraintViolationReportApiService()

// 导出类型和服务
export default constraintViolationReportApi
