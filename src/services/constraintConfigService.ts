/**
 * 约束配置服务
 * 负责前后端约束配置的同步和管理
 *
 * 🔧 方案B更新：集成权重映射服务
 * - 前端使用用户友好的30-90范围
 * - 自动映射到后端实际权重5-700范围
 */

import { apiService } from './api-service'
import { constraintWeightMappingService } from './constraintWeightMappingService'

// 前端约束ID到后端字段名的映射
export const CONSTRAINT_FIELD_MAPPING = {
  // 硬约束映射 - 与后端OptimizedConstraintConfiguration.java字段名保持一致
  HC1: 'workdaysOnlyExam', // 法定节假日不安排考试（周六周日可以考试，但行政班考官周末不参加考试）
  HC2: 'examinerDepartmentRules', // 考官1与学员同科室
  HC3: 'twoMainExaminersRequired', // 考官执勤白班不能安排考试（行政班考官除外）
  HC4: 'noDayShiftExaminer', // 每名考官每天只能监考一名考生
  HC5: 'noStudentDayShiftExam', // 考生执勤白班不能安排考试
  HC6: 'consecutiveTwoDaysExam', // 考生需要在连续两天完成考试
  HC7: 'examinerDifferentDepartments', // 必须有考官1和考官2两名考官，且不能同科室
  HC8: 'backupExaminerDifferentPerson', // 备份考官不能与考官1和考官2是同一人

  // 软约束映射 - 与后端OptimizedConstraintConfiguration.java字段名保持一致
  SC1: 'nightShiftTeacherPriorityWeight', // 优先安排执勤晚班的考官
  SC2: 'firstRestDayTeacherPriorityWeight', // 其次安排休息第一天的考官
  SC3: 'secondRestDayTeacherPriorityWeight', // 再次安排休息第二天的考官
  SC4: 'adminTeacherPriorityWeight', // 最后安排行政班考官
  SC5: 'preferRecommendedExaminer2Weight', // 优先安排推荐科室池内的考官2
  SC6: 'nonRecommendedExaminer2Weight', // 其次安排非推荐科室池的考官
  SC7: 'preferRecommendedBackupExaminerWeight', // 优先安排推荐科室池内的备份考官
  SC8: 'nonRecommendedBackupExaminerWeight', // 其次安排非推荐科室池的备份考官
  SC9: 'crossRegionExaminerWeight', // 区域三室和区域七室的考官互用
  SC10: 'workloadBalanceWeight', // 考官工作量均衡考量
  SC11: 'dateDistributionBalanceWeight', // 考试日期分配均衡考量
} as const

// 反向映射：后端字段名到约束ID
export const BACKEND_FIELD_TO_CONSTRAINT_ID = Object.fromEntries(
  Object.entries(CONSTRAINT_FIELD_MAPPING).map(([id, field]) => [field, id])
) as Record<string, string>

// 约束配置接口 - 与后端 OptimizedConstraintConfiguration 保持一致
export interface ConstraintConfig {
  name?: string // 配置名称（可选）

  // 硬约束（不可关闭，与后端 final boolean 字段对应）
  hardConstraints: {
    workdaysOnlyExam: boolean
    examinerDepartmentRules: boolean
    twoMainExaminersRequired: boolean
    noDayShiftExaminer: boolean
  }

  // 软约束（可配置，与后端权重字段对应）
  softConstraints: {
    allowDept37CrossUse: boolean
    preferNoGroupTeachers: boolean
    nightShiftTeacherPriority: boolean
    firstRestDayTeacherPriority: boolean
    secondRestDayTeacherPriority: boolean
    adminTeacherPriority: boolean
    backupExaminerDiffDept: boolean
    avoidStudentDayShift: boolean
    preferRecommendedDepts: boolean
    ensureConsecutiveDays: boolean
    balanceWorkload: boolean
    preferLaterDates: boolean
    nightShiftTeacherRecommendedDepartmentBonus: boolean
  }

