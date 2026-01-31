/**
 * 约束验证服务
 * 提供约束配置验证、冲突检测和修复建议功能
 */

export interface ConstraintConfig {
  constraints: Record<string, boolean>
  weights: Record<string, number>
}

export interface ValidationError {
  type: 'error' | 'warning' | 'info'
  constraint: string
  message: string
  suggestion?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: ValidationError[]
  score: number // 配置质量评分 0-100
}

export interface ConflictDetectionResult {
  hasConflicts: boolean
  conflicts: Array<{
    constraint1: string
    constraint2: string
    severity: 'high' | 'medium' | 'low'
    description: string
    resolution: string
  }>
}

/**
 * 约束验证服务类
 */
export class ConstraintValidationService {
  // 硬约束定义（不可关闭）
  private readonly hardConstraints = [
    'workdaysOnlyExam', // HC1: 工作日考试限制
    'examinerDepartmentRules', // HC2: 考官科室规则
    'twoMainExaminersRequired', // HC3: 考官配备要求
    'noDayShiftExaminer', // HC4: 白班禁止规则
  ]

  // 软约束定义及其合理权重范围
  private readonly softConstraints = {
    allowDept37CrossUse: { min: 100, max: 300, optimal: 200 }, // SC4: 三七室互通
    preferNoGroupTeachers: { min: 150, max: 400, optimal: 250 }, // SC6: 无班组优先
  }

  // 约束冲突规则定义
  private readonly conflictRules = [
    {
      constraint1: 'ensureConsecutiveDays',
      constraint2: 'preferLaterDates',
      severity: 'medium' as const,
      condition: (w1: number, w2: number) => w1 > 80 && w2 > 30,
      description: '连续日期约束与较晚日期偏好可能产生冲突',
      resolution: '建议降低较晚日期偏好权重或调整连续日期约束权重',
    },
    {
      constraint1: 'preferRecommendedDepts',
      constraint2: 'balanceWorkload',
      severity: 'low' as const,
      condition: (w1: number, w2: number) => w1 > 100 && w2 > 80,
      description: '推荐科室偏好与工作负荷平衡可能产生轻微冲突',
      resolution: '建议适当平衡两个约束的权重',
    },
    {
      constraint1: 'allowDept37CrossUse',
      constraint2: 'preferRecommendedDepts',
      severity: 'low' as const,
      condition: (w1: number, w2: number) => w1 > 50 && w2 > 100,
      description: '跨科室支援与推荐科室偏好存在潜在冲突',
      resolution: '建议根据实际资源情况调整权重',
    },
  ]

  /**
   * 验证约束配置
   */
  validateConfiguration(config: ConstraintConfig): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    // 验证硬约束
    this.validateHardConstraints(config, errors)

    // 验证软约束
    this.validateSoftConstraints(config, errors, warnings, suggestions)

    // 检测约束冲突
    const conflictResult = this.detectConflicts(config)
    if (conflictResult.hasConflicts) {
      conflictResult.conflicts.forEach(conflict => {
        const error: ValidationError = {
          type: conflict.severity === 'high' ? 'error' : 'warning',
          constraint: `${conflict.constraint1} vs ${conflict.constraint2}`,
          message: conflict.description,
          suggestion: conflict.resolution,
        }

        if (conflict.severity === 'high') {
          errors.push(error)
        } else {
          warnings.push(error)
        }
      })
    }

