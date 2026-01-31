/**
 * 约束权重同步服务
 * 从后端获取约束权重配置，并提供给前端使用
 */

export interface BackendConstraintWeights {
  hardConstraints: {
    HC1: number // 5000
    HC2: number // 15000
    HC3: number // 7000
    HC4: number // 18000
    HC6: number // 25000
    HC7: number // 10000
    HC8: number // 3000
  }
  softConstraints: {
    SC1: number // 100 - 晚班考官优先
    SC2: number // 90 - 考官2专业匹配
    SC3: number // 80 - 休息第一天考官优先
    SC4: number // 70 - 备份考官专业匹配
    SC5: number // 60 - 休息第二天考官优先
    SC6: number // 50 - 考官2备选方案
    SC7: number // 60 - 行政班考官优先
    SC8: number // 30 - 备份考官备选方案
    SC9: number // 20 - 三七室互通
    SC10: number // 500 - 考官1工作量均衡+连续工作惩罚
    SC10b: number // 500 - 考官2连续工作惩罚
    SC10c: number // 500 - 备份考官连续工作惩罚
    SC11: number // 5 - 日期分配均衡
    SC12: number // 50 - 备份考官工作量均衡
    SC13: number // 30 - 限制行政班担任主考官
  }
  lastUpdated: string
}

export interface NormalizedWeights {
  resourceAvailability: number // 资源可用性（HC2, HC7, SC1/SC3/SC5/SC7）
  workloadBalance: number // 工作量均衡（SC10）
  conflictProbability: number // 冲突概率（HC1, HC4）
  futureFlexibility: number // 未来灵活性
  consecutiveWorkStress: number // 连续工作压力（SC10）
  recommendedMatch: number // 推荐科室匹配（SC2, SC4）
}

class ConstraintWeightSyncService {
  private cachedWeights: BackendConstraintWeights | null = null
  private lastSyncTime: number = 0
  private readonly SYNC_INTERVAL = 300000 // 5分钟同步一次

  // 🔧 临时方案：使用硬编码的后端权重（直到后端API就绪）
  private readonly DEFAULT_WEIGHTS: BackendConstraintWeights = {
    hardConstraints: {
      HC1: 5000,
      HC2: 15000,
      HC3: 7000,
      HC4: 18000,
      HC6: 25000,
      HC7: 10000,
      HC8: 3000,
    },
    softConstraints: {
      SC1: 100,
      SC2: 90,
      SC3: 80,
      SC4: 70,
      SC5: 60,
      SC6: 50,
      SC7: 60,
      SC8: 30,
      SC9: 20,
      SC10: 500,
      SC10b: 500,
      SC10c: 500,
      SC11: 5,
      SC12: 50,
      SC13: 30,
    },
    lastUpdated: new Date().toISOString(),
  }

  /**
   * 获取后端约束权重
   */
  async getBackendWeights(): Promise<BackendConstraintWeights> {
    const now = Date.now()

    // 检查缓存是否有效
    if (this.cachedWeights && now - this.lastSyncTime < this.SYNC_INTERVAL) {
      process.env.NODE_ENV === 'development' && console.log('📦 使用缓存的约束权重')
      return this.cachedWeights
    }

    try {
      process.env.NODE_ENV === 'development' && console.log('🔄 从后端同步约束权重...')

      // TODO: 实现真实的API调用
      // const response = await fetch('/api/constraints/weights')
      // const weights = await response.json()

      // 🔧 临时方案：使用默认权重
      const weights = this.DEFAULT_WEIGHTS

      this.cachedWeights = weights
      this.lastSyncTime = now

      process.env.NODE_ENV === 'development' && console.log('✅ 约束权重同步成功')
      return weights
    } catch (error) {
      console.error('❌ 约束权重同步失败:', error)

      // 失败时返回默认权重
      return this.DEFAULT_WEIGHTS
    }
  }

  /**
   * 🎯 核心方法：将后端绝对权重归一化为前端相对权重
   */
  async getNormalizedWeights(): Promise<NormalizedWeights> {
    const backendWeights = await this.getBackendWeights()

    // 计算每个维度的原始权重
    const dimensionWeights = {
      // 资源可用性 = SC1 + SC3 + SC5 + SC7 (考官优先级相关)
      resourceAvailability:
        backendWeights.softConstraints.SC1 * 1.0 + // 晚班考官
        backendWeights.softConstraints.SC3 * 0.8 + // 休息第一天
        backendWeights.softConstraints.SC5 * 0.6 + // 休息第二天
        backendWeights.softConstraints.SC7 * 0.4, // 行政班

      // 工作量均衡 = SC10 + SC10b + SC10c + SC12
      workloadBalance:
        backendWeights.softConstraints.SC10 * 1.0 + // 考官1工作量
        backendWeights.softConstraints.SC10b * 1.0 + // 考官2工作量
        backendWeights.softConstraints.SC10c * 1.0 + // 备份考官工作量
        backendWeights.softConstraints.SC12 * 0.5, // 备份考官均衡

      // 冲突概率 = HC1 + HC4 (基于硬约束，给予较高权重)
      conflictProbability:
        backendWeights.hardConstraints.HC1 * 0.1 + // 节假日检查
        backendWeights.hardConstraints.HC4 * 0.1, // 考官时间冲突

      // 未来灵活性 = SC11 (日期分配均衡)
      futureFlexibility: backendWeights.softConstraints.SC11 * 10.0, // 权重较小，放大10倍

      // 连续工作压力 = SC10 (连续工作惩罚部分)
      consecutiveWorkStress: backendWeights.softConstraints.SC10 * 1.0, // 与工作量均衡共享SC10

      // 推荐科室匹配 = SC2 + SC4
      recommendedMatch:
        backendWeights.softConstraints.SC2 * 1.0 + // 考官2专业匹配
        backendWeights.softConstraints.SC4 * 0.8, // 备份考官专业匹配
    }

    // 计算总权重
    const totalWeight = Object.values(dimensionWeights).reduce((sum, w) => sum + w, 0)

    // 归一化到 0-1 范围
    const normalized: NormalizedWeights = {
      resourceAvailability: dimensionWeights.resourceAvailability / totalWeight,
      workloadBalance: dimensionWeights.workloadBalance / totalWeight,
      conflictProbability: dimensionWeights.conflictProbability / totalWeight,
      futureFlexibility: dimensionWeights.futureFlexibility / totalWeight,
      consecutiveWorkStress: dimensionWeights.consecutiveWorkStress / totalWeight,
      recommendedMatch: dimensionWeights.recommendedMatch / totalWeight,
    }

    process.env.NODE_ENV === 'development' && console.log('📊 归一化权重:', {
      resourceAvailability: `${(normalized.resourceAvailability * 100).toFixed(1)}%`,
      workloadBalance: `${(normalized.workloadBalance * 100).toFixed(1)}%`,
      conflictProbability: `${(normalized.conflictProbability * 100).toFixed(1)}%`,
      futureFlexibility: `${(normalized.futureFlexibility * 100).toFixed(1)}%`,
      consecutiveWorkStress: `${(normalized.consecutiveWorkStress * 100).toFixed(1)}%`,
      recommendedMatch: `${(normalized.recommendedMatch * 100).toFixed(1)}%`,
    })

    return normalized
  }

  /**
   * 清除缓存（用于强制刷新）
   */
  clearCache(): void {
    this.cachedWeights = null
    this.lastSyncTime = 0
    process.env.NODE_ENV === 'development' && console.log('🗑️ 约束权重缓存已清除')
  }
}

export const constraintWeightSyncService = new ConstraintWeightSyncService()
