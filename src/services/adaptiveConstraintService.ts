/**
 * 自适应约束服务 - 阶段二智能降级算法
 * 实现资源感知的权重调整和多层次降级策略
 */

export interface ResourceAnalysis {
  departmentRatios: Record<string, number>
  overallRatio: number
  bottleneckDepartments: string[]
  resourceTension: number
  recommendations: string[]
}

export interface AdaptiveConstraints {
  [key: string]: any
  resourceTension: number
  strategyUsed: string
  adjustments: string[]
}

/**
 * 降级策略配置
 */
const DEGRADATION_STRATEGIES = [
  {
    name: '标准配置',
    description: '资源充足时的理想配置',
    tension: 0.0,
    constraints: {
      preferRecommendedExaminer2Weight: { hardScore: 0, softScore: 80 },
      preferRecommendedBackupWeight: { hardScore: 0, softScore: 60 },
      fallbackToExaminer1DeptWeight: { hardScore: 0, softScore: 50 },
      consecutiveExamWeight: { hardScore: 0, softScore: 60 },
      priorityNightShiftWeight: { hardScore: 0, softScore: 100 },
      balanceWorkloadWeight: { hardScore: 0, softScore: 40 },
      avoidConsecutiveWorkWeight: { hardScore: 0, softScore: 50 },
      enableNoGroupMainExaminersWeight: { hardScore: 0, softScore: 20 },
      examiner2DiffDept: true,
      backupDiffDept: true,
      threeExaminers: true,
      preferTwoWorkdaysComplete: true, // 改为软约束，优先但不强制
    },
  },
  {
    name: '轻度降级',
    description: '轻微资源紧张时的优化配置',
    tension: 0.3,
    constraints: {
      preferRecommendedExaminer2Weight: { hardScore: 0, softScore: 60 },
      preferRecommendedBackupWeight: { hardScore: 0, softScore: 40 },
      fallbackToExaminer1DeptWeight: { hardScore: 0, softScore: 55 },
      consecutiveExamWeight: { hardScore: 0, softScore: 50 },
      priorityNightShiftWeight: { hardScore: 0, softScore: 90 },
      enableNoGroupMainExaminersWeight: { hardScore: 0, softScore: 25 },
      allowCrossDeptExaminer2Weight: { hardScore: 0, softScore: 35 },
      examiner2DiffDept: true,
      backupDiffDept: true,
      threeExaminers: true,
    },
  },
  {
    name: '中度降级',
    description: '中等资源紧张时的平衡配置',
    tension: 0.6,
    constraints: {
      preferRecommendedExaminer2Weight: { hardScore: 0, softScore: 40 },
      preferRecommendedBackupWeight: { hardScore: 0, softScore: 25 },
      fallbackToExaminer1DeptWeight: { hardScore: 0, softScore: 60 },
      consecutiveExamWeight: { hardScore: 0, softScore: 40 },
      priorityNightShiftWeight: { hardScore: 0, softScore: 80 },
      enableNoGroupMainExaminersWeight: { hardScore: 0, softScore: 30 },
      allowCrossDeptExaminer2Weight: { hardScore: 0, softScore: 40 },
      allowAnyCrossDeptBackupWeight: { hardScore: 0, softScore: 25 },
      examiner2DiffDept: true,
      backupDiffDept: false, // 🔓 放宽备份考官科室限制
      threeExaminers: true,
    },
  },
  {
    name: '高度降级',
    description: '严重资源紧张时的灵活配置',
    tension: 0.8,
    constraints: {
      preferRecommendedExaminer2Weight: { hardScore: 0, softScore: 20 },
      preferRecommendedBackupWeight: { hardScore: 0, softScore: 15 },
      fallbackToExaminer1DeptWeight: { hardScore: 0, softScore: 65 },
      consecutiveExamWeight: { hardScore: 0, softScore: 30 },
      priorityNightShiftWeight: { hardScore: 0, softScore: 70 },
      enableNoGroupMainExaminersWeight: { hardScore: 0, softScore: 35 },
      allowCrossDeptExaminer2Weight: { hardScore: 0, softScore: 50 },
      allowAnyCrossDeptBackupWeight: { hardScore: 0, softScore: 35 },
      enableFlexibleSchedulingWeight: { hardScore: 0, softScore: 40 },
      examiner2DiffDept: false, // 🔓 放宽考官2科室限制
      backupDiffDept: false,
      threeExaminers: true,
    },
  },
  {
    name: '极限降级',
    description: '极度资源紧张时的保底配置',
    tension: 0.95,
    constraints: {
      preferRecommendedExaminer2Weight: { hardScore: 0, softScore: 10 },
      preferRecommendedBackupWeight: { hardScore: 0, softScore: 5 },
      fallbackToExaminer1DeptWeight: { hardScore: 0, softScore: 70 },
      consecutiveExamWeight: { hardScore: 0, softScore: 20 },
      priorityNightShiftWeight: { hardScore: 0, softScore: 60 },
      enableNoGroupMainExaminersWeight: { hardScore: 0, softScore: 40 },
      allowCrossDeptExaminer2Weight: { hardScore: 0, softScore: 60 },
      allowAnyCrossDeptBackupWeight: { hardScore: 0, softScore: 50 },
      enableFlexibleSchedulingWeight: { hardScore: 0, softScore: 50 },
      allowPartialBackupWeight: { hardScore: 0, softScore: 40 },
      examiner2DiffDept: false,
      backupDiffDept: false,
      threeExaminers: false, // 🔓 允许缺失备份考官
    },
  },
]

