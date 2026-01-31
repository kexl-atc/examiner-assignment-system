/**
 * 统一约束条件数据模型
 * 基于 constraint-configuration-guide.md 文档设计
 * 整合前后端约束定义，确保数据一致性
 */

// 约束类型枚举
export enum ConstraintType {
  HARD = 'HARD',
  SOFT = 'SOFT',
}

// 约束类别枚举
export enum ConstraintCategory {
  TIME = 'TIME', // 时间相关约束
  RESOURCE = 'RESOURCE', // 资源分配约束
  WORKLOAD = 'WORKLOAD', // 工作负载约束
  QUALITY = 'QUALITY', // 质量优化约束
  PREFERENCE = 'PREFERENCE', // 偏好设置约束
}

// 约束优先级枚举
export enum ConstraintPriority {
  CRITICAL = 'CRITICAL', // 关键约束，必须满足
  HIGH = 'HIGH', // 高优先级
  MEDIUM = 'MEDIUM', // 中等优先级
  LOW = 'LOW', // 低优先级
}

// 约束状态枚举
export enum ConstraintStatus {
  ENABLED = 'ENABLED', // 启用
  DISABLED = 'DISABLED', // 禁用
  CONDITIONAL = 'CONDITIONAL', // 条件启用
}

// 基础约束定义接口
export interface BaseConstraint {
  id: string // 约束唯一标识符
  name: string // 约束名称
  description: string // 约束描述
  type: ConstraintType // 约束类型（硬约束/软约束）
  category: ConstraintCategory // 约束类别
  priority: ConstraintPriority // 约束优先级
  status: ConstraintStatus // 约束状态
  weight: number // 约束权重
  minWeight: number // 最小权重
  maxWeight: number // 最大权重
  defaultWeight: number // 默认权重
  isAdjustable: boolean // 是否可调整
  version: string // 约束版本
  lastModified: Date // 最后修改时间
  tags: string[] // 约束标签
}

// 硬约束定义
export interface HardConstraint extends BaseConstraint {
  type: ConstraintType.HARD
  violationPenalty: number // 违反惩罚值
  isMandatory: boolean // 是否强制执行
}

// 软约束定义
export interface SoftConstraint extends BaseConstraint {
  type: ConstraintType.SOFT
  satisfactionReward: number // 满足奖励值
  degradationCurve: 'linear' | 'exponential' | 'logarithmic' // 降级曲线
  dynamicWeightCalculation?: {
    // 动态权重计算配置
    enabled: boolean // 是否启用动态权重计算
    baseWeight: number // 基础权重
    priorityScoreOverlay: {
      // 优先级分数叠加配置
      enabled: boolean // 是否启用优先级分数叠加
      sourceConstraints: string[] // 源约束ID列表（如SC10、SC11、SC12）
      calculationMethod: 'sum' | 'max' | 'weighted_average' // 计算方法
    }
  }
}

// 约束条件配置
export interface ConstraintConfiguration {
  hardConstraints: Record<string, HardConstraint> | Map<string, HardConstraint>
  softConstraints: Record<string, SoftConstraint> | Map<string, SoftConstraint>
  globalSettings: {
    hardConstraintWeight: number
    softConstraintWeight: number
    optimizationTimeout: number
    maxIterations: number
    convergenceThreshold: number
    enableDynamicWeightAdjustment?: boolean
    maxSolverTime?: number
  }
  metadata: {
    configVersion: string
    createdAt: Date
    updatedAt: Date
    createdBy: string
    environment: 'development' | 'testing' | 'production'
  }
  weightMapping?: Record<string, ConstraintWeightMapping> | Map<string, ConstraintWeightMapping>
}

// 约束验证结果
export interface ConstraintValidationResult {
  isValid: boolean
  violations: ConstraintViolation[]
  warnings: ConstraintWarning[]
  score: {
    hardScore: number
    softScore: number
    totalScore: number
  }
  metadata: {
    validationTime: Date
    executionDuration: number
    validatedConstraints: number
  }
  validationTime?: number
  timestamp?: Date
}

// 约束违反详情
export interface ConstraintViolation {
  constraintId: string
  constraintName: string
  type: ConstraintType
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  message: string
  affectedEntities: string[]
  suggestedActions: string[]
  violationScore: number
  context: Record<string, any>
  violationType?: string
  details?: string
}

// 约束警告
export interface ConstraintWarning {
  constraintId: string
  constraintName: string
  message: string
  recommendation: string
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
}

// 约束权重映射配置
export interface ConstraintWeightMapping {
  frontendRange: {
    min: number
    max: number
  }
  backendRange: {
    min: number
    max: number
  }
  mappingFunction: 'linear' | 'exponential' | 'logarithmic'
  scalingFactor: number
}

// 约束预设配置
export interface ConstraintPreset {
  id: string
  name: string
  description: string
  constraints: Partial<ConstraintConfiguration>
  applicableScenarios: string[]
  recommendedFor: string[]
}

// 动态约束调整配置
export interface DynamicConstraintAdjustment {
  constraintId: string
  adjustmentRules: {
    condition: string
    action: 'increase' | 'decrease' | 'disable' | 'enable'
    value: number
    reason: string
  }[]
  adaptiveSettings: {
    enabled: boolean
    learningRate: number
    adaptationThreshold: number
  }
}

// 约束性能指标
export interface ConstraintPerformanceMetrics {
  constraintId?: string
  evaluationCount?: number
  averageEvaluationTime?: number
  violationFrequency?: number
  satisfactionRate?: number
  impactOnSolution?: number
  lastEvaluated?: Date
  activeConstraints?: number
  violationCount?: number
  averageViolationSeverity?: number
  lastValidationTime?: number
  validationFrequency?: number
  memoryUsage?: number
  cpuUsage?: number
}

// 约束冲突检测结果
export interface ConstraintConflictDetection {
  hasConflicts: boolean
  conflicts: {
    constraint1Id: string
    constraint2Id: string
    conflictType: 'MUTUAL_EXCLUSION' | 'WEIGHT_IMBALANCE' | 'LOGICAL_CONTRADICTION'
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    description: string
    resolution: string
  }[]
  recommendations: string[]
}

// 约束模板
export interface ConstraintTemplate {
  id: string
  name: string
  description: string
  category: ConstraintCategory
  type: ConstraintType
  parameters: {
    name: string
    type: 'number' | 'string' | 'boolean' | 'array'
    required: boolean
    defaultValue?: any
    validation?: string
  }[]
  implementation: {
    frontend: string
    backend: string
  }
}

// 约束历史记录
export interface ConstraintHistory {
  constraintId?: string
  action?: string
  timestamp?: Date
  configurationSnapshot?: string
  validationResult?: any
  metadata?: any
  userId?: string
  changes?: {
    timestamp: Date
    field: string
    oldValue: any
    newValue: any
    reason: string
    changedBy: string
  }[]
  performanceHistory?: ConstraintPerformanceMetrics[]
}

// 约束导入导出格式
export interface ConstraintExportFormat {
  version: string
  exportDate: Date
  configuration: ConstraintConfiguration
  presets: ConstraintPreset[]
  templates: ConstraintTemplate[]
  metadata: {
    source: string
    compatibility: string[]
    checksum: string
  }
  format?: 'JSON' | 'YAML' | 'XML'
  content?: string
  mimeType?: string
  filename?: string
  size?: number
  exportTime?: Date
  checksum?: string
}
