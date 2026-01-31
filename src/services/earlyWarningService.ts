/**
 * 智能预警系统
 * 实现文档中要求的预警机制和预测性分析
 */

import { resourcePreCheckService } from './resourcePreCheckService'
import { dutyRotationService } from './dutyRotationService'
import { workloadBalancer } from './dynamicOptimizationService'

export interface AlertThresholds {
  resourceUsage: number // 资源使用率阈值
  workloadImbalance: number // 工作量不均衡阈值
  conflictRate: number // 冲突率阈值
  continuityRate: number // 连续性阈值
  fatigueLevel: number // 疲劳度阈值
}

export interface SystemAlert {
  id: string
  type:
    | 'RESOURCE_WARNING'
    | 'WORKLOAD_WARNING'
    | 'CONFLICT_WARNING'
    | 'CONTINUITY_WARNING'
    | 'FATIGUE_WARNING'
    | 'PREDICTION_WARNING'
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  message: string
  suggestion: string
  affectedEntities: string[]
  timestamp: Date
  autoResolvable: boolean
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
}

export interface SystemState {
  resourceUsage: number
  workloadVariance: number
  conflictRate: number
  continuityRate: number
  averageFatigueLevel: number
  activeTeachers: number
  totalAssignments: number
  lastUpdated: Date
}

export interface PredictionResult {
  date: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  potentialIssues: Array<{
    type: string
    probability: number
    impact: 'LOW' | 'MEDIUM' | 'HIGH'
    description: string
  }>
  recommendations: string[]
}

export class EarlyWarningSystem {
  private readonly DEFAULT_THRESHOLDS: AlertThresholds = {
    resourceUsage: 0.8,
    workloadImbalance: 0.3,
    conflictRate: 0.1,
    continuityRate: 0.7,
    fatigueLevel: 0.6,
  }

  private thresholds: AlertThresholds
  private alertHistory: SystemAlert[] = []
  private systemStateHistory: SystemState[] = []
  private monitoringActive = false

  constructor(customThresholds?: Partial<AlertThresholds>) {
    this.thresholds = { ...this.DEFAULT_THRESHOLDS, ...customThresholds }
  }

  /**
   * 开始系统监控
   */
  startMonitoring(): void {
    if (this.monitoringActive) {
      process.env.NODE_ENV === 'development' && console.log('⚠️ 预警系统已在运行中')
      return
    }

    this.monitoringActive = true
    process.env.NODE_ENV === 'development' && console.log('🚨 智能预警系统已启动')

    // 定期监控（实际应用中可能需要更复杂的调度机制）
    // 这里只是示例，实际应该根据需要调用monitor方法
  }

  /**
   * 停止系统监控
   */
  stopMonitoring(): void {
    this.monitoringActive = false
    process.env.NODE_ENV === 'development' && console.log('🔇 智能预警系统已停止')
  }

  /**
   * 监控系统状态并生成预警
   */
  async monitor(
    assignments: any[],
    teachers: any[],
    students: any[]
  ): Promise<{
    systemState: SystemState
    newAlerts: SystemAlert[]
    activeAlerts: SystemAlert[]
    recommendations: string[]
  }> {
    process.env.NODE_ENV === 'development' && console.log('🔍 执行系统状态监控...')

    // 1. 计算当前系统状态
    const systemState = this.calculateSystemState(assignments, teachers, students)

    // 2. 检测预警条件
    const newAlerts = await this.detectAlerts(systemState, assignments, teachers, students)

    // 3. 更新预警历史
    this.updateAlertHistory(newAlerts)

    // 4. 记录系统状态历史
    this.systemStateHistory.push(systemState)

    // 保持历史记录在合理范围内
    if (this.systemStateHistory.length > 100) {
      this.systemStateHistory = this.systemStateHistory.slice(-50)
    }

    // 5. 获取当前活跃预警
    const activeAlerts = this.getActiveAlerts()

    // 6. 生成建议
    const recommendations = this.generateRecommendations(systemState, activeAlerts)

    process.env.NODE_ENV === 'development' && console.log(`🔍 监控完成，发现${newAlerts.length}个新预警，${activeAlerts.length}个活跃预警`)

    return {
      systemState,
      newAlerts,
      activeAlerts,
      recommendations,
    }
  }

