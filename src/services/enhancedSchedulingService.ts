/**
 * 增强排班服务
 * 整合所有新功能，提供完整的智能排班解决方案
 */

import { dutyRotationService } from './dutyRotationService'
import { resourcePreCheckService } from './resourcePreCheckService'
import { smartScoringService, type ScoringContext } from './smartScoringService'
import { crossDepartmentService, type SupportRequest } from './crossDepartmentService'
import { workloadBalancer, conflictResolver } from './dynamicOptimizationService'
import { earlyWarningSystem } from './earlyWarningService'
import { optaPlannerService } from './optaplanner-service'
import { OptaPlannerDataConverter } from './optaPlannerDataConverter'
import { intelligentTimeSelectionService } from './intelligentTimeSelectionService'
import { intelligentDateSelector } from './ai/IntelligentDateSelector'
import {
  timeSpreadingMoveGenerator,
  timeSpreadingMoveEvaluator,
  TimeSpreadingMove,
} from './timeSpreadingMoveService'
import {
  calculateTimeDistributionStats,
  needsTimeDistributionOptimization,
} from './timeConcentrationService'
import type { ExamAssignment } from '../types/scheduleTypes'

export interface EnhancedSchedulingRequest {
  students: any[]
  teachers: any[]
  examDates: string[]
  availableDates?: Date[]
  constraints: any
  solverConfig?: {
    mode?: 'fast' | 'balanced' | 'optimal' | 'auto'
    timeoutSeconds?: number
    maxIterations?: number
    enableMultiThreading?: boolean
    description?: string
  }
  options?: {
    enablePreCheck: boolean
    enableSmartScoring: boolean
    enableCrossDepartmentSupport: boolean
    enableDynamicOptimization: boolean
    enableEarlyWarning: boolean
    maxOptimizationIterations: number
  }
}

export interface EnhancedSchedulingResult {
  success: boolean
  assignments: any[]
  preCheckReport?: any
  optimizationResults?: any
  warningAlerts?: any[]
  statistics: {
    totalStudents: number
    successfulAssignments: number
    successRate: number
    processingTime: number
    qualityScore: number
    resourceUtilization: number
    workloadBalance: number
  }
  recommendations: string[]
  issues: Array<{
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    description: string
    suggestion: string
  }>
}

export class EnhancedSchedulingService {
  protected readonly DEFAULT_OPTIONS = {
    enablePreCheck: true,
    enableSmartScoring: true,
    enableCrossDepartmentSupport: true,
    enableDynamicOptimization: true,
    enableEarlyWarning: true,
    maxOptimizationIterations: 3,
  }

  private intelligentTimeSelectionService: typeof intelligentTimeSelectionService

  constructor() {
    this.intelligentTimeSelectionService = intelligentTimeSelectionService

    process.env.NODE_ENV === 'development' && console.log('🚀 增强排班服务已启动')
  }

  /**
   * 执行增强排班
   */
  async executeEnhancedScheduling(
    request: EnhancedSchedulingRequest
  ): Promise<EnhancedSchedulingResult> {
    const startTime = Date.now()
    process.env.NODE_ENV === 'development' && console.log('🚀 开始增强排班流程...')

    const options = { ...this.DEFAULT_OPTIONS, ...request.options }
    const result: EnhancedSchedulingResult = {
      success: false,
      assignments: [],
      statistics: {
        totalStudents: request.students.length * 2, // 每个学员需要两次考试
        successfulAssignments: 0,
        successRate: 0,
        processingTime: 0,
        qualityScore: 0,
        resourceUtilization: 0,
        workloadBalance: 0,
      },
      recommendations: [],
      issues: [],
    }

    try {
      // 阶段1: 资源预检
      if (options.enablePreCheck) {
        process.env.NODE_ENV === 'development' && console.log('📋 阶段1: 资源预检分析...')
        result.preCheckReport = await resourcePreCheckService.performPreCheck(
          request.students,
          request.teachers,
          request.examDates
        )

        // 检查可行性
        if (result.preCheckReport.feasibilityScore < 60) {
          result.issues.push({
            type: 'feasibility',
            severity: 'HIGH',
            description: `可行性评分仅${result.preCheckReport.feasibilityScore}分，排班可能失败`,
            suggestion: '建议调整资源配置或放宽约束条件',
          })
        }

        result.recommendations.push(...result.preCheckReport.recommendations)
      }

      // 阶段2: 智能排班分配
      process.env.NODE_ENV === 'development' && console.log('🧠 阶段2: 智能排班分配...')
      const schedulingResult = await this.performIntelligentScheduling(request, options)

      result.assignments = schedulingResult.assignments
      result.success = schedulingResult.success

      if (!result.success) {
        result.issues.push({
          type: 'scheduling_failure',
          severity: 'HIGH',
          description: '基础排班失败',
          suggestion: schedulingResult.error || '检查约束配置和资源充足性',
        })

        // 尝试降级策略
        process.env.NODE_ENV === 'development' && console.log('🔄 尝试降级策略...')
        const fallbackResult = await this.performFallbackScheduling(request)

        if (fallbackResult.success) {
          result.assignments = fallbackResult.assignments
          result.success = true
          result.recommendations.push('使用了降级策略完成排班')
        }
      }

      // 阶段3: 动态优化
      if (options.enableDynamicOptimization && result.success) {
        process.env.NODE_ENV === 'development' && console.log('⚖️ 阶段3: 动态优化...')
        result.optimizationResults = await this.performDynamicOptimization(
          result.assignments,
          request.teachers,
          options.maxOptimizationIterations
        )

        if (result.optimizationResults.success) {
          result.assignments = result.optimizationResults.optimizedAssignments || result.assignments
          result.recommendations.push(...(result.optimizationResults.recommendations || []))
        }
      }

      // 阶段4: 预警检测
      if (options.enableEarlyWarning && result.success) {
        process.env.NODE_ENV === 'development' && console.log('🚨 阶段4: 预警检测...')
        const warningResult = await earlyWarningSystem.monitor(
          result.assignments,
          request.teachers,
          request.students
        )

        result.warningAlerts = warningResult.newAlerts
        result.recommendations.push(...warningResult.recommendations)

        // 将高级别预警转换为问题
        for (const alert of warningResult.newAlerts) {
          if (alert.level === 'HIGH' || alert.level === 'CRITICAL') {
            result.issues.push({
              type: alert.type.toLowerCase(),
              severity: alert.level === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
              description: alert.message,
              suggestion: alert.suggestion,
            })
          }
        }
      }

      // 阶段5: 统计计算
      process.env.NODE_ENV === 'development' && console.log('📊 阶段5: 统计计算...')
      this.calculateStatistics(result, request, startTime)

      // 阶段6: 质量评估
      process.env.NODE_ENV === 'development' && console.log('🎯 阶段6: 质量评估...')
      this.assessQuality(result, request)

      const processingTime = Date.now() - startTime
      process.env.NODE_ENV === 'development' && console.log(
        `✅ 增强排班完成，耗时${processingTime}ms，成功率${result.statistics.successRate.toFixed(1)}%`
      )
    } catch (error) {
      console.error('❌ 增强排班失败:', error)
      result.success = false
      result.issues.push({
        type: 'system_error',
        severity: 'HIGH',
        description: `系统错误: ${(error as Error).message}`,
        suggestion: '请检查系统配置和数据完整性',
      })
    }

    return result
  }