export class AdaptiveConstraintService {
  /**
   * 分析资源可用性
   */
  analyzeResourceAvailability(students: any[], teachers: any[]): ResourceAnalysis {
    process.env.NODE_ENV === 'development' && console.log('🔍 开始资源可用性分析...')

    // 按科室统计学员和考官数量
    const studentsByDept = this.groupByDepartment(students)
    const teachersByDept = this.groupByDepartment(teachers)

    // 计算各科室的考官/学员比例
    const departmentRatios: Record<string, number> = {}
    const bottleneckDepartments: string[] = []

    Object.keys(studentsByDept).forEach(dept => {
      const studentCount = studentsByDept[dept] || 0
      const teacherCount = teachersByDept[dept] || 0

      if (studentCount > 0) {
        const ratio = teacherCount / studentCount
        departmentRatios[dept] = ratio

        // 识别瓶颈科室（比例 < 1.5）
        if (ratio < 1.5) {
          bottleneckDepartments.push(dept)
        }
      }
    })

    // 计算整体资源比例
    const totalStudents = students.length
    const totalTeachers = teachers.length
    const overallRatio = totalTeachers / totalStudents

    // 计算资源紧张度
    const resourceTension = this.calculateResourceTension(departmentRatios, overallRatio)

    // 生成建议
    const recommendations = this.generateResourceRecommendations(
      departmentRatios,
      bottleneckDepartments,
      resourceTension
    )

    process.env.NODE_ENV === 'development' && console.log('📊 资源分析结果:', {
      overallRatio: overallRatio.toFixed(2),
      resourceTension: resourceTension.toFixed(2),
      bottleneckDepartments,
      departmentRatios,
    })

    return {
      departmentRatios,
      overallRatio,
      bottleneckDepartments,
      resourceTension,
      recommendations,
    }
  }

  /**
   * 计算自适应权重
   */
  calculateAdaptiveWeights(
    students: any[],
    teachers: any[],
    baseConstraints: any
  ): AdaptiveConstraints {
    process.env.NODE_ENV === 'development' && console.log('⚙️ 开始计算自适应权重...')

    // 分析资源情况
    const resourceAnalysis = this.analyzeResourceAvailability(students, teachers)

    // 选择最适合的降级策略
    const strategy = this.selectOptimalStrategy(resourceAnalysis.resourceTension)

    // 应用策略调整权重
    const adaptiveConstraints = this.applyStrategy(baseConstraints, strategy, resourceAnalysis)

    process.env.NODE_ENV === 'development' && console.log(
      '🎯 选择策略:',
      strategy.name,
      '(紧张度:',
      resourceAnalysis.resourceTension.toFixed(2),
      ')'
    )

    return {
      ...adaptiveConstraints,
      resourceTension: resourceAnalysis.resourceTension,
      strategyUsed: strategy.name,
      adjustments: this.generateAdjustmentLog(baseConstraints, adaptiveConstraints),
    }
  }

  /**
   * 计算资源紧张度 (0-1，越接近1越紧张)
   */
  private calculateResourceTension(
    departmentRatios: Record<string, number>,
    overallRatio: number
  ): number {
    const ratios = Object.values(departmentRatios)
    if (ratios.length === 0) return 0.5

    // 计算最小比例（最紧张的科室）
    const minRatio = Math.min(...ratios)

    // 计算平均比例
    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length

    // 综合考虑最小比例、平均比例和整体比例
    let tension = 0

    // 基于最小比例的紧张度（权重40%）
    if (minRatio < 1.0) tension += 0.4 * (1.0 - minRatio)
    else if (minRatio < 1.2) tension += 0.4 * 0.8
    else if (minRatio < 1.5) tension += 0.4 * 0.6
    else if (minRatio < 2.0) tension += 0.4 * 0.3

    // 基于平均比例的紧张度（权重35%）
    if (avgRatio < 1.2) tension += 0.35 * 0.9
    else if (avgRatio < 1.5) tension += 0.35 * 0.7
    else if (avgRatio < 2.0) tension += 0.35 * 0.4
    else if (avgRatio < 2.5) tension += 0.35 * 0.2

    // 基于整体比例的紧张度（权重25%）
    if (overallRatio < 1.5) tension += 0.25 * 0.8
    else if (overallRatio < 2.0) tension += 0.25 * 0.5
    else if (overallRatio < 2.5) tension += 0.25 * 0.2

    return Math.min(1.0, Math.max(0.0, tension))
  }