  /**
   * 计算系统状态
   */
  private calculateSystemState(assignments: any[], teachers: any[], students: any[]): SystemState {
    // 计算资源使用率
    const totalCapacity = teachers.length * 2 // 假设每个考官最多承担2个任务
    const usedCapacity = assignments.length
    const resourceUsage = totalCapacity > 0 ? usedCapacity / totalCapacity : 0

    // 计算工作量方差
    const workloadStats = workloadBalancer['calculateWorkloadStats'](assignments, teachers)
    const avgWorkload =
      workloadStats.reduce((sum, stat) => sum + stat.totalTasks, 0) / workloadStats.length
    const workloadVariance =
      workloadStats.reduce((sum, stat) => sum + Math.pow(stat.totalTasks - avgWorkload, 2), 0) /
      workloadStats.length

    // 计算冲突率（简化计算）
    const conflictCount = this.countConflicts(assignments)
    const conflictRate = assignments.length > 0 ? conflictCount / assignments.length : 0

    // 计算连续性率
    const continuityRate = this.calculateContinuityRate(assignments, students)

    // 计算平均疲劳度
    const averageFatigueLevel = this.calculateAverageFatigueLevel(workloadStats)

    return {
      resourceUsage,
      workloadVariance,
      conflictRate,
      continuityRate,
      averageFatigueLevel,
      activeTeachers: teachers.filter(t =>
        assignments.some(
          a => a.examiner1?.id === t.id || a.examiner2?.id === t.id || a.backupExaminer?.id === t.id
        )
      ).length,
      totalAssignments: assignments.length,
      lastUpdated: new Date(),
    }
  }

  /**
   * 检测预警条件
   */
  private async detectAlerts(
    systemState: SystemState,
    assignments: any[],
    teachers: any[],
    students: any[]
  ): Promise<SystemAlert[]> {
    const alerts: SystemAlert[] = []

    // 1. 资源使用率预警
    if (systemState.resourceUsage > this.thresholds.resourceUsage) {
      alerts.push({
        id: `resource_${Date.now()}`,
        type: 'RESOURCE_WARNING',
        level: systemState.resourceUsage > 0.9 ? 'CRITICAL' : 'HIGH',
        title: '资源使用率过高',
        message: `当前资源使用率为${(systemState.resourceUsage * 100).toFixed(1)}%，超过阈值${(this.thresholds.resourceUsage * 100).toFixed(1)}%`,
        suggestion: '考虑启用预留资源、调整排班密度或延长排班周期',
        affectedEntities: ['系统整体'],
        timestamp: new Date(),
        autoResolvable: false,
        resolved: false,
      })
    }

    // 2. 工作量不均衡预警
    if (systemState.workloadVariance > this.thresholds.workloadImbalance) {
      const overloadedTeachers = teachers.filter(t => {
        const workload = assignments.filter(
          a => a.examiner1?.id === t.id || a.examiner2?.id === t.id || a.backupExaminer?.id === t.id
        ).length
        return workload > 3
      })

      alerts.push({
        id: `workload_${Date.now()}`,
        type: 'WORKLOAD_WARNING',
        level: 'MEDIUM',
        title: '考官工作量分配不均',
        message: `工作量方差为${systemState.workloadVariance.toFixed(2)}，存在明显不均衡`,
        suggestion: '执行工作量重新平衡，将过载考官的任务转移给轻载考官',
        affectedEntities: overloadedTeachers.map(t => t.name),
        timestamp: new Date(),
        autoResolvable: true,
        resolved: false,
      })
    }

    // 3. 冲突率预警
    if (systemState.conflictRate > this.thresholds.conflictRate) {
      alerts.push({
        id: `conflict_${Date.now()}`,
        type: 'CONFLICT_WARNING',
        level: systemState.conflictRate > 0.2 ? 'HIGH' : 'MEDIUM',
        title: '约束冲突率过高',
        message: `当前冲突率为${(systemState.conflictRate * 100).toFixed(1)}%，超过阈值${(this.thresholds.conflictRate * 100).toFixed(1)}%`,
        suggestion: '检查约束条件设置，考虑放宽部分软约束或增加考官资源',
        affectedEntities: ['约束系统'],
        timestamp: new Date(),
        autoResolvable: false,
        resolved: false,
      })
    }

    // 4. 连续性预警
    if (systemState.continuityRate < this.thresholds.continuityRate) {
      alerts.push({
        id: `continuity_${Date.now()}`,
        type: 'CONTINUITY_WARNING',
        level: 'LOW',
        title: '考试连续性不足',
        message: `考试连续性仅为${(systemState.continuityRate * 100).toFixed(1)}%，低于期望值${(this.thresholds.continuityRate * 100).toFixed(1)}%`,
        suggestion: '优化考试日期安排，尽量安排连续的工作日进行考试',
        affectedEntities: ['排班计划'],
        timestamp: new Date(),
        autoResolvable: true,
        resolved: false,
      })
    }

    // 5. 疲劳度预警
    if (systemState.averageFatigueLevel > this.thresholds.fatigueLevel) {
      const fatigueTeachers = teachers.filter(t => {
        const consecutiveDays = this.calculateTeacherConsecutiveDays(t.id, assignments)
        return consecutiveDays >= 3
      })

      alerts.push({
        id: `fatigue_${Date.now()}`,
        type: 'FATIGUE_WARNING',
        level: 'MEDIUM',
        title: '考官疲劳度过高',
        message: `平均疲劳度为${(systemState.averageFatigueLevel * 100).toFixed(1)}%，${fatigueTeachers.length}名考官连续工作超过3天`,
        suggestion: '安排考官轮休，避免长期连续工作导致的疲劳',
        affectedEntities: fatigueTeachers.map(t => t.name),
        timestamp: new Date(),
        autoResolvable: true,
        resolved: false,
      })
    }

    return alerts
  }

