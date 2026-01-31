/**
 * 冲突信息接口
 */
export interface ConflictInfo {
  /** 冲突唯一标识 */
  id: string
  /** 冲突类型 */
  type:
    | 'hard_constraint'
    | 'soft_constraint'
    | 'resource_conflict'
    | 'scheduling_conflict'
    | 'examiner_time_conflict'
  /** 严重程度 */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  /** 冲突描述 */
  description: string
  /** 受影响的实体 */
  affectedEntities: string[]
  /** 建议解决方案 */
  suggestedSolutions: string[]
  /** 是否可自动解决 */
  autoResolvable: boolean
  /** 冲突发生时间 */
  timestamp?: string
  /** 相关数据 */
  metadata?: Record<string, any>
}

/**
 * 错误反馈状态接口
 */
export interface ErrorFeedbackState {
  /** 是否显示错误反馈模态框 */
  isVisible: boolean
  /** 错误类型 */
  errorType: 'constraint_violation' | 'resource_shortage' | 'system_error' | 'validation_error'
  /** 错误消息 */
  errorMessage: string
  /** 冲突列表 */
  conflicts: ConflictInfo[]
  /** 是否正在分析 */
  isAnalyzing: boolean
  /** 分析结果 */
  analysisResult: ErrorAnalysisResult | null
}

/**
 * 错误分析结果接口
 */
export interface ErrorAnalysisResult {
  /** 总冲突数 */
  totalConflicts: number
  /** 严重程度分布 */
  severityDistribution: {
    CRITICAL: number
    HIGH: number
    MEDIUM: number
    LOW: number
  }
  /** 冲突类型分布 */
  conflictTypes: Record<string, number>
  /** 可自动解决的冲突数量 */
  autoResolvableCount: number
  /** 解决建议 */
  recommendations: string[]
  /** 预估解决时间 */
  estimatedResolutionTime: string
}

/**
 * 建议操作接口
 */
export interface SuggestionAction {
  /** 操作标签 */
  label: string
  /** 操作类型 */
  action: string
  /** 操作参数 */
  params?: any
  /** 是否为主要操作 */
  primary?: boolean
  /** 操作图标 */
  icon?: string
}

/**
 * 通用建议接口
 */
export interface GeneralSuggestion {
  /** 建议标题 */
  title: string
  /** 建议图标 */
  icon: string
  /** 建议描述 */
  description: string
  /** 可执行的操作 */
  actions: SuggestionAction[]
  /** 建议优先级 */
  priority?: 'high' | 'medium' | 'low'
}

/**
 * 错误上下文接口
 */
export interface ErrorContext {
  /** 用户操作 */
  userAction?: string
  /** 系统状态 */
  systemState?: Record<string, any>
  /** 相关数据 */
  relatedData?: any[]
  /** 错误堆栈 */
  stackTrace?: string
  /** 浏览器信息 */
  browserInfo?: {
    userAgent: string
    url: string
    timestamp: string
  }
}

/**
 * 错误报告接口
 */
export interface ErrorReport {
  /** 报告ID */
  id: string
  /** 时间戳 */
  timestamp: string
  /** 错误类型 */
  errorType: string
  /** 错误消息 */
  errorMessage: string
  /** 冲突列表 */
  conflicts: ConflictInfo[]
  /** 分析结果 */
  analysisResult: ErrorAnalysisResult | null
  /** 错误上下文 */
  context: ErrorContext
  /** 用户反馈 */
  userFeedback?: string
  /** 解决状态 */
  resolutionStatus: 'pending' | 'in_progress' | 'resolved' | 'dismissed'
}

/**
 * 冲突解决结果接口
 */
export interface ConflictResolutionResult {
  /** 是否成功 */
  success: boolean
  /** 解决的冲突ID */
  conflictId: string
  /** 解决方法 */
  resolutionMethod: string
  /** 结果消息 */
  message: string
  /** 剩余冲突 */
  remainingConflicts?: ConflictInfo[]
  /** 新产生的冲突 */
  newConflicts?: ConflictInfo[]
}

/**
 * 错误反馈配置接口
 */
export interface ErrorFeedbackConfig {
  /** 是否启用自动冲突检测 */
  enableAutoDetection: boolean
  /** 是否启用自动解决 */
  enableAutoResolution: boolean
  /** 最大显示冲突数量 */
  maxDisplayConflicts: number
  /** 严重程度过滤 */
  severityFilter: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[]
  /** 是否显示解决建议 */
  showSuggestions: boolean
  /** 是否启用错误报告导出 */
  enableReportExport: boolean
}

/**
 * 验证错误接口（扩展现有类型）
 */
export interface ValidationError {
  /** 字段名 */
  field: string
  /** 错误消息 */
  message: string
  /** 错误代码 */
  code?: string
  /** 错误值 */
  value?: any
  /** 约束信息 */
  constraint?: string
}

/**
 * 约束违反错误接口
 */
export interface ConstraintViolationError {
  /** 约束名称 */
  constraintName: string
  /** 约束类型 */
  constraintType: 'hard' | 'soft'
  /** 违反描述 */
  description: string
  /** 受影响的实体 */
  affectedEntities: string[]
  /** 违反分数 */
  violationScore?: number
  /** 建议修复方案 */
  suggestedFixes: string[]
}

/**
 * 系统错误接口
 */
export interface SystemError {
  /** 错误代码 */
  code: string
  /** 错误消息 */
  message: string
  /** 错误详情 */
  details?: string
  /** 错误来源 */
  source: 'frontend' | 'backend' | 'network' | 'external'
  /** 是否为临时错误 */
  isTemporary: boolean
  /** 重试建议 */
  retryable: boolean
}

/**
 * 错误反馈事件接口
 */
export interface ErrorFeedbackEvent {
  /** 事件类型 */
  type: 'error_shown' | 'conflict_detected' | 'auto_resolved' | 'user_action' | 'dismissed'
  /** 事件时间戳 */
  timestamp: string
  /** 事件数据 */
  data: any
  /** 用户ID */
  userId?: string
  /** 会话ID */
  sessionId?: string
}
