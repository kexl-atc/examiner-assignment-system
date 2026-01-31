// 统一类型定义文件

// 基础数据类型
export interface Teacher {
  id: string
  name: string
  department: string
  title?: string
  group?: string
  status?: '可用' | '不可用' | 'active' | 'inactive'
  shift?: string
  workload?: number
  consecutiveDays?: number
  selected?: boolean
  preferences?: any
  availability?: {
    [date: string]: {
      morning: boolean
      afternoon: boolean
      evening: boolean
    }
  }
  unavailablePeriods?: Array<{
    id: string
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD
    reason: string
    createdAt?: string
  }>
  created_at?: string
  updated_at?: string
}

// 排班相关类型
export interface ScheduleRecord {
  id: string
  teacher_id: string
  exam_date: string
  exam_time: string
  exam_type: string
  room: string
  subject: string
  created_at: string
}

// 排班响应类型
export interface ScheduleResponse {
  id: string
  teacherId: string
  teacherName: string
  examDate: string
  examTime: string
  examType: string
  room: string
  subject: string
  workload: number
  status: 'scheduled' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
}

// 数据库操作结果类型
export interface OperationResult {
  success: boolean
  message?: string
  data?: any
  error?: Error
}

// 批量操作结果类型
export interface BatchOperationResult {
  success: boolean
  successCount: number
  failureCount: number
  errors: Array<{
    index: number
    error: string
    data?: any
  }>
  results: any[]
}

// 分页参数类型
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
}

// 分页结果类型
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// 缓存配置类型
export interface CacheConfig {
  maxSize: number
  ttl: number
  enableLRU: boolean
}

// 性能监控类型
export interface PerformanceMetrics {
  apiCalls: {
    total: number
    successful: number
    failed: number
    averageResponseTime: number
  }
  cacheHits: {
    total: number
    hitRate: number
  }
  errors: {
    total: number
    byType: Record<string, number>
  }
  systemHealth: {
    memoryUsage: number
    cpuUsage: number
    diskUsage: number
  }
}

// 数据导入导出类型
export interface ImportOptions {
  format: 'json' | 'csv' | 'sql'
  skipDuplicates?: boolean
  validateData?: boolean
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'sql'
  includeMetadata?: boolean
  compression?: boolean
}

// 错误类型
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType
  message: string
  details?: any
  timestamp: number
  stack?: string
}

// 环境类型
export type Environment = 'web' | 'electron' | 'unknown'

// 数据适配器类型
export type AdapterType = 'sqlite' | 'indexeddb' | 'json' | 'memory'

// 学员类型定义
export interface Student {
  id: string
  name: string
  studentId: string
  department: string
  group: string
  examType?: 'practical' | 'theory' | 'both'
  examDate?: string
  recommendedExaminer1Dept?: string
  recommendedExaminer2Dept?: string
  recommendedBackupDept?: string
  specialRequirements?: string[]
  created_at?: string
  updated_at?: string
}

// 排班快照类型（历史排班记录）
export interface ScheduleSnapshot {
  id: number
  name: string
  description?: string
  createdAt: string
  updatedAt?: string
  scheduleData: ScheduleResultRecord[]
  metadata: {
    totalStudents: number
    totalTeachers: number
    dateRange: {
      start: string
      end: string
    }
    constraintConfig?: any
    manualEditCount: number
    autoAssignedCount: number
    // 扩展元数据：保存学员和教师完整信息
    studentList?: any[] // 学员完整数据
    teacherList?: any[] // 教师完整数据（包含不可用时间）
    examDates?: string[] // 考试日期范围
  }
}

// 排班结果记录类型
export interface ScheduleResultRecord {
  id: string | number
  student: string
  department: string
  date1: string
  date2: string
  type1?: string
  type2?: string
  examiner1_1: string
  examiner1_2: string
  backup1: string
  examiner2_1: string
  examiner2_2: string
  backup2: string
  examDays?: 1 | 2 // 🆕 考试天数（1天或2天）
  manualEdits?: ManualEditInfo[]
  constraintViolations?: any[]
}

// 人工修改信息类型
export interface ManualEditInfo {
  field: string
  oldValue: string
  newValue: string
  timestamp: string
  reason?: string
  conflictLevel?: 'none' | 'info' | 'warning' | 'error'
}

// 历史排班查询参数类型
export interface ScheduleSnapshotQuery {
  page?: number
  pageSize?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'name'
  sortOrder?: 'asc' | 'desc'
  nameFilter?: string
  startDate?: string
  endDate?: string
}

// 历史排班列表响应类型
export interface ScheduleSnapshotListResponse {
  snapshots: ScheduleSnapshot[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 重新导出学员相关类型
export * from './studentTypes'

// 重新导出services/data中的类型
// 暂时注释数据服务类型导入
// export * from '../services/data/types'
