import { ConflictType, ConflictSeverity } from './preValidationService'

// 约束权重配置
export interface ConstraintWeight {
  id: string
  name: string
  type: 'hard' | 'soft'
  baseWeight: number
  currentWeight: number
  priority: number
  category: ConstraintCategory
  isAdjustable: boolean
  minWeight: number
  maxWeight: number
}

// 约束类别
export enum ConstraintCategory {
  LEGAL_COMPLIANCE = 'legal_compliance', // 法规遵从
  SAFETY_CRITICAL = 'safety_critical', // 安全关键
  OPERATIONAL = 'operational', // 运营相关
  PREFERENCE = 'preference', // 偏好设置
  OPTIMIZATION = 'optimization', // 优化目标
}

// 权重调整规则
export interface WeightAdjustmentRule {
  id: string
  name: string
  condition: string
  targetConstraints: string[]
  adjustmentType: 'multiply' | 'add' | 'set'
  adjustmentValue: number
  priority: number
  isActive: boolean
}

// 权重调整历史
export interface WeightAdjustmentHistory {
  timestamp: Date
  constraintId: string
  oldWeight: number
  newWeight: number
  reason: string
  triggeredBy: string
}

// 系统状态
export interface SystemState {
  conflictCount: number
  conflictsBySeverity: Record<ConflictSeverity, number>
  conflictsByType: Record<ConflictType, number>
  overallRiskScore: number
  schedulingSuccess: boolean
  lastOptimizationTime: Date
}

export class DynamicWeightAdjustmentService {
  private constraints: Map<string, ConstraintWeight> = new Map()
  private adjustmentRules: WeightAdjustmentRule[] = []
  private adjustmentHistory: WeightAdjustmentHistory[] = []
  private systemState: SystemState | null = null

  constructor() {
    this.initializeDefaultConstraints()
    this.initializeDefaultRules()
  }

  /**
   * 初始化默认约束权重
   */
  private initializeDefaultConstraints(): void {
    const defaultConstraints: ConstraintWeight[] = [
      // 硬约束 - 法规遵从类
      {
        id: 'HC1',
        name: '考官1必须分配',
        type: 'hard',
        baseWeight: 1000,
        currentWeight: 1000,
        priority: 1,
        category: ConstraintCategory.LEGAL_COMPLIANCE,
        isAdjustable: false,
        minWeight: 1000,
        maxWeight: 1000,
      },
      {
        id: 'HC2',
        name: '考官2必须分配',
        type: 'hard',
        baseWeight: 1000,
        currentWeight: 1000,
        priority: 1,
        category: ConstraintCategory.LEGAL_COMPLIANCE,
        isAdjustable: false,
        minWeight: 1000,
        maxWeight: 1000,
      },
      {
        id: 'HC3',
        name: '考官1必须与学员不同科室',
        type: 'hard',
        baseWeight: 1000,
        currentWeight: 1000,
        priority: 2,
        category: ConstraintCategory.LEGAL_COMPLIANCE,
        isAdjustable: true,
        minWeight: 800,
        maxWeight: 2000,
      },
      {
        id: 'HC4',
        name: '白班考官不能作为考官（轮值日约束）',
        type: 'hard',
        baseWeight: 5000,
        currentWeight: 5000,
        priority: 1,
        category: ConstraintCategory.SAFETY_CRITICAL,
        isAdjustable: true,
        minWeight: 3000,
        maxWeight: 10000,
      },
      // 硬约束 - 核心约束类
      {
        id: 'HC1',
        name: '工作日考试限制',
        type: 'hard',
        baseWeight: 1000,
        currentWeight: 1000,
        priority: 1,
        category: ConstraintCategory.LEGAL_COMPLIANCE,
        isAdjustable: false,
        minWeight: 1000,
        maxWeight: 1000,
      },
      {
        id: 'HC2',
        name: '考官科室规则',
        type: 'hard',
        baseWeight: 1000,
        currentWeight: 1000,
        priority: 1,
        category: ConstraintCategory.LEGAL_COMPLIANCE,
        isAdjustable: false,
        minWeight: 1000,
        maxWeight: 1000,
      },
      {
        id: 'HC3',
        name: '考官配备要求',
        type: 'hard',
        baseWeight: 1000,
        currentWeight: 1000,
        priority: 1,
        category: ConstraintCategory.LEGAL_COMPLIANCE,
        isAdjustable: false,
        minWeight: 1000,
        maxWeight: 1000,
      },
      {
        id: 'HC4',
        name: '白班禁止规则',
        type: 'hard',
        baseWeight: 1000,
        currentWeight: 1000,
        priority: 1,
        category: ConstraintCategory.LEGAL_COMPLIANCE,
        isAdjustable: false,
        minWeight: 1000,
        maxWeight: 1000,
      },

      // 软约束 - 运营相关类
      {
        id: 'SC4',
        name: '三七室互通',
        type: 'soft',
        baseWeight: 200,
        currentWeight: 200,
        priority: 3,
        category: ConstraintCategory.OPERATIONAL,
        isAdjustable: true,
        minWeight: 100,
        maxWeight: 300,
      },
      {
        id: 'SC6',
        name: '无班组优先',
        type: 'soft',
        baseWeight: 250,
        currentWeight: 250,
        priority: 2,
        category: ConstraintCategory.PREFERENCE,
        isAdjustable: true,
        minWeight: 150,
        maxWeight: 400,
      },
    ]

    for (const constraint of defaultConstraints) {
      this.constraints.set(constraint.id, constraint)
    }
  }