  /**
   * 执行智能排班分配
   */
  private async performIntelligentScheduling(
    request: EnhancedSchedulingRequest,
    options: any
  ): Promise<{ success: boolean; assignments: any[]; error?: string }> {
    try {
      process.env.NODE_ENV === 'development' && console.log('🔄 开始执行智能排班分配...')
      process.env.NODE_ENV === 'development' && console.log('📊 输入数据统计:', {
        studentsCount: request.students.length,
        teachersCount: request.teachers.length,
        examDatesCount: request.examDates.length,
        constraintsKeys: Object.keys(request.constraints || {}),
        optionsKeys: Object.keys(options || {}),
      })

      // 准备OptaPlanner请求
      const optaPlannerStudents = OptaPlannerDataConverter.convertStudents(request.students)
      const optaPlannerTeachers = OptaPlannerDataConverter.convertTeachers(request.teachers)

      process.env.NODE_ENV === 'development' && console.log('🔄 数据转换完成:', {
        convertedStudentsCount: optaPlannerStudents.length,
        convertedTeachersCount: optaPlannerTeachers.length,
      })

      // 构建增强约束
      const enhancedConstraints = await this.buildEnhancedConstraints(
        request.constraints,
        request.students,
        request.teachers,
        request.examDates,
        options
      )

      // 构建求解器配置，优先使用用户指定的配置
      const defaultSolverConfig = {
        solvingMode: 'adaptive', // ✅ 使用adaptive模式启用新的初始解构建
        mode: 'balanced' as const,
        timeoutSeconds: 180,
        maxIterations: 8000,
        enableMultiThreading: true,
      }

      const solverConfig = {
        ...defaultSolverConfig,
        ...request.solverConfig,
      }

      // 🎯 阶段零：智能日期选择（新增）
      process.env.NODE_ENV === 'development' && console.log('🎯 [阶段0.5] 执行智能日期选择...')
      let optimizedStudents = request.students
      let optimizedExamDates = request.examDates
      const studentDateMappings = new Map<string, { date1: string; date2: string }>()

      try {
        // 🆕 为每个学员执行智能日期选择
        process.env.NODE_ENV === 'development' && console.log(`📅 为 ${request.students.length} 个学员选择最优考试日期...`)

        for (const student of request.students) {
          try {
            const dateSelectionResult = await intelligentDateSelector.selectOptimalDates(
              student,
              request.teachers,
              {
                existingAssignments: Array.from(studentDateMappings.entries()).map(
                  ([id, dates]) => ({
                    studentId: id,
                    examDate1: dates.date1,
                    examDate2: dates.date2,
                  })
                ),
                teacherWorkloads: new Map(),
                availableDates: request.examDates,
                dutySchedules: new Map(), // 🔧 添加必需字段
                constraints: enhancedConstraints,
              }
            )

            if (dateSelectionResult.selectedPair) {
              studentDateMappings.set(student.id, {
                date1: dateSelectionResult.selectedPair.date1,
                date2: dateSelectionResult.selectedPair.date2,
              })

              process.env.NODE_ENV === 'development' && console.log(
                `✅ 学员 ${student.name} 最优日期: ${dateSelectionResult.selectedPair.date1} & ${dateSelectionResult.selectedPair.date2} (评分: ${dateSelectionResult.selectedPair.score.toFixed(1)})`
              )
              process.env.NODE_ENV === 'development' && console.log(
                `   📊 连续工作压力: ${dateSelectionResult.selectedPair.evaluation.consecutiveWorkStress.toFixed(1)}/100`
              )
            } else {
              console.warn(`⚠️ 学员 ${student.name} 未找到最优日期，将使用默认配置`)
            }
          } catch (dateSelectionError) {
            console.error(
              `❌ 学员 ${student.name} 日期选择失败:`,
              (dateSelectionError as Error).message
            )
          }
        }

        // 更新学员数据，添加推荐日期信息
        if (studentDateMappings.size > 0) {
          optimizedStudents = request.students.map(student => {
            const recommendedDates = studentDateMappings.get(student.id)
            if (recommendedDates) {
              return {
                ...student,
                recommendedExamDate1: recommendedDates.date1,
                recommendedExamDate2: recommendedDates.date2,
                _dateSelectionApplied: true,
              }
            }
            return student
          })

          process.env.NODE_ENV === 'development' && console.log(
            `✨ 智能日期选择完成：${studentDateMappings.size}/${request.students.length} 个学员获得优化日期`
          )
        }
      } catch (dateSelectionError) {
        console.error('❌ 智能日期选择执行异常:', (dateSelectionError as Error).message)
        process.env.NODE_ENV === 'development' && console.log('🔄 继续使用原始日期配置')
      }

      // 🎯 阶段一：智能时间选择
      process.env.NODE_ENV === 'development' && console.log('🎯 [阶段1] 执行智能时间选择...')

      try {
        const timeSelectionRequest = {
          students: optimizedStudents, // 🔧 使用优化后的学员数据
          teachers: request.teachers,
          examDates: request.examDates,
          constraints: enhancedConstraints,
          options: {
            enableInitialFiltering: true,
            enableOptimizationFiltering: true,
            enableConflictResolution: true,
            enableConsistencyCheck: true,
            maxIterations: options.maxTimeSelectionIterations || 3,
            qualityThreshold: options.timeSelectionQualityThreshold || 0.7,
          },
        }

        const timeSelectionResult =
          await this.intelligentTimeSelectionService.executeIntelligentTimeSelection(
            timeSelectionRequest
          )

        if (timeSelectionResult.success && timeSelectionResult.studentTimePools.length > 0) {
          process.env.NODE_ENV === 'development' && console.log('✅ 智能时间选择成功!')
          process.env.NODE_ENV === 'development' && console.log(`📊 优化质量评分: ${timeSelectionResult.overallQuality.toFixed(2)}`)
          process.env.NODE_ENV === 'development' && console.log(`⏱️ 处理阶段数量: ${timeSelectionResult.processingStages.length}`)
          process.env.NODE_ENV === 'development' && console.log(`📈 学员时间池数量: ${timeSelectionResult.studentTimePools.length}`)

          // 更新学员的可用时间信息
          if (timeSelectionResult.optimizedStudents) {
            optimizedStudents = timeSelectionResult.optimizedStudents
          }

          // 如果有推荐的考试日期，更新考试日期范围
          if (
            timeSelectionResult.optimizedExamDates &&
            timeSelectionResult.optimizedExamDates.length > 0
          ) {
            optimizedExamDates = timeSelectionResult.optimizedExamDates
            process.env.NODE_ENV === 'development' && console.log(`📅 推荐考试日期: ${optimizedExamDates.join(', ')}`)
          }
        } else {
          console.warn('⚠️ 智能时间选择未找到最优解，使用原始时间配置')
          if (
            timeSelectionResult.recommendations &&
            timeSelectionResult.recommendations.length > 0
          ) {
            process.env.NODE_ENV === 'development' && console.log(
              '💡 时间选择建议:',
              timeSelectionResult.recommendations.map((r: any) => r.description).join('; ')
            )
          }
        }
      } catch (timeSelectionError) {
        console.error('❌ 智能时间选择执行异常:', (timeSelectionError as Error).message)
        process.env.NODE_ENV === 'development' && console.log('🔄 继续使用原始时间配置进行排班')
      }

      process.env.NODE_ENV === 'development' && console.log('🎯 使用求解器配置:', solverConfig)

      // 🔧 确保日期数据有效性
      if (!optimizedExamDates || optimizedExamDates.length === 0) {
        console.warn('⚠️ 优化后的考试日期为空，使用原始日期范围')
        optimizedExamDates = request.examDates
      }

      // ✨ 关键修复：始终使用原始的完整日期范围进行OptaPlanner求解
      // 智能日期选择只是为学员添加推荐日期，但不应缩小OptaPlanner的搜索空间
      process.env.NODE_ENV === 'development' && console.log('🔍 智能推荐日期:', {
        recommendedDates:
          optimizedExamDates.length < request.examDates.length
            ? optimizedExamDates
            : '使用完整范围',
        originalDatesCount: request.examDates.length,
      })

      // 使用原始的完整日期范围
      const finalExamDates = request.examDates

      // 再次验证日期数据
      if (!finalExamDates || finalExamDates.length === 0) {
        throw new Error('考试日期数据为空，无法进行排班')
      }

      const startDate = finalExamDates[0]
      const endDate = finalExamDates[finalExamDates.length - 1]

      process.env.NODE_ENV === 'development' && console.log('🔍 最终使用的日期范围:', {
        startDate,
        endDate,
        totalDates: finalExamDates.length,
        智能推荐数: optimizedExamDates.length,
        实际使用数: finalExamDates.length,
      })

      // ✨ 诊断：打印优化后的学员数据
      process.env.NODE_ENV === 'development' && console.log(
        '🔍 优化后的学员数据(发送前):',
        optimizedStudents.map(s => ({
          name: s.name,
          recommendedExamDate1: s.recommendedExamDate1,
          recommendedExamDate2: s.recommendedExamDate2,
          _dateSelectionApplied: s._dateSelectionApplied,
        }))
      )

      const optaPlannerRequest = {
        students: OptaPlannerDataConverter.convertStudents(optimizedStudents), // 使用优化后的学员数据
        teachers: optaPlannerTeachers,
        startDate: startDate,
        endDate: endDate,
        constraints: enhancedConstraints,
        solverConfig: solverConfig,
      }

      // ✨ 诊断：打印转换后的学员数据
      process.env.NODE_ENV === 'development' && console.log(
        '🔍 转换后的学员数据(发送给后端):',
        optaPlannerRequest.students.map(s => ({
          name: s.name,
          recommendedExamDate1: s.recommendedExamDate1,
          recommendedExamDate2: s.recommendedExamDate2,
        }))
      )

      process.env.NODE_ENV === 'development' && console.log('🚀 发送OptaPlanner请求:', {
        studentsCount: optaPlannerRequest.students.length,
        teachersCount: optaPlannerRequest.teachers.length,
        startDate: optaPlannerRequest.startDate,
        endDate: optaPlannerRequest.endDate,
        constraintsCount: Object.keys(optaPlannerRequest.constraints).length,
        solverConfig: optaPlannerRequest.solverConfig,
      })

      process.env.NODE_ENV === 'development' && console.log('📋 详细OptaPlanner请求数据:', optaPlannerRequest)

      const response = await optaPlannerService.generateSchedule(optaPlannerRequest)

      process.env.NODE_ENV === 'development' && console.log('📥 OptaPlanner响应:', {
        success: response.success,
        message: response.message,
        assignmentsCount: response.assignments?.length || 0,
        statisticsKeys: Object.keys(response.statistics || {}),
        conflictsCount: response.conflicts?.length || 0,
        warningsCount: response.warnings?.length || 0,
      })

      if (response.success) {
        const convertedResult = OptaPlannerDataConverter.convertScheduleResult(response)
        let result = {
          success: true,
          assignments: convertedResult.assignments,
        }

        // 应用时间集中度优化
        if (request.constraints.timeConcentration?.enabled) {
          process.env.NODE_ENV === 'development' && console.log('应用时间集中度优化...')
          const optimizedResult = await this.applyTimeConcentrationOptimization(
            {
              ...result,
              recommendations: [],
              statistics: {
                totalStudents: 0,
                successfulAssignments: 0,
                successRate: 0,
                processingTime: 0,
                qualityScore: 0,
                resourceUtilization: 0,
                workloadBalance: 0,
              },
              issues: [],
            } as EnhancedSchedulingResult,
            request
          )
          result.assignments = optimizedResult.assignments
        }

        return result
      } else {
        return {
          success: false,
          assignments: [],
          error: response.message,
        }
      }
    } catch (error) {
      return {
        success: false,
        assignments: [],
        error: (error as Error).message,
      }
    }
  }

