/**
 * 跨部门支援服务
 * 实现考官跨部门借调/支援机制和紧急支援
 */

export interface CrossDepartmentConfig {
  allowCrossBorrow: boolean
  specialDepartmentGroups: string[][]
  crossBorrowPriority: Record<string, string[]>
  emergencySupport: boolean
}

export interface SupportRequest {
  requestingDepartment: string
  requiredRole: 'examiner1' | 'examiner2' | 'backup'
  examDate: string
  studentInfo: {
    name: string
    department: string
    group: string
  }
  urgency: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface SupportResponse {
  success: boolean
  supportingTeacher?: any
  supportingDepartment?: string
  reason?: string
  alternatives?: any[]
}

export interface CrossBorrowRecord {
  date: string
  requestingDept: string
  supportingDept: string
  teacher: any
  role: string
  studentName: string
}

export class CrossDepartmentService {
  private readonly DEFAULT_CONFIG: CrossDepartmentConfig = {
    allowCrossBorrow: true,
    specialDepartmentGroups: [
      ['dept1', 'dept2'], // 相关科室可以互借
      ['dept3', 'dept4'], // 相关科室可以互借（有限制要求）
      ['dept5', 'dept6', 'dept7'], // 相关科室可以互借
    ],
    crossBorrowPriority: {
      dept1: ['dept2', 'dept3', 'dept4', 'dept5', 'dept6', 'dept7'],
      dept2: ['dept1', 'dept3', 'dept4', 'dept5', 'dept6', 'dept7'],
      dept3: ['dept1', 'dept2', 'dept4', 'dept5'],
      dept4: ['dept3', 'dept1', 'dept2', 'dept5'],
      dept5: ['dept1', 'dept2', 'dept3', 'dept4'],
      dept6: ['dept1', 'dept2', 'dept3', 'dept4'],
      dept7: ['dept1', 'dept2', 'dept3', 'dept4'],
    },
    emergencySupport: true,
  }

  private crossBorrowHistory: CrossBorrowRecord[] = []
  private config: CrossDepartmentConfig

  constructor(config?: Partial<CrossDepartmentConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config }
  }

  /**
   * 检查是否可以跨科室借调
   */
  canCrossBorrow(
    requestingDept: string,
    supportingDept: string,
    role: 'examiner1' | 'examiner2' | 'backup'
  ): boolean {
    if (!this.config.allowCrossBorrow) {
      return false
    }

    // 考官1：同一科室组，不能跨借
    if (role === 'examiner1') {
      return this.isInSameSpecialGroup(requestingDept, supportingDept)
    }

    // 考官2和备用可以跨科室借调
    return true
  }

  /**
   * 检查是否在同一个特殊科室组（相关科室/专业组）
   */
  private isInSameSpecialGroup(dept1: string, dept2: string): boolean {
    for (const group of this.config.specialDepartmentGroups) {
      if (group.includes(dept1) && group.includes(dept2)) {
        return true
      }
    }
    return false
  }

  /**
   * 请求跨部门支援
   */
  async requestSupport(
    request: SupportRequest,
    availableTeachers: any[]
  ): Promise<SupportResponse> {
    process.env.NODE_ENV === 'development' && console.log(`收到跨部门支援请求: ${request.requestingDepartment}需要${request.requiredRole}`)

    // 1. 检查是否允许跨部门支援
    if (!this.config.allowCrossBorrow) {
      return {
        success: false,
        reason: '跨部门支援功能已禁用',
      }
    }

    // 2. 获取支援优先级列表
    const priorityDepts = this.getSupportPriority(
      request.requestingDepartment,
      request.requiredRole
    )

    // 3. 按优先级寻找可用考官
    for (const supportingDept of priorityDepts) {
      const candidates = this.findCandidatesFromDepartment(
        supportingDept,
        request,
        availableTeachers
      )

      if (candidates.length > 0) {
        const selectedTeacher = this.selectBestCandidate(candidates, request)

        // 记录跨部门支援
        this.recordCrossBorrow({
          date: request.examDate,
          requestingDept: request.requestingDepartment,
          supportingDept: supportingDept,
          teacher: selectedTeacher,
          role: request.requiredRole,
          studentName: request.studentInfo.name,
        })

        process.env.NODE_ENV === 'development' && console.log(
          ` 找到支援考官: ${selectedTeacher.name}(${supportingDept}科) -> ${request.requestingDepartment}科`
        )

        return {
          success: true,
          supportingTeacher: selectedTeacher,
          supportingDepartment: supportingDept,
          reason: `${supportingDept}科提供支援`,
        }
      }
    }

    // 4. 如果没有找到，尝试应急支援
    if (this.config.emergencySupport && request.urgency === 'HIGH') {
      return this.requestEmergencySupport(request, availableTeachers)
    }

    return {
      success: false,
      reason: '未找到合适的可用跨部门支援考官',
      alternatives: this.suggestAlternatives(request, availableTeachers),
    }
  }