  // 约束权重 - 与后端权重字段名称保持一致
  weights: {
    allowDept37CrossUse: number
    preferNoGroupTeachers: number
    nightShiftTeacherPriority: number
    firstRestDayTeacherPriority: number
    secondRestDayTeacherPriority: number
    adminTeacherPriority: number
    backupExaminerDiffDept: number
    avoidStudentDayShift: number
    preferRecommendedDepts: number
    ensureConsecutiveDays: number
    balanceWorkload: number
    preferLaterDates: number
    nightShiftTeacherRecommendedDepartmentBonus: number
  }
}

// HardSoftScore对象接口
export interface HardSoftScore {
  initScore: number
  hardScore: number
  softScore: number
  feasible: boolean
  zero: boolean
  solutionInitialized: boolean
}

// 后端约束配置格式 - 与 OptimizedConstraintConfiguration 完全一致
export interface BackendConstraintConfig {
  // 硬约束（后端为 final boolean，前端只读显示）
  hardConstraints: {
    workdaysOnlyExam: boolean
    examinerDepartmentRules: boolean
    twoMainExaminersRequired: boolean
    noDayShiftExaminer: boolean
  }

  // 软约束权重（HardSoftScore对象格式）
  softConstraints: {
    allowDept37CrossUse: HardSoftScore
    preferNoGroupTeachers: HardSoftScore
    nightShiftTeacherPriority: HardSoftScore
    firstRestDayTeacherPriority: HardSoftScore
    secondRestDayTeacherPriority: HardSoftScore
    adminTeacherPriority: HardSoftScore
    backupExaminerDiffDept: HardSoftScore
    avoidStudentDayShift: HardSoftScore
    preferRecommendedDepts: HardSoftScore
    ensureConsecutiveDays: HardSoftScore
    balanceWorkload: HardSoftScore
    preferLaterDates: HardSoftScore
    nightShiftTeacherRecommendedDepartmentBonus: HardSoftScore
  }
}

