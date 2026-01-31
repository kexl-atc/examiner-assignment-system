/**
 * 类型定义文件
 * 保持与原有代码的兼容性
 */

// 学员信息接口
export interface StudentInfo {
  id: string
  name: string
  department: string // 一、二、三、四、五、六、七
  group?: string // 一组、二组、三组、四组
  recommendedExaminer1Dept?: string // 推荐考官1科室
  recommendedExaminer2Dept?: string // 推荐考官2科室
  recommendedBackupDept?: string // 推荐备份考官科室
  selectedExaminer2Dept?: string // 实际选择的考官2科室（用于备份考官选择）
  originalExaminers?: {
    examiner1?: string
    examiner2?: string
    backup?: string
  }

  // 🆕 考试内容配置
  examDays?: 1 | 2 // 考试天数：1天或2天（默认2天）
  examType?: string // 考试类型描述（用于显示）
  day1Subjects?: string[] // 第一天考试科目
  day2Subjects?: string[] // 第二天考试科目（仅两天考试时）
}

// 考官信息接口
export interface TeacherInfo {
  id: string
  name: string
  department: string // 一、二、三、四、五、六、七
  group: string // 一组、二组、三组、四组、无
  shift?: string // 🔄 轮班信息：日常班、白班、周末班等
  skills: string[]
  workload: number
  consecutiveDays: number
  availability?: {
    [date: string]: {
      morning: boolean
      afternoon: boolean
      evening: boolean
    }
  }

  // 🆕 不可用期列表
  unavailablePeriods?: Array<{
    id: string
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD
    reason: string
    createdAt?: string
  }>

  // ✨ 智能推荐所需的扩展字段
  available?: boolean // 当前是否可用（动态计算）
  currentWorkload?: number // 当前工作量（实时计算）
  nightShiftPreferred?: boolean // 是否为晚班值班（动态计算）
  restDayStatus?: 'first' | 'second' | 'none' // 休息日状态（动态计算）
  shiftMatched?: boolean // 🔄 轮班是否匹配（动态计算）
  conflictInfo?: string // 冲突信息文本（动态生成）
}

// 考试分配接口
export interface ExamAssignment {
  id: string
  studentId: string
  studentName: string
  studentDepartment: string
  examDate: string
  examType: 'day1' | 'day2' // 第一天或第二天
  subjects: string[] // ['现场', '模拟机1'] 或 ['模拟机2', '口试']
  examiner1: string // 同科室考官
  examiner2: string // 不同科室考官
  backupExaminer: string // 备份考官
  location: string
  timeSlot: {
    start: string
    end: string
    period: 'morning' | 'afternoon' | 'evening'
  }
}

// 约束违反接口
export interface ConstraintViolation {
  id?: string
  type:
    | 'hard'
    | 'soft'
    | 'info'
    | 'workload'
    | 'weekend'
    | 'holiday'
    | 'department'
    | 'teacher'
    | 'other'
  constraint?: string
  severity: 'low' | 'medium' | 'high' | 'error' | 'warning' | 'hard' | 'soft'
  title?: string
  message?: string
  description?: string
  affectedEntities?: string[]
  suggestion?: string
  count?: number
  details?: string[]
  relatedDate?: string
  relatedStudent?: string
  relatedTeacher?: string
  constraintName?: string
}

// 排班统计接口
export interface SchedulingStatistics {
  totalStudents: number
  assignedStudents: number
  unassignedStudents: number
  totalTeachers: number
  activeTeachers: number
  averageWorkload: number
  maxWorkload: number
  hardConstraintsSatisfied: number
  softConstraintsScore?: number
  continuityRate: number
  hardConstraintViolations?: number
  finalScore?: any
}

// 排班结果接口
export interface SchedulingResult {
  assignments: ExamAssignment[]
  unassignedStudents: StudentInfo[]
  conflicts: ConstraintViolation[]
  statistics: SchedulingStatistics
  warnings: string[]
  score?: any
  message?: string
  success?: boolean
}

// 值班调度信息接口
export interface DutyScheduleInfo {
  date: string
  dayShift: string // 白班班组
  nightShift: string // 晚班班组
  restGroups: string[] // 休息班组
  cyclePosition: number // 循环位置 (0-3)
}

// 时间段接口
export interface TimeSlot {
  start: string
  end: string
  period: 'morning' | 'afternoon' | 'evening'
}
