import type { Teacher } from '../types'
import { normalizeDeptToShort } from '../utils/departmentNormalizer'

// 临时定义缺失的类型
interface ScheduleResult {
  id?: string
  student: string
  department: string
  examDate: string
  examiner1_1?: string
  examiner1_2?: string
  backup1?: string
  examiner2_1?: string
  examiner2_2?: string
  backup2?: string
}

interface ConstraintConfig {
  softConstraints: {
    allowDept37CrossUse?: boolean
    preferNoGroupTeachers?: boolean
    preferNightShiftTeachers?: boolean
    preferFirstRestDayTeachers?: boolean
    preferSecondRestDayTeachers?: boolean
    [key: string]: any
  }
  [key: string]: any
}

export interface SmartRecommendation {
  teacher: Teacher
  score: number
  priority: 'high' | 'medium' | 'low'
  reasons: RecommendationReason[]
  warnings: RecommendationWarning[]
  confidence: number
}

export interface RecommendationReason {
  type:
    | 'department_match'
    | 'workload_balance'
    | 'specialty_match'
    | 'night_shift_preferred'
    | 'rest_day_optimal'
    | 'availability'
    | 'experience'
    | 'performance'
    | 'efficiency'
    | 'preference'
  text: string
  weight: number
  impact: 'positive' | 'neutral' | 'negative'
}

export interface RecommendationWarning {
  type:
    | 'workload_high'
    | 'department_mismatch'
    | 'availability_conflict'
    | 'constraint_violation'
    | 'performance_issue'
    | 'schedule_conflict'
  text: string
  severity: 'high' | 'medium' | 'low'
}

export interface ConflictDetection {
  type:
    | 'schedule_conflict'
    | 'workload_overload'
    | 'department_rule'
    | 'availability'
    | 'constraint_violation'
    | 'resource_shortage'
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  suggestions: string[]
  autoResolvable: boolean
  resolutionSteps?: string[]
}

export interface ManualEditContext {
  editingRecord: ScheduleResult
  editingField: string
  currentValue?: string
  examDate: string
  studentInfo: {
    name: string
    department: string
    level: string
  }
  scheduleContext: {
    existingAssignments: ScheduleResult[]
    timeSlot: 'day1' | 'day2'
    role: 'main' | 'backup'
  }
}

export interface RecommendationOptions {
  includeUnavailable?: boolean
  maxRecommendations?: number
  prioritizeExperience?: boolean
  balanceWorkload?: boolean
  respectPreferences?: boolean
  strictDepartmentMatch?: boolean
}

class SmartRecommendationService {
  private constraintConfig: ConstraintConfig | null = null
  private teacherPerformanceData: Map<string, any> = new Map()
  private workloadCache: Map<string, number> = new Map()

  /**
   * 设置约束配置
   */
  setConstraintConfig(config: ConstraintConfig) {
    this.constraintConfig = config
  }

  /**
   * 更新考官工作量缓存
   */
  updateWorkloadCache(teacherId: string, workload: number) {
    this.workloadCache.set(teacherId, workload)
  }

  /**
   * 生成智能推荐
   */
  async generateRecommendations(
    context: ManualEditContext,
    availableTeachers: Teacher[],
    options: RecommendationOptions = {}
  ): Promise<SmartRecommendation[]> {
    const {
      maxRecommendations = 5,
      includeUnavailable = false,
      prioritizeExperience = true,
      balanceWorkload = true,
      respectPreferences = true,
      strictDepartmentMatch = false,
    } = options

    // 过滤可用考官
    let candidateTeachers = includeUnavailable
      ? availableTeachers
      : availableTeachers.filter(t => this.isTeacherAvailable(t, context))

    // 生成推荐
    const recommendations: SmartRecommendation[] = []

    for (const teacher of candidateTeachers) {
      const recommendation = await this.evaluateTeacher(teacher, context, {
        prioritizeExperience,
        balanceWorkload,
        respectPreferences,
        strictDepartmentMatch,
      })

      if (recommendation.score > 30) {
        // 最低分数阈值
        recommendations.push(recommendation)
      }
    }

    // 排序并限制数量
    return recommendations.sort((a, b) => b.score - a.score).slice(0, maxRecommendations)
  }

