/**
 * 考官排班系统专用约束定义
 * 基于 constraint-configuration-guide.md 文档中的具体约束条件
 */

import {
  BaseConstraint,
  HardConstraint,
  SoftConstraint,
  ConstraintType,
  ConstraintCategory,
  ConstraintPriority,
  ConstraintStatus,
} from './unified-constraint'

// 硬约束标识符枚举 - 与后端OptimizedExamScheduleConstraintProvider.java对齐
export enum HardConstraintId {
  HC1_WORKDAYS_ONLY_EXAM = 'HC1_WORKDAYS_ONLY_EXAM', // 工作日考试限制
  HC2_EXAMINER_DEPARTMENT_RULES = 'HC2_EXAMINER_DEPARTMENT_RULES', // 考官科室规则
  HC3_TWO_MAIN_EXAMINERS_REQUIRED = 'HC3_TWO_MAIN_EXAMINERS_REQUIRED', // 考官配备要求
  HC4_NO_DAY_SHIFT_EXAMINER = 'HC4_NO_DAY_SHIFT_EXAMINER', // 每名考官每天只能监考一名考生
  HC5_NO_STUDENT_DAY_SHIFT_EXAM = 'HC5_NO_STUDENT_DAY_SHIFT_EXAM', // 考生执勤白班不能安排考试
  HC6_CONSECUTIVE_DAYS_REQUIRED = 'HC6_CONSECUTIVE_DAYS_REQUIRED', // 连续两天考试要求
  HC7_TWO_DIFFERENT_DEPT_EXAMINERS = 'HC7_TWO_DIFFERENT_DEPT_EXAMINERS', // 不同科室考官
  HC8_BACKUP_EXAMINER_DIFFERENT_PERSON = 'HC8_BACKUP_EXAMINER_DIFFERENT_PERSON', // 备份考官不同人
}

// 软约束ID枚举 - 与后端OptimizedExamScheduleConstraintProvider.java权重对齐
export enum SoftConstraintId {
  SC1_NIGHT_SHIFT_TEACHER_PRIORITY = 'SC1', // SC1: 晚班考官优先级最高权重 (150)
  SC2_EXAMINER2_PROFESSIONAL_MATCH = 'SC2', // SC2: 考官2专业匹配 (100)
  SC3_FIRST_REST_DAY_TEACHER_PRIORITY = 'SC3', // SC3: 休息第一天考官优先级次高权重 (120)
  SC4_BACKUP_EXAMINER_PROFESSIONAL_MATCH = 'SC4', // SC4: 备份考官专业匹配 (80)
  SC5_SECOND_REST_DAY_TEACHER_PRIORITY = 'SC5', // SC5: 休息第二天考官优先级中等权重 (40)
  SC6_EXAMINER2_ALTERNATIVE_OPTION = 'SC6', // SC6: 考官2备选方案 (50)
  SC7_ADMIN_TEACHER_PRIORITY = 'SC7', // SC7: 行政班考官优先级最低权重 (60)
  SC8_BACKUP_EXAMINER_ALTERNATIVE_OPTION = 'SC8', // SC8: 备份考官备选方案 (30)
  SC9_DEPT_37_CROSS_USE = 'SC9', // SC9: 区域协作鼓励 (20)
  SC10_WORKLOAD_BALANCE = 'SC10', // SC10: 工作量均衡 (400)
  SC11_DATE_DISTRIBUTION_BALANCE = 'SC11', // SC11: 日期分配均衡 (50)
}

