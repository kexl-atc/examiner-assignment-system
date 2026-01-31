export interface WorkloadStatistic {
  date: string
  examinerId: string
  examinerName: string
  totalExams: number
  totalHours: number
  averageWorkload: number
}

export interface HeatmapData {
  date: string
  hour: number
  examCount: number
  workload: number
}

export interface DashboardFilter {
  dateRange?: [string, string] | null
  teacherIds?: string[]
  classes?: string[]
  startDate?: string
  endDate?: string
  examinerIds?: string[]
  departments?: string[]
  examType?: string
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
}

export interface DashboardMetrics {
  totalSchedules: number
  scheduleTrend: number
  activeExaminers: number
  totalExaminers: number
  avgWorkload: number
  completionRate: number
  totalFiles: number
  totalFileSize: number
  dataLatency: number
}

export interface StatisticsResponse {
  workloadData: WorkloadStatistic[]
  heatmapData: HeatmapData[]
  totalExams: number
  totalHours: number
  averageWorkload: number
  peakHours: number[]
}

export interface ScheduleHistory {
  id: string
  scheduleDate: string
  examinerCount: number
  examCount: number
  totalHours: number
  status: 'completed' | 'pending' | 'cancelled'
  createdAt: string
  updatedAt: string
  fileAttachments?: FileAttachment[]
}

export interface FileAttachment {
  id: string
  filename: string
  fileType: string
  fileSize: number
  uploadDate: string
  downloadUrl: string
}

export interface RealTimeUpdate {
  type: 'workload' | 'schedule' | 'exam'
  data: any
  timestamp: string
}
