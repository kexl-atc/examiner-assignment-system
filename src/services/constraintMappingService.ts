import {
  FRONTEND_HARD_CONSTRAINTS,
  FRONTEND_SOFT_CONSTRAINTS,
} from '../utils/constraintMappingValidator'
import { constraintMappingApi, type ConstraintMapping } from './constraintMappingApi'

/**
 * 约束映射服务
 * 负责前端和后端约束之间的映射转换
 */
export class ConstraintMappingService {
  // 前端到后端的硬约束映射 - 已优化权重配置
  private frontendToBackendHardMapping: Map<string, string> = new Map([
    ['HC1', 'workdaysOnlyExam'], // 法定节假日限制
    ['HC2', 'examinerDepartmentRules'], // 专业匹配要求（已优化：5000，支持三七室互通）
    ['HC3', 'twoMainExaminersRequired'], // 考官时间冲突避免
    ['HC4', 'noExaminerTimeConflict'], // 考官工作负荷控制（已优化：12000，减少过度惩罚）
    ['HC5', 'noStudentDayShiftExam'], // 考生执勤白班不能安排考试
    ['HC6', 'consecutiveTwoDaysExam'], // 考试连续性要求（已优化：8000，大幅降低权重）
    ['HC7', 'examinerDifferentDepartments'], // 考试基本制度要求
    ['HC8', 'backupExaminerDifferentPerson'], // 备份考官独立性
  ])

  // 前端到后端的软约束映射 - 按照文档SC1-SC11重新编号
  private frontendToBackendSoftMapping: Map<string, string> = new Map([
    ['SC1', 'nightShiftTeacherPriorityWeight'], // SC1: 晚班考官优先级最高权重
    ['SC2', 'preferRecommendedExaminer2Weight'], // SC2: 考官2专业匹配
    ['SC3', 'firstRestDayTeacherPriorityWeight'], // SC3: 休息第一天考官优先级次高权重
    ['SC4', 'preferRecommendedBackupExaminerWeight'], // SC4: 备份考官专业匹配
    ['SC5', 'secondRestDayTeacherPriorityWeight'], // SC5: 休息第二天考官优先级中等权重
    ['SC6', 'nonRecommendedExaminer2Weight'], // SC6: 考官2备选方案
    ['SC7', 'adminClassTeacherPriorityWeight'], // SC7: 行政班考官优先级最低权重
    ['SC8', 'nonRecommendedBackupExaminerWeight'], // SC8: 备份考官备选方案
    ['SC9', 'allowDept37CrossUseWeight'], // SC9: 区域协作鼓励
    ['SC10', 'balanceWorkloadWeight'], // SC10: 工作量均衡
    ['SC11', 'preferLaterDatesWeight'], // SC11: 日期分配均衡
  ])

  // 缓存API映射数据
  private apiMappingCache: {
    hardConstraints?: Record<string, string>
    softConstraints?: Record<string, string>
    lastUpdated?: number
  } = {}

  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  /**
   * 初始化映射服务，从API获取最新映射配置
   */
  async initialize(): Promise<void> {
    try {
      await this.refreshMappingCache()
    } catch (error) {
      console.warn('无法从API获取约束映射，使用本地默认映射:', error)
    }
  }

  /**
   * 刷新映射缓存
   */
  private async refreshMappingCache(): Promise<void> {
    try {
      const mappingResponse = await constraintMappingApi.getAllMappings()
      this.apiMappingCache = {
        hardConstraints: mappingResponse.hardConstraints,
        softConstraints: mappingResponse.softConstraints,
        lastUpdated: Date.now(),
      }
    } catch (error) {
      console.error('刷新映射缓存失败:', error)
      throw error
    }
  }

  /**
   * 检查缓存是否过期
   */
  private isCacheExpired(): boolean {
    if (!this.apiMappingCache.lastUpdated) {
      return true
    }
    return Date.now() - this.apiMappingCache.lastUpdated > this.CACHE_DURATION
  }

  /**
   * 获取有效的映射数据（优先使用API数据，回退到本地映射）
   */
  private async getEffectiveMapping(): Promise<{
    hardConstraints: Record<string, string>
    softConstraints: Record<string, string>
  }> {
    // 如果缓存过期，尝试刷新
    if (this.isCacheExpired()) {
      try {
        await this.refreshMappingCache()
      } catch (error) {
        console.warn('无法刷新映射缓存，使用本地映射:', error)
      }
    }

    // 优先使用API数据
    if (this.apiMappingCache.hardConstraints && this.apiMappingCache.softConstraints) {
      return {
        hardConstraints: this.apiMappingCache.hardConstraints,
        softConstraints: this.apiMappingCache.softConstraints,
      }
    }

    // 回退到本地映射
    return {
      hardConstraints: Object.fromEntries(this.frontendToBackendHardMapping),
      softConstraints: Object.fromEntries(this.frontendToBackendSoftMapping),
    }
  }

  /**
   * 前端到后端约束映射
   */
  async mapFrontendToBackend(frontendConstraintId: string): Promise<string | null> {
    try {
      const mapping = await this.getEffectiveMapping()

      // 先检查硬约束
      if (mapping.hardConstraints[frontendConstraintId]) {
        return mapping.hardConstraints[frontendConstraintId]
      }

      // 再检查软约束
      if (mapping.softConstraints[frontendConstraintId]) {
        return mapping.softConstraints[frontendConstraintId]
      }

      return null
    } catch (error) {
      console.error('前端到后端映射失败:', error)
      return null
    }
  }