  /**
   * 初始化默认调整规则
   */
  private initializeDefaultRules(): void {
    this.adjustmentRules = [
      // 规则1：当轮值日冲突频发时，提升HC4权重
      {
        id: 'rule_duty_conflict_boost',
        name: '轮值日冲突权重提升',
        condition: 'duty_shift_conflicts > 3',
        targetConstraints: ['HC4'],
        adjustmentType: 'multiply',
        adjustmentValue: 1.5,
        priority: 1,
        isActive: true,
      },
      // 规则2：当科室冲突较多时，提升科室约束权重
      {
        id: 'rule_department_conflict_boost',
        name: '科室冲突权重提升',
        condition: 'department_conflicts > 2',
        targetConstraints: ['HC3', 'HC7'],
        adjustmentType: 'multiply',
        adjustmentValue: 1.3,
        priority: 2,
        isActive: true,
      },
      // 规则3：当工作负荷不均时，提升负荷均衡权重
      {
        id: 'rule_workload_balance_boost',
        name: '工作负荷均衡权重提升',
        condition: 'workload_conflicts > 1',
        targetConstraints: ['SC1'],
        adjustmentType: 'multiply',
        adjustmentValue: 2.0,
        priority: 3,
        isActive: true,
      },
      // 规则4：当连续工作冲突出现时，提升相关约束权重
      // 规则1：当工作负荷不均衡时，提升三七室互通权重
      {
        id: 'rule_workload_balance_boost',
        name: '工作负荷不均衡时三七室互通权重提升',
        condition: 'workload_imbalance > 0.3',
        targetConstraints: ['SC4'],
        adjustmentType: 'multiply',
        adjustmentValue: 1.5,
        priority: 3,
        isActive: true,
      },
      // 规则2：当关键约束被违反时，大幅提升其权重
      {
        id: 'rule_critical_constraint_emergency_boost',
        name: '关键约束紧急权重提升',
        condition: 'critical_conflicts > 0',
        targetConstraints: ['HC1', 'HC2', 'HC3', 'HC4'],
        adjustmentType: 'set',
        adjustmentValue: 10000,
        priority: 1,
        isActive: true,
      },
    ]
  }

  /**
   * 根据系统状态动态调整权重
   */
  async adjustWeights(systemState: SystemState): Promise<Map<string, number>> {
    this.systemState = systemState
    const adjustments = new Map<string, number>()

    // 重置所有可调整约束到基础权重
    this.resetAdjustableWeights()

    // 应用调整规则
    for (const rule of this.adjustmentRules.filter(r => r.isActive)) {
      if (this.evaluateRuleCondition(rule, systemState)) {
        this.applyAdjustmentRule(rule, adjustments)
      }
    }

    // 确保关键约束优先级
    this.ensureCriticalConstraintPriority(adjustments)

    // 记录调整历史
    this.recordAdjustments(adjustments)

    return adjustments
  }

