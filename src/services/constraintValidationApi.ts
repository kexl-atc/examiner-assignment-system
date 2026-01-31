/**
 * 约束验证API服务
 * 提供与后端约束验证服务的接口
 */

import apiService from './api-service'

export interface ValidationResult {
  valid: boolean
  hardConstraintViolations: ConstraintViolation[]
  softConstraintViolations: ConstraintViolation[]
  overallScore: number
  statistics: Record<string, any>
}

export interface ConstraintViolation {
  constraintName: string
  constraintType: 'HARD' | 'SOFT'
  description: string
  affectedEntity: string
  severity: number
  suggestedFixes: string[]
  details: Record<string, any>
}

export interface BatchValidationResponse {
  items: BatchValidationItem[]
  totalCount: number
  validCount: number
  invalidCount: number
  averageScore: number
}

export interface BatchValidationItem {
  assignmentId: string
  studentName: string
  examDate: string
  valid: boolean
  score: number
  hardViolationCount: number
  softViolationCount: number
  validationResult: ValidationResult
}

export interface FilterValidAssignmentsResponse {
  validAssignments: any[]
  originalCount: number
  validCount: number
  filteredCount: number
}

export interface ConstraintInfoResponse {
  hardConstraints: Record<string, string>
  softConstraints: Record<string, string>
}

class ConstraintValidationApi {
  private baseUrl = '/api/constraint-validation'

  /**
   * 验证单个考试分配
   */
  async validateAssignment(assignment: any, dutySchedules: any[]): Promise<ValidationResult> {
    try {
      const response = await apiService.post<ValidationResult>(
        `${this.baseUrl}/validate-assignment`,
        {
          assignment,
          dutySchedules,
        }
      )
      return response.data as ValidationResult
    } catch (error) {
      console.error('验证考试分配失败:', error)
      throw error
    }
  }

  /**
   * 验证完整排班方案
   */
  async validateSchedule(assignments: any[], dutySchedules: any[]): Promise<ValidationResult> {
    try {
      const response = await apiService.post(`${this.baseUrl}/validate-schedule`, {
        assignments,
        dutySchedules,
      })
      return response.data as ValidationResult
    } catch (error) {
      console.error('验证排班方案失败:', error)
      throw error
    }
  }

  /**
   * 过滤有效的考试分配
   */
  async filterValidAssignments(
    assignments: any[],
    dutySchedules: any[]
  ): Promise<FilterValidAssignmentsResponse> {
    try {
      const response = await apiService.post(`${this.baseUrl}/filter-valid-assignments`, {
        assignments,
        dutySchedules,
      })
      return response.data as FilterValidAssignmentsResponse
    } catch (error) {
      console.error('过滤有效分配失败:', error)
      throw error
    }
  }

  /**
   * 批量验证考试分配
   */
  async batchValidate(assignments: any[], dutySchedules: any[]): Promise<BatchValidationResponse> {
    try {
      const response = await apiService.post(`${this.baseUrl}/batch-validate`, {
        assignments,
        dutySchedules,
      })
      return response.data as BatchValidationResponse
    } catch (error) {
      console.error('批量验证失败:', error)
      throw error
    }
  }

  /**
   * 获取约束配置信息
   */
  async getConstraintInfo(): Promise<ConstraintInfoResponse> {
    try {
      const response = await apiService.get(`${this.baseUrl}/constraint-info`)
      return response.data as ConstraintInfoResponse
    } catch (error) {
      console.error('获取约束信息失败:', error)
      throw error
    }
  }

  /**
   * 实时验证考试分配（WebSocket）
   */
  async startRealTimeValidation(
    assignments: any[],
    dutySchedules: any[],
    callback: (result: ValidationResult) => void
  ): Promise<void> {
    // 这里可以实现WebSocket连接进行实时验证
    // 暂时使用轮询方式模拟实时验证
    try {
      const result = await this.validateSchedule(assignments, dutySchedules)
      callback(result)
    } catch (error) {
      console.error('实时验证失败:', error)
      throw error
    }
  }

  /**
   * 停止实时验证
   */
  stopRealTimeValidation(): void {
    // 停止WebSocket连接或轮询
    process.env.NODE_ENV === 'development' && console.log('停止实时验证')
  }
}

export const constraintValidationApi = new ConstraintValidationApi()
export default constraintValidationApi
