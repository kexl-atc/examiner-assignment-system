/**
 * 约束映射API服务
 * 提供与后端约束映射API的交互功能
 */

import { apiService } from './api-service'

export interface ConstraintMapping {
  frontendId: string
  backendName: string
  constraintType: 'hard' | 'soft'
  description?: string
}

export interface MappingResponse {
  hardConstraints: Record<string, string>
  softConstraints: Record<string, string>
  totalMappings: number
  lastUpdated: string
}

export interface WeightMappingRequest {
  frontendWeight: number
}

export interface WeightMappingResponse {
  backendWeight: number
  mappingFunction: string
  scalingFactor: number
}

/**
 * 约束映射API服务类
 */
class ConstraintMappingApi {
  private readonly baseUrl = 'constraint-mapping'

  /**
   * 获取所有约束映射
   * @returns 所有约束映射
   */
  async getAllMappings(): Promise<MappingResponse> {
    try {
      const response = await apiService.get<MappingResponse>(`${this.baseUrl}/all`)
      return (
        response.data || {
          hardConstraints: {},
          softConstraints: {},
          totalMappings: 0,
          lastUpdated: new Date().toISOString(),
        }
      )
    } catch (error) {
      console.error('获取约束映射失败:', error)
      throw new Error('无法获取约束映射配置')
    }
  }

  /**
   * 获取硬约束映射
   * @returns 硬约束映射
   */
  async getHardConstraintMappings(): Promise<Record<string, string>> {
    try {
      const response = await apiService.get<Record<string, string>>(
        `${this.baseUrl}/hard-constraints`
      )
      return response.data || {}
    } catch (error) {
      console.error('获取硬约束映射失败:', error)
      throw new Error('无法获取硬约束映射配置')
    }
  }

  /**
   * 获取软约束映射
   * @returns 软约束映射
   */
  async getSoftConstraintMappings(): Promise<Record<string, string>> {
    try {
      const response = await apiService.get<Record<string, string>>(
        `${this.baseUrl}/soft-constraints`
      )
      return response.data || {}
    } catch (error) {
      console.error('获取软约束映射失败:', error)
      throw new Error('无法获取软约束映射配置')
    }
  }

  /**
   * 根据前端约束键获取后端约束名称
   * @param frontendKey 前端约束键
   * @returns 后端约束信息
   */
  async getBackendConstraintByFrontendKey(frontendKey: string): Promise<{
    backendName: string
    constraintType: 'hard' | 'soft'
  }> {
    try {
      const response = await apiService.get<{
        backendName: string
        constraintType: 'hard' | 'soft'
      }>(`${this.baseUrl}/frontend-to-backend?frontendKey=${encodeURIComponent(frontendKey)}`)
      return response.data || { backendName: '', constraintType: 'hard' }
    } catch (error) {
      console.error('获取后端约束失败:', error)
      throw new Error(`无法获取前端约束 ${frontendKey} 对应的后端约束`)
    }
  }

  /**
   * 根据后端约束名称获取前端约束键
   * @param backendName 后端约束名称
   * @returns 前端约束信息
   */
  async getFrontendConstraintByBackendName(backendName: string): Promise<{
    frontendKey: string
    constraintType: 'hard' | 'soft'
  }> {
    try {
      const response = await apiService.get<{
        frontendKey: string
        constraintType: 'hard' | 'soft'
      }>(`${this.baseUrl}/backend-to-frontend?backendName=${encodeURIComponent(backendName)}`)
      return response.data || { frontendKey: '', constraintType: 'hard' }
    } catch (error) {
      console.error('获取前端约束失败:', error)
      throw new Error(`无法获取后端约束 ${backendName} 对应的前端约束`)
    }
  }

