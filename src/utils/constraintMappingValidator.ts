/**
 * 约束映射验证工具
 * 验证前后端约束映射的完整性和一致性
 */

import { constraintMappingService } from '../services/constraintMappingService'
import { constraintMappingApi } from '../services/constraintMappingApi'

// 后端约束定义（基于OptimizedConstraintConfiguration.java）
const BACKEND_HARD_CONSTRAINTS = [
  'workdaysOnlyExam',
  'examinerDepartmentRules',
  'twoMainExaminersRequired',
  'noDayShiftExaminer',
  'noStudentConflict',
  'noExaminerConflict',
  'roomCapacityConstraint',
  'examinerQualificationConstraint',
]

const BACKEND_SOFT_CONSTRAINTS = [
  'backupExaminerDiffDept',
  'avoidStudentDayShift',
  'preferRecommendedDepts',
  'balanceWorkload',
  'ensureConsecutiveDays',
  'preferNoGroupTeachers',
]

// 前端约束定义（基于constraintMappingService.ts）
export const FRONTEND_HARD_CONSTRAINTS = [
  'HC1', // 法定节假日限制
  'HC2', // 专业匹配要求
  'HC3', // 考官时间冲突避免
  'HC4', // 考官工作负荷控制
  'HC5', // 考生执勤白班不能安排考试
  'HC6', // 考试连续性要求
  'HC7', // 考试基本制度要求
  'HC8', // 备份考官独立性
]

export const FRONTEND_SOFT_CONSTRAINTS = [
  'SC1', // 优先安排执勤晚班的考官
  'SC2', // 其次安排休息第一天的考官
  'SC3', // 再次安排休息第二天的考官
  'SC4', // 最后安排行政班考官
  'SC5', // 优先安排推荐科室池内的考官2
  'SC6', // 其次安排非推荐科室池的考官
  'SC7', // 优先安排推荐科室池内的备份考官
  'SC8', // 其次安排非推荐科室池的备份考官
  'SC9', // 区域三室和区域七室的考官互用
  'SC10', // 考官工作量均衡考量
  'SC11', // 考试日期分配均衡考量
]

export interface MappingValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  missingMappings: {
    frontendToBackend: string[]
    backendToFrontend: string[]
  }
  inconsistentMappings: Array<{
    frontend: string
    expectedBackend: string
    actualBackend: string
  }>
  unmappedConstraints: {
    frontend: string[]
    backend: string[]
  }
  statistics: {
    totalFrontendConstraints: number
    totalBackendConstraints: number
    mappedConstraints: number
    mappingCoverage: number
  }
}

export class ConstraintMappingValidator {
  /**
   * 验证约束映射的完整性和一致性
   */
  static async validateConstraintMapping(): Promise<MappingValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const missingMappings = {
      frontendToBackend: [] as string[],
      backendToFrontend: [] as string[],
    }
    const inconsistentMappings: Array<{
      frontend: string
      expectedBackend: string
      actualBackend: string
    }> = []
    const unmappedConstraints = {
      frontend: [] as string[],
      backend: [] as string[],
    }

    try {
      // 1. 验证前端到后端的映射完整性
      await this.validateFrontendToBackendMapping(
        errors,
        warnings,
        missingMappings,
        inconsistentMappings
      )

      // 2. 验证后端到前端的映射完整性
      await this.validateBackendToFrontendMapping(
        errors,
        warnings,
        missingMappings,
        unmappedConstraints
      )

      // 3. 验证映射一致性
      await this.validateMappingConsistency(errors, warnings, inconsistentMappings)

      // 4. 检查未映射的约束
      await this.checkUnmappedConstraints(warnings, unmappedConstraints)

      // 5. 验证与后端API的一致性
      await this.validateWithBackendApi(errors, warnings)
    } catch (error) {
      errors.push(`验证过程中发生错误: ${error}`)
    }