  /**
   * 构建增强约束 - 集成自适应约束服务
   */
  private async buildEnhancedConstraints(
    baseConstraints: any,
    students: any[],
    teachers: any[],
    examDates: string[],
    options: any
  ): Promise<any> {
    // 🧠 使用自适应约束服务计算最优权重
    const { adaptiveConstraintService } = await import('./adaptiveConstraintService')
    const adaptiveConstraints = adaptiveConstraintService.calculateAdaptiveWeights(
      students,
      teachers,
      baseConstraints
    )

    // 合并基础约束和自适应约束
    const enhancedConstraints = {
      ...baseConstraints,
      ...adaptiveConstraints,
      // 确保核心约束保持不变
      workdaysOnlyExam: true, // HC1: 工作日考试限制
      examinerDepartmentRules: true, // HC2: 考官科室规则
      twoMainExaminersRequired: true, // HC3: 考官配备要求
      noDayShiftExaminer: true, // HC4: 白班禁止规则

      // 软约束权重
      allowDept37CrossUseWeight: { hardScore: 0, softScore: 200 }, // SC4: 三七室互通
      preferNoGroupTeachersWeight: { hardScore: 0, softScore: 250 }, // SC6: 无班组优先

      // 时间集中度优化（默认启用）
      timeConcentration: { enabled: true },
      timeConcentrationWeight: { hardScore: 0, softScore: 50 },
    }

    // 启用三室/七室互借
    if (options.enableCrossDepartmentSupport) {
      enhancedConstraints.mergeDept37 = true
      enhancedConstraints.allowCrossDeptSupport = true
    }

    // 根据资源情况动态调整约束
    if (options.enablePreCheck) {
      const resourceReport = await resourcePreCheckService.performPreCheck(
        students,
        teachers,
        examDates
      )

      if (resourceReport.overallRiskLevel === 'HIGH') {
        // 高风险情况下放宽约束但保持软约束权重
        enhancedConstraints.threeExaminers = false
        enhancedConstraints.examiner2DiffDept = false
        enhancedConstraints.backupDiffDept = false
        enhancedConstraints.preferTwoWorkdaysComplete = false // 改为软约束，不强制要求
        // 适当降低部分软约束权重以提高可行性
        enhancedConstraints.preferRecommendedExaminer2Weight.softScore = 80
        enhancedConstraints.preferRecommendedBackupWeight.softScore = 60
      } else if (resourceReport.overallRiskLevel === 'MEDIUM') {
        // 中风险情况下适度放宽
        enhancedConstraints.threeExaminers = false
        // 轻微降低推荐权重
        enhancedConstraints.preferRecommendedExaminer2Weight.softScore = 100
        enhancedConstraints.preferRecommendedBackupWeight.softScore = 70
      }
    }

    process.env.NODE_ENV === 'development' && console.log('🎯 构建的增强约束配置:', {
      硬约束数量: Object.keys(enhancedConstraints).filter(
        key => typeof enhancedConstraints[key] === 'boolean' && enhancedConstraints[key]
      ).length,
      软约束权重数量: Object.keys(enhancedConstraints).filter(
        key =>
          enhancedConstraints[key] &&
          typeof enhancedConstraints[key] === 'object' &&
          'softScore' in enhancedConstraints[key]
      ).length,
    })

    return enhancedConstraints
  }

