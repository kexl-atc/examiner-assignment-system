/**
 * 约束权重映射服务
 * 负责前端友好权重（30-90）与后端实际权重（5-700）之间的双向转换
 *
 * @author AI Assistant
 * @date 2025-10-06
 */

/**
 * 权重映射配置
 */
interface WeightMappingConfig {
  frontendMin: number
  frontendMax: number
  backendMin: number
  backendMax: number
  mappingType: 'linear' | 'exponential'
  scalingFactor?: number
}

/**
 * 软约束权重映射配置
 * 前端：30-90（用户友好范围）
 * 后端：5-700（实际计算权重）
 */
const SOFT_CONSTRAINT_MAPPING: WeightMappingConfig = {
  frontendMin: 30,
  frontendMax: 90,
  backendMin: 5,
  backendMax: 700,
  mappingType: 'linear',
}

/**
 * 硬约束权重映射配置
 * 前端：30-90（用户友好范围）
 * 后端：150,000-1,000,000（实际计算权重）
 */
const HARD_CONSTRAINT_MAPPING: WeightMappingConfig = {
  frontendMin: 30,
  frontendMax: 90,
  backendMin: 150000,
  backendMax: 1000000,
  mappingType: 'exponential',
  scalingFactor: 2.5,
}

/**
 * 约束权重映射服务类
 */
export class ConstraintWeightMappingService {
  private backendPort = 8081 // 默认端口，将动态获取

  constructor() {
    this.initializeBackendPort()
  }

  /**
   * 初始化后端端口
   */
  private async initializeBackendPort(): Promise<void> {
    try {
      if (
        typeof window !== 'undefined' &&
        (window as any).electronAPI?.isElectron &&
        (window as any).electronAPI?.getBackendPort
      ) {
        this.backendPort = await (window as any).electronAPI.getBackendPort()
        process.env.NODE_ENV === 'development' && console.log('✅ Constraint Weight Mapping Service获取到后端端口:', this.backendPort)
      }
    } catch (error) {
      console.warn('⚠️ Constraint Weight Mapping Service无法获取后端端口，使用默认端口8081:', error)
      this.backendPort = 8081
    }
  }

  /**
   * 获取动态基础URL
   */
  private async getBaseUrl(): Promise<string> {
    await this.initializeBackendPort()
    return typeof window !== 'undefined' && (window as any).electronAPI?.isElectron
      ? `http://127.0.0.1:${this.backendPort}`
      : ''
  }

  /**
   * 前端权重转后端权重（线性映射）
   * 公式：backend = (frontend - frontendMin) * (backendMax - backendMin) / (frontendMax - frontendMin) + backendMin
   */
  private linearMap(frontendWeight: number, config: WeightMappingConfig): number {
    const { frontendMin, frontendMax, backendMin, backendMax } = config

    // 边界检查
    if (frontendWeight < frontendMin) frontendWeight = frontendMin
    if (frontendWeight > frontendMax) frontendWeight = frontendMax

    // 线性映射
    const ratio = (frontendWeight - frontendMin) / (frontendMax - frontendMin)
    const backendWeight = backendMin + ratio * (backendMax - backendMin)

    return Math.round(backendWeight)
  }

  /**
   * 前端权重转后端权重（指数映射）
   * 公式：backend = backendMin + (backendMax - backendMin) * ((frontend - frontendMin) / (frontendMax - frontendMin))^scalingFactor
   */
  private exponentialMap(frontendWeight: number, config: WeightMappingConfig): number {
    const { frontendMin, frontendMax, backendMin, backendMax, scalingFactor = 2.5 } = config

    // 边界检查
    if (frontendWeight < frontendMin) frontendWeight = frontendMin
    if (frontendWeight > frontendMax) frontendWeight = frontendMax

    // 指数映射
    const ratio = (frontendWeight - frontendMin) / (frontendMax - frontendMin)
    const backendWeight = backendMin + (backendMax - backendMin) * Math.pow(ratio, scalingFactor)

    return Math.round(backendWeight)
  }

  /**
   * 后端权重转前端权重（线性反向映射）
   */
  private linearUnmap(backendWeight: number, config: WeightMappingConfig): number {
    const { frontendMin, frontendMax, backendMin, backendMax } = config

    // 边界检查
    if (backendWeight < backendMin) backendWeight = backendMin
    if (backendWeight > backendMax) backendWeight = backendMax

    // 线性反向映射
    const ratio = (backendWeight - backendMin) / (backendMax - backendMin)
    const frontendWeight = frontendMin + ratio * (frontendMax - frontendMin)

    return Math.round(frontendWeight)
  }

  /**
   * 后端权重转前端权重（指数反向映射）
   */
  private exponentialUnmap(backendWeight: number, config: WeightMappingConfig): number {
    const { frontendMin, frontendMax, backendMin, backendMax, scalingFactor = 2.5 } = config

    // 边界检查
    if (backendWeight < backendMin) backendWeight = backendMin
    if (backendWeight > backendMax) backendWeight = backendMax

    // 指数反向映射
    const ratio = (backendWeight - backendMin) / (backendMax - backendMin)
    const frontendWeight =
      frontendMin + (frontendMax - frontendMin) * Math.pow(ratio, 1 / scalingFactor)

    return Math.round(frontendWeight)
  }

  /**
   * 单个前端权重转换为后端权重（软约束）
   */
  mapFrontendToBackend(frontendWeight: number): number {
    return this.linearMap(frontendWeight, SOFT_CONSTRAINT_MAPPING)
  }

