import { ref, reactive } from 'vue'
import type { ConflictInfo, ErrorFeedbackState, ErrorAnalysisResult } from '../types/errorFeedback'

/**
 * 增强错误反馈服务
 * 提供统一的错误处理、冲突检测和解决建议功能
 */
class EnhancedErrorFeedbackService {
  private state = reactive<ErrorFeedbackState>({
    isVisible: false,
    errorType: 'system_error',
    errorMessage: '',
    conflicts: [],
    isAnalyzing: false,
    analysisResult: null,
  })

  /**
   * 显示错误反馈模态框
   */
  showErrorFeedback(
    errorType: 'constraint_violation' | 'resource_shortage' | 'system_error' | 'validation_error',
    errorMessage: string,
    conflicts: ConflictInfo[] = []
  ) {
    this.state.errorType = errorType
    this.state.errorMessage = errorMessage
    this.state.conflicts = conflicts
    this.state.isVisible = true

    // 如果有冲突，自动进行分析
    if (conflicts.length > 0) {
      this.analyzeConflicts(conflicts)
    }
  }

  /**
   * 隐藏错误反馈模态框
   */
  hideErrorFeedback() {
    this.state.isVisible = false
    this.state.conflicts = []
    this.state.analysisResult = null
  }

  /**
   * 分析冲突并生成解决建议
   */
  private async analyzeConflicts(conflicts: ConflictInfo[]) {
    this.state.isAnalyzing = true

    try {
      const analysisResult: ErrorAnalysisResult = {
        totalConflicts: conflicts.length,
        severityDistribution: this.calculateSeverityDistribution(conflicts),
        conflictTypes: this.analyzeConflictTypes(conflicts),
        autoResolvableCount: conflicts.filter(c => c.autoResolvable).length,
        recommendations: this.generateRecommendations(conflicts),
        estimatedResolutionTime: this.estimateResolutionTime(conflicts),
      }

      this.state.analysisResult = analysisResult
    } catch (error) {
      console.error('Error analyzing conflicts:', error)
    } finally {
      this.state.isAnalyzing = false
    }
  }