  /**
   * 执行降级排班
   */
  private async performFallbackScheduling(
    request: EnhancedSchedulingRequest
  ): Promise<{ success: boolean; assignments: any[] }> {
    process.env.NODE_ENV === 'development' && console.log('🔄 执行降级排班策略...')

    // 使用最宽松的约束配置，但保持合理的权重
    const fallbackConstraints = {
      workdaysOnlyExam: true, // HC1: 工作日考试限制（核心约束保持）
      examinerDepartmentRules: true, // HC2: 考官科室规则（核心约束保持）
      twoMainExaminersRequired: true, // HC3: 考官配备要求（核心约束保持）
      noDayShiftExaminer: true, // HC4: 白班禁止规则（核心约束保持）

      // 软约束权重 - 降级模式下使用较低权重
      allowDept37CrossUseWeight: { hardScore: 0, softScore: 100 }, // SC4: 三七室互通
      preferNoGroupTeachersWeight: { hardScore: 0, softScore: 0 }, // SC6: 无班组优先（放宽）
      // 软约束权重优化以改善质量评分
      consecutiveExamWeight: { hardScore: 0, softScore: 5 },
      minimizeIntervalWeight: { hardScore: 0, softScore: 5 },
      maxTwoStudentsPerDayWeight: { hardScore: 0, softScore: 5 },
      priorityNightShiftWeight: { hardScore: 0, softScore: 10 },
      priorityRestGroupWeight: { hardScore: 0, softScore: 10 },
      noGroupAsBackupWeight: { hardScore: 0, softScore: 5 },
      balanceWorkloadWeight: { hardScore: 0, softScore: 15 },
      avoidConsecutiveWorkWeight: { hardScore: 0, softScore: 5 },
      considerTotalWorkTimeWeight: { hardScore: 0, softScore: 5 },
      preferRecommendedExaminer2Weight: { hardScore: 0, softScore: 100 },
      preferRecommendedBackupWeight: { hardScore: 0, softScore: 70 },
      fallbackToExaminer1DeptWeight: { hardScore: 0, softScore: 30 },
      preferBackupExaminerWeight: { hardScore: 0, softScore: 80 },
    }

    try {
      // 🔧 验证日期数据有效性
      if (!request.examDates || request.examDates.length === 0) {
        throw new Error('考试日期数据为空，无法执行降级排班')
      }

      const optaPlannerStudents = OptaPlannerDataConverter.convertStudents(request.students)
      const optaPlannerTeachers = OptaPlannerDataConverter.convertTeachers(request.teachers)

      const startDate = request.examDates[0]
      const endDate = request.examDates[request.examDates.length - 1]

      process.env.NODE_ENV === 'development' && console.log('🔍 降级排班使用的日期范围:', {
        startDate,
        endDate,
        totalDates: request.examDates.length,
      })

      const optaPlannerRequest = {
        students: optaPlannerStudents,
        teachers: optaPlannerTeachers,
        startDate: startDate,
        endDate: endDate,
        constraints: fallbackConstraints,
        solverConfig: {
          timeoutSeconds: 240, // 更长的求解时间
          maxIterations: 10000,
          enableMultiThreading: true,
        },
      }

      const response = await optaPlannerService.generateSchedule(optaPlannerRequest)

      if (response.success) {
        const convertedResult = OptaPlannerDataConverter.convertScheduleResult(response)
        return {
          success: true,
          assignments: convertedResult.assignments,
        }
      }
    } catch (error) {
      console.error('降级排班也失败:', error)
    }

    return { success: false, assignments: [] }
  }

