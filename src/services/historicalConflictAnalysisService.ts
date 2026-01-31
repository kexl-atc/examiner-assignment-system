/**
 * 历史冲突数据分析服务
 * 负责收集、分析和存储历史冲突数据，为智能时间选择提供数据支持
 */

export interface ConflictRecord {
  id: string
  date: string
  conflictType:
    | 'DUTY_CONFLICT'
    | 'RESOURCE_SHORTAGE'
    | 'DEPARTMENT_IMBALANCE'
    | 'SCHEDULE_OVERLAP'
    | 'OTHER'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  affectedStudents: string[]
  affectedTeachers: string[]
  affectedDepartments: string[]
  affectedGroups: string[]
  resolution: string
  resolutionTime: number // 解决时间（分钟）
  impact: {
    delayMinutes: number
    rescheduled: boolean
    resourcesReallocated: boolean
    studentsAffected: number
    teachersAffected: number
  }
  metadata: {
    dayOfWeek: number
    dayOfMonth: number
    month: number
    quarter: number
    isHoliday: boolean
    isMonthStart: boolean
    isMonthEnd: boolean
    dutyGroup: string
    weatherCondition?: string
  }
  createdAt: string
  resolvedAt?: string
}

export interface ConflictPattern {
  id: string
  patternType: 'TEMPORAL' | 'RESOURCE' | 'ORGANIZATIONAL' | 'SEASONAL'
  name: string
  description: string
  frequency: number // 0-1
  severity: number // 0-1
  confidence: number // 0-1
  triggers: string[]
  conditions: {
    dayOfWeek?: number[]
    dayOfMonth?: number[]
    months?: number[]
    dutyGroups?: string[]
    departments?: string[]
    minStudents?: number
    maxStudents?: number
  }
  historicalOccurrences: number
  lastOccurrence: string
  predictiveAccuracy: number
  mitigationStrategies: string[]
}

export interface ConflictAnalysisResult {
  totalConflicts: number
  conflictsByType: Record<string, number>
  conflictsBySeverity: Record<string, number>
  averageResolutionTime: number
  mostProblematicDates: Array<{
    date: string
    conflictCount: number
    averageSeverity: number
  }>
  identifiedPatterns: ConflictPattern[]
  recommendations: Array<{
    type: 'AVOIDANCE' | 'MITIGATION' | 'PREPARATION'
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    description: string
    applicableConditions: string[]
  }>
  riskFactors: Array<{
    factor: string
    riskLevel: number
    description: string
  }>
}

class HistoricalConflictAnalysisService {
  private conflictRecords: ConflictRecord[] = []
  private identifiedPatterns: ConflictPattern[] = []
  private analysisCache: Map<string, ConflictAnalysisResult> = new Map()

  constructor() {
    this.initializeHistoricalData()
  }

  /**
   * 记录新的冲突事件
   */
  async recordConflict(
    conflict: Omit<ConflictRecord, 'id' | 'metadata' | 'createdAt'>
  ): Promise<string> {
    const conflictRecord: ConflictRecord = {
      ...conflict,
      id: this.generateConflictId(),
      metadata: this.generateMetadata(conflict.date),
      createdAt: new Date().toISOString(),
    }

    this.conflictRecords.push(conflictRecord)

    // 清除相关缓存
    this.clearAnalysisCache()

    // 触发模式重新识别
    await this.updateConflictPatterns()

    process.env.NODE_ENV === 'development' && console.log(`📝 记录新冲突事件: ${conflict.conflictType} - ${conflict.severity}`)

    return conflictRecord.id
  }

  /**
   * 分析历史冲突数据
   */
  async analyzeHistoricalConflicts(dateRange?: {
    start: string
    end: string
  }): Promise<ConflictAnalysisResult> {
    const cacheKey = dateRange ? `${dateRange.start}-${dateRange.end}` : 'all'

    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!
    }

    process.env.NODE_ENV === 'development' && console.log('📊 开始分析历史冲突数据...')

    let relevantConflicts = this.conflictRecords

    if (dateRange) {
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      relevantConflicts = this.conflictRecords.filter(record => {
        const recordDate = new Date(record.date)
        return recordDate >= startDate && recordDate <= endDate
      })
    }