  /**
   * 获取支援优先级列表
   */
  private getSupportPriority(
    requestingDept: string,
    role: 'examiner1' | 'examiner2' | 'backup'
  ): string[] {
    // 考官1只能从相关科室组内借调
    if (role === 'examiner1') {
      const specialGroup = this.config.specialDepartmentGroups.find(group =>
        group.includes(requestingDept)
      )

      if (specialGroup) {
        return specialGroup.filter(dept => dept !== requestingDept)
      }

      return [] // 考官1不能跨科室借调
    }

    // 考官2和备用可以从任何科室借调
    return (
      this.config.crossBorrowPriority[requestingDept] ||
      ['dept3', 'dept4', 'dept5', 'dept6', 'dept1', 'dept2', 'dept7'].filter(
        d => d !== requestingDept
      )
    )
  }

  /**
   * 从指定科室查找候选考官
   */
  private findCandidatesFromDepartment(
    department: string,
    request: SupportRequest,
    availableTeachers: any[]
  ): any[] {
    return availableTeachers.filter(teacher => {
      // 检查考官是否属于指定科室
      if (teacher.department !== department) {
        return false
      }

      // 检查是否在指定日期有考试安排
      // 这里应该调用dutyRotationService等
      // 实现，这里已经过滤了不可用的考官

      return true
    })
  }

  /**
   * 选择最佳候选考官
   */
  private selectBestCandidate(candidates: any[], request: SupportRequest): any {
    // 简单实现，选择工作量最少的考官
    // 实际应该结合smartScoringService进行评分
    return candidates.reduce((best, current) => {
      const bestWorkload = best.workload || 0
      const currentWorkload = current.workload || 0
      return currentWorkload < bestWorkload ? current : best
    })
  }

  /**
   * 请求应急支援
   */
  private async requestEmergencySupport(
    request: SupportRequest,
    availableTeachers: any[]
  ): Promise<SupportResponse> {
    process.env.NODE_ENV === 'development' && console.log(' 启动应急支援流程')

    // 应急支援可以放宽限制
    const emergencyCandidates = availableTeachers.filter(teacher => {
      // 应急情况下，考虑科室兼容性
      if (request.requiredRole === 'examiner1') {
        // 考官1应急情况下可以跨科室借调
        return this.isCompatibleDepartment(teacher.department, request.requestingDepartment)
      }

      // 考官2和备用可以从任何科室
      return teacher.department !== request.requestingDepartment
    })

    if (emergencyCandidates.length > 0) {
      const selectedTeacher = this.selectBestCandidate(emergencyCandidates, request)

      this.recordCrossBorrow({
        date: request.examDate,
        requestingDept: request.requestingDepartment,
        supportingDept: selectedTeacher.department,
        teacher: selectedTeacher,
        role: `emergency_${request.requiredRole}`,
        studentName: request.studentInfo.name,
      })

      return {
        success: true,
        supportingTeacher: selectedTeacher,
        supportingDepartment: selectedTeacher.department,
        reason: '应急支援成功',
      }
    }

    return {
      success: false,
      reason: '应急支援也无法找到合适考官',
    }
  }

  /**
   * 检查科室兼容性（用于应急支援）
   */
  private isCompatibleDepartment(teacherDept: string, studentDept: string): boolean {
    // 检查是否在同一科室组
    if (
      (teacherDept === '内科' && studentDept === '内科') ||
      (teacherDept === '外科' && studentDept === '外科')
    ) {
      return true
    }

    // 其他兼容性应该根据实际业务需求配置
    // 这里可以根据实际业务需求扩展
    return teacherDept === studentDept
  }

  /**
   * 建议替代方案
   */
  private suggestAlternatives(request: SupportRequest, availableTeachers: any[]): any[] {
    const alternatives: any[] = []

    // 建议调整考试日期
    alternatives.push({
      type: 'date_adjustment',
      description: '建议调整考试日期以获得更多可用考官',
      feasibility: 'MEDIUM',
    })

    // 放宽约束条件
    if (request.requiredRole === 'backup') {
      alternatives.push({
        type: 'constraint_relaxation',
        description: '考虑让考官2兼任备用，无备用考官',
        feasibility: 'HIGH',
      })
    }

    // 建议增加考官资源
    alternatives.push({
      type: 'resource_expansion',
      description: `建议为${request.requestingDepartment}科增加考官或培训其他考官`,
      feasibility: 'LOW',
    })

    return alternatives
  }