// 预设配置 - 根据文档标准更新权重设置
export const presetConfigs: Record<string, ConstraintConfig> = {
  balanced: {
    name: '均衡模式',
    hardConstraints: {
      workdaysOnlyExam: true,
      examinerDepartmentRules: true,
      twoMainExaminersRequired: true,
      noDayShiftExaminer: true,
    },
    softConstraints: {
      allowDept37CrossUse: true,
      preferNoGroupTeachers: true,
      nightShiftTeacherPriority: true,
      firstRestDayTeacherPriority: true,
      secondRestDayTeacherPriority: true,
      adminTeacherPriority: true,
      backupExaminerDiffDept: true,
      avoidStudentDayShift: true,
      preferRecommendedDepts: true,
      ensureConsecutiveDays: true,
      balanceWorkload: true,
      preferLaterDates: true,
      nightShiftTeacherRecommendedDepartmentBonus: true,
    },
    weights: {
      // 🎨 方案B：使用用户友好的30-90范围（会自动映射到后端5-700范围）
      allowDept37CrossUse: 35, // SC9: 区域协作（最低优先级） → 后端: ~63
      preferNoGroupTeachers: 65, // SC8: 无班组考官优先 → 后端: ~410
      nightShiftTeacherPriority: 85, // SC1: 晚班考官优先（最高优先级之一） → 后端: ~642
      firstRestDayTeacherPriority: 75, // SC2: 休息第一天优先 → 后端: ~526
      secondRestDayTeacherPriority: 60, // SC3: 休息第二天优先 → 后端: ~352
      adminTeacherPriority: 50, // SC4: 行政班考官优先 → 后端: ~237
      backupExaminerDiffDept: 70, // SC5: 备份考官科室差异化 → 后端: ~468
      avoidStudentDayShift: 68, // SC6: 避免学员白班 → 后端: ~445
      preferRecommendedDepts: 90, // SC7: 推荐科室优先（最高优先级） → 后端: ~700
      ensureConsecutiveDays: 70, // SC12: 连续日期 → 后端: ~468
      balanceWorkload: 80, // SC10: 工作量均衡（高优先级） → 后端: ~584
      preferLaterDates: 48, // SC11: 日期分配均衡 → 后端: ~213
      nightShiftTeacherRecommendedDepartmentBonus: 45, // SC13: 晚班考官推荐科室加分 → 后端: ~178
    },
  },

  strict: {
    name: '严格模式',
    hardConstraints: {
      workdaysOnlyExam: true,
      examinerDepartmentRules: true,
      twoMainExaminersRequired: true,
      noDayShiftExaminer: true,
    },
    softConstraints: {
      allowDept37CrossUse: true,
      preferNoGroupTeachers: true,
      nightShiftTeacherPriority: true,
      firstRestDayTeacherPriority: true,
      secondRestDayTeacherPriority: true,
      adminTeacherPriority: true,
      backupExaminerDiffDept: true,
      avoidStudentDayShift: true,
      preferRecommendedDepts: true,
      ensureConsecutiveDays: true,
      balanceWorkload: true,
      preferLaterDates: true,
      nightShiftTeacherRecommendedDepartmentBonus: true,
    },
    weights: {
      // 🎨 方案B：严格模式（与均衡模式相同，使用30-90范围）
      allowDept37CrossUse: 35, // SC9: 区域协作
      preferNoGroupTeachers: 65, // SC8: 无班组考官优先
      nightShiftTeacherPriority: 85, // SC1: 晚班考官优先
      firstRestDayTeacherPriority: 75, // SC2: 休息第一天优先
      secondRestDayTeacherPriority: 60, // SC3: 休息第二天优先
      adminTeacherPriority: 50, // SC4: 行政班考官优先
      backupExaminerDiffDept: 70, // SC5: 备份考官科室差异化
      avoidStudentDayShift: 68, // SC6: 避免学员白班
      preferRecommendedDepts: 90, // SC7: 推荐科室优先
      ensureConsecutiveDays: 70, // SC12: 连续日期
      balanceWorkload: 80, // SC10: 工作量均衡
      preferLaterDates: 48, // SC11: 日期分配均衡
      nightShiftTeacherRecommendedDepartmentBonus: 45, // SC13: 晚班考官推荐科室加分
    },
  },

  flexible: {
    name: '灵活模式',
    hardConstraints: {
      workdaysOnlyExam: true,
      examinerDepartmentRules: true,
      twoMainExaminersRequired: true,
      noDayShiftExaminer: true,
    },
    softConstraints: {
      allowDept37CrossUse: true,
      preferNoGroupTeachers: true, // 全部软约束默认开启
      nightShiftTeacherPriority: true,
      firstRestDayTeacherPriority: true,
      secondRestDayTeacherPriority: true,
      adminTeacherPriority: true,
      backupExaminerDiffDept: true,
      avoidStudentDayShift: true,
      preferRecommendedDepts: true,
      ensureConsecutiveDays: true,
      balanceWorkload: true,
      preferLaterDates: true,
      nightShiftTeacherRecommendedDepartmentBonus: true,
    },
    weights: {
      // 🎨 方案B：灵活模式（相对均衡模式降低15-25%，使用30-90范围）
      allowDept37CrossUse: 32, // SC9: 区域协作（降低8%） → 后端: ~28
      preferNoGroupTeachers: 55, // SC8: 无班组考官优先（降低15%） → 后端: ~295
      nightShiftTeacherPriority: 72, // SC1: 晚班考官优先（降低15%） → 后端: ~490
      firstRestDayTeacherPriority: 64, // SC2: 休息第一天优先（降低15%） → 后端: ~399
      secondRestDayTeacherPriority: 51, // SC3: 休息第二天优先（降低15%） → 后端: ~249
      adminTeacherPriority: 42, // SC4: 行政班考官优先（降低16%） → 后端: ~143
      backupExaminerDiffDept: 58, // SC5: 备份考官科室差异化（降低17%） → 后端: ~329
      avoidStudentDayShift: 56, // SC6: 避免学员白班（降低18%） → 后端: ~306
      preferRecommendedDepts: 77, // SC7: 推荐科室优先（降低14%） → 后端: ~549
      ensureConsecutiveDays: 58, // SC12: 连续日期（降低17%） → 后端: ~329
      balanceWorkload: 68, // SC10: 工作量均衡（降低15%） → 后端: ~445
      preferLaterDates: 40, // SC11: 日期分配均衡（降低17%） → 后端: ~120
      nightShiftTeacherRecommendedDepartmentBonus: 38, // SC13: 晚班推荐加分（降低16%） → 后端: ~98
    },
  },
}