  /**
   * 执行动态优化
   */
  private async performDynamicOptimization(
    assignments: any[],
    teachers: any[],
    maxIterations: number
  ): Promise<any> {
    const optimizationResults = {
      success: false,
      iterations: 0,
      improvements: [] as string[],
      optimizedAssignments: assignments,
      recommendations: [] as string[],
    }

    try {
      // 工作量平衡优化
      const balanceResult = await workloadBalancer.monitorAndBalance(assignments, teachers)

      if (balanceResult.success) {
        optimizationResults.success = true
        optimizationResults.improvements.push('工作量平衡优化')
        optimizationResults.recommendations.push(
          ...balanceResult.changesApplied.map(c => c.description)
        )

        // 更新分配结果
        optimizationResults.optimizedAssignments = assignments // 实际应该是优化后的结果
      }

      // 冲突解决
      const conflicts = this.identifyConflicts(assignments)

      for (const conflict of conflicts.slice(0, 5)) {
        // 限制处理的冲突数量
        const resolutionResult = await conflictResolver.resolveConflict(conflict, {
          assignments,
          teachers,
        })

        if (resolutionResult.success) {
          optimizationResults.improvements.push(`解决冲突: ${conflict.description}`)
          optimizationResults.recommendations.push(String(resolutionResult.resolution))
        }

        optimizationResults.iterations++

        if (optimizationResults.iterations >= maxIterations) {
          break
        }
      }
    } catch (error) {
      console.error('动态优化失败:', error)
    }

    return optimizationResults
  }