  /**
   * 重置可调整约束权重
   */
  private resetAdjustableWeights(): void {
    for (const [id, constraint] of this.constraints) {
      if (constraint.isAdjustable) {
        constraint.currentWeight = constraint.baseWeight
      }
    }
  }

  /**
   * 评估规则条件
   */
  private evaluateRuleCondition(rule: WeightAdjustmentRule, systemState: SystemState): boolean {
    const condition = rule.condition

    try {
      // 解析条件表达式
      if (condition.includes('duty_shift_conflicts')) {
        const dutyShiftConflicts = systemState.conflictsByType[ConflictType.DUTY_SHIFT] || 0
        return this.evaluateNumericCondition(condition, 'duty_shift_conflicts', dutyShiftConflicts)
      }

      if (condition.includes('department_conflicts')) {
        const departmentConflicts = systemState.conflictsByType[ConflictType.DEPARTMENT] || 0
        return this.evaluateNumericCondition(condition, 'department_conflicts', departmentConflicts)
      }

      if (condition.includes('workload_conflicts')) {
        const workloadConflicts = systemState.conflictsByType[ConflictType.WORKLOAD] || 0
        return this.evaluateNumericCondition(condition, 'workload_conflicts', workloadConflicts)
      }

      if (condition.includes('continuous_work_conflicts')) {
        const continuousWorkConflicts =
          systemState.conflictsByType[ConflictType.CONTINUOUS_WORK] || 0
        return this.evaluateNumericCondition(
          condition,
          'continuous_work_conflicts',
          continuousWorkConflicts
        )
      }

      if (condition.includes('overall_risk_score')) {
        return this.evaluateNumericCondition(
          condition,
          'overall_risk_score',
          systemState.overallRiskScore
        )
      }

      if (condition.includes('critical_conflicts')) {
        const criticalConflicts = systemState.conflictsBySeverity[ConflictSeverity.CRITICAL] || 0
        return this.evaluateNumericCondition(condition, 'critical_conflicts', criticalConflicts)
      }

      return false
    } catch (error) {
      console.warn(`Failed to evaluate rule condition: ${condition}`, error)
      return false
    }
  }

  /**
   * 评估数值条件
   */
  private evaluateNumericCondition(condition: string, variable: string, value: number): boolean {
    const regex = new RegExp(`${variable}\s*([><=]+)\s*(\d+)`)
    const match = condition.match(regex)

    if (!match) return false

    const operator = match[1]
    const threshold = parseInt(match[2])

    switch (operator) {
      case '>':
        return value > threshold
      case '>=':
        return value >= threshold
      case '<':
        return value < threshold
      case '<=':
        return value <= threshold
      case '=':
      case '==':
        return value === threshold
      default:
        return false
    }
  }

  /**
   * 应用调整规则
   */
  private applyAdjustmentRule(rule: WeightAdjustmentRule, adjustments: Map<string, number>): void {
    for (const constraintId of rule.targetConstraints) {
      const constraint = this.constraints.get(constraintId)
      if (!constraint || !constraint.isAdjustable) continue

      let newWeight = constraint.currentWeight

      switch (rule.adjustmentType) {
        case 'multiply':
          newWeight = constraint.currentWeight * rule.adjustmentValue
          break
        case 'add':
          newWeight = constraint.currentWeight + rule.adjustmentValue
          break
        case 'set':
          newWeight = rule.adjustmentValue
          break
      }

      // 确保权重在允许范围内
      newWeight = Math.max(constraint.minWeight, Math.min(constraint.maxWeight, newWeight))

      if (newWeight !== constraint.currentWeight) {
        constraint.currentWeight = newWeight
        adjustments.set(constraintId, newWeight)
      }
    }
  }