/**
 * 约束配置服务类
 */
export class ConstraintConfigService {
  private currentConfig: ConstraintConfig | null = null
  private configCache = new Map<string, BackendConstraintConfig>()

  /**
   * 获取当前约束配置
   */
  async getCurrentConfig(): Promise<ConstraintConfig> {
    if (this.currentConfig) {
      return this.currentConfig
    }

    try {
      const response = await apiService.getConstraintConfiguration()
      if (response.success && response.data) {
        this.currentConfig = this.convertFromBackendFormat(response.data)
        return this.currentConfig
      }
    } catch (error) {
      console.warn('获取后端约束配置失败，使用默认配置:', error)
    }

    // 返回默认配置
    this.currentConfig = presetConfigs.balanced
    return this.currentConfig
  }

  /**
   * 更新约束配置
   */
  async updateConfig(config: ConstraintConfig): Promise<boolean> {
    try {
      const backendConfig = this.convertToBackendFormat(config)
      const response = await apiService.updateConstraintConfiguration(backendConfig)

      if (response.success) {
        this.currentConfig = config
        process.env.NODE_ENV === 'development' && console.log('✅ 约束配置更新成功')
        return true
      } else {
        console.error('❌ 约束配置更新失败:', response.data?.message || '未知错误')
        return false
      }
    } catch (error) {
      console.error('❌ 约束配置更新异常:', error)
      return false
    }
  }

  /**
   * 应用预设配置
   */
  async applyPreset(presetName: keyof typeof presetConfigs): Promise<boolean> {
    const preset = presetConfigs[presetName]
    if (!preset) {
      console.error('❌ 未知的预设配置:', presetName)
      return false
    }

    process.env.NODE_ENV === 'development' && console.log(`🎯 应用预设配置: ${preset.name}`)
    return await this.updateConfig(preset)
  }