  /**
   * 单个后端权重转换为前端权重（软约束）
   */
  mapBackendToFrontend(backendWeight: number): number {
    return this.linearUnmap(backendWeight, SOFT_CONSTRAINT_MAPPING)
  }

  /**
   * 批量前端权重转换为后端权重
   */
  mapFrontendWeightsToBackend(frontendWeights: Record<string, number>): Record<string, number> {
    const backendWeights: Record<string, number> = {}

    for (const [key, frontendWeight] of Object.entries(frontendWeights)) {
      backendWeights[key] = this.mapFrontendToBackend(frontendWeight)
    }

    return backendWeights
  }

  /**
   * 批量后端权重转换为前端权重
   */
  mapBackendWeightsToFrontend(backendWeights: Record<string, number>): Record<string, number> {
    const frontendWeights: Record<string, number> = {}

    for (const [key, backendWeight] of Object.entries(backendWeights)) {
      frontendWeights[key] = this.mapBackendToFrontend(backendWeight)
    }

    return frontendWeights
  }

  /**
   * 获取权重映射信息（用于UI显示）
   */
  getMappingInfo(frontendWeight: number): {
    frontend: number
    backend: number
    description: string
  } {
    const backend = this.mapFrontendToBackend(frontendWeight)

    let description = ''
    if (frontendWeight >= 80) {
      description = '最高优先级'
    } else if (frontendWeight >= 65) {
      description = '高优先级'
    } else if (frontendWeight >= 50) {
      description = '中等优先级'
    } else if (frontendWeight >= 35) {
      description = '低优先级'
    } else {
      description = '最低优先级'
    }

    return {
      frontend: frontendWeight,
      backend,
      description,
    }
  }

  /**
   * 验证前端权重是否在有效范围内
   */
  validateFrontendWeight(weight: number): { valid: boolean; message?: string } {
    const { frontendMin, frontendMax } = SOFT_CONSTRAINT_MAPPING

    if (weight < frontendMin) {
      return {
        valid: false,
        message: `权重不能小于 ${frontendMin}`,
      }
    }

    if (weight > frontendMax) {
      return {
        valid: false,
        message: `权重不能大于 ${frontendMax}`,
      }
    }

    return { valid: true }
  }

  /**
   * 获取推荐的权重预设值
   */
  getRecommendedWeights(): Record<string, { label: string; frontend: number; backend: number }> {
    return {
      veryHigh: {
        label: '最高',
        frontend: 90,
        backend: this.mapFrontendToBackend(90),
      },
      high: {
        label: '高',
        frontend: 75,
        backend: this.mapFrontendToBackend(75),
      },
      medium: {
        label: '中',
        frontend: 60,
        backend: this.mapFrontendToBackend(60),
      },
      low: {
        label: '低',
        frontend: 45,
        backend: this.mapFrontendToBackend(45),
      },
      veryLow: {
        label: '最低',
        frontend: 30,
        backend: this.mapFrontendToBackend(30),
      },
    }
  }

  /**
   * 使用后端API进行权重映射（如果可用）
   * 优先使用后端映射API，如果失败则使用本地映射
   */
  async mapFrontendToBackendViaAPI(
    frontendWeights: Record<string, number>
  ): Promise<Record<string, number>> {
    try {
      // 根据环境动态设置URL
      const baseUrl = await this.getBaseUrl()
      const response = await fetch(
        `${baseUrl}/api/constraint-mapping/weight/batch-frontend-to-backend`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(frontendWeights),
        }
      )

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.backendWeights) {
        process.env.NODE_ENV === 'development' && console.log('✅ 使用后端API进行权重映射')
        return result.backendWeights
      }

      throw new Error('API返回格式错误')
    } catch (error) {
      console.warn('⚠️ 后端API不可用，使用本地权重映射:', error)
      // 降级到本地映射
      return this.mapFrontendWeightsToBackend(frontendWeights)
    }
  }

  /**
   * 使用后端API进行反向权重映射（如果可用）
   */
  async mapBackendToFrontendViaAPI(
    backendWeights: Record<string, number>
  ): Promise<Record<string, number>> {
    try {
      // 根据环境动态设置URL
      const baseUrl = await this.getBaseUrl()
      const response = await fetch(
        `${baseUrl}/api/constraint-mapping/weight/batch-backend-to-frontend`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backendWeights),
        }
      )

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.frontendWeights) {
        process.env.NODE_ENV === 'development' && console.log('✅ 使用后端API进行反向权重映射')
        return result.frontendWeights
      }

      throw new Error('API返回格式错误')
    } catch (error) {
      console.warn('⚠️ 后端API不可用，使用本地反向映射:', error)
      // 降级到本地映射
      return this.mapBackendWeightsToFrontend(backendWeights)
    }
  }

  /**
   * 获取映射配置信息
   */
  getMappingConfig(): {
    soft: WeightMappingConfig
    hard: WeightMappingConfig
  } {
    return {
      soft: SOFT_CONSTRAINT_MAPPING,
      hard: HARD_CONSTRAINT_MAPPING,
    }
  }
}

// 导出单例实例
export const constraintWeightMappingService = new ConstraintWeightMappingService()

// 导出便捷方法
export const mapFrontendToBackend = (weight: number) =>
  constraintWeightMappingService.mapFrontendToBackend(weight)

export const mapBackendToFrontend = (weight: number) =>
  constraintWeightMappingService.mapBackendToFrontend(weight)

export const mapFrontendWeightsToBackend = (weights: Record<string, number>) =>
  constraintWeightMappingService.mapFrontendWeightsToBackend(weights)

export const mapBackendWeightsToFrontend = (weights: Record<string, number>) =>
  constraintWeightMappingService.mapBackendWeightsToFrontend(weights)