  /**
   * 将前端权重转换为后端权重
   * @param frontendWeight 前端权重
   * @returns 后端权重信息
   */
  async convertFrontendToBackendWeight(frontendWeight: number): Promise<WeightMappingResponse> {
    try {
      const response = await apiService.post<WeightMappingResponse>(
        `${this.baseUrl}/weight/frontend-to-backend`,
        { frontendWeight }
      )
      return response.data || { backendWeight: 0, mappingFunction: '', scalingFactor: 1 }
    } catch (error) {
      console.error('权重转换失败:', error)
      throw new Error('无法转换前端权重到后端权重')
    }
  }

  /**
   * 将后端权重转换为前端权重
   * @param backendWeight 后端权重
   * @returns 前端权重信息
   */
  async convertBackendToFrontendWeight(backendWeight: number): Promise<{
    frontendWeight: number
    mappingFunction: string
    scalingFactor: number
  }> {
    try {
      const response = await apiService.post<{
        frontendWeight: number
        mappingFunction: string
        scalingFactor: number
      }>(`${this.baseUrl}/weight/backend-to-frontend`, { backendWeight })
      return response.data || { frontendWeight: 0, mappingFunction: '', scalingFactor: 1 }
    } catch (error) {
      console.error('权重转换失败:', error)
      throw new Error('无法转换后端权重到前端权重')
    }
  }

  /**
   * 批量转换前端权重到后端权重
   * @param weightMappings 权重映射对象
   * @returns 转换后的权重映射
   */
  async batchConvertFrontendToBackendWeights(
    weightMappings: Record<string, number>
  ): Promise<Record<string, number>> {
    try {
      const response = await apiService.post<Record<string, number>>(
        `${this.baseUrl}/weight/batch-frontend-to-backend`,
        { weightMappings }
      )
      return response.data || {}
    } catch (error) {
      console.error('批量权重转换失败:', error)
      throw new Error('无法批量转换前端权重到后端权重')
    }
  }

  /**
   * 批量转换后端权重到前端权重
   * @param weightMappings 权重映射对象
   * @returns 转换后的权重映射
   */
  async batchConvertBackendToFrontendWeights(
    weightMappings: Record<string, number>
  ): Promise<Record<string, number>> {
    try {
      const response = await apiService.post<Record<string, number>>(
        `${this.baseUrl}/weight/batch-backend-to-frontend`,
        { weightMappings }
      )
      return response.data || {}
    } catch (error) {
      console.error('批量权重转换失败:', error)
      throw new Error('无法批量转换后端权重到前端权重')
    }
  }

  /**
   * 获取约束映射统计信息
   * @returns 统计信息
   */
  async getMappingStatistics(): Promise<{
    totalHardConstraints: number
    totalSoftConstraints: number
    mappedConstraints: number
    unmappedConstraints: number
    mappingCoverage: number
  }> {
    try {
      const response = await apiService.get<{
        totalHardConstraints: number
        totalSoftConstraints: number
        mappedConstraints: number
        unmappedConstraints: number
        mappingCoverage: number
      }>(`${this.baseUrl}/statistics`)
      return (
        response.data || {
          totalHardConstraints: 0,
          totalSoftConstraints: 0,
          mappedConstraints: 0,
          unmappedConstraints: 0,
          mappingCoverage: 0,
        }
      )
    } catch (error) {
      console.error('获取映射统计信息失败:', error)
      throw new Error('无法获取约束映射统计信息')
    }
  }

  /**
   * 验证约束映射的完整性
   * @returns 验证结果
   */
  async validateMappings(): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    suggestions: string[]
  }> {
    try {
      const response = await apiService.get<{
        isValid: boolean
        errors: string[]
        warnings: string[]
        suggestions: string[]
      }>(`${this.baseUrl}/validate`)
      return (
        response.data || {
          isValid: false,
          errors: [],
          warnings: [],
          suggestions: [],
        }
      )
    } catch (error) {
      console.error('验证约束映射失败:', error)
      throw new Error('无法验证约束映射配置')
    }
  }
}

// 导出单例实例
export const constraintMappingApi = new ConstraintMappingApi()
export default constraintMappingApi