// 硬约束具体定义
export const HARD_CONSTRAINTS: Record<HardConstraintId, HardConstraint> = {
  [HardConstraintId.HC1_WORKDAYS_ONLY_EXAM]: {
    id: HardConstraintId.HC1_WORKDAYS_ONLY_EXAM,
    name: '法定节假日不安排考试（周六周日可以考试，但行政班考官周末不参加考试）',
    description:
      '法定节假日（如春节、国庆节等）不能安排考试，周六、周日可以安排考试，但行政班考官在周末不参加考试安排，夜班考官可以在周末参加考试',
    type: ConstraintType.HARD,
    category: ConstraintCategory.TIME,
    priority: ConstraintPriority.CRITICAL,
    status: ConstraintStatus.ENABLED,
    weight: 1000000,
    minWeight: 1000000,
    maxWeight: 1000000,
    defaultWeight: 1000000,
    isAdjustable: false,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['时间', '法定节假日', '行政班限制'],
    violationPenalty: 1000000,
    isMandatory: true,
  },

  [HardConstraintId.HC2_EXAMINER_DEPARTMENT_RULES]: {
    id: HardConstraintId.HC2_EXAMINER_DEPARTMENT_RULES,
    name: '考官1与学员同科室',
    description: '考官1必须与考生属于同一科室，这是考试公平性和专业性的基本要求',
    type: ConstraintType.HARD,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.CRITICAL,
    status: ConstraintStatus.ENABLED,
    weight: 1000000,
    minWeight: 1000000,
    maxWeight: 1000000,
    defaultWeight: 1000000,
    isAdjustable: false,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['科室', '考官分配', '专业匹配'],
    violationPenalty: 1000000,
    isMandatory: true,
  },

  [HardConstraintId.HC3_TWO_MAIN_EXAMINERS_REQUIRED]: {
    id: HardConstraintId.HC3_TWO_MAIN_EXAMINERS_REQUIRED,
    name: '考官执勤白班不能安排考试（行政班考官除外）',
    description:
      '考官在执勤白班期间不能安排考试任务，但行政班考官不受此限制。检查考官1、考官2、备份考官的工作安排，确保考官有足够的时间和精力进行考试监督',
    type: ConstraintType.HARD,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.HIGH,
    status: ConstraintStatus.ENABLED,
    weight: 1000000,
    minWeight: 1000000,
    maxWeight: 1000000,
    defaultWeight: 1000000,
    isAdjustable: false,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['执勤冲突', '白班限制', '行政班例外'],
    violationPenalty: 1000000,
    isMandatory: true,
  },

  [HardConstraintId.HC4_NO_DAY_SHIFT_EXAMINER]: {
    id: HardConstraintId.HC4_NO_DAY_SHIFT_EXAMINER,
    name: '每名考官每天只能监考一名考生',
    description: '同一考官在同一天只能参与一场考试，防止考官工作负荷过重，确保考试质量和公平性',
    type: ConstraintType.HARD,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.HIGH,
    status: ConstraintStatus.ENABLED,
    weight: 1000000,
    minWeight: 1000000,
    maxWeight: 1000000,
    defaultWeight: 1000000,
    isAdjustable: false,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['资源分配', '考官唯一性', '工作负荷'],
    violationPenalty: 1000000,
    isMandatory: true,
  },

  [HardConstraintId.HC5_NO_STUDENT_DAY_SHIFT_EXAM]: {
    id: HardConstraintId.HC5_NO_STUDENT_DAY_SHIFT_EXAM,
    name: '考生执勤白班不能安排考试（已合并到HC6）',
    description:
      '考生在执勤白班期间不能安排考试，考生需要专注于白班工作，无法参加考试，确保考生有充分的准备时间（注：此约束已合并到HC6）',
    type: ConstraintType.HARD,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.HIGH,
    status: ConstraintStatus.ENABLED,
    weight: 1000000,
    minWeight: 1000000,
    maxWeight: 1000000,
    defaultWeight: 1000000,
    isAdjustable: false,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['执勤冲突', '白班限制', '学员约束'],
    violationPenalty: 1000000,
    isMandatory: true,
  },

  [HardConstraintId.HC6_CONSECUTIVE_DAYS_REQUIRED]: {
    id: HardConstraintId.HC6_CONSECUTIVE_DAYS_REQUIRED,
    name: '考生需要在连续两天完成考试',
    description:
      '考生的考试必须安排在连续的两天内完成。两种有效情况：1.除去执勤日的两个连续休息日 2.第一天执勤晚班、第二天休息日',
    type: ConstraintType.HARD,
    category: ConstraintCategory.TIME,
    priority: ConstraintPriority.HIGH,
    status: ConstraintStatus.ENABLED,
    weight: 1000000,
    minWeight: 1000000,
    maxWeight: 1000000,
    defaultWeight: 1000000,
    isAdjustable: false,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['连续性', '考试周期', '考生要求'],
    violationPenalty: 1000000,
    isMandatory: true,
  },

  [HardConstraintId.HC7_TWO_DIFFERENT_DEPT_EXAMINERS]: {
    id: HardConstraintId.HC7_TWO_DIFFERENT_DEPT_EXAMINERS,
    name: '必须有考官1和考官2两名考官，且不能同科室',
    description:
      '每场考试必须配备两名不同科室的考官，确保考试的公正性和客观性，不同科室的考官提供多角度评估，防止科室内部偏见影响考试结果',
    type: ConstraintType.HARD,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.CRITICAL,
    status: ConstraintStatus.ENABLED,
    weight: 1000000,
    minWeight: 1000000,
    maxWeight: 1000000,
    defaultWeight: 1000000,
    isAdjustable: false,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['考官配备', '科室要求', '公正性'],
    violationPenalty: 1000000,
    isMandatory: true,
  },

  [HardConstraintId.HC8_BACKUP_EXAMINER_DIFFERENT_PERSON]: {
    id: HardConstraintId.HC8_BACKUP_EXAMINER_DIFFERENT_PERSON,
    name: '备份考官不能与考官1和考官2是同一人',
    description:
      '备份考官必须是独立的第三人，确保在主考官无法履职时有替代方案，维护考试的连续性和稳定性，避免人员冲突和角色混淆',
    type: ConstraintType.HARD,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.MEDIUM,
    status: ConstraintStatus.ENABLED,
    weight: 1000000,
    minWeight: 1000000,
    maxWeight: 1000000,
    defaultWeight: 1000000,
    isAdjustable: false,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['备份考官', '人员独立性', '角色分离'],
    violationPenalty: 1000000,
    isMandatory: true,
  },
}