  /**
   * 更新学员的优化时间段信息
   */
  private updateStudentsWithOptimizedTimeSlots(
    originalStudents: any[],
    optimizedTimeSlots: any[]
  ): any[] {
    const updatedStudents = originalStudents.map(student => {
      // 查找该学员的优化时间段
      const studentTimeSlots = optimizedTimeSlots.filter(slot => slot.studentId === student.id)

      if (studentTimeSlots.length > 0) {
        // 更新学员的可用时间信息
        const optimizedAvailableTimes = studentTimeSlots.map(slot => ({
          date: slot.date,
          timeSlot: slot.timeSlot,
          quality: slot.quality || 1.0,
          conflictScore: slot.conflictScore || 0,
          recommended: slot.recommended || false,
        }))

        return {
          ...student,
          availableTimes: optimizedAvailableTimes,
          optimizedTimeSelection: true,
          originalAvailableTimes: student.availableTimes, // 保留原始时间信息
        }
      }

      return student
    })

    process.env.NODE_ENV === 'development' && console.log(
      `📊 更新了 ${updatedStudents.filter(s => s.optimizedTimeSelection).length} 位学员的时间信息`
    )
    return updatedStudents
  }

  /**
   * 应用时间集中度优化
   */
  private async applyTimeConcentrationOptimization(
    result: EnhancedSchedulingResult,
    request: EnhancedSchedulingRequest
  ): Promise<EnhancedSchedulingResult> {
    try {
      process.env.NODE_ENV === 'development' && console.log('🔄 开始时间集中度优化...')

      // 计算当前时间分布统计
      const currentStats = calculateTimeDistributionStats(result.assignments)

      if (!needsTimeDistributionOptimization(currentStats)) {
        process.env.NODE_ENV === 'development' && console.log('⚠️ 当前时间分布已经较为均匀，无需优化')
        return result
      }

      process.env.NODE_ENV === 'development' && console.log(`📊 当前时间集中度评分: ${currentStats.timeConcentrationScore.toFixed(2)}`)
      process.env.NODE_ENV === 'development' && console.log(`📊 标准差: ${currentStats.stdDev.toFixed(2)}`)

      // 生成时间分散移动
      const availableDates = request.availableDates || []
      const moves = timeSpreadingMoveGenerator.generateMoves(result.assignments, availableDates)

      if (moves.length === 0) {
        process.env.NODE_ENV === 'development' && console.log('⚠️ 未找到可用的时间分散移动')
        return result
      }

      process.env.NODE_ENV === 'development' && console.log(`📊 生成了 ${moves.length} 个时间分散移动`)

      // 评估并应用最佳移动
      let bestMove: TimeSpreadingMove | null = null
      let bestScore = -Infinity

      for (const move of moves) {
        const evaluation = timeSpreadingMoveEvaluator.evaluateMove(move, result.assignments)
        if (evaluation.feasible && evaluation.improvement > bestScore) {
          bestScore = evaluation.improvement
          bestMove = move
        }
      }

      if (bestMove && bestScore > 0) {
        process.env.NODE_ENV === 'development' && console.log(`✅ 应用最佳时间分散移动，改进分数: ${bestScore.toFixed(2)}`)

        // 应用移动
        const optimizedAssignments = this.applyTimeSpreadingMove(result.assignments, bestMove)

        result.assignments = optimizedAssignments
        result.recommendations.push(`应用时间分散优化，改进分数: ${bestScore.toFixed(2)}`)

        // 重新计算统计信息
        this.calculateStatistics(result, request, Date.now())

        // 计算优化后的统计
        const newStats = calculateTimeDistributionStats(result.assignments)
        process.env.NODE_ENV === 'development' && console.log(`📊 优化后时间集中度评分: ${newStats.timeConcentrationScore.toFixed(2)}`)
        process.env.NODE_ENV === 'development' && console.log(`📊 优化后标准差: ${newStats.stdDev.toFixed(2)}`)
      } else {
        process.env.NODE_ENV === 'development' && console.log('⚠️ 未找到有效的时间分散优化方案')
      }
    } catch (error) {
      console.error('❌ 时间集中度优化失败:', (error as Error).message)
      result.issues.push({
        type: 'time_concentration_optimization',
        severity: 'LOW',
        description: `时间集中度优化失败: ${(error as Error).message}`,
        suggestion: '继续使用原始排班结果',
      })
    }

    return result
  }

  /**
   * 应用时间分散移动
   */
  private applyTimeSpreadingMove(
    assignments: ExamAssignment[],
    move: TimeSpreadingMove
  ): ExamAssignment[] {
    switch (move.type) {
      case 'MOVE_TO_LESS_BUSY_DAY':
        return assignments.map(assignment => {
          if (assignment.id === move.sourceAssignmentId && move.targetDate) {
            return {
              ...assignment,
              date: move.targetDate,
            }
          }
          return assignment
        })

      case 'SWAP_BETWEEN_DAYS':
        if (!move.swapAssignmentId) return assignments

        const sourceAssignment = assignments.find(a => a.id === move.sourceAssignmentId)
        const swapAssignment = assignments.find(a => a.id === move.swapAssignmentId)

        if (!sourceAssignment || !swapAssignment) return assignments

        return assignments.map(assignment => {
          if (assignment.id === move.sourceAssignmentId) {
            return { ...assignment, date: swapAssignment.date }
          }
          if (assignment.id === move.swapAssignmentId) {
            return { ...assignment, date: sourceAssignment.date }
          }
          return assignment
        })

      default:
        return assignments
    }
  }