    const totalFrontendConstraints =
      FRONTEND_HARD_CONSTRAINTS.length + FRONTEND_SOFT_CONSTRAINTS.length
    const totalBackendConstraints =
      BACKEND_HARD_CONSTRAINTS.length + BACKEND_SOFT_CONSTRAINTS.length
    const mappedConstraints = totalFrontendConstraints - missingMappings.frontendToBackend.length
    const mappingCoverage = (mappedConstraints / totalFrontendConstraints) * 100

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingMappings,
      inconsistentMappings,
      unmappedConstraints,
      statistics: {
        totalFrontendConstraints,
        totalBackendConstraints,
        mappedConstraints,
        mappingCoverage,
      },
    }
  }

  /**
   * 验证前端到后端的映射完整性
   */
  private static async validateFrontendToBackendMapping(
    errors: string[],
    warnings: string[],
    missingMappings: { frontendToBackend: string[]; backendToFrontend: string[] },
    inconsistentMappings: Array<{
      frontend: string
      expectedBackend: string
      actualBackend: string
    }>
  ): Promise<void> {
    // 验证硬约束映射
    for (const frontendConstraint of FRONTEND_HARD_CONSTRAINTS) {
      const backendConstraint =
        await constraintMappingService.mapFrontendToBackend(frontendConstraint)

      if (backendConstraint === frontendConstraint) {
        // 没有找到映射
        missingMappings.frontendToBackend.push(frontendConstraint)
        errors.push(`前端硬约束 ${frontendConstraint} 缺少后端映射`)
      } else if (backendConstraint) {
        // 验证映射的后端约束是否存在
        const expectedBackend = this.getExpectedBackendConstraint(frontendConstraint)
        if (expectedBackend && backendConstraint !== expectedBackend) {
          inconsistentMappings.push({
            frontend: frontendConstraint,
            expectedBackend,
            actualBackend: backendConstraint,
          })
          warnings.push(
            `前端约束 ${frontendConstraint} 映射不一致: 期望 ${expectedBackend}, 实际 ${backendConstraint}`
          )
        }

        if (!BACKEND_HARD_CONSTRAINTS.includes(backendConstraint)) {
          errors.push(
            `前端硬约束 ${frontendConstraint} 映射到不存在的后端约束 ${backendConstraint}`
          )
        }
      }
    }

    // 验证软约束映射
    for (const frontendConstraint of FRONTEND_SOFT_CONSTRAINTS) {
      const backendConstraint =
        await constraintMappingService.mapFrontendToBackend(frontendConstraint)

      if (backendConstraint === frontendConstraint) {
        missingMappings.frontendToBackend.push(frontendConstraint)
        errors.push(`前端软约束 ${frontendConstraint} 缺少后端映射`)
      } else if (backendConstraint) {
        const expectedBackend = this.getExpectedBackendConstraint(frontendConstraint)
        if (expectedBackend && backendConstraint !== expectedBackend) {
          inconsistentMappings.push({
            frontend: frontendConstraint,
            expectedBackend,
            actualBackend: backendConstraint,
          })
          warnings.push(
            `前端约束 ${frontendConstraint} 映射不一致: 期望 ${expectedBackend}, 实际 ${backendConstraint}`
          )
        }

        if (!BACKEND_SOFT_CONSTRAINTS.includes(backendConstraint)) {
          errors.push(
            `前端软约束 ${frontendConstraint} 映射到不存在的后端约束 ${backendConstraint}`
          )
        }
      }
    }
  }

  /**
   * 验证后端到前端的映射完整性
   */
  private static async validateBackendToFrontendMapping(
    errors: string[],
    warnings: string[],
    missingMappings: { frontendToBackend: string[]; backendToFrontend: string[] },
    unmappedConstraints: { frontend: string[]; backend: string[] }
  ): Promise<void> {
    // 验证后端硬约束是否都有前端映射
    for (const backendConstraint of BACKEND_HARD_CONSTRAINTS) {
      const frontendConstraint =
        await constraintMappingService.mapBackendToFrontend(backendConstraint)

      if (frontendConstraint === backendConstraint) {
        // 没有找到映射
        missingMappings.backendToFrontend.push(backendConstraint)
        unmappedConstraints.backend.push(backendConstraint)
        warnings.push(`后端硬约束 ${backendConstraint} 缺少前端映射`)
      } else if (frontendConstraint && !FRONTEND_HARD_CONSTRAINTS.includes(frontendConstraint)) {
        errors.push(`后端硬约束 ${backendConstraint} 映射到不存在的前端约束 ${frontendConstraint}`)
      }
    }

    // 验证后端软约束是否都有前端映射
    for (const backendConstraint of BACKEND_SOFT_CONSTRAINTS) {
      const frontendConstraint =
        await constraintMappingService.mapBackendToFrontend(backendConstraint)

      if (frontendConstraint === backendConstraint) {
        missingMappings.backendToFrontend.push(backendConstraint)
        unmappedConstraints.backend.push(backendConstraint)
        warnings.push(`后端软约束 ${backendConstraint} 缺少前端映射`)
      } else if (frontendConstraint && !FRONTEND_SOFT_CONSTRAINTS.includes(frontendConstraint)) {
        errors.push(`后端软约束 ${backendConstraint} 映射到不存在的前端约束 ${frontendConstraint}`)
      }
    }
  }

  /**
   * 验证映射一致性（双向映射是否一致）
   */
  private static async validateMappingConsistency(
    errors: string[],
    warnings: string[],
    inconsistentMappings: Array<{
      frontend: string
      expectedBackend: string
      actualBackend: string
    }>
  ): Promise<void> {
    const allFrontendConstraints = [...FRONTEND_HARD_CONSTRAINTS, ...FRONTEND_SOFT_CONSTRAINTS]

    for (const frontendConstraint of allFrontendConstraints) {
      const backendConstraint =
        await constraintMappingService.mapFrontendToBackend(frontendConstraint)
      if (backendConstraint && backendConstraint !== frontendConstraint) {
        const reverseFrontendConstraint =
          await constraintMappingService.mapBackendToFrontend(backendConstraint)

        if (reverseFrontendConstraint !== frontendConstraint) {
          errors.push(
            `映射不一致: ${frontendConstraint} -> ${backendConstraint} -> ${reverseFrontendConstraint}`
          )
        }
      }
    }
  }

  /**
   * 检查未映射的约束
   */
  private static async checkUnmappedConstraints(
    warnings: string[],
    unmappedConstraints: { frontend: string[]; backend: string[] }
  ): Promise<void> {
    // 检查前端是否有未映射的约束
    const allFrontendConstraints = [...FRONTEND_HARD_CONSTRAINTS, ...FRONTEND_SOFT_CONSTRAINTS]
    for (const frontendConstraint of allFrontendConstraints) {
      const backendConstraint =
        await constraintMappingService.mapFrontendToBackend(frontendConstraint)
      if (backendConstraint === frontendConstraint) {
        unmappedConstraints.frontend.push(frontendConstraint)
      }
    }

    if (unmappedConstraints.frontend.length > 0) {
      warnings.push(`发现 ${unmappedConstraints.frontend.length} 个未映射的前端约束`)
    }

    if (unmappedConstraints.backend.length > 0) {
      warnings.push(`发现 ${unmappedConstraints.backend.length} 个未映射的后端约束`)
    }
  }

  /**
   * 验证与后端API的一致性
   */
  /**
   * 通过后端API验证约束映射
   */
  private static async validateWithBackendApi(errors: string[], warnings: string[]): Promise<void> {
    try {
      // 根据环境动态设置URL，支持动态端口获取
      let baseUrl = ''
      if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
        try {
          const port = await (window as any).electronAPI.getBackendPort()
          baseUrl = `http://127.0.0.1:${port}`
        } catch (error) {
          console.warn('Failed to get backend port, using default 8081:', error)
          baseUrl = 'http://127.0.0.1:8081'
        }
      }

      const response = await fetch(`${baseUrl}/api/constraint-mapping/all`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const backendMappings = await response.json()

      // 验证硬约束映射 - 后端API返回的是约束ID到描述的映射
      for (const frontend of FRONTEND_HARD_CONSTRAINTS) {
        const backendDescription = backendMappings.hardConstraints[frontend]
        if (!backendDescription) {
          errors.push(`后端API缺少硬约束映射: ${frontend}`)
        }
      }

      // 验证软约束映射 - 后端API返回的是约束ID到描述的映射
      for (const frontend of FRONTEND_SOFT_CONSTRAINTS) {
        const backendDescription = backendMappings.softConstraints[frontend]
        if (!backendDescription) {
          errors.push(`后端API缺少软约束映射: ${frontend}`)
        }
      }
    } catch (error) {
      warnings.push(`无法验证后端API一致性: ${error}`)
    }
  }

  /**
   * 获取期望的后端约束名称
   */
  private static getExpectedBackendConstraint(frontendConstraint: string): string | null {
    // 基于约束编号推断后端约束名称
    const constraintMappings: Record<string, string> = {
      // 硬约束映射
      HC1: 'workdaysOnlyExam',
      HC2: 'examinerDepartmentRules',
      HC3: 'twoMainExaminersRequired',
      HC4: 'noDayShiftExaminer',
      HC5: 'noStudentConflict',
      HC6: 'consecutiveTwoDaysExam',
      HC7: 'examinerDifferentDepartments',
      HC8: 'backupExaminerDifferentPerson',

      // 软约束映射
      SC10: 'nightShiftTeacherPriorityWeight',
      SC2: 'preferRecommendedExaminer2Weight',
      SC11: 'firstRestDayTeacherPriorityWeight',
      SC3: 'preferRecommendedBackupExaminerWeight',
      SC12: 'secondRestDayTeacherPriorityWeight',
      SC2_NON_RECOMMENDED: 'nonRecommendedExaminer2Weight',
      SC1_ADMIN: 'adminClassTeacherPriorityWeight',
      SC3_NON_RECOMMENDED: 'nonRecommendedBackupExaminerWeight',
      SC4: 'backupExaminerDiffDeptWeight',
      SC5: 'avoidStudentDayShiftWeight',
      SC6: 'preferLaterDatesWeight',
    }

    return constraintMappings[frontendConstraint] || null
  }

  /**
   * 获取前端硬约束映射
   */
  private static getFrontendHardConstraintMappings(): Record<string, string> {
    const mappings: Record<string, string> = {}
    for (const frontend of FRONTEND_HARD_CONSTRAINTS) {
      const backend = this.getExpectedBackendConstraint(frontend)
      if (backend) {
        mappings[frontend] = backend
      }
    }
    return mappings
  }

  /**
   * 获取前端软约束映射
   */
  private static getFrontendSoftConstraintMappings(): Record<string, string> {
    const mappings: Record<string, string> = {}
    for (const frontend of FRONTEND_SOFT_CONSTRAINTS) {
      const backend = this.getExpectedBackendConstraint(frontend)
      if (backend) {
        mappings[frontend] = backend
      }
    }
    return mappings
  }

  /**
   * 生成映射修复建议
   */
  static generateMappingFixSuggestions(validationResult: MappingValidationResult): string[] {
    const suggestions: string[] = []

    // 缺失映射的修复建议
    if (validationResult.missingMappings.frontendToBackend.length > 0) {
      suggestions.push('在 constraintMappingService.ts 中添加缺失的前端到后端映射')
      validationResult.missingMappings.frontendToBackend.forEach(constraint => {
        const expectedBackend = this.getExpectedBackendConstraint(constraint)
        if (expectedBackend) {
          suggestions.push(`  '${constraint}': '${expectedBackend}'`)
        }
      })
    }

    // 不一致映射的修复建议
    if (validationResult.inconsistentMappings.length > 0) {
      suggestions.push('修复不一致的约束映射:')
      validationResult.inconsistentMappings.forEach(mapping => {
        suggestions.push(
          `  将 '${mapping.frontend}' 的映射从 '${mapping.actualBackend}' 改为 '${mapping.expectedBackend}'`
        )
      })
    }

    // 未映射约束的处理建议
    if (validationResult.unmappedConstraints.backend.length > 0) {
      suggestions.push('考虑为以下后端约束添加前端映射:')
      validationResult.unmappedConstraints.backend.forEach(constraint => {
        suggestions.push(`  后端约束: ${constraint}`)
      })
    }

    return suggestions
  }
}

export default ConstraintMappingValidator