  /**
   * 记录跨科室支援
   */
  private recordCrossBorrow(record: CrossBorrowRecord): void {
    this.crossBorrowHistory.push(record)

    // 保持历史记录在合理范围内
    if (this.crossBorrowHistory.length > 1000) {
      this.crossBorrowHistory = this.crossBorrowHistory.slice(-500)
    }
  }

  /**
   * 获取跨科室支援统计
   */
  getCrossBorrowStatistics(dateRange?: { start: string; end: string }): {
    totalSupports: number
    byDepartment: Record<string, { requested: number; provided: number }>
    byRole: Record<string, number>
    successRate: number
    topSupportingDepts: Array<{ dept: string; count: number }>
  } {
    let records = this.crossBorrowHistory

    if (dateRange) {
      records = records.filter(r => r.date >= dateRange.start && r.date <= dateRange.end)
    }

    const byDepartment: Record<string, { requested: number; provided: number }> = {}
    const byRole: Record<string, number> = {}

    for (const record of records) {
      // 统计请求科室
      if (!byDepartment[record.requestingDept]) {
        byDepartment[record.requestingDept] = { requested: 0, provided: 0 }
      }
      byDepartment[record.requestingDept].requested++

      // 统计支援科室
      if (!byDepartment[record.supportingDept]) {
        byDepartment[record.supportingDept] = { requested: 0, provided: 0 }
      }
      byDepartment[record.supportingDept].provided++

      // 统计角色
      if (!byRole[record.role]) {
        byRole[record.role] = 0
      }
      byRole[record.role]++
    }

    // 计算最多提供支援的科室
    const topSupportingDepts = Object.entries(byDepartment)
      .map(([dept, stats]) => ({ dept, count: stats.provided }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalSupports: records.length,
      byDepartment,
      byRole,
      successRate: 1.0, // 记录的都是成功的支援
      topSupportingDepts,
    }
  }

  /**
   * 生成跨科室支援报告
   */
  generateSupportReport(dateRange: { start: string; end: string }): {
    summary: string
    statistics: any
    recommendations: string[]
    riskAssessment: {
      overDependentDepts: string[]
      underUtilizedDepts: string[]
      balanceScore: number
    }
  } {
    const stats = this.getCrossBorrowStatistics(dateRange)
    const recommendations: string[] = []

    // 识别过度依赖的科室
    const overDependentDepts = Object.entries(stats.byDepartment)
      .filter(([_, data]) => data.requested > data.provided * 2)
      .map(([dept, _]) => dept)

    // 识别未充分利用的科室
    const underUtilizedDepts = Object.entries(stats.byDepartment)
      .filter(([_, data]) => data.provided === 0 && data.requested === 0)
      .map(([dept, _]) => dept)

    // 生成建议
    if (overDependentDepts.length > 0) {
      recommendations.push(`${overDependentDepts.join('、')}科过度依赖外部支援，建议增加考官配置`)
    }

    if (underUtilizedDepts.length > 0) {
      recommendations.push(`${underUtilizedDepts.join('、')}科可以提供更多跨科室支援`)
    }

    if (stats.totalSupports > 50) {
      recommendations.push('跨科室支援频繁，建议优化考官配置或调整安排')
    }

    // 计算平衡分数
    const deptCount = Object.keys(stats.byDepartment).length
    const avgRequested = stats.totalSupports / deptCount
    const variance =
      Object.values(stats.byDepartment).reduce(
        (sum, data) => sum + Math.pow(data.requested - avgRequested, 2),
        0
      ) / deptCount
    const balanceScore = Math.max(0, 100 - variance * 10)

    return {
      summary: `在此期间共完成${stats.totalSupports}次跨科室支援，涉及${Object.keys(stats.byDepartment).length}个科室`,
      statistics: stats,
      recommendations,
      riskAssessment: {
        overDependentDepts,
        underUtilizedDepts,
        balanceScore,
      },
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CrossDepartmentConfig>): void {
    this.config = { ...this.config, ...newConfig }
    process.env.NODE_ENV === 'development' && console.log(' 跨科室支援配置已更新')
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.crossBorrowHistory = []
    process.env.NODE_ENV === 'development' && console.log(' 跨科室支援历史记录已清空')
  }
}

// 导出服务实例
export const crossDepartmentService = new CrossDepartmentService()