// 软约束具体定义 - 按照文档权重设置原则重新组织
export const SOFT_CONSTRAINTS: Record<SoftConstraintId, SoftConstraint> = {
  [SoftConstraintId.SC1_NIGHT_SHIFT_TEACHER_PRIORITY]: {
    id: SoftConstraintId.SC1_NIGHT_SHIFT_TEACHER_PRIORITY,
    name: 'SC1: 晚班考官优先级最高权重',
    description:
      '优先安排执勤晚班的考官参与考试，权重等级仅次于科室推荐，优先选择晚班考官作为考官2和备份考官',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.HIGH,
    status: ConstraintStatus.ENABLED,
    weight: 150,
    minWeight: 100,
    maxWeight: 200,
    defaultWeight: 150,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['执勤晚班', '考官优先', '资源分配'],
    satisfactionReward: 150,
    degradationCurve: 'linear',
  },

  [SoftConstraintId.SC2_EXAMINER2_PROFESSIONAL_MATCH]: {
    id: SoftConstraintId.SC2_EXAMINER2_PROFESSIONAL_MATCH,
    name: 'SC2: 考官2专业匹配',
    description: '考官2优先来自推荐科室，提高专业匹配度和考试质量',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.QUALITY,
    priority: ConstraintPriority.HIGH,
    status: ConstraintStatus.ENABLED,
    weight: 100,
    minWeight: 80,
    maxWeight: 150,
    defaultWeight: 100,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['专业匹配', '考官2', '推荐科室'],
    satisfactionReward: 100,
    degradationCurve: 'linear',
  },

  [SoftConstraintId.SC3_FIRST_REST_DAY_TEACHER_PRIORITY]: {
    id: SoftConstraintId.SC3_FIRST_REST_DAY_TEACHER_PRIORITY,
    name: 'SC3: 休息第一天考官优先级次高权重',
    description: '在晚班考官之后，优先选择休息第一天的考官参与考试',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.HIGH,
    status: ConstraintStatus.ENABLED,
    weight: 120,
    minWeight: 80,
    maxWeight: 150,
    defaultWeight: 120,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['休息第一天', '考官优先', '资源分配'],
    satisfactionReward: 120,
    degradationCurve: 'linear',
  },

  [SoftConstraintId.SC4_BACKUP_EXAMINER_PROFESSIONAL_MATCH]: {
    id: SoftConstraintId.SC4_BACKUP_EXAMINER_PROFESSIONAL_MATCH,
    name: 'SC4: 备份考官专业匹配',
    description: '备份考官优先来自推荐科室，与SC1-SC3优先级分数可叠加',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.QUALITY,
    priority: ConstraintPriority.MEDIUM,
    status: ConstraintStatus.ENABLED,
    weight: 80,
    minWeight: 60,
    maxWeight: 120,
    defaultWeight: 80,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['备份考官', '专业匹配', '推荐科室'],
    satisfactionReward: 80,
    degradationCurve: 'linear',
  },

  [SoftConstraintId.SC5_SECOND_REST_DAY_TEACHER_PRIORITY]: {
    id: SoftConstraintId.SC5_SECOND_REST_DAY_TEACHER_PRIORITY,
    name: 'SC5: 休息第二天考官优先级中等权重',
    description: '在休息第一天考官之后，优先选择休息第二天的考官参与考试',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.MEDIUM,
    status: ConstraintStatus.ENABLED,
    weight: 40,
    minWeight: 20,
    maxWeight: 60,
    defaultWeight: 40,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['休息第二天', '考官优先', '资源分配'],
    satisfactionReward: 40,
    degradationCurve: 'linear',
  },

  [SoftConstraintId.SC6_EXAMINER2_ALTERNATIVE_OPTION]: {
    id: SoftConstraintId.SC6_EXAMINER2_ALTERNATIVE_OPTION,
    name: 'SC6: 考官2备选方案',
    description: '当推荐科室考官2不可用时的备选方案，与SC1-SC5优先级分数可叠加',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.QUALITY,
    priority: ConstraintPriority.MEDIUM,
    status: ConstraintStatus.ENABLED,
    weight: 50,
    minWeight: 30,
    maxWeight: 70,
    defaultWeight: 50,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['备选方案', '考官2', '灵活性'],
    satisfactionReward: 50,
    degradationCurve: 'linear',
  },

  [SoftConstraintId.SC7_ADMIN_TEACHER_PRIORITY]: {
    id: SoftConstraintId.SC7_ADMIN_TEACHER_PRIORITY,
    name: 'SC7: 行政班考官优先级最低权重',
    description: '在所有班组考官之后，最后考虑行政班考官参与考试',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.LOW,
    status: ConstraintStatus.ENABLED,
    weight: 60,
    minWeight: 40,
    maxWeight: 80,
    defaultWeight: 60,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['行政班', '考官优先', '资源分配'],
    satisfactionReward: 60,
    degradationCurve: 'linear',
  },

  [SoftConstraintId.SC8_BACKUP_EXAMINER_ALTERNATIVE_OPTION]: {
    id: SoftConstraintId.SC8_BACKUP_EXAMINER_ALTERNATIVE_OPTION,
    name: 'SC8: 备份考官备选方案',
    description: '当推荐科室备份考官不可用时的备选方案，与SC1-SC7优先级分数可叠加',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.LOW,
    status: ConstraintStatus.ENABLED,
    weight: 30,
    minWeight: 20,
    maxWeight: 50,
    defaultWeight: 30,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['备选方案', '备份考官', '灵活性'],
    satisfactionReward: 30,
    degradationCurve: 'linear',
  },

  [SoftConstraintId.SC9_DEPT_37_CROSS_USE]: {
    id: SoftConstraintId.SC9_DEPT_37_CROSS_USE,
    name: 'SC9: 区域协作鼓励',
    description: '允许区域三室和区域七室的考官互相使用，提高资源利用率和协作效率',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.RESOURCE,
    priority: ConstraintPriority.LOW,
    status: ConstraintStatus.ENABLED,
    weight: 20,
    minWeight: 10,
    maxWeight: 40,
    defaultWeight: 20,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['跨科室', '资源共享', '协作'],
    satisfactionReward: 20,
    degradationCurve: 'linear',
  },

  [SoftConstraintId.SC10_WORKLOAD_BALANCE]: {
    id: SoftConstraintId.SC10_WORKLOAD_BALANCE,
    name: 'SC10: 工作量均衡',
    description: '尽量平衡各考官的工作负载，避免个别考官过度繁忙或空闲',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.WORKLOAD,
    priority: ConstraintPriority.LOW,
    status: ConstraintStatus.ENABLED,
    weight: 400,
    minWeight: 200,
    maxWeight: 600,
    defaultWeight: 400,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['负载均衡', '公平分配', '效率优化'],
    satisfactionReward: 400,
    degradationCurve: 'logarithmic',
  },

  [SoftConstraintId.SC11_DATE_DISTRIBUTION_BALANCE]: {
    id: SoftConstraintId.SC11_DATE_DISTRIBUTION_BALANCE,
    name: 'SC11: 日期分配均衡',
    description: '尽量将考试时间均匀分配，避免集中在某些日期，促进日期分配的平衡性',
    type: ConstraintType.SOFT,
    category: ConstraintCategory.TIME,
    priority: ConstraintPriority.LOW,
    status: ConstraintStatus.ENABLED,
    weight: 50,
    minWeight: 30,
    maxWeight: 80,
    defaultWeight: 50,
    isAdjustable: true,
    version: '1.0.0',
    lastModified: new Date(),
    tags: ['时间分配', '均衡性', '优化'],
    satisfactionReward: 50,
    degradationCurve: 'exponential',
  },
}