    const result: ConflictAnalysisResult = {
      totalConflicts: relevantConflicts.length,
      conflictsByType: this.analyzeConflictsByType(relevantConflicts),
      conflictsBySeverity: this.analyzeConflictsBySeverity(relevantConflicts),
      averageResolutionTime: this.calculateAverageResolutionTime(relevantConflicts),
      mostProblematicDates: this.identifyProblematicDates(relevantConflicts),
      identifiedPatterns: await this.identifyConflictPatterns(relevantConflicts),
      recommendations: this.generateRecommendations(relevantConflicts),
      riskFactors: this.identifyRiskFactors(relevantConflicts),
    }

    this.analysisCache.set(cacheKey, result)

    process.env.NODE_ENV === 'development' && console.log(`✅ 冲突分析完成，共分析${result.totalConflicts}条记录`)

    return result
  }

  /**
   * 预测特定日期的冲突风险
   */
  async predictConflictRisk(
    date: string,
    context: {
      students: any[]
      teachers: any[]
      dutySchedule?: any
    }
  ): Promise<{
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    riskScore: number // 0-100
    riskFactors: Array<{
      factor: string
      contribution: number
      description: string
    }>
    applicablePatterns: ConflictPattern[]
    recommendations: string[]
  }> {
    process.env.NODE_ENV === 'development' && console.log(`🔮 预测${date}的冲突风险...`)

    const metadata = this.generateMetadata(date)
    let riskScore = 0
    const riskFactors = []
    const applicablePatterns = []

    // 1. 基于历史模式的风险评估
    for (const pattern of this.identifiedPatterns) {
      if (this.isPatternApplicable(pattern, date, metadata, context)) {
        const patternRisk = pattern.frequency * pattern.severity * pattern.confidence * 100
        riskScore += patternRisk

        applicablePatterns.push(pattern)
        riskFactors.push({
          factor: pattern.name,
          contribution: patternRisk,
          description: pattern.description,
        })
      }
    }

    // 2. 基于当前条件的风险评估
    const contextRisk = this.assessContextualRisk(date, metadata, context)
    riskScore += contextRisk.score
    riskFactors.push(...contextRisk.factors)

    // 3. 基于历史同期数据的风险评估
    const historicalRisk = this.assessHistoricalRisk(date, metadata)
    riskScore += historicalRisk.score
    riskFactors.push(...historicalRisk.factors)

    // 限制风险评分在0-100范围内
    riskScore = Math.min(100, Math.max(0, riskScore))

    // 确定风险等级
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    if (riskScore >= 80) riskLevel = 'CRITICAL'
    else if (riskScore >= 60) riskLevel = 'HIGH'
    else if (riskScore >= 40) riskLevel = 'MEDIUM'
    else riskLevel = 'LOW'

    const recommendations = this.generateRiskMitigationRecommendations(
      riskLevel,
      applicablePatterns,
      riskFactors
    )

    process.env.NODE_ENV === 'development' && console.log(`📈 ${date}冲突风险评估完成: ${riskLevel} (${riskScore.toFixed(1)}分)`)

    return {
      riskLevel,
      riskScore,
      riskFactors: riskFactors.sort((a, b) => b.contribution - a.contribution).slice(0, 10),
      applicablePatterns,
      recommendations,
    }
  }

  /**
   * 获取高频冲突时段
   */
  getHighConflictPeriods(): Array<{
    period: string
    conflictCount: number
    averageSeverity: number
    commonTypes: string[]
    avoidanceRecommendation: string
  }> {
    const periodConflicts = new Map<string, ConflictRecord[]>()

    // 按时段分组冲突记录
    this.conflictRecords.forEach(record => {
      const period = this.categorizePeriod(record.metadata)
      if (!periodConflicts.has(period)) {
        periodConflicts.set(period, [])
      }
      periodConflicts.get(period)!.push(record)
    })

    const highConflictPeriods = []

    for (const [period, conflicts] of periodConflicts) {
      if (conflicts.length >= 3) {
        // 至少3次冲突才认为是高频
        const severitySum = conflicts.reduce((sum, c) => {
          const severityScore = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[c.severity]
          return sum + severityScore
        }, 0)

        const typeCount = new Map<string, number>()
        conflicts.forEach(c => {
          typeCount.set(c.conflictType, (typeCount.get(c.conflictType) || 0) + 1)
        })

        const commonTypes = Array.from(typeCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type]) => type)

        highConflictPeriods.push({
          period,
          conflictCount: conflicts.length,
          averageSeverity: severitySum / conflicts.length,
          commonTypes,
          avoidanceRecommendation: this.generateAvoidanceRecommendation(period, commonTypes),
        })
      }
    }

    return highConflictPeriods.sort((a, b) => b.conflictCount - a.conflictCount)
  }

  /**
   * 获取冲突模式
   */
  getConflictPatterns(): ConflictPattern[] {
    return [...this.identifiedPatterns]
  }

  /**
   * 更新冲突解决状态
   */
  async resolveConflict(
    conflictId: string,
    resolution: string,
    resolutionTime: number
  ): Promise<void> {
    const conflict = this.conflictRecords.find(c => c.id === conflictId)
    if (conflict) {
      conflict.resolution = resolution
      conflict.resolutionTime = resolutionTime
      conflict.resolvedAt = new Date().toISOString()

      // 清除缓存
      this.clearAnalysisCache()

      process.env.NODE_ENV === 'development' && console.log(`✅ 冲突${conflictId}已解决: ${resolution}`)
    }
  }

  // 私有方法
  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateMetadata(date: string): ConflictRecord['metadata'] {
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    const dayOfMonth = dateObj.getDate()
    const month = dateObj.getMonth() + 1
    const quarter = Math.ceil(month / 3)

    return {
      dayOfWeek,
      dayOfMonth,
      month,
      quarter,
      isHoliday: this.isHoliday(date),
      isMonthStart: dayOfMonth <= 5,
      isMonthEnd: dayOfMonth >= 25,
      dutyGroup: this.getDutyGroup(date),
    }
  }

  private analyzeConflictsByType(conflicts: ConflictRecord[]): Record<string, number> {
    const typeCount: Record<string, number> = {}
    conflicts.forEach(conflict => {
      typeCount[conflict.conflictType] = (typeCount[conflict.conflictType] || 0) + 1
    })
    return typeCount
  }

  private analyzeConflictsBySeverity(conflicts: ConflictRecord[]): Record<string, number> {
    const severityCount: Record<string, number> = {}
    conflicts.forEach(conflict => {
      severityCount[conflict.severity] = (severityCount[conflict.severity] || 0) + 1
    })
    return severityCount
  }

  private calculateAverageResolutionTime(conflicts: ConflictRecord[]): number {
    const resolvedConflicts = conflicts.filter(c => c.resolutionTime > 0)
    if (resolvedConflicts.length === 0) return 0

    const totalTime = resolvedConflicts.reduce((sum, c) => sum + c.resolutionTime, 0)
    return totalTime / resolvedConflicts.length
  }

  private identifyProblematicDates(conflicts: ConflictRecord[]): Array<{
    date: string
    conflictCount: number
    averageSeverity: number
  }> {
    const dateConflicts = new Map<string, ConflictRecord[]>()

    conflicts.forEach(conflict => {
      if (!dateConflicts.has(conflict.date)) {
        dateConflicts.set(conflict.date, [])
      }
      dateConflicts.get(conflict.date)!.push(conflict)
    })

    const problematicDates = []
    for (const [date, dateConflictList] of dateConflicts) {
      if (dateConflictList.length >= 2) {
        // 至少2个冲突
        const severitySum = dateConflictList.reduce((sum, c) => {
          const severityScore = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[c.severity]
          return sum + severityScore
        }, 0)

        problematicDates.push({
          date,
          conflictCount: dateConflictList.length,
          averageSeverity: severitySum / dateConflictList.length,
        })
      }
    }

    return problematicDates.sort((a, b) => b.conflictCount - a.conflictCount).slice(0, 10)
  }

  private async identifyConflictPatterns(conflicts: ConflictRecord[]): Promise<ConflictPattern[]> {
    const patterns: ConflictPattern[] = []

    // 1. 时间模式识别
    const temporalPatterns = this.identifyTemporalPatterns(conflicts)
    patterns.push(...temporalPatterns)

    // 2. 资源模式识别
    const resourcePatterns = this.identifyResourcePatterns(conflicts)
    patterns.push(...resourcePatterns)

    // 3. 组织模式识别
    const organizationalPatterns = this.identifyOrganizationalPatterns(conflicts)
    patterns.push(...organizationalPatterns)

    return patterns
  }

  private identifyTemporalPatterns(conflicts: ConflictRecord[]): ConflictPattern[] {
    const patterns: ConflictPattern[] = []

    // 周一模式
    const mondayConflicts = conflicts.filter(c => c.metadata.dayOfWeek === 1)
    if (mondayConflicts.length >= 3) {
      patterns.push({
        id: 'monday_pattern',
        patternType: 'TEMPORAL',
        name: '周一高冲突模式',
        description: '周一通常资源紧张，冲突频发',
        frequency: mondayConflicts.length / conflicts.length,
        severity: this.calculatePatternSeverity(mondayConflicts),
        confidence: Math.min(0.9, mondayConflicts.length / 10),
        triggers: ['周一', '资源紧张', '轮值安排'],
        conditions: { dayOfWeek: [1] },
        historicalOccurrences: mondayConflicts.length,
        lastOccurrence: mondayConflicts[mondayConflicts.length - 1]?.date || '',
        predictiveAccuracy: 0.8,
        mitigationStrategies: ['提前资源预留', '避开周一安排', '增加备用考官'],
      })
    }

    // 月初模式
    const monthStartConflicts = conflicts.filter(c => c.metadata.isMonthStart)
    if (monthStartConflicts.length >= 2) {
      patterns.push({
        id: 'month_start_pattern',
        patternType: 'TEMPORAL',
        name: '月初冲突模式',
        description: '月初可能有特殊安排导致冲突',
        frequency: monthStartConflicts.length / conflicts.length,
        severity: this.calculatePatternSeverity(monthStartConflicts),
        confidence: Math.min(0.7, monthStartConflicts.length / 5),
        triggers: ['月初', '特殊安排', '轮值调整'],
        conditions: { dayOfMonth: [1, 2, 3, 4, 5] },
        historicalOccurrences: monthStartConflicts.length,
        lastOccurrence: monthStartConflicts[monthStartConflicts.length - 1]?.date || '',
        predictiveAccuracy: 0.6,
        mitigationStrategies: ['月初避开安排', '提前沟通协调', '灵活调整时间'],
      })
    }

    return patterns
  }

  private identifyResourcePatterns(conflicts: ConflictRecord[]): ConflictPattern[] {
    const patterns: ConflictPattern[] = []

    // 资源不足模式
    const resourceConflicts = conflicts.filter(c => c.conflictType === 'RESOURCE_SHORTAGE')
    if (resourceConflicts.length >= 3) {
      patterns.push({
        id: 'resource_shortage_pattern',
        patternType: 'RESOURCE',
        name: '资源不足模式',
        description: '考官资源不足导致的冲突',
        frequency: resourceConflicts.length / conflicts.length,
        severity: this.calculatePatternSeverity(resourceConflicts),
        confidence: Math.min(0.9, resourceConflicts.length / 8),
        triggers: ['考官不足', '轮值冲突', '科室不平衡'],
        conditions: {},
        historicalOccurrences: resourceConflicts.length,
        lastOccurrence: resourceConflicts[resourceConflicts.length - 1]?.date || '',
        predictiveAccuracy: 0.85,
        mitigationStrategies: ['增加备用考官', '跨科室调配', '分批安排'],
      })
    }

    return patterns
  }

  private identifyOrganizationalPatterns(conflicts: ConflictRecord[]): ConflictPattern[] {
    const patterns: ConflictPattern[] = []

    // 科室不平衡模式
    const deptConflicts = conflicts.filter(c => c.conflictType === 'DEPARTMENT_IMBALANCE')
    if (deptConflicts.length >= 2) {
      patterns.push({
        id: 'department_imbalance_pattern',
        patternType: 'ORGANIZATIONAL',
        name: '科室不平衡模式',
        description: '科室间资源分配不均导致的冲突',
        frequency: deptConflicts.length / conflicts.length,
        severity: this.calculatePatternSeverity(deptConflicts),
        confidence: Math.min(0.8, deptConflicts.length / 5),
        triggers: ['科室不平衡', '资源分配', '考官分布'],
        conditions: {},
        historicalOccurrences: deptConflicts.length,
        lastOccurrence: deptConflicts[deptConflicts.length - 1]?.date || '',
        predictiveAccuracy: 0.7,
        mitigationStrategies: ['平衡科室分配', '跨科室协调', '提前规划'],
      })
    }

    return patterns
  }

  private calculatePatternSeverity(conflicts: ConflictRecord[]): number {
    if (conflicts.length === 0) return 0

    const severitySum = conflicts.reduce((sum, c) => {
      const severityScore = { LOW: 0.25, MEDIUM: 0.5, HIGH: 0.75, CRITICAL: 1.0 }[c.severity]
      return sum + severityScore
    }, 0)

    return severitySum / conflicts.length
  }

  private generateRecommendations(
    conflicts: ConflictRecord[]
  ): ConflictAnalysisResult['recommendations'] {
    const recommendations = []

    // 基于冲突类型的建议
    const typeCount = this.analyzeConflictsByType(conflicts)

    if (typeCount['DUTY_CONFLICT'] > 0) {
      recommendations.push({
        type: 'AVOIDANCE' as const,
        priority: 'HIGH' as const,
        description: '避开轮值日安排考试，或提前协调轮值调整',
        applicableConditions: ['轮值日冲突', '白班考官不足'],
      })
    }

    if (typeCount['RESOURCE_SHORTAGE'] > 0) {
      recommendations.push({
        type: 'PREPARATION' as const,
        priority: 'HIGH' as const,
        description: '提前进行资源预检，确保考官充足',
        applicableConditions: ['考官资源紧张', '多科室同时安排'],
      })
    }

    return recommendations
  }

  private identifyRiskFactors(conflicts: ConflictRecord[]): ConflictAnalysisResult['riskFactors'] {
    const riskFactors = []

    // 周一风险
    const mondayConflicts = conflicts.filter(c => c.metadata.dayOfWeek === 1)
    if (mondayConflicts.length > 0) {
      riskFactors.push({
        factor: '周一安排',
        riskLevel: mondayConflicts.length / conflicts.length,
        description: '周一资源紧张，冲突风险较高',
      })
    }

    // 轮值冲突风险
    const dutyConflicts = conflicts.filter(c => c.conflictType === 'DUTY_CONFLICT')
    if (dutyConflicts.length > 0) {
      riskFactors.push({
        factor: '轮值冲突',
        riskLevel: dutyConflicts.length / conflicts.length,
        description: '轮值日与考试安排冲突',
      })
    }

    return riskFactors.sort((a, b) => b.riskLevel - a.riskLevel)
  }

  private isPatternApplicable(
    pattern: ConflictPattern,
    date: string,
    metadata: ConflictRecord['metadata'],
    context: any
  ): boolean {
    const conditions = pattern.conditions

    if (conditions.dayOfWeek && !conditions.dayOfWeek.includes(metadata.dayOfWeek)) {
      return false
    }

    if (conditions.dayOfMonth && !conditions.dayOfMonth.includes(metadata.dayOfMonth)) {
      return false
    }

    if (conditions.months && !conditions.months.includes(metadata.month)) {
      return false
    }

    if (conditions.dutyGroups && !conditions.dutyGroups.includes(metadata.dutyGroup)) {
      return false
    }

    if (conditions.minStudents && context.students.length < conditions.minStudents) {
      return false
    }

    if (conditions.maxStudents && context.students.length > conditions.maxStudents) {
      return false
    }

    return true
  }

  private assessContextualRisk(
    date: string,
    metadata: ConflictRecord['metadata'],
    context: any
  ): {
    score: number
    factors: Array<{ factor: string; contribution: number; description: string }>
  } {
    let score = 0
    const factors = []

    // 安全检查context参数
    if (!context || !context.students || !context.teachers) {
      console.warn('Context数据不完整，使用默认风险评估')
      return {
        score: 30, // 默认中等风险
        factors: [
          {
            factor: '数据不完整',
            contribution: 30,
            description: '缺少学员或考官数据，使用默认风险评估',
          },
        ],
      }
    }

    // 学员数量风险
    if (context.students.length > 10) {
      const risk = Math.min(20, (context.students.length - 10) * 2)
      score += risk
      factors.push({
        factor: '学员数量过多',
        contribution: risk,
        description: `${context.students.length}名学员，资源需求大`,
      })
    }

    // 考官数量风险
    if (context.students.length > 0) {
      const teacherStudentRatio = context.teachers.length / context.students.length
      if (teacherStudentRatio < 2) {
        const risk = (2 - teacherStudentRatio) * 15
        score += risk
        factors.push({
          factor: '师生比不足',
          contribution: risk,
          description: `师生比${teacherStudentRatio.toFixed(1)}:1，低于推荐值2:1`,
        })
      }
    }

    return { score, factors }
  }

  private assessHistoricalRisk(
    date: string,
    metadata: ConflictRecord['metadata']
  ): {
    score: number
    factors: Array<{ factor: string; contribution: number; description: string }>
  } {
    let score = 0
    const factors = []

    // 同期历史冲突
    const sameWeekdayConflicts = this.conflictRecords.filter(
      c => c.metadata.dayOfWeek === metadata.dayOfWeek
    )

    if (sameWeekdayConflicts.length > 0) {
      const risk = Math.min(15, sameWeekdayConflicts.length * 3)
      score += risk
      factors.push({
        factor: '同星期历史冲突',
        contribution: risk,
        description: `该星期历史上发生过${sameWeekdayConflicts.length}次冲突`,
      })
    }

    return { score, factors }
  }

  private generateRiskMitigationRecommendations(
    riskLevel: string,
    patterns: ConflictPattern[],
    factors: any[]
  ): string[] {
    const recommendations = []

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendations.push('强烈建议选择其他日期或调整安排')
      recommendations.push('如必须安排，请提前进行详细的资源预检')
    }

    patterns.forEach(pattern => {
      recommendations.push(...pattern.mitigationStrategies)
    })

    return [...new Set(recommendations)] // 去重
  }

  private categorizePeriod(metadata: ConflictRecord['metadata']): string {
    if (metadata.dayOfWeek === 1) return '周一'
    if (metadata.dayOfWeek === 5) return '周五'
    if (metadata.isMonthStart) return '月初'
    if (metadata.isMonthEnd) return '月末'
    if (metadata.isHoliday) return '节假日'
    return '常规时段'
  }

  private generateAvoidanceRecommendation(period: string, commonTypes: string[]): string {
    const typeDescriptions: Record<string, string> = {
      DUTY_CONFLICT: '轮值冲突',
      RESOURCE_SHORTAGE: '资源不足',
      DEPARTMENT_IMBALANCE: '科室不平衡',
      SCHEDULE_OVERLAP: '时间重叠',
    }

    const typeNames = commonTypes.map(type => typeDescriptions[type] || type).join('、')
    return `${period}易发生${typeNames}，建议避开或提前准备`
  }

  private isHoliday(date: string): boolean {
    // 简化实现，实际应该查询节假日数据库
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    return dayOfWeek === 0 || dayOfWeek === 6 // 周末
  }

  private getDutyGroup(date: string): string {
    // 简化实现，实际应该查询轮值安排
    const groups = ['一组', '二组', '三组', '四组']
    const dateObj = new Date(date)
    const daysSinceEpoch = Math.floor(dateObj.getTime() / (1000 * 60 * 60 * 24))
    return groups[daysSinceEpoch % 4]
  }

  private clearAnalysisCache(): void {
    this.analysisCache.clear()
  }

  private async updateConflictPatterns(): Promise<void> {
    // 重新识别模式
    this.identifiedPatterns = await this.identifyConflictPatterns(this.conflictRecords)
  }

  /**
   * 初始化历史数据（示例数据）
   */
  private initializeHistoricalData(): void {
    process.env.NODE_ENV === 'development' && console.log('📚 初始化历史冲突数据...')

    // 添加一些示例冲突记录
    const sampleConflicts: Omit<ConflictRecord, 'id' | 'metadata' | 'createdAt'>[] = [
      {
        date: '2024-01-08', // 周一
        conflictType: 'DUTY_CONFLICT',
        severity: 'HIGH',
        description: '一组轮值白班，3名考官无法担任考官',
        affectedStudents: ['学员A', '学员B'],
        affectedTeachers: ['考官1', '考官2', '考官3'],
        affectedDepartments: ['一科'],
        affectedGroups: ['一组'],
        resolution: '调整轮值安排',
        resolutionTime: 45,
        impact: {
          delayMinutes: 30,
          rescheduled: true,
          resourcesReallocated: true,
          studentsAffected: 2,
          teachersAffected: 3,
        },
      },
      {
        date: '2024-01-15', // 周一
        conflictType: 'RESOURCE_SHORTAGE',
        severity: 'MEDIUM',
        description: '考官资源不足，无法满足考试需求',
        affectedStudents: ['学员C'],
        affectedTeachers: [],
        affectedDepartments: ['二科'],
        affectedGroups: [],
        resolution: '跨科室调配考官',
        resolutionTime: 20,
        impact: {
          delayMinutes: 15,
          rescheduled: false,
          resourcesReallocated: true,
          studentsAffected: 1,
          teachersAffected: 2,
        },
      },
    ]

    // 批量添加示例数据
    sampleConflicts.forEach(conflict => {
      const conflictRecord: ConflictRecord = {
        ...conflict,
        id: this.generateConflictId(),
        metadata: this.generateMetadata(conflict.date),
        createdAt: new Date(conflict.date).toISOString(),
      }
      this.conflictRecords.push(conflictRecord)
    })

    process.env.NODE_ENV === 'development' && console.log(`✅ 初始化完成，加载${this.conflictRecords.length}条历史记录`)
  }
}

export { HistoricalConflictAnalysisService }
export const historicalConflictAnalysisService = new HistoricalConflictAnalysisService()
export default historicalConflictAnalysisService