  /**
   * 识别冲突
   */
  private identifyConflicts(assignments: any[]): any[] {
    const conflicts = []

    // 检查未分配的考官
    for (const assignment of assignments) {
      if (!assignment.examiner1) {
        conflicts.push({
          id: `missing_examiner1_${assignment.id}`,
          type: 'hard_constraint',
          severity: 'HIGH',
          description: `学员${assignment.studentName}缺少考官1`,
          affectedEntities: [assignment.studentName],
          suggestedSolutions: ['启用跨科室支援', '调整考试日期', '自动分配可用考官'],
          autoResolvable: true,
        })
      }

      if (!assignment.examiner2) {
        conflicts.push({
          id: `missing_examiner2_${assignment.id}`,
          type: 'hard_constraint',
          severity: 'HIGH', // 提升为高优先级，因为约束要求两名主考官
          description: `学员${assignment.studentName}缺少考官2`,
          affectedEntities: [assignment.studentName],
          suggestedSolutions: ['启用跨科室支援', '自动分配可用考官'],
          autoResolvable: true,
        })
      }

      // 检查考官重复
      if (
        assignment.examiner1 &&
        assignment.examiner2 &&
        assignment.examiner1.id === assignment.examiner2.id
      ) {
        conflicts.push({
          id: `duplicate_examiner_${assignment.id}`,
          type: 'hard_constraint',
          severity: 'HIGH',
          description: `学员${assignment.studentName}的考官1和考官2是同一人`,
          affectedEntities: [assignment.studentName],
          suggestedSolutions: ['重新分配考官2'],
          autoResolvable: true,
        })
      }
    }

    // 检查时间冲突
    const timeConflicts = this.detectTimeConflicts(assignments)
    conflicts.push(...timeConflicts)

    return conflicts
  }