  /**
   * 检测冲突
   */
  async detectConflicts(
    teacher: Teacher,
    context: ManualEditContext
  ): Promise<ConflictDetection[]> {
    const conflicts: ConflictDetection[] = []

    // 检查可用性冲突
    if (!this.isTeacherAvailable(teacher, context)) {
      conflicts.push({
        type: 'availability',
        severity: 'high',
        title: '考官不可用',
        description: `${teacher.name}在${context.examDate}不可用`,
        suggestions: ['选择其他可用考官', '调整考试时间', '联系考官确认可用性'],
        autoResolvable: false,
      })
    }

    // 检查工作量冲突
    const currentWorkload = this.workloadCache.get(teacher.id) || 0
    if (currentWorkload > 6) {
      conflicts.push({
        type: 'workload_overload',
        severity: 'medium',
        title: '工作量过载',
        description: `${teacher.name}当前工作量为${currentWorkload}，超过建议上限`,
        suggestions: ['考虑工作量较轻的考官', '重新分配现有工作', '申请增加考官资源'],
        autoResolvable: true,
        resolutionSteps: ['分析考官当前排班', '识别可调整的排班', '重新分配工作量'],
      })
    }

    // 检查科室规则冲突
    if (
      this.constraintConfig?.softConstraints.examiner1SameDept &&
      teacher.department !== context.studentInfo.department &&
      context.editingField.includes('examiner')
    ) {
      conflicts.push({
        type: 'department_rule',
        severity: 'low',
        title: '科室匹配规则',
        description: `${teacher.name}来自${teacher.department}，与学员科室${context.studentInfo.department}不匹配`,
        suggestions: ['优先选择同科室考官', '确认跨科室安排的合理性', '获取科室主任批准'],
        autoResolvable: true,
        resolutionSteps: ['搜索同科室可用考官', '评估跨科室安排的影响', '记录特殊安排原因'],
      })
    }

    // 检查时间冲突
    const scheduleConflict = await this.checkScheduleConflict(teacher, context)
    if (scheduleConflict) {
      conflicts.push(scheduleConflict)
    }

    // 检查约束违规
    const constraintViolations = await this.checkConstraintViolations(teacher, context)
    conflicts.push(...constraintViolations)

    return conflicts
  }

  /**
   * 获取修改建议
   */
  async getManualEditSuggestions(
    context: ManualEditContext,
    availableTeachers: Teacher[]
  ): Promise<{
    quickFixes: SmartRecommendation[]
    alternatives: SmartRecommendation[]
    insights: string[]
  }> {
    const recommendations = await this.generateRecommendations(context, availableTeachers)

    // 分类推荐
    const quickFixes = recommendations.filter(r => r.priority === 'high' && r.warnings.length === 0)
    const alternatives = recommendations.filter(r => r.priority !== 'high' || r.warnings.length > 0)

    // 生成洞察
    const insights = this.generateInsights(context, recommendations)

    return {
      quickFixes: quickFixes.slice(0, 3),
      alternatives: alternatives.slice(0, 5),
      insights,
    }
  }