  /**
   * 计算严重程度分布
   */
  private calculateSeverityDistribution(conflicts: ConflictInfo[]) {
    const distribution: Record<ConflictInfo['severity'], number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    }
    conflicts.forEach(conflict => {
      distribution[conflict.severity]++
    })
    return distribution
  }

  /**
   * 分析冲突类型
   */
  private analyzeConflictTypes(conflicts: ConflictInfo[]) {
    const types = new Map<string, number>()
    conflicts.forEach(conflict => {
      types.set(conflict.type, (types.get(conflict.type) || 0) + 1)
    })
    return Object.fromEntries(types)
  }

  /**
   * 生成解决建议
   */
  private generateRecommendations(conflicts: ConflictInfo[]): string[] {
    const recommendations: string[] = []
    const conflictTypes = this.analyzeConflictTypes(conflicts)

    // 基于冲突类型生成建议
    if (conflictTypes['examiner_time_conflict']) {
      recommendations.push('检查考官时间安排，避免同一考官在同一时间段被分配到多个考试')
      recommendations.push('考虑增加备用考官或调整考试时间安排')
    }

    if (conflictTypes['hard_constraint']) {
      recommendations.push('检查硬约束配置，确保约束条件合理且可满足')
      recommendations.push('考虑临时放宽某些非关键硬约束')
    }

    if (conflictTypes['resource_conflict']) {
      recommendations.push('检查考官资源配置，确保有足够的可用考官')
      recommendations.push('考虑扩展考试时间范围或增加考试场次')
    }

    if (conflictTypes['scheduling_conflict']) {
      recommendations.push('检查排班规则设置，避免冲突的排班要求')
      recommendations.push('考虑使用自动优化功能重新分配资源')
    }

    // 通用建议
    if (conflicts.some(c => c.severity === 'CRITICAL')) {
      recommendations.push('优先解决严重冲突，这些冲突可能导致系统无法正常工作')
    }

    if (conflicts.filter(c => c.autoResolvable).length > 0) {
      recommendations.push('使用自动解决功能处理可自动修复的冲突')
    }

    return recommendations
  }

  /**
   * 估算解决时间
   */
  private estimateResolutionTime(conflicts: ConflictInfo[]): string {
    const criticalCount = conflicts.filter(c => c.severity === 'CRITICAL').length
    const highCount = conflicts.filter(c => c.severity === 'HIGH').length
    const autoResolvableCount = conflicts.filter(c => c.autoResolvable).length

    if (criticalCount > 5) {
      return '30-60分钟'
    } else if (criticalCount > 0 || highCount > 10) {
      return '15-30分钟'
    } else if (autoResolvableCount === conflicts.length) {
      return '1-5分钟'
    } else {
      return '5-15分钟'
    }
  }

  /**
   * 检测考官时间冲突
   */
  detectExaminerTimeConflicts(examSchedules: any[]): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []
    const examinerTimeMap = new Map<string, Set<string>>()

    // 构建考官时间映射
    examSchedules.forEach((schedule, index) => {
      const timeSlot = `${schedule.date}_${schedule.timeSlot}`

      // 检查考官1
      if (schedule.examiner1) {
        if (!examinerTimeMap.has(schedule.examiner1)) {
          examinerTimeMap.set(schedule.examiner1, new Set())
        }
        if (examinerTimeMap.get(schedule.examiner1)!.has(timeSlot)) {
          conflicts.push({
            id: `examiner_conflict_${index}_${schedule.examiner1}`,
            type: 'examiner_time_conflict',
            severity: 'CRITICAL',
            description: `考官 ${schedule.examiner1} 在 ${schedule.date} ${schedule.timeSlot} 时间段存在冲突`,
            affectedEntities: [
              `考试: ${schedule.examName}`,
              `考官: ${schedule.examiner1}`,
              `时间: ${schedule.date} ${schedule.timeSlot}`,
            ],
            suggestedSolutions: ['更换其他可用考官', '调整考试时间', '使用备用考官替代'],
            autoResolvable: true,
          })
        }
        examinerTimeMap.get(schedule.examiner1)!.add(timeSlot)
      }

      // 检查考官2
      if (schedule.examiner2) {
        if (!examinerTimeMap.has(schedule.examiner2)) {
          examinerTimeMap.set(schedule.examiner2, new Set())
        }
        if (examinerTimeMap.get(schedule.examiner2)!.has(timeSlot)) {
          conflicts.push({
            id: `examiner_conflict_${index}_${schedule.examiner2}`,
            type: 'examiner_time_conflict',
            severity: 'CRITICAL',
            description: `考官 ${schedule.examiner2} 在 ${schedule.date} ${schedule.timeSlot} 时间段存在冲突`,
            affectedEntities: [
              `考试: ${schedule.examName}`,
              `考官: ${schedule.examiner2}`,
              `时间: ${schedule.date} ${schedule.timeSlot}`,
            ],
            suggestedSolutions: ['更换其他可用考官', '调整考试时间', '使用备用考官替代'],
            autoResolvable: true,
          })
        }
        examinerTimeMap.get(schedule.examiner2)!.add(timeSlot)
      }

      // 检查备用考官
      if (schedule.backupExaminer) {
        if (!examinerTimeMap.has(schedule.backupExaminer)) {
          examinerTimeMap.set(schedule.backupExaminer, new Set())
        }
        if (examinerTimeMap.get(schedule.backupExaminer)!.has(timeSlot)) {
          conflicts.push({
            id: `examiner_conflict_${index}_${schedule.backupExaminer}`,
            type: 'examiner_time_conflict',
            severity: 'HIGH',
            description: `备用考官 ${schedule.backupExaminer} 在 ${schedule.date} ${schedule.timeSlot} 时间段存在冲突`,
            affectedEntities: [
              `考试: ${schedule.examName}`,
              `备用考官: ${schedule.backupExaminer}`,
              `时间: ${schedule.date} ${schedule.timeSlot}`,
            ],
            suggestedSolutions: ['更换其他备用考官', '调整考试时间', '移除备用考官配置'],
            autoResolvable: true,
          })
        }
        examinerTimeMap.get(schedule.backupExaminer)!.add(timeSlot)
      }
    })

    return conflicts
  }

  /**
   * 检测资源冲突
   */
  detectResourceConflicts(examSchedules: any[], availableExaminers: any[]): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []
    const examinerWorkload = new Map<string, number>()

    // 计算考官工作量
    examSchedules.forEach(schedule => {
      if (schedule.examiner1) {
        examinerWorkload.set(
          schedule.examiner1,
          (examinerWorkload.get(schedule.examiner1) || 0) + 1
        )
      }
      if (schedule.examiner2) {
        examinerWorkload.set(
          schedule.examiner2,
          (examinerWorkload.get(schedule.examiner2) || 0) + 1
        )
      }
    })

    // 检测工作量过载
    examinerWorkload.forEach((workload, examinerId) => {
      const examiner = availableExaminers.find(e => e.id === examinerId)
      if (examiner && workload > examiner.maxWorkload) {
        conflicts.push({
          id: `workload_conflict_${examinerId}`,
          type: 'resource_conflict',
          severity: 'HIGH',
          description: `考官 ${examiner.name} 工作量过载 (${workload}/${examiner.maxWorkload})`,
          affectedEntities: [
            `考官: ${examiner.name}`,
            `当前工作量: ${workload}`,
            `最大工作量: ${examiner.maxWorkload}`,
          ],
          suggestedSolutions: [
            '重新分配部分考试给其他考官',
            '增加该考官的最大工作量限制',
            '调整考试安排以平衡工作量',
          ],
          autoResolvable: false,
        })
      }
    })

    return conflicts
  }

  /**
   * 自动解决冲突
   */
  async autoResolveConflict(conflict: ConflictInfo): Promise<boolean> {
    try {
      switch (conflict.type) {
        case 'examiner_time_conflict':
          return await this.resolveExaminerTimeConflict(conflict)
        case 'resource_conflict':
          return await this.resolveResourceConflict(conflict)
        default:
          return false
      }
    } catch (error) {
      console.error('Error auto-resolving conflict:', error)
      return false
    }
  }

  /**
   * 解决考官时间冲突
   */
  private async resolveExaminerTimeConflict(conflict: ConflictInfo): Promise<boolean> {
    // 这里应该调用后端API来重新分配考官
    // 暂时返回模拟结果
    process.env.NODE_ENV === 'development' && console.log('Auto-resolving examiner time conflict:', conflict)
    return true
  }

  /**
   * 解决资源冲突
   */
  private async resolveResourceConflict(conflict: ConflictInfo): Promise<boolean> {
    // 这里应该调用后端API来重新平衡资源
    // 暂时返回模拟结果
    process.env.NODE_ENV === 'development' && console.log('Auto-resolving resource conflict:', conflict)
    return true
  }

  /**
   * 导出错误报告
   */
  exportErrorReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      errorType: this.state.errorType,
      errorMessage: this.state.errorMessage,
      conflicts: this.state.conflicts,
      analysisResult: this.state.analysisResult,
    }

    const reportJson = JSON.stringify(report, null, 2)

    // 创建下载链接
    const blob = new Blob([reportJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return reportJson
  }

  /**
   * 获取当前状态
   */
  getState() {
    return this.state
  }
}

// 创建单例实例
export const enhancedErrorFeedbackService = new EnhancedErrorFeedbackService()

// 导出类型
export type { ConflictInfo, ErrorFeedbackState, ErrorAnalysisResult }