  /**
   * 选择最优降级策略
   */
  private selectOptimalStrategy(resourceTension: number) {
    // 根据资源紧张度选择最合适的策略
    for (let i = DEGRADATION_STRATEGIES.length - 1; i >= 0; i--) {
      const strategy = DEGRADATION_STRATEGIES[i]
      if (resourceTension >= strategy.tension) {
        return strategy
      }
    }

    return DEGRADATION_STRATEGIES[0] // 默认返回标准配置
  }

  /**
   * 应用降级策略
   */
  private applyStrategy(
    baseConstraints: any,
    strategy: any,
    resourceAnalysis: ResourceAnalysis
  ): any {
    const adaptiveConstraints = { ...baseConstraints }

    // 应用策略中的约束配置
    Object.keys(strategy.constraints).forEach(key => {
      adaptiveConstraints[key] = strategy.constraints[key]
    })

    // 根据具体的瓶颈科室进一步微调
    if (resourceAnalysis.bottleneckDepartments.length > 0) {
      // 如果有瓶颈科室，进一步提升跨科室支援权重
      if (adaptiveConstraints.allowCrossDeptExaminer2Weight) {
        adaptiveConstraints.allowCrossDeptExaminer2Weight.softScore += 10
      }
      if (adaptiveConstraints.allowAnyCrossDeptBackupWeight) {
        adaptiveConstraints.allowAnyCrossDeptBackupWeight.softScore += 10
      }
    }

    return adaptiveConstraints
  }

  /**
   * 按科室分组
   */
  private groupByDepartment(items: any[]): Record<string, number> {
    const groups: Record<string, number> = {}

    items.forEach(item => {
      const dept = item.department || '未知'
      groups[dept] = (groups[dept] || 0) + 1
    })

    return groups
  }

  /**
   * 生成资源建议
   */
  private generateResourceRecommendations(
    departmentRatios: Record<string, number>,
    bottleneckDepartments: string[],
    resourceTension: number
  ): string[] {
    const recommendations: string[] = []

    if (resourceTension > 0.8) {
      recommendations.push('资源极度紧张，建议启用极限降级策略')
      recommendations.push('考虑放宽部分硬约束以确保排班可行性')
    } else if (resourceTension > 0.6) {
      recommendations.push('资源较为紧张，建议启用高度降级策略')
      recommendations.push('优先使用晚班考官和无班组考官')
    } else if (resourceTension > 0.3) {
      recommendations.push('资源轻微紧张，建议启用中度降级策略')
      recommendations.push('适当放宽推荐考官权重')
    }

    if (bottleneckDepartments.length > 0) {
      recommendations.push(`瓶颈科室: ${bottleneckDepartments.join(', ')}，建议启用跨科室支援`)
    }

    return recommendations
  }

  /**
   * 生成调整日志
   */
  private generateAdjustmentLog(baseConstraints: any, adaptiveConstraints: any): string[] {
    const adjustments: string[] = []

    // 比较权重变化
    const weightKeys = [
      'preferRecommendedExaminer2Weight',
      'preferRecommendedBackupWeight',
      'consecutiveExamWeight',
      'priorityNightShiftWeight',
      'balanceWorkloadWeight',
    ]

    weightKeys.forEach(key => {
      const baseWeight = baseConstraints[key]?.softScore || 0
      const adaptiveWeight = adaptiveConstraints[key]?.softScore || 0

      if (baseWeight !== adaptiveWeight) {
        const change = adaptiveWeight - baseWeight
        const direction = change > 0 ? '提升' : '降低'
        adjustments.push(
          `${key}: ${baseWeight} → ${adaptiveWeight} (${direction}${Math.abs(change)})`
        )
      }
    })

    return adjustments
  }

  /**
   * 预测成功率
   */
  predictSuccessRate(resourceAnalysis: ResourceAnalysis): number {
    const { resourceTension, overallRatio, bottleneckDepartments } = resourceAnalysis

    // 基础成功率
    let successRate = 0.6

    // 根据资源紧张度调整
    if (resourceTension < 0.3) {
      successRate = 0.95 // 资源充足
    } else if (resourceTension < 0.6) {
      successRate = 0.85 // 轻微紧张
    } else if (resourceTension < 0.8) {
      successRate = 0.75 // 中度紧张
    } else {
      successRate = 0.65 // 严重紧张
    }

    // 根据整体比例微调
    if (overallRatio > 2.5) successRate += 0.05
    else if (overallRatio < 1.2) successRate -= 0.1

    // 根据瓶颈科室数量微调
    successRate -= bottleneckDepartments.length * 0.02

    return Math.min(0.98, Math.max(0.3, successRate))
  }
}

// 导出单例实例
export const adaptiveConstraintService = new AdaptiveConstraintService()