  /**
   * 预测性分析
   */
  async predictiveAnalysis(
    currentAssignments: any[],
    teachers: any[],
    students: any[],
    futureDays: number = 7
  ): Promise<PredictionResult[]> {
    process.env.NODE_ENV === 'development' && console.log(`🔮 开始${futureDays}天预测性分析...`)

    const predictions: PredictionResult[] = []
    const today = new Date()

    for (let day = 1; day <= futureDays; day++) {
      const futureDate = new Date(today)
      futureDate.setDate(today.getDate() + day)
      const dateStr = futureDate.toISOString().split('T')[0]

      const prediction = await this.predictDayRisk(dateStr, currentAssignments, teachers, students)

      predictions.push(prediction)
    }

    process.env.NODE_ENV === 'development' && console.log(
      `🔮 预测分析完成，识别出${predictions.filter(p => p.riskLevel !== 'LOW').length}个高风险日期`
    )

    return predictions
  }

  /**
   * 预测单日风险
   */
  private async predictDayRisk(
    date: string,
    currentAssignments: any[],
    teachers: any[],
    students: any[]
  ): Promise<PredictionResult> {
    const potentialIssues: PredictionResult['potentialIssues'] = []
    const recommendations: string[] = []

    // 1. 预测班组轮转影响
    const dutySchedule = dutyRotationService.calculateDutySchedule(date)
    const dayShiftTeachers = teachers.filter(t => t.group === dutySchedule.dayShift)
    const unavailableRatio = dayShiftTeachers.length / teachers.length

    if (unavailableRatio > 0.3) {
      potentialIssues.push({
        type: 'group_rotation_impact',
        probability: 0.8,
        impact: 'HIGH',
        description: `${date}有${(unavailableRatio * 100).toFixed(1)}%的考官执勤白班，可用资源严重不足`,
      })
      recommendations.push('考虑调整该日期的考试安排或启用应急考官')
    }

    // 2. 预测工作量累积
    const workloadProjection = this.projectWorkload(date, currentAssignments, teachers)
    const overloadedCount = workloadProjection.filter(w => w.projectedLoad > 3).length

    if (overloadedCount > 0) {
      potentialIssues.push({
        type: 'workload_accumulation',
        probability: 0.6,
        impact: 'MEDIUM',
        description: `预计${overloadedCount}名考官工作量将超载`,
      })
      recommendations.push('提前进行工作量平衡调整')
    }

    // 3. 预测资源冲突
    const resourceConflictRisk = this.assessResourceConflictRisk(date, students, teachers)

    if (resourceConflictRisk > 0.5) {
      potentialIssues.push({
        type: 'resource_conflict',
        probability: resourceConflictRisk,
        impact: 'HIGH',
        description: '预计出现资源分配冲突',
      })
      recommendations.push('预先准备跨科室支援方案')
    }

    // 4. 确定整体风险等级
    const highImpactIssues = potentialIssues.filter(i => i.impact === 'HIGH').length
    const mediumImpactIssues = potentialIssues.filter(i => i.impact === 'MEDIUM').length

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    if (highImpactIssues > 0) {
      riskLevel = 'HIGH'
    } else if (mediumImpactIssues > 1) {
      riskLevel = 'MEDIUM'
    } else {
      riskLevel = 'LOW'
    }

    return {
      date,
      riskLevel,
      potentialIssues,
      recommendations,
    }
  }