    // 计算配置质量评分
    const score = this.calculateConfigurationScore(config, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    }
  }

  /**
   * 验证硬约束
   */
  private validateHardConstraints(config: ConstraintConfig, errors: ValidationError[]) {
    this.hardConstraints.forEach(constraint => {
      if (!config.constraints[constraint]) {
        errors.push({
          type: 'error',
          constraint,
          message: `硬约束 ${constraint} 必须启用`,
          suggestion: '硬约束是系统运行的基础规则，不可关闭',
        })
      }
    })
  }

  /**
   * 验证软约束
   */
  private validateSoftConstraints(
    config: ConstraintConfig,
    errors: ValidationError[],
    warnings: ValidationError[],
    suggestions: ValidationError[]
  ) {
    Object.entries(this.softConstraints).forEach(([constraint, range]) => {
      const isEnabled = config.constraints[constraint]
      const weight = config.weights[constraint] || 0

      if (isEnabled) {
        // 检查权重范围
        if (weight < range.min) {
          warnings.push({
            type: 'warning',
            constraint,
            message: `软约束 ${constraint} 权重过低 (${weight})，可能影响效果`,
            suggestion: `建议权重范围: ${range.min}-${range.max}，最优值: ${range.optimal}`,
          })
        } else if (weight > range.max) {
          warnings.push({
            type: 'warning',
            constraint,
            message: `软约束 ${constraint} 权重过高 (${weight})，可能影响求解性能`,
            suggestion: `建议权重范围: ${range.min}-${range.max}，最优值: ${range.optimal}`,
          })
        } else if (Math.abs(weight - range.optimal) > 20) {
          suggestions.push({
            type: 'info',
            constraint,
            message: `软约束 ${constraint} 权重可以优化`,
            suggestion: `当前权重: ${weight}，建议最优权重: ${range.optimal}`,
          })
        }
      } else if (weight > 0) {
        warnings.push({
          type: 'warning',
          constraint,
          message: `软约束 ${constraint} 已禁用但权重不为0`,
          suggestion: '建议将禁用约束的权重设为0',
        })
      }
    })

    // 检查启用的软约束数量
    const enabledSoftConstraints = Object.keys(this.softConstraints).filter(
      constraint => config.constraints[constraint]
    )

    if (enabledSoftConstraints.length === 0) {
      warnings.push({
        type: 'warning',
        constraint: 'general',
        message: '未启用任何软约束，排班质量可能不佳',
        suggestion: '建议至少启用核心软约束：推荐科室偏好、工作负荷平衡',
      })
    } else if (enabledSoftConstraints.length > 6) {
      warnings.push({
        type: 'warning',
        constraint: 'general',
        message: `启用软约束过多 (${enabledSoftConstraints.length}个)，可能影响求解速度`,
        suggestion: '建议根据实际需求精简约束数量',
      })
    }

    // 检查总权重
    const totalWeight = Object.entries(config.weights)
      .filter(([constraint]) => config.constraints[constraint])
      .reduce((sum, [, weight]) => sum + weight, 0)

    if (totalWeight > 500) {
      warnings.push({
        type: 'warning',
        constraint: 'general',
        message: `总权重过高 (${totalWeight})，可能导致求解困难`,
        suggestion: '建议适当降低各约束权重',
      })
    }
  }

  /**
   * 检测约束冲突
   */
  detectConflicts(config: ConstraintConfig): ConflictDetectionResult {
    const conflicts: ConflictDetectionResult['conflicts'] = []

    this.conflictRules.forEach(rule => {
      const weight1 = config.weights[rule.constraint1] || 0
      const weight2 = config.weights[rule.constraint2] || 0
      const enabled1 = config.constraints[rule.constraint1]
      const enabled2 = config.constraints[rule.constraint2]

      if (enabled1 && enabled2 && rule.condition(weight1, weight2)) {
        conflicts.push({
          constraint1: rule.constraint1,
          constraint2: rule.constraint2,
          severity: rule.severity,
          description: rule.description,
          resolution: rule.resolution,
        })
      }
    })

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
    }
  }

  /**
   * 计算配置质量评分
   */
  private calculateConfigurationScore(
    config: ConstraintConfig,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): number {
    let score = 100

    // 硬约束错误严重扣分
    score -= errors.length * 20

    // 警告适度扣分
    score -= warnings.length * 5

    // 软约束权重合理性加分
    const softConstraintScore = Object.entries(this.softConstraints)
      .filter(([constraint]) => config.constraints[constraint])
      .reduce((sum, [constraint, range]) => {
        const weight = config.weights[constraint] || 0
        const deviation = Math.abs(weight - range.optimal) / range.optimal
        return sum + Math.max(0, 10 - deviation * 10)
      }, 0)

    score += softConstraintScore

    // 约束数量合理性
    const enabledCount = Object.keys(this.softConstraints).filter(
      constraint => config.constraints[constraint]
    ).length

    if (enabledCount >= 3 && enabledCount <= 6) {
      score += 10 // 合理的约束数量
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * 生成优化建议
   */
  generateOptimizationSuggestions(config: ConstraintConfig): string[] {
    const suggestions: string[] = []

    // 分析当前配置特点
    const enabledSoftConstraints = Object.keys(this.softConstraints).filter(
      constraint => config.constraints[constraint]
    )

    const highWeightConstraints = enabledSoftConstraints.filter(
      constraint => (config.weights[constraint] || 0) > 80
    )

    const lowWeightConstraints = enabledSoftConstraints.filter(
      constraint => (config.weights[constraint] || 0) < 30
    )

    // 生成针对性建议
    if (highWeightConstraints.length > 3) {
      suggestions.push('当前配置中高权重约束过多，建议适当降低部分约束权重以提升求解效率')
    }

    if (lowWeightConstraints.length > 2) {
      suggestions.push('部分约束权重过低可能影响效果，建议适当提升或考虑禁用')
    }

    if (!config.constraints.preferRecommendedDepts) {
      suggestions.push('建议启用推荐科室偏好约束，这是提升排班质量的关键因素')
    }

    if (!config.constraints.balanceWorkload) {
      suggestions.push('建议启用工作负荷平衡约束，确保考官工作分配公平')
    }

    if (enabledSoftConstraints.length < 3) {
      suggestions.push('当前启用的软约束较少，建议增加核心约束以提升排班质量')
    }

    return suggestions
  }

  /**
   * 获取预设配置
   */
  getPresetConfigurations(): Record<string, ConstraintConfig> {
    return {
      balanced: {
        constraints: {
          // 硬约束全部启用
          ...Object.fromEntries(this.hardConstraints.map(hc => [hc, true])),
          // 软约束均衡启用
          allowDept37CrossUse: true,
          preferNoGroupTeachers: true,
          preferNightShiftTeachers: true,
          preferFirstRestDayTeachers: true,
          preferSecondRestDayTeachers: true,
        },
        weights: {
          allowDept37CrossUse: 200,
          preferNoGroupTeachers: 250,
          preferNightShiftTeachers: 700,
          preferFirstRestDayTeachers: 500,
          preferSecondRestDayTeachers: 300,
        },
      },

      strict: {
        constraints: {
          // 硬约束全部启用
          ...Object.fromEntries(this.hardConstraints.map(hc => [hc, true])),
          // 软约束全部启用
          ...Object.fromEntries(Object.keys(this.softConstraints).map(sc => [sc, true])),
        },
        weights: Object.fromEntries(
          Object.entries(this.softConstraints).map(([constraint, range]) => [
            constraint,
            Math.round(range.max * 0.8),
          ])
        ),
      },

      flexible: {
        constraints: {
          // 硬约束全部启用
          ...Object.fromEntries(this.hardConstraints.map(hc => [hc, true])),
          // 只启用核心软约束
          backupExaminerDiffDept: true,
          avoidStudentDayShift: false,
          preferRecommendedDepts: true,
          allowDept37CrossUse: true,
          ensureConsecutiveDays: false,
          preferNoGroupTeachers: false,
          balanceWorkload: true,
          preferLaterDates: false,
        },
        weights: {
          backupExaminerDiffDept: 40,
          avoidStudentDayShift: 0,
          preferRecommendedDepts: 60,
          allowDept37CrossUse: 40,
          ensureConsecutiveDays: 0,
          preferNoGroupTeachers: 0,
          balanceWorkload: 50,
          preferLaterDates: 0,
        },
      },
    }
  }
}

// 导出默认实例
export const constraintValidationService = new ConstraintValidationService()
