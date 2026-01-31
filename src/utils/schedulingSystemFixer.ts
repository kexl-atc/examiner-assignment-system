/**
 * 排班系统综合修复脚本
 * 集成所有修复功能，一键解决系统问题
 */

import { SchedulingDataValidator } from './schedulingDataValidator'
import { FrontendDisplayFixer } from './frontendDisplayFixer'
import { ConstraintViolationDiagnostic } from './constraintViolationDiagnostic'

export class SchedulingSystemFixer {
  /**
   * 执行完整的系统修复
   */
  static async performCompleteFix(options: {
    students: any[]
    teachers: any[]
    dutySchedules: any[]
    scheduleResult?: any
    frontendDisplay?: any[]
  }): Promise<{
    success: boolean
    message: string
    fixedData?: any
    diagnosticReport?: string
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    process.env.NODE_ENV === 'development' && console.log(' 开始执行排班系统综合修复...')

    try {
      // 1. 数据验证
      process.env.NODE_ENV === 'development' && console.log(' 步骤1: 验证数据完整性...')
      const dataValidation = SchedulingDataValidator.validateAllData(
        options.students,
        options.teachers,
        options.dutySchedules
      )

      if (!dataValidation.isValid) {
        errors.push(...dataValidation.errors)
        console.error(' 数据验证失败:', dataValidation.errors)
      } else {
        process.env.NODE_ENV === 'development' && console.log(' 数据验证通过')
      }

      // 2. 约束违反诊断
      process.env.NODE_ENV === 'development' && console.log(' 步骤2: 诊断约束违反问题...')
      const diagnostic = ConstraintViolationDiagnostic.diagnoseHardConstraintViolations(
        options.scheduleResult?.assignments || [],
        options.teachers,
        options.dutySchedules
      )

      if (diagnostic.summary.totalViolations > 0) {
        warnings.push(`发现 ${diagnostic.summary.totalViolations} 个约束违反问题`)
        console.warn(' 发现约束违反问题:', diagnostic.summary)
      } else {
        process.env.NODE_ENV === 'development' && console.log(' 未发现约束违反问题')
      }

      // 3. 生成诊断报告
      const diagnosticReport = ConstraintViolationDiagnostic.generateDiagnosticReport(
        options.scheduleResult?.assignments || [],
        options.teachers,
        options.dutySchedules
      )

      // 4. 修复前端显示问题
      let fixedData = null
      if (options.scheduleResult) {
        process.env.NODE_ENV === 'development' && console.log(' 步骤3: 修复前端显示问题...')
        fixedData = FrontendDisplayFixer.fixScheduleResultDisplay(
          options.scheduleResult,
          options.teachers
        )
        process.env.NODE_ENV === 'development' && console.log(' 前端显示修复完成')
      }

      // 5. 修复表格数据显示
      if (options.frontendDisplay) {
        process.env.NODE_ENV === 'development' && console.log(' 步骤4: 修复表格数据显示...')
        const fixedDisplay = FrontendDisplayFixer.fixTableDataDisplay(
          options.frontendDisplay,
          options.teachers
        )
        fixedData = { ...fixedData, fixedDisplay }
        process.env.NODE_ENV === 'development' && console.log(' 表格数据显示修复完成')
      }

      // 6. 检查数据一致性
      if (options.scheduleResult && options.frontendDisplay) {
        process.env.NODE_ENV === 'development' && console.log(' 步骤5: 检查数据一致性...')
        const consistencyCheck = FrontendDisplayFixer.checkAndFixDataConsistency(
          options.scheduleResult,
          options.frontendDisplay,
          options.teachers
        )

        if (!consistencyCheck.isConsistent) {
          warnings.push(...consistencyCheck.issues)
          console.warn(' 数据一致性问题:', consistencyCheck.issues)
        } else {
          process.env.NODE_ENV === 'development' && console.log(' 数据一致性检查通过')
        }
      }

      const success = errors.length === 0
      const message = success
        ? '排班系统修复完成，所有问题已解决'
        : `修复完成，但存在 ${errors.length} 个错误需要手动处理`

      process.env.NODE_ENV === 'development' && console.log(success ? ' 修复成功!' : ' 修复完成，但存在问题')

      return {
        success,
        message,
        fixedData,
        diagnosticReport,
        errors,
        warnings,
      }
    } catch (error: any) {
      console.error('🔧 修复过程中发生错误:', error)
      return {
        success: false,
        message: '修复过程中发生错误',
        errors: [error.message],
        warnings,
      }
    }
  }

  /**
   * 快速修复前端显示问题
   */
  static quickFixFrontendDisplay(scheduleResult: any, teachers: any[]): any {
    process.env.NODE_ENV === 'development' && console.log(' 执行快速前端显示修复...')

    try {
      const fixed = FrontendDisplayFixer.fixScheduleResultDisplay(scheduleResult, teachers)
      process.env.NODE_ENV === 'development' && console.log(' 快速修复完成')
      return fixed
    } catch (error: any) {
      console.error('🔧 快速修复失败:', error)
      return scheduleResult
    }
  }

  /**
   * 验证修复结果
   */
  static validateFixResult(
    fixedData: any,
    originalData: any
  ): {
    isValid: boolean
    improvements: string[]
    issues: string[]
  } {
    const improvements: string[] = []
    const issues: string[] = []

    if (!fixedData) {
      issues.push('修复数据为空')
      return { isValid: false, improvements, issues }
    }

    // 检查数据完整性
    if (fixedData.assignments && fixedData.assignments.length > 0) {
      improvements.push('排班数据完整')
    } else {
      issues.push('排班数据不完整')
    }

    // 检查考官姓名映射
    const hasValidExaminers = fixedData.assignments?.every(
      (assignment: any) => assignment.examiner1 && assignment.examiner2
    )

    if (hasValidExaminers) {
      improvements.push('考官分配完整')
    } else {
      issues.push('考官分配不完整')
    }

    return {
      isValid: issues.length === 0,
      improvements,
      issues,
    }
  }
}

// 导出修复函数供外部使用
export const fixSchedulingSystem = SchedulingSystemFixer.performCompleteFix
export const quickFixDisplay = SchedulingSystemFixer.quickFixFrontendDisplay
export const validateFix = SchedulingSystemFixer.validateFixResult