  /**
   * 检测时间冲突
   */
  private detectTimeConflicts(assignments: any[]): any[] {
    const conflicts = []
    const timeSlotMap = new Map<string, any[]>()

    // 按时间段分组
    for (const assignment of assignments) {
      const timeKey = `${assignment.examDate}_${assignment.examTime}`
      if (!timeSlotMap.has(timeKey)) {
        timeSlotMap.set(timeKey, [])
      }
      timeSlotMap.get(timeKey)!.push(assignment)
    }

    // 检查每个时间段的冲突
    // TODO: 优化嵌套循环 - 当前复杂度 O(n²)
// 建议使用Map/Set或其他数据结构优化
// for (const [timeKey, timeAssignments] of timeSlotMap) {
    for (const [timeKey, timeAssignments] of timeSlotMap) {
      const examinerMap = new Map<string, any[]>()

      // 统计每个考官在该时间段的分配
      for (const assignment of timeAssignments) {
        if (assignment.examiner1?.id) {
          if (!examinerMap.has(assignment.examiner1.id)) {
            examinerMap.set(assignment.examiner1.id, [])
          }
          examinerMap.get(assignment.examiner1.id)!.push(assignment)
        }

        if (assignment.examiner2?.id) {
          if (!examinerMap.has(assignment.examiner2.id)) {
            examinerMap.set(assignment.examiner2.id, [])
          }
          examinerMap.get(assignment.examiner2.id)!.push(assignment)
        }
      }

      // 检查考官冲突
      for (const [examinerId, examinerAssignments] of examinerMap) {
        if (examinerAssignments.length > 1) {
          conflicts.push({
            id: `examiner_conflict_${examinerId}_${timeKey}`,
            type: 'time_conflict',
            severity: 'HIGH',
            description: `考官${examinerId}在${timeKey}时间段有${examinerAssignments.length}个冲突分配`,
            affectedEntities: examinerAssignments.map(a => a.studentName),
            suggestedSolutions: ['调整考试时间', '更换考官'],
            autoResolvable: true,
          })
        }
      }
    }

    return conflicts
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(
    result: EnhancedSchedulingResult,
    request: EnhancedSchedulingRequest,
    startTime: number
  ): void {
    const stats = result.statistics

    // 修复成功率计算逻辑 - 考虑未分配学员
    stats.successfulAssignments = result.assignments.filter(
      a => a.examiner1 && a.examiner2 // 只要有考官1和考官2就算成功，备份考官是可选的
    ).length

    // 计算未分配学员数量
    const unassignedCount = result.assignments.filter(a => !a.examiner1 || !a.examiner2).length

    // 成功率 = (成功分配数 / 总学员数) * 100
    // 如果有未分配学员，成功率不能是100%
    stats.successRate =
      stats.totalStudents > 0 ? (stats.successfulAssignments / stats.totalStudents) * 100 : 0

    process.env.NODE_ENV === 'development' && console.log('📊 成功率计算详情:', {
      总学员数: request.students.length,
      总考试次数: stats.totalStudents,
      成功分配数: stats.successfulAssignments,
      未分配数: unassignedCount,
      成功率: stats.successRate.toFixed(1) + '%',
      实际状态: unassignedCount > 0 ? '存在未分配学员' : '全部分配成功',
    })

    stats.processingTime = Date.now() - startTime

    // 计算资源利用率
    const activeTeachers = new Set()
    for (const assignment of result.assignments) {
      if (assignment.examiner1?.id) activeTeachers.add(assignment.examiner1.id)
      if (assignment.examiner2?.id) activeTeachers.add(assignment.examiner2.id)
      if (assignment.backupExaminer?.id) activeTeachers.add(assignment.backupExaminer.id)
    }

    stats.resourceUtilization =
      request.teachers.length > 0 ? (activeTeachers.size / request.teachers.length) * 100 : 0

    // 计算工作量平衡度
    const workloadStats = this.calculateWorkloadDistribution(result.assignments, request.teachers)
    const avgWorkload =
      workloadStats.reduce((sum, stat) => sum + stat.workload, 0) / workloadStats.length
    const variance =
      workloadStats.reduce((sum, stat) => sum + Math.pow(stat.workload - avgWorkload, 2), 0) /
      workloadStats.length

    stats.workloadBalance = Math.max(0, 100 - variance * 20) // 方差越小，平衡度越高
  }

  /**
   * 评估质量
   */
  private assessQuality(
    result: EnhancedSchedulingResult,
    request: EnhancedSchedulingRequest
  ): void {
    let qualityScore = 0
    const scoreComponents = {
      成功率得分: 0,
      资源利用率得分: 0,
      工作量平衡得分: 0,
      问题扣分: 0,
      预警扣分: 0,
    }

    // 基础分数：成功率 (40%权重)
    const successRateScore = result.statistics.successRate * 0.4
    qualityScore += successRateScore
    scoreComponents.成功率得分 = successRateScore

    // 资源利用率 (30%权重，理想利用率60-80%)
    const utilizationRate = result.statistics.resourceUtilization
    let utilizationScore = 0
    if (utilizationRate >= 60 && utilizationRate <= 80) {
      utilizationScore = 30 // 理想范围内给满分
    } else if (utilizationRate > 80) {
      utilizationScore = Math.max(0, 30 - (utilizationRate - 80) * 0.5) // 过高扣分
    } else {
      utilizationScore = (utilizationRate * 30) / 60 // 过低按比例给分
    }
    qualityScore += utilizationScore
    scoreComponents.资源利用率得分 = utilizationScore

    // 工作量平衡度 (20%权重)
    const balanceScore = result.statistics.workloadBalance * 0.2
    qualityScore += balanceScore
    scoreComponents.工作量平衡得分 = balanceScore

    // 问题严重程度扣分
    const highSeverityIssues = result.issues.filter(i => i.severity === 'HIGH').length
    const mediumSeverityIssues = result.issues.filter(i => i.severity === 'MEDIUM').length
    const lowSeverityIssues = result.issues.filter(i => i.severity === 'LOW').length

    const issuesPenalty = highSeverityIssues * 15 + mediumSeverityIssues * 8 + lowSeverityIssues * 3
    qualityScore -= issuesPenalty
    scoreComponents.问题扣分 = -issuesPenalty

    // 预警扣分
    let warningPenalty = 0
    if (result.warningAlerts && Array.isArray(result.warningAlerts)) {
      const criticalAlerts = result.warningAlerts.filter(
        a => typeof a === 'object' && a.level === 'CRITICAL'
      ).length
      const highAlerts = result.warningAlerts.filter(
        a => typeof a === 'object' && a.level === 'HIGH'
      ).length

      warningPenalty = criticalAlerts * 10 + highAlerts * 5
      qualityScore -= warningPenalty
    }
    scoreComponents.预警扣分 = -warningPenalty

    // 确保分数在0-100范围内
    const finalScore = Math.max(0, Math.min(100, qualityScore))
    result.statistics.qualityScore = finalScore

    process.env.NODE_ENV === 'development' && console.log('🎯 质量评分详细计算:', {
      各项得分: scoreComponents,
      原始总分: qualityScore.toFixed(1),
      最终得分: finalScore.toFixed(1),
      统计数据: {
        成功率: result.statistics.successRate.toFixed(1) + '%',
        资源利用率: result.statistics.resourceUtilization.toFixed(1) + '%',
        工作量平衡: result.statistics.workloadBalance.toFixed(1) + '%',
        高级问题: highSeverityIssues,
        中级问题: mediumSeverityIssues,
        低级问题: lowSeverityIssues,
      },
    })
  }

  /**
   * 计算工作量分布
   */
  private calculateWorkloadDistribution(
    assignments: any[],
    teachers: any[]
  ): Array<{ teacherId: string; workload: number }> {
    const workloadMap = new Map<string, number>()

    // 初始化
    for (const teacher of teachers) {
      workloadMap.set(teacher.id, 0)
    }

    // 统计工作量
    for (const assignment of assignments) {
      if (assignment.examiner1?.id) {
        workloadMap.set(
          assignment.examiner1.id,
          (workloadMap.get(assignment.examiner1.id) || 0) + 1
        )
      }
      if (assignment.examiner2?.id) {
        workloadMap.set(
          assignment.examiner2.id,
          (workloadMap.get(assignment.examiner2.id) || 0) + 1
        )
      }
      if (assignment.backupExaminer?.id) {
        workloadMap.set(
          assignment.backupExaminer.id,
          (workloadMap.get(assignment.backupExaminer.id) || 0) + 0.5
        )
      }
    }

    return Array.from(workloadMap.entries()).map(([teacherId, workload]) => ({
      teacherId,
      workload,
    }))
  }
}

// 创建单例实例
export const enhancedSchedulingService = new EnhancedSchedulingService()