  /**
   * 更新预警历史
   */
  private updateAlertHistory(newAlerts: SystemAlert[]): void {
    this.alertHistory.push(...newAlerts)

    // 保持历史记录在合理范围内
    if (this.alertHistory.length > 500) {
      this.alertHistory = this.alertHistory.slice(-250)
    }
  }

  /**
   * 获取活跃预警
   */
  private getActiveAlerts(): SystemAlert[] {
    return this.alertHistory.filter(alert => !alert.resolved)
  }

  /**
   * 生成建议
   */
  private generateRecommendations(systemState: SystemState, activeAlerts: SystemAlert[]): string[] {
    const recommendations: string[] = []

    // 基于系统状态的建议
    if (systemState.resourceUsage > 0.8) {
      recommendations.push('资源使用率过高，建议增加考官配置或延长排班周期')
    }

    if (systemState.workloadVariance > 0.3) {
      recommendations.push('工作量分配不均，建议执行负载均衡优化')
    }

    if (systemState.continuityRate < 0.7) {
      recommendations.push('考试连续性不足，建议优化日期安排')
    }

    // 基于活跃预警的建议
    const criticalAlerts = activeAlerts.filter(a => a.level === 'CRITICAL')
    if (criticalAlerts.length > 0) {
      recommendations.push('存在严重预警，建议立即采取应急措施')
    }

    const autoResolvableAlerts = activeAlerts.filter(a => a.autoResolvable)
    if (autoResolvableAlerts.length > 0) {
      recommendations.push(`有${autoResolvableAlerts.length}个预警可以自动解决，建议启用自动优化`)
    }

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push('系统运行正常，继续监控')
    }