  /**
   * 验证约束配置
   */
  validateConfig(config: ConstraintConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证硬约束（必须全部启用）
    const requiredHardConstraints: Array<keyof ConstraintConfig['hardConstraints']> = [
      'workdaysOnlyExam',
      'examinerDepartmentRules',
      'twoMainExaminersRequired',
      'noDayShiftExaminer',
    ]
    requiredHardConstraints.forEach(constraint => {
      if (!config.hardConstraints[constraint]) {
        errors.push(`硬约束 ${constraint} 必须启用`)
      }
    })

    // 验证软约束权重范围
    Object.entries(config.weights).forEach(([key, weight]) => {
      if (weight < 0) {
        errors.push(`约束 ${key} 的权重不能为负数`)
      }
      if (weight > 1000) {
        errors.push(`约束 ${key} 的权重不能超过1000`)
      }
    })

    // 验证约束逻辑一致性
    if (config.softConstraints.allowDept37CrossUse && config.weights.allowDept37CrossUse === 0) {
      errors.push('启用的约束必须设置大于0的权重')
    }

    // 验证关键约束权重合理性
    if (
      config.weights.nightShiftTeacherPriority > 0 &&
      config.weights.nightShiftTeacherPriority < 50
    ) {
      errors.push('夜班考官优先约束权重过低，建议设置为50以上')
    }

    if (config.weights.preferRecommendedDepts > 0 && config.weights.preferRecommendedDepts < 60) {
      errors.push('推荐科室优先约束权重过低，建议设置为60以上')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * 获取约束配置统计信息
   */
  getConfigStats(config: ConstraintConfig): {
    enabledHardConstraints: number
    enabledSoftConstraints: number
    totalWeight: number
    avgWeight: number
  } {
    const enabledHardConstraints = Object.values(config.hardConstraints).filter(Boolean).length
    const enabledSoftConstraints = Object.values(config.softConstraints).filter(Boolean).length
    const weights = Object.values(config.weights)
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    const avgWeight = weights.length > 0 ? totalWeight / weights.length : 0

    return {
      enabledHardConstraints,
      enabledSoftConstraints,
      totalWeight,
      avgWeight: Math.round(avgWeight * 100) / 100,
    }
  }

  /**
   * 导出配置为JSON
   */
  exportConfig(config: ConstraintConfig, configName: string = 'custom'): string {
    const exportData = {
      name: configName,
      description: `约束配置导出 - ${new Date().toLocaleDateString()}`,
      version: '2.1',
      timestamp: new Date().toISOString(),
      config: config,
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 从JSON导入配置
   */
  importConfig(jsonString: string): ConstraintConfig {
    try {
      const importData = JSON.parse(jsonString)

      if (!importData.config) {
        throw new Error('配置文件格式错误：缺少config字段')
      }

      const config = importData.config as ConstraintConfig
      const validation = this.validateConfig(config)

      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`)
      }

      return config
    } catch (error) {
      console.error('❌ 配置导入失败:', error)
      throw error
    }
  }

  /**
   * 转换为后端格式 - 实现正确的字段映射
   * 🔧 方案B更新：使用权重映射服务将前端权重（30-90）转换为后端权重（5-700）
   */
  private convertToBackendFormat(config: ConstraintConfig): BackendConstraintConfig {
    // 🔧 将前端权重映射到后端权重
    const mappedWeights = constraintWeightMappingService.mapFrontendWeightsToBackend(config.weights)

    process.env.NODE_ENV === 'development' && console.log('🔄 权重映射转换:', {
      frontend: config.weights,
      backend: mappedWeights,
    })

    // 确保所有字段都正确映射到后端格式
    return {
      hardConstraints: {
        workdaysOnlyExam: config.hardConstraints.workdaysOnlyExam,
        examinerDepartmentRules: config.hardConstraints.examinerDepartmentRules,
        twoMainExaminersRequired: config.hardConstraints.twoMainExaminersRequired,
        noDayShiftExaminer: config.hardConstraints.noDayShiftExaminer,
      },
      softConstraints: {
        allowDept37CrossUse: { softScore: mappedWeights.allowDept37CrossUse } as HardSoftScore,
        preferNoGroupTeachers: { softScore: mappedWeights.preferNoGroupTeachers } as HardSoftScore,
        nightShiftTeacherPriority: {
          softScore: mappedWeights.nightShiftTeacherPriority,
        } as HardSoftScore,
        firstRestDayTeacherPriority: {
          softScore: mappedWeights.firstRestDayTeacherPriority,
        } as HardSoftScore,
        secondRestDayTeacherPriority: {
          softScore: mappedWeights.secondRestDayTeacherPriority,
        } as HardSoftScore,
        backupExaminerDiffDept: {
          softScore: mappedWeights.backupExaminerDiffDept,
        } as HardSoftScore,
        avoidStudentDayShift: { softScore: mappedWeights.avoidStudentDayShift } as HardSoftScore,
        preferRecommendedDepts: {
          softScore: mappedWeights.preferRecommendedDepts,
        } as HardSoftScore,
        ensureConsecutiveDays: { softScore: mappedWeights.ensureConsecutiveDays } as HardSoftScore,
        balanceWorkload: { softScore: mappedWeights.balanceWorkload } as HardSoftScore,
        preferLaterDates: { softScore: mappedWeights.preferLaterDates } as HardSoftScore,
        nightShiftTeacherRecommendedDepartmentBonus: {
          softScore: mappedWeights.nightShiftTeacherRecommendedDepartmentBonus,
        } as HardSoftScore,
        adminTeacherPriority: {
          softScore: mappedWeights.adminTeacherPriority || 40,
        } as HardSoftScore,
      },
    }
  }

  /**
   * 从后端格式转换 - 实现正确的字段映射
   * 🔧 方案B更新：使用权重映射服务将后端权重（5-700）转换为前端权重（30-90）
   */
  private convertFromBackendFormat(backendConfig: BackendConstraintConfig): ConstraintConfig {
    // 提取后端权重
    const backendWeights = {
      allowDept37CrossUse: backendConfig.softConstraints.allowDept37CrossUse.softScore,
      preferNoGroupTeachers: backendConfig.softConstraints.preferNoGroupTeachers.softScore,
      nightShiftTeacherPriority: backendConfig.softConstraints.nightShiftTeacherPriority.softScore,
      firstRestDayTeacherPriority:
        backendConfig.softConstraints.firstRestDayTeacherPriority.softScore,
      secondRestDayTeacherPriority:
        backendConfig.softConstraints.secondRestDayTeacherPriority.softScore,
      backupExaminerDiffDept: backendConfig.softConstraints.backupExaminerDiffDept.softScore,
      avoidStudentDayShift: backendConfig.softConstraints.avoidStudentDayShift.softScore,
      preferRecommendedDepts: backendConfig.softConstraints.preferRecommendedDepts.softScore,
      ensureConsecutiveDays: backendConfig.softConstraints.ensureConsecutiveDays.softScore,
      balanceWorkload: backendConfig.softConstraints.balanceWorkload.softScore,
      preferLaterDates: backendConfig.softConstraints.preferLaterDates.softScore,
      nightShiftTeacherRecommendedDepartmentBonus:
        backendConfig.softConstraints.nightShiftTeacherRecommendedDepartmentBonus.softScore,
      adminTeacherPriority: backendConfig.softConstraints.adminTeacherPriority?.softScore || 40,
    }

    // 🔧 将后端权重映射到前端权重
    const mappedWeights = constraintWeightMappingService.mapBackendWeightsToFrontend(backendWeights)

    process.env.NODE_ENV === 'development' && console.log('🔄 反向权重映射转换:', {
      backend: backendWeights,
      frontend: mappedWeights,
    })

    return {
      hardConstraints: {
        workdaysOnlyExam: backendConfig.hardConstraints.workdaysOnlyExam,
        examinerDepartmentRules: backendConfig.hardConstraints.examinerDepartmentRules,
        twoMainExaminersRequired: backendConfig.hardConstraints.twoMainExaminersRequired,
        noDayShiftExaminer: backendConfig.hardConstraints.noDayShiftExaminer,
      },
      softConstraints: {
        allowDept37CrossUse: backendWeights.allowDept37CrossUse > 0,
        preferNoGroupTeachers: backendWeights.preferNoGroupTeachers > 0,
        nightShiftTeacherPriority: backendWeights.nightShiftTeacherPriority > 0,
        firstRestDayTeacherPriority: backendWeights.firstRestDayTeacherPriority > 0,
        secondRestDayTeacherPriority: backendWeights.secondRestDayTeacherPriority > 0,
        adminTeacherPriority: backendWeights.adminTeacherPriority > 0,
        backupExaminerDiffDept: backendWeights.backupExaminerDiffDept > 0,
        avoidStudentDayShift: backendWeights.avoidStudentDayShift > 0,
        preferRecommendedDepts: backendWeights.preferRecommendedDepts > 0,
        ensureConsecutiveDays: backendWeights.ensureConsecutiveDays > 0,
        balanceWorkload: backendWeights.balanceWorkload > 0,
        preferLaterDates: backendWeights.preferLaterDates > 0,
        nightShiftTeacherRecommendedDepartmentBonus:
          backendWeights.nightShiftTeacherRecommendedDepartmentBonus > 0,
      },
      weights: mappedWeights as ConstraintConfig['weights'],
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.currentConfig = null
    this.configCache.clear()
  }
}

// 导出单例实例
export const constraintConfigService = new ConstraintConfigService()

// 导出便捷方法
export const getCurrentConstraintConfig = () => constraintConfigService.getCurrentConfig()
export const updateConstraintConfig = (config: ConstraintConfig) =>
  constraintConfigService.updateConfig(config)
export const applyPresetConfig = (preset: keyof typeof presetConfigs) =>
  constraintConfigService.applyPreset(preset)
export const validateConstraintConfig = (config: ConstraintConfig) =>
  constraintConfigService.validateConfig(config)
