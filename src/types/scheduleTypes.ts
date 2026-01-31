// 排班结果展示相关类型定义

export interface ExamAssignment {
  id: string
  date: Date
  timeSlot: string
  student: {
    id: string
    name: string
    department: string
    group: string
  }
  examiner1: {
    id: string
    name: string
    department: string
    isRecommended: boolean
  }
  examiner2: {
    id: string
    name: string
    department: string
    isRecommended: boolean
  }
  violations?: Array<{
    id: string
    constraintName: string
    severity: string
    message: string
  }>
}

export interface CalendarDate {
  date: Date
  day: number
  dateString: string
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  isHoliday: boolean
  examCount: number
  constraintStatus: string
}

export interface TimelineResource {
  id: string
  name: string
  type: string
  workloadPercentage: number
}

export interface TimelinePeriod {
  key: string
  label: string
}

export interface WorkloadAnalysis {
  id: string
  name: string
  examCount: number
  workloadPercentage: number
}

export interface ConstraintSatisfactionMetrics {
  overallScore: number
  hardConstraintSatisfaction: number
  softConstraintSatisfaction: number
  workloadBalance: number
  scheduleEfficiency: number
  hardConstraintStats: {
    satisfied: number
    violated: number
  }
  softConstraintStats: {
    score: number
    improvements: number
  }
  workloadStats: {
    average: number
    stdDev: number
  }
  efficiencyStats: {
    scheduled: number
    total: number
  }
}

export interface ViolationSummary {
  [key: string]: number
}

// 时间分布统计
export interface TimeDistributionStats {
  dailyExamCount: number[]
  avgExamsPerDay: number
  stdDev: number
  variance: number
  timeConcentrationScore: number
  totalExams: number
  activeDays: number
  // 保持向后兼容的字段
  standardDeviation: number
  maxExamsPerDay: number
  minExamsPerDay: number
  averageExamsPerDay: number
}

// 时间集中度约束配置
export interface TimeConcentrationConstraint {
  enabled: boolean
  weight: number
  maxDailyExams: number
  idealDailyExams: number
  penaltyMultiplier: number
  description: string
}

export type ViewMode = 'calendar' | 'timeline' | 'table' | 'statistics'
export type TimelineScale = 'day' | 'week' | 'month'
export type SortBy = 'date' | 'student' | 'department' | 'violations'
export type SortOrder = 'asc' | 'desc'