    return recommendations
  }

  /**
   * 解决预警
   */
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId)

    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      alert.resolvedBy = resolvedBy

      process.env.NODE_ENV === 'development' && console.log(`✅ 预警已解决: ${alert.title}`)
      return true
    }

    return false
  }

  /**
   * 获取预警统计
   */
  getAlertStatistics(): {
    total: number
    byType: Record<string, number>
    byLevel: Record<string, number>
    resolved: number
    resolvedRate: number
    avgResolutionTime: number
  } {
    const total = this.alertHistory.length
    const resolved = this.alertHistory.filter(a => a.resolved).length
    const resolvedRate = total > 0 ? resolved / total : 0

    const byType: Record<string, number> = {}
    const byLevel: Record<string, number> = {}
    let totalResolutionTime = 0
    let resolvedWithTime = 0

    for (const alert of this.alertHistory) {
      // 统计类型
      if (!byType[alert.type]) byType[alert.type] = 0
      byType[alert.type]++

      // 统计级别
      if (!byLevel[alert.level]) byLevel[alert.level] = 0
      byLevel[alert.level]++

      // 计算解决时间
      if (alert.resolved && alert.resolvedAt) {
        const resolutionTime = alert.resolvedAt.getTime() - alert.timestamp.getTime()
        totalResolutionTime += resolutionTime
        resolvedWithTime++
      }
    }

    const avgResolutionTime = resolvedWithTime > 0 ? totalResolutionTime / resolvedWithTime : 0

    return {
      total,
      byType,
      byLevel,
      resolved,
      resolvedRate,
      avgResolutionTime: avgResolutionTime / (1000 * 60), // 转换为分钟
    }
  }

  // 辅助方法
  private countConflicts(assignments: any[]): number {
    // 简化实现：计算明显的冲突
    let conflicts = 0

    for (const assignment of assignments) {
      // 检查考官配置是否完整
      if (!assignment.examiner1 || !assignment.examiner2 || !assignment.backupExaminer) {
        conflicts++
      }

      // 检查科室约束
      if (assignment.examiner1?.department !== assignment.student?.department) {
        conflicts++
      }
    }

    return conflicts
  }

  private calculateContinuityRate(assignments: any[], students: any[]): number {
    // 简化实现：计算连续考试的学员比例
    let continuousCount = 0

    for (const student of students) {
      const studentAssignments = assignments.filter(a => a.student?.id === student.id)
      if (studentAssignments.length >= 2) {
        const dates = studentAssignments.map(a => new Date(a.examDate)).sort()
        const dayDiff = (dates[1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)

        if (dayDiff <= 3) {
          // 3天内认为是连续的
          continuousCount++
        }
      }
    }

    return students.length > 0 ? continuousCount / students.length : 0
  }

  private calculateAverageFatigueLevel(workloadStats: any[]): number {
    if (workloadStats.length === 0) return 0

    const fatigueScores = workloadStats.map(stat => {
      let score = 0
      if (stat.consecutiveDays >= 3) score += 0.4
      if (stat.totalTasks >= 3) score += 0.3
      if (stat.fatigueLevel === 'HIGH') score += 0.3
      return Math.min(1, score)
    })

    return fatigueScores.reduce((sum, score) => sum + score, 0) / fatigueScores.length
  }

  private calculateTeacherConsecutiveDays(teacherId: string, assignments: any[]): number {
    const teacherDates = assignments
      .filter(
        a =>
          a.examiner1?.id === teacherId ||
          a.examiner2?.id === teacherId ||
          a.backupExaminer?.id === teacherId
      )
      .map(a => a.examDate)
      .sort()

    if (teacherDates.length === 0) return 0

    let maxConsecutive = 1
    let currentConsecutive = 1

    for (let i = 1; i < teacherDates.length; i++) {
      const prevDate = new Date(teacherDates[i - 1])
      const currDate = new Date(teacherDates[i])
      const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)

      if (dayDiff === 1) {
        currentConsecutive++
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive)
      } else {
        currentConsecutive = 1
      }
    }

    return maxConsecutive
  }

  private projectWorkload(
    date: string,
    currentAssignments: any[],
    teachers: any[]
  ): Array<{ teacherId: string; currentLoad: number; projectedLoad: number }> {
    return teachers.map(teacher => {
      const currentLoad = currentAssignments.filter(
        a =>
          a.examiner1?.id === teacher.id ||
          a.examiner2?.id === teacher.id ||
          a.backupExaminer?.id === teacher.id
      ).length

      // 简化预测：假设工作量会继续增长
      const projectedLoad = currentLoad * 1.2

      return {
        teacherId: teacher.id,
        currentLoad,
        projectedLoad,
      }
    })
  }

  private assessResourceConflictRisk(date: string, students: any[], teachers: any[]): number {
    const dutySchedule = dutyRotationService.calculateDutySchedule(date)
    const availableTeachers = teachers.filter(t =>
      dutyRotationService.canTeacherBeExaminer(t.group, date)
    )

    const requiredTeachers = students.length * 3 // 每个学员需要3名考官
    const availableCount = availableTeachers.length

    if (availableCount < requiredTeachers) {
      return Math.min(1, (requiredTeachers - availableCount) / requiredTeachers)
    }

    return 0
  }
}

// 创建单例实例
export const earlyWarningSystem = new EarlyWarningSystem()

// 类型已在文件开头通过interface导出
