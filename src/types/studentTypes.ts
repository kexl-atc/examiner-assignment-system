/**
 * 学员相关类型定义
 * 支持推荐科室信息解析和验证
 */

// 基础学员信息
export interface StudentInfo {
  id: string
  name: string
  department: string
  group: string
  examType?: 'practical' | 'theory' | 'both'
  specialRequirements?: string[]
  created_at?: string
  updated_at?: string
}

// 推荐科室信息
export interface RecommendedDepartments {
  examiner1Department: string // 考官1推荐科室
  examiner2Department: string // 考官2推荐科室
  backupDepartment?: string // 备份考官推荐科室
}

// 增强的学员信息（包含推荐科室）
export interface EnhancedStudentInfo extends StudentInfo {
  recommendedDepartments: RecommendedDepartments
  originalData?: string // 原始上传数据，用于调试
}

// 学员名单解析结果
export interface StudentListParseResult {
  success: boolean
  totalRows: number
  validStudents: EnhancedStudentInfo[]
  invalidRows: Array<{
    rowIndex: number
    rawData: string
    errors: string[]
    warnings: string[]
  }>
  summary: {
    validCount: number
    invalidCount: number
    duplicateCount: number
    missingRecommendationsCount: number
  }
  parseTime: number
}

// 文件上传配置
export interface FileUploadConfig {
  maxFileSize: number // 最大文件大小（字节）
  allowedFormats: string[] // 允许的文件格式
  requiredColumns: string[] // 必需的列名
  optionalColumns: string[] // 可选的列名
  encoding: string // 文件编码
  delimiter?: string // CSV分隔符
}

// 推荐科室验证规则
export interface DepartmentValidationRules {
  availableDepartments: string[] // 可用科室列表
  crossDepartmentRules: Array<{
    department1: string
    department2: string
    allowed: boolean
    description: string
  }>
  specialRules: Array<{
    condition: string
    rule: string
    description: string
  }>
}

// 验证错误类型
export enum ValidationErrorType {
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  INVALID_DEPARTMENT = 'INVALID_DEPARTMENT',
  SAME_DEPARTMENT_CONFLICT = 'SAME_DEPARTMENT_CONFLICT',
  MISSING_RECOMMENDATIONS = 'MISSING_RECOMMENDATIONS',
  INVALID_RECOMMENDATIONS = 'INVALID_RECOMMENDATIONS',
  CROSS_DEPARTMENT_VIOLATION = 'CROSS_DEPARTMENT_VIOLATION',
}

// 验证错误详情
export interface ValidationError {
  type: ValidationErrorType
  field: string
  value: any
  message: string
  suggestion?: string
  severity: 'error' | 'warning' | 'info'
}

// 学员数据验证结果
export interface StudentValidationResult {
  isValid: boolean
  student?: EnhancedStudentInfo
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: string[]
}

// 批量验证结果
export interface BatchValidationResult {
  totalProcessed: number
  validStudents: EnhancedStudentInfo[]
  invalidStudents: Array<{
    rowIndex: number
    rawData: any
    validationResult: StudentValidationResult
  }>
  summary: {
    validCount: number
    errorCount: number
    warningCount: number
    duplicateCount: number
  }
  departmentStatistics: Record<
    string,
    {
      studentCount: number
      examiner1Recommendations: Record<string, number>
      examiner2Recommendations: Record<string, number>
    }
  >
}

// 文件解析选项
export interface ParseOptions {
  skipEmptyRows: boolean
  trimWhitespace: boolean
  validateDepartments: boolean
  allowDuplicates: boolean
  autoFixFormat: boolean
  strictMode: boolean
}

// 导入预览数据
export interface ImportPreview {
  fileName: string
  fileSize: number
  totalRows: number
  detectedColumns: string[]
  sampleData: Array<Record<string, any>>
  parseOptions: ParseOptions
  estimatedProcessingTime: number
}

// 导入进度信息
export interface ImportProgress {
  stage: 'parsing' | 'validating' | 'processing' | 'completed' | 'error'
  progress: number // 0-100
  currentRow: number
  totalRows: number
  message: string
  errors: ValidationError[]
  warnings: ValidationError[]
}

// 学员名单模板
export interface StudentListTemplate {
  name: string
  description: string
  columns: Array<{
    key: string
    label: string
    required: boolean
    type: 'string' | 'number' | 'date' | 'department'
    format?: string
    example?: string
    validation?: string
  }>
  sampleData: Array<Record<string, any>>
}

// 导出选项
export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'json'
  includeHeaders: boolean
  includeValidationResults: boolean
  includeRecommendations: boolean
  encoding: string
  dateFormat: string
}

// 学员名单统计信息
export interface StudentListStatistics {
  totalStudents: number
  departmentDistribution: Record<string, number>
  groupDistribution: Record<string, number>
  examTypeDistribution: Record<string, number>
  recommendationCoverage: {
    examiner1: number // 有考官1推荐的学员数
    examiner2: number // 有考官2推荐的学员数
    backup: number // 有备份考官推荐的学员数
    complete: number // 推荐信息完整的学员数
  }
  validationSummary: {
    fullyValid: number
    hasWarnings: number
    hasErrors: number
    needsReview: number
  }
}