  /**
   * 评估考官适合度
   */
  private async evaluateTeacher(
    teacher: Teacher,
    context: ManualEditContext,
    options: any
  ): Promise<SmartRecommendation> {
    const reasons: RecommendationReason[] = []
    const warnings: RecommendationWarning[] = []
    let score = 50 // 基础分数
    let confidence = 0.7 // 基础置信度

    // 可用性检查
    if (this.isTeacherAvailable(teacher, context)) {
      reasons.push({
        type: 'availability',
        text: '时间可用',
        weight: 10,
        impact: 'positive',
      })
      score += 10
      confidence += 0.1
    } else {
      warnings.push({
        type: 'availability_conflict',
        text: '时间冲突',
        severity: 'high',
      })
      score -= 20
      confidence -= 0.2
    }

    // 确定角色类型
    const isExaminer1 = context.editingField.includes('examiner1')
    const isExaminer2 = context.editingField.includes('examiner2')
    const isBackup = context.editingField.includes('backup')

    // 科室匹配逻辑 (HC2/HC7)
    const studentDept = normalizeDeptToShort(context.studentInfo.department)
    const teacherDept = normalizeDeptToShort(teacher.department)
    const isSameDept = studentDept === teacherDept

    if (isExaminer1) {
      // 考官1必须同科室 (HC2)
      if (isSameDept) {
        reasons.push({
          type: 'department_match',
          text: '科室匹配 (HC2)',
          weight: 50,
          impact: 'positive',
        })
        score += 50
        confidence += 0.3
      } else {
        // 检查三七互通
        const isCross37 = (studentDept === '三' && teacherDept === '七') || (studentDept === '七' && teacherDept === '三')
        if (isCross37) {
          reasons.push({
            type: 'department_match',
            text: '三七室互通 (HC2)',
            weight: 40,
            impact: 'positive',
          })
          score += 40
          confidence += 0.2
        } else {
          warnings.push({
            type: 'constraint_violation',
            text: 'HC2硬约束违反：考官1需同科室',
            severity: 'high',
          })
          score -= 100 // 严重惩罚
        }
      }
    } else if (isExaminer2) {
      // 考官2必须不同科室 (HC7)
      if (isSameDept) {
        warnings.push({
          type: 'constraint_violation',
          text: 'HC7硬约束违反：考官2需不同科室',
          severity: 'high',
        })
        score -= 100 // 严重惩罚
      } else {
        // 考官2不同科室是基本要求，不加分，但也不扣分
        // 可以稍微加一点分表示"合规"
        reasons.push({
          type: 'department_match',
          text: '科室合规 (HC7)',
          weight: 5,
          impact: 'positive',
        })
        score += 5
      }
    } else if (isBackup) {
      // 备份考官最好不同科室 (HC8b建议)
      if (isSameDept) {
        warnings.push({
          type: 'constraint_violation',
          text: '建议备份考官来自不同科室',
          severity: 'medium',
        })
        score -= 30
      }
    } else {
      // 默认逻辑（保留原有，作为回退）
      if (isSameDept) {
        reasons.push({
          type: 'department_match',
          text: '科室完全匹配',
          weight: 20,
          impact: 'positive',
        })
        score += 20
        confidence += 0.15
      } else {
        // 检查相关科室
        const relatedDepts = this.getRelatedDepartments(teacher.department)
        if (relatedDepts.some(d => normalizeDeptToShort(d) === studentDept)) {
          reasons.push({
            type: 'department_match',
            text: '相关科室',
            weight: 10,
            impact: 'positive',
          })
          score += 10
        } else if (options.strictDepartmentMatch) {
          warnings.push({
            type: 'department_mismatch',
            text: '科室不匹配',
            severity: 'medium',
          })
          score -= 15
        }
      }
    }

    // 工作量平衡
    const currentWorkload = this.workloadCache.get(teacher.id) || 0
    if (options.balanceWorkload) {
      if (currentWorkload < 3) {
        reasons.push({
          type: 'workload_balance',
          text: '工作量较轻',
          weight: 15,
          impact: 'positive',
        })
        score += 15
      } else if (currentWorkload > 5) {
        warnings.push({
          type: 'workload_high',
          text: `当前工作量${currentWorkload}较重`,
          severity: 'medium',
        })
        score -= 10
      }
    }

    // 夜班偏好
    if (context.scheduleContext.timeSlot === 'day2' && (teacher as any).nightShiftPreferred) {
      reasons.push({
        type: 'night_shift_preferred',
        text: '偏好夜班时间',
        weight: 12,
        impact: 'positive',
      })
      score += 12
    }

    // 经验评估
    if (options.prioritizeExperience) {
      const experience = this.getTeacherExperience(teacher)
      if (experience > 5) {
        reasons.push({
          type: 'experience',
          text: `${experience}年经验`,
          weight: 10,
          impact: 'positive',
        })
        score += 10
        confidence += 0.05
      }
    }

    // 性能评估
    const performance = this.getTeacherPerformance(teacher)
    if (performance > 0.8) {
      reasons.push({
        type: 'performance',
        text: '表现优异',
        weight: 8,
        impact: 'positive',
      })
      score += 8
    } else if (performance < 0.6) {
      warnings.push({
        type: 'performance_issue',
        text: '表现需要改进',
        severity: 'low',
      })
      score -= 5
    }

    // 确定优先级
    let priority: 'high' | 'medium' | 'low' = 'low'
    if (score >= 80 && warnings.length === 0) priority = 'high'
    else if (score >= 60) priority = 'medium'

    return {
      teacher,
      score: Math.min(Math.max(score, 0), 100),
      priority,
      reasons,
      warnings,
      confidence: Math.min(Math.max(confidence, 0), 1),
    }
  }