  /**
   * 确保关键约束优先级
   */
  private ensureCriticalConstraintPriority(adjustments: Map<string, number>): void {
    const criticalConstraints = Array.from(this.constraints.values())
      .filter(c => c.category === ConstraintCategory.SAFETY_CRITICAL || c.priority === 1)
      .sort((a, b) => a.priority - b.priority)

    // 确保关键约束权重始终高于非关键约束
    const maxNonCriticalWeight = Math.max(
      ...Array.from(this.constraints.values())
        .filter(c => c.category !== ConstraintCategory.SAFETY_CRITICAL && c.priority > 1)
        .map(c => c.currentWeight)
    )

    for (const constraint of criticalConstraints) {
      if (constraint.isAdjustable && constraint.currentWeight <= maxNonCriticalWeight) {
        const newWeight = Math.min(constraint.maxWeight, maxNonCriticalWeight * 2)
        constraint.currentWeight = newWeight
        adjustments.set(constraint.id, newWeight)
      }
    }
  }

  /**
   * 记录调整历史
   */
  private recordAdjustments(adjustments: Map<string, number>): void {
    const timestamp = new Date()

    for (const [constraintId, newWeight] of adjustments) {
      const constraint = this.constraints.get(constraintId)
      if (!constraint) continue

      this.adjustmentHistory.push({
        timestamp,
        constraintId,
        oldWeight: constraint.baseWeight,
        newWeight,
        reason: '动态权重调整',
        triggeredBy: 'system',
      })
    }

    // 保持历史记录在合理范围内
    if (this.adjustmentHistory.length > 1000) {
      this.adjustmentHistory = this.adjustmentHistory.slice(-500)
    }
  }

  /**
   * 获取当前约束权重配置
   */
  getCurrentWeights(): Map<string, ConstraintWeight> {
    return new Map(this.constraints)
  }

  /**
   * 获取权重调整历史
   */
  getAdjustmentHistory(limit: number = 50): WeightAdjustmentHistory[] {
    return this.adjustmentHistory.slice(-limit)
  }

  /**
   * 添加自定义调整规则
   */
  addAdjustmentRule(rule: WeightAdjustmentRule): void {
    this.adjustmentRules.push(rule)
    this.adjustmentRules.sort((a, b) => a.priority - b.priority)
  }

  /**
   * 移除调整规则
   */
  removeAdjustmentRule(ruleId: string): boolean {
    const index = this.adjustmentRules.findIndex(r => r.id === ruleId)
    if (index >= 0) {
      this.adjustmentRules.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * 更新约束基础权重
   */
  updateConstraintBaseWeight(constraintId: string, newBaseWeight: number): boolean {
    const constraint = this.constraints.get(constraintId)
    if (!constraint || !constraint.isAdjustable) return false

    if (newBaseWeight >= constraint.minWeight && newBaseWeight <= constraint.maxWeight) {
      constraint.baseWeight = newBaseWeight
      constraint.currentWeight = newBaseWeight
      return true
    }
    return false
  }

  /**
   * 获取权重调整建议
   */
  getWeightAdjustmentRecommendations(systemState: SystemState): string[] {
    const recommendations: string[] = []

    if (systemState.conflictsBySeverity[ConflictSeverity.CRITICAL] > 0) {
      recommendations.push('检测到严重冲突，建议立即提升相关硬约束权重')
    }

    if (systemState.conflictsByType[ConflictType.DUTY_SHIFT] > 2) {
      recommendations.push('轮值日冲突频发，建议提升HC4约束权重至最高级别')
    }

    if (systemState.overallRiskScore > 70) {
      recommendations.push('整体风险评分较高，建议降低优化类软约束权重，专注解决核心冲突')
    }

    if (!systemState.schedulingSuccess) {
      recommendations.push('排班失败，建议临时禁用部分软约束以确保基本排班成功')
    }

    return recommendations
  }

  /**
   * 导出权重配置
   */
  exportWeightConfiguration(): any {
    return {
      constraints: Array.from(this.constraints.values()),
      rules: this.adjustmentRules,
      history: this.adjustmentHistory.slice(-100),
      exportTime: new Date().toISOString(),
    }
  }

  /**
   * 导入权重配置
   */
  importWeightConfiguration(config: any): boolean {
    try {
      if (config.constraints) {
        this.constraints.clear()
        for (const constraint of config.constraints) {
          this.constraints.set(constraint.id, constraint)
        }
      }

      if (config.rules) {
        this.adjustmentRules = config.rules
      }

      return true
    } catch (error) {
      console.error('Failed to import weight configuration:', error)
      return false
    }
  }
}