// 约束权重映射配置 - 与后端OptimizedExamScheduleConstraintProvider.java同步
export const CONSTRAINT_WEIGHT_MAPPING = {
  // 硬约束权重映射：后端所有硬约束统一使用1000000（绝对优先级）
  hardConstraints: {
    frontendRange: { min: 1000000, max: 1000000 },
    backendRange: { min: 1000000, max: 1000000 }, // 所有硬约束统一权重
    mappingFunction: 'linear' as const,
    scalingFactor: 1.0,
  },
  // 软约束权重映射：与后端实际配置对齐
  softConstraints: {
    frontendRange: { min: 20, max: 400 },
    backendRange: { min: 20, max: 400 }, // 与后端SC1-SC11权重范围一致
    mappingFunction: 'linear' as const,
    scalingFactor: 1.0,
  },
}

// 约束预设配置
export const CONSTRAINT_PRESETS = {
  STRICT_MODE: {
    id: 'STRICT_MODE',
    name: '严格模式',
    description: '所有约束都设置为最高权重，确保最严格的调度规则',
    hardConstraints: Object.keys(HARD_CONSTRAINTS).reduce(
      (acc, key) => {
        acc[key] = {
          ...HARD_CONSTRAINTS[key as HardConstraintId],
          weight: HARD_CONSTRAINTS[key as HardConstraintId].maxWeight,
        }
        return acc
      },
      {} as Record<string, HardConstraint>
    ),
    softConstraints: Object.keys(SOFT_CONSTRAINTS).reduce(
      (acc, key) => {
        acc[key] = {
          ...SOFT_CONSTRAINTS[key as SoftConstraintId],
          weight: SOFT_CONSTRAINTS[key as SoftConstraintId].maxWeight,
        }
        return acc
      },
      {} as Record<string, SoftConstraint>
    ),
  },

  BALANCED_MODE: {
    id: 'BALANCED_MODE',
    name: '平衡模式',
    description: '在严格性和灵活性之间取得平衡的约束配置',
    hardConstraints: Object.keys(HARD_CONSTRAINTS).reduce(
      (acc, key) => {
        acc[key] = {
          ...HARD_CONSTRAINTS[key as HardConstraintId],
          weight: HARD_CONSTRAINTS[key as HardConstraintId].defaultWeight,
        }
        return acc
      },
      {} as Record<string, HardConstraint>
    ),
    softConstraints: Object.keys(SOFT_CONSTRAINTS).reduce(
      (acc, key) => {
        acc[key] = {
          ...SOFT_CONSTRAINTS[key as SoftConstraintId],
          weight: SOFT_CONSTRAINTS[key as SoftConstraintId].defaultWeight,
        }
        return acc
      },
      {} as Record<string, SoftConstraint>
    ),
  },

  FLEXIBLE_MODE: {
    id: 'FLEXIBLE_MODE',
    name: '宽松模式',
    description: '降低约束权重，提供更大的调度灵活性',
    hardConstraints: Object.keys(HARD_CONSTRAINTS).reduce(
      (acc, key) => {
        const constraint = HARD_CONSTRAINTS[key as HardConstraintId]
        acc[key] = {
          ...constraint,
          weight: constraint.isAdjustable ? constraint.minWeight : constraint.weight,
        }
        return acc
      },
      {} as Record<string, HardConstraint>
    ),
    softConstraints: Object.keys(SOFT_CONSTRAINTS).reduce(
      (acc, key) => {
        acc[key] = {
          ...SOFT_CONSTRAINTS[key as SoftConstraintId],
          weight: SOFT_CONSTRAINTS[key as SoftConstraintId].minWeight,
        }
        return acc
      },
      {} as Record<string, SoftConstraint>
    ),
  },
}

// 约束验证规则
export const CONSTRAINT_VALIDATION_RULES = {
  // 权重范围验证
  validateWeightRange: (constraintId: string, weight: number): boolean => {
    const hardConstraint = HARD_CONSTRAINTS[constraintId as HardConstraintId]
    const softConstraint = SOFT_CONSTRAINTS[constraintId as SoftConstraintId]

    if (hardConstraint) {
      return weight >= hardConstraint.minWeight && weight <= hardConstraint.maxWeight
    }
    if (softConstraint) {
      return weight >= softConstraint.minWeight && weight <= softConstraint.maxWeight
    }
    return false
  },

  // 约束冲突检测
  detectConflicts: (constraints: Record<string, BaseConstraint>): string[] => {
    const conflicts: string[] = []

    // 检查互斥约束
    const enabledConstraints = Object.values(constraints).filter(
      c => c.status === ConstraintStatus.ENABLED
    )

    // 示例：检查时间相关约束的冲突
    const timeConstraints = enabledConstraints.filter(c => c.category === ConstraintCategory.TIME)
    if (timeConstraints.length > 0) {
      // 具体的冲突检测逻辑
    }

    return conflicts
  },
}