  /**
   * 检查考官可用性（包含HC1约束：周末+行政班考官检查，HC9约束：考官不可用期检查）
   */
  private isTeacherAvailable(teacher: Teacher, context: ManualEditContext): boolean {
    // 基础可用性检查
    if (!(teacher as any).available) return false

    // 🆕 HC9约束：检查考官不可用期 🔥 重要漏洞修复
    const unavailablePeriods =
      (teacher as any).unavailableDates || (teacher as any).unavailablePeriods
    if (unavailablePeriods && unavailablePeriods.length > 0) {
      try {
        const examDateObj = new Date(context.examDate + 'T00:00:00')

        for (const period of unavailablePeriods) {
          if (!period.startDate || !period.endDate) continue

          const startDate = new Date(period.startDate + 'T00:00:00')
          const endDate = new Date(period.endDate + 'T23:59:59')

          // 检查考试日期是否在不可用期内
          if (examDateObj >= startDate && examDateObj <= endDate) {
            process.env.NODE_ENV === 'development' && console.log(
              `🚫 [HC9约束-智能推荐] 考官${teacher.name}在${context.examDate}不可用（${period.reason || '不可用期'}）`
            )
            return false // 考官在不可用期内，不可用
          }
        }
      } catch (error) {
        console.warn('HC9约束检查失败:', error)
      }
    }

    // 检查HC1约束：周六周日可以考试，但行政班考官周末不参加考试
    try {
      const date = new Date(context.examDate)
      const dayOfWeek = date.getDay() // 0=周日, 6=周六
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const isAdminTeacher = !teacher.group || teacher.group === '无' || teacher.group.trim() === ''

      if (isWeekend && isAdminTeacher) {
        process.env.NODE_ENV === 'development' && console.log(
          `🚫 [HC1约束-智能推荐] 考官${teacher.name}为行政班考官，周末${context.examDate}不可用`
        )
        return false // 周末，行政班考官不可用
      }
    } catch (error) {
      console.warn('HC1约束检查失败:', error)
    }

    // 检查是否已在同一考试中担任其他角色
    const existingAssignment = context.scheduleContext.existingAssignments.find(
      assignment =>
        assignment.examDate === context.examDate &&
        (assignment.examiner1_1 === teacher.name ||
          assignment.examiner1_2 === teacher.name ||
          assignment.backup1 === teacher.name ||
          assignment.examiner2_1 === teacher.name ||
          assignment.examiner2_2 === teacher.name ||
          assignment.backup2 === teacher.name)
    )

    return !existingAssignment
  }

  /**
   * 检查时间冲突
   */
  private async checkScheduleConflict(
    teacher: Teacher,
    context: ManualEditContext
  ): Promise<ConflictDetection | null> {
    // 检查同一时间段的其他安排
    const conflictingAssignments = context.scheduleContext.existingAssignments.filter(
      assignment =>
        assignment.examDate === context.examDate &&
        assignment.student !== context.studentInfo.name &&
        (assignment.examiner1_1 === teacher.name ||
          assignment.examiner1_2 === teacher.name ||
          assignment.backup1 === teacher.name ||
          assignment.examiner2_1 === teacher.name ||
          assignment.examiner2_2 === teacher.name ||
          assignment.backup2 === teacher.name)
    )

    if (conflictingAssignments.length > 0) {
      return {
        type: 'schedule_conflict',
        severity: 'high',
        title: '时间冲突',
        description: `${teacher.name}在${context.examDate}已有其他考试安排`,
        suggestions: ['选择其他时间可用的考官', '调整冲突考试的时间', '重新安排考官分配'],
        autoResolvable: true,
        resolutionSteps: ['识别冲突的考试安排', '评估调整的可行性', '执行时间重排'],
      }
    }

    return null
  }