  /**
   * 后端到前端约束映射
   */
  async mapBackendToFrontend(backendConstraintName: string): Promise<string | null> {
    try {
      const mapping = await this.getEffectiveMapping()

      // 创建反向映射
      const reverseHardMapping = Object.fromEntries(
        Object.entries(mapping.hardConstraints).map(([k, v]) => [v, k])
      )
      const reverseSoftMapping = Object.fromEntries(
        Object.entries(mapping.softConstraints).map(([k, v]) => [v, k])
      )

      // 先检查硬约束
      if (reverseHardMapping[backendConstraintName]) {
        return reverseHardMapping[backendConstraintName]
      }

      // 再检查软约束
      if (reverseSoftMapping[backendConstraintName]) {
        return reverseSoftMapping[backendConstraintName]
      }

      return null
    } catch (error) {
      console.error('后端到前端映射失败:', error)
      return null
    }
  }

  /**
   * 获取所有映射
   */
  async getAllMappings(): Promise<{
    hardConstraints: Record<string, string>
    softConstraints: Record<string, string>
  }> {
    return await this.getEffectiveMapping()
  }

  /**
   * 检查映射是否存在
   */
  async hasMappingFor(
    constraintId: string,
    direction: 'frontend-to-backend' | 'backend-to-frontend'
  ): Promise<boolean> {
    try {
      if (direction === 'frontend-to-backend') {
        const result = await this.mapFrontendToBackend(constraintId)
        return result !== null
      } else {
        const result = await this.mapBackendToFrontend(constraintId)
        return result !== null
      }
    } catch (error) {
      console.error('检查映射存在性失败:', error)
      return false
    }
  }

  /**
   * 批量前端到后端映射
   */
  async batchMapFrontendToBackend(
    frontendConstraintIds: string[]
  ): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {}

    for (const id of frontendConstraintIds) {
      results[id] = await this.mapFrontendToBackend(id)
    }

    return results
  }

  /**
   * 批量后端到前端映射
   */
  async batchMapBackendToFrontend(
    backendConstraintNames: string[]
  ): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {}

    for (const name of backendConstraintNames) {
      results[name] = await this.mapBackendToFrontend(name)
    }

    return results
  }

  /**
   * 获取映射统计信息
   */
  async getMappingStatistics(): Promise<{
    totalFrontendConstraints: number
    totalBackendConstraints: number
    mappedConstraints: number
    unmappedConstraints: number
    mappingCoverage: number
  }> {
    try {
      const mapping = await this.getEffectiveMapping()
      const totalHardMappings = Object.keys(mapping.hardConstraints).length
      const totalSoftMappings = Object.keys(mapping.softConstraints).length
      const totalMappings = totalHardMappings + totalSoftMappings

      const totalFrontendConstraints =
        FRONTEND_HARD_CONSTRAINTS.length + FRONTEND_SOFT_CONSTRAINTS.length
      const mappedConstraints = totalMappings
      const unmappedConstraints = totalFrontendConstraints - mappedConstraints
      const mappingCoverage =
        totalFrontendConstraints > 0 ? (mappedConstraints / totalFrontendConstraints) * 100 : 0

      return {
        totalFrontendConstraints,
        totalBackendConstraints: totalMappings,
        mappedConstraints,
        unmappedConstraints,
        mappingCoverage,
      }
    } catch (error) {
      console.error('获取映射统计信息失败:', error)
      return {
        totalFrontendConstraints: 0,
        totalBackendConstraints: 0,
        mappedConstraints: 0,
        unmappedConstraints: 0,
        mappingCoverage: 0,
      }
    }
  }

  /**
   * 验证映射完整性
   */
  async validateMappings(): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
    suggestions: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    try {
      const mapping = await this.getEffectiveMapping()

      // 检查前端约束是否都有映射
      for (const frontendConstraint of FRONTEND_HARD_CONSTRAINTS) {
        if (!mapping.hardConstraints[frontendConstraint]) {
          errors.push(`硬约束 ${frontendConstraint} 缺少后端映射`)
        }
      }

      for (const frontendConstraint of FRONTEND_SOFT_CONSTRAINTS) {
        if (!mapping.softConstraints[frontendConstraint]) {
          warnings.push(`软约束 ${frontendConstraint} 缺少后端映射`)
        }
      }

      // 检查映射的唯一性
      const allBackendNames = [
        ...Object.values(mapping.hardConstraints),
        ...Object.values(mapping.softConstraints),
      ]
      const uniqueBackendNames = new Set(allBackendNames)

      if (allBackendNames.length !== uniqueBackendNames.size) {
        errors.push('存在重复的后端约束映射')
      }

      // 提供改进建议
      if (warnings.length > 0) {
        suggestions.push('建议为所有软约束添加后端映射以确保完整性')
      }

      if (errors.length === 0 && warnings.length === 0) {
        suggestions.push('约束映射配置完整且正确')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      }
    } catch (error) {
      console.error('验证映射失败:', error)
      return {
        isValid: false,
        errors: ['验证映射时发生错误: ' + (error as Error).message],
        warnings: [],
        suggestions: ['请检查网络连接和后端服务状态'],
      }
    }
  }

  /**
   * 强制刷新映射缓存
   */
  async forceRefresh(): Promise<void> {
    await this.refreshMappingCache()
  }

  /**
   * 清除映射缓存
   */
  clearCache(): void {
    this.apiMappingCache = {}
  }
}

// 导出单例实例
export const constraintMappingService = new ConstraintMappingService()
export default constraintMappingService