  /**
   * 检查约束违规
   */
  private async checkConstraintViolations(
    teacher: Teacher,
    context: ManualEditContext
  ): Promise<ConflictDetection[]> {
    const violations: ConflictDetection[] = []

    if (!this.constraintConfig) return violations

    // 检查科室规则约束
    if (
      this.constraintConfig.softConstraints.examiner1SameDept &&
      context.editingField.includes('examiner1') &&
      teacher.department !== context.studentInfo.department
    ) {
      violations.push({
        type: 'constraint_violation',
        severity: 'medium',
        title: '科室匹配约束违规',
        description: '主考官应与学员同科室',
        suggestions: ['选择同科室考官', '调整约束配置', '记录违规原因'],
        autoResolvable: false,
      })
    }

    // 检查三七室互通规则
    if (
      this.constraintConfig.softConstraints.allowDept37CrossUse &&
      (teacher.department === '三室' || teacher.department === '七室') &&
      (context.studentInfo.department === '三室' || context.studentInfo.department === '七室')
    ) {
      violations.push({
        type: 'constraint_violation',
        severity: 'low',
        title: '备用考官科室约束违规',
        description: '备用考官应来自不同科室',
        suggestions: ['选择其他科室考官', '调整约束权重', '确认特殊情况'],
        autoResolvable: true,
        resolutionSteps: ['搜索其他科室可用考官', '评估违规影响', '记录决策依据'],
      })
    }

    return violations
  }

  /**
   * 获取相关科室
   */
  private getRelatedDepartments(department: string): string[] {
    // 科室关联关系映射
    const departmentRelations: Record<string, string[]> = {
      内科: ['心内科', '消化科', '呼吸科', '内分泌科'],
      外科: ['普外科', '骨科', '泌尿外科', '神经外科'],
      妇产科: ['妇科', '产科'],
      儿科: ['新生儿科', '儿童保健科'],
      // 可以根据实际情况扩展
    }

    return departmentRelations[department] || []
  }

  /**
   * 获取考官经验年限
   */
  private getTeacherExperience(teacher: Teacher): number {
    // 暂无经验年限数据，使用默认值
    return 3
  }

  /**
   * 获取考官表现评分
   */
  private getTeacherPerformance(teacher: Teacher): number {
    // 从缓存或数据库获取表现数据
    const performanceData = this.teacherPerformanceData.get(teacher.id)
    return performanceData?.averageScore || 0.75
  }

  /**
   * 生成洞察建议
   */
  private generateInsights(
    context: ManualEditContext,
    recommendations: SmartRecommendation[]
  ): string[] {
    const insights: string[] = []

    // 分析推荐质量
    const highQualityRecs = recommendations.filter(r => r.score > 80)
    if (highQualityRecs.length === 0) {
      insights.push('当前没有高质量推荐，建议调整约束条件或考试时间')
    } else if (highQualityRecs.length === 1) {
      insights.push(
        `${highQualityRecs[0].teacher.name}是最佳选择，匹配度${highQualityRecs[0].score}%`
      )
    }

    // 分析科室分布
    const deptCounts = recommendations.reduce(
      (acc, rec) => {
        acc[rec.teacher.department] = (acc[rec.teacher.department] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const sameDeptCount = deptCounts[context.studentInfo.department] || 0
    if (sameDeptCount === 0) {
      insights.push('没有同科室考官可用，建议确认跨科室安排的合理性')
    } else if (sameDeptCount > 3) {
      insights.push('同科室考官选择较多，建议优先考虑工作量平衡')
    }

    // 分析工作量情况
    const avgWorkload =
      recommendations.reduce((sum, rec) => {
        return sum + (this.workloadCache.get(rec.teacher.id) || 0)
      }, 0) / recommendations.length

    if (avgWorkload > 5) {
      insights.push('推荐考官工作量普遍较重，建议考虑工作量重新分配')
    }

    // 分析时间段特点
    if (context.scheduleContext.timeSlot === 'day2') {
      const nightShiftCount = recommendations.filter(
        r => (r.teacher as any).nightShiftPreferred
      ).length

      if (nightShiftCount > 0) {
        insights.push(`有${nightShiftCount}位考官偏好夜班时间，建议优先考虑`)
      } else {
        insights.push('没有考官偏好夜班时间，可能需要额外协调')
      }
    }

    return insights
  }
}

export const smartRecommendationService = new SmartRecommendationService()
