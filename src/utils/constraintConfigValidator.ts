/**
 * 约束配置验证工具
 * 确保前后端约束配置与文档constraint-configuration-guide.md的一致性
 */

import { HARD_CONSTRAINTS, SOFT_CONSTRAINTS } from '@/types/examiner-constraints'

// 文档规定的硬约束权重
const DOCUMENT_HARD_CONSTRAINT_WEIGHTS = {
  HC1: 5000, // 法定节假日限制
  HC2: 8000, // 专业匹配要求，确保考试有效性
  HC3: 7000, // 考官时间冲突避免
  HC4: 9000, // 考官工作负荷控制，防止过度安排
  HC5: 6000, // 考生执勤白班不能安排考试
  HC6: 4000, // 考试连续性要求
  HC7: 10000, // 考试基本制度要求，权重最高
  HC8: 3000, // 备份考官独立性
}

// 文档规定的软约束权重
const DOCUMENT_SOFT_CONSTRAINT_WEIGHTS = {
  SC1: 100, // 晚班考官优先级最高权重
  SC2: 90, // 考官2专业匹配
  SC3: 80, // 休息第一天考官优先级次高权重
  SC4: 70, // 备份考官专业匹配
  SC5: 60, // 休息第二天考官优先级中等权重
  SC6: 50, // 考官2备选方案
  SC7: 40, // 行政班考官优先级最低权重
  SC8: 30, // 备份考官备选方案
  SC9: 20, // 区域协作鼓励
  SC10: 10, // 工作量均衡
  SC11: 5, // 日期分配均衡
}

// 文档规定的约束描述关键词
const DOCUMENT_CONSTRAINT_KEYWORDS = {
  HC1: ['法定节假日', '行政班考官', '周末不参加'],
  HC2: ['考官1', '学员同科室', '专业性'],
  HC3: ['执勤白班', '行政班考官除外', '时间和精力'],
  HC4: ['每名考官', '每天只能', '一名考生'],
  HC5: ['考生执勤白班', '专注于白班工作', '准备时间'],
  HC6: ['连续两天', '两个连续休息日', '第一天执勤晚班'],
  HC7: ['考官1和考官2', '不同科室', '公正性'],
  HC8: ['备份考官', '独立的第三人', '角色混淆'],
  SC1: ['晚班考官', '优先级最高', '权重等级'],
  SC2: ['考官2', '专业匹配', '推荐科室'],
  SC3: ['休息第一天', '次高权重', '晚班考官之后'],
  SC4: ['备份考官', '专业匹配', '推荐科室'],
  SC5: ['休息第二天', '中等权重', '第一天之后'],
  SC6: ['考官2', '备选方案', '不可用时'],
  SC7: ['行政班考官', '最低权重', '最后考虑'],
  SC8: ['备份考官', '备选方案', '不可用时'],
  SC9: ['区域协作', '三室七室', '互相使用'],
  SC10: ['工作量均衡', '负载', '繁忙或空闲'],
  SC11: ['日期分配', '均匀分配', '集中在某些日期'],
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  summary: {
    totalConstraints: number
    validConstraints: number
    errorCount: number
    warningCount: number
  }
}

export class ConstraintConfigValidator {
  /**
   * 验证硬约束配置
   */
  validateHardConstraints(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 检查硬约束权重是否与文档一致
    Object.entries(DOCUMENT_HARD_CONSTRAINT_WEIGHTS).forEach(([constraintId, expectedWeight]) => {
      const actualConstraint = HARD_CONSTRAINTS[constraintId as keyof typeof HARD_CONSTRAINTS]

      if (!actualConstraint) {
        errors.push(`缺少硬约束 ${constraintId}`)
        return
      }

      if (actualConstraint.weight !== expectedWeight) {
        errors.push(
          `硬约束 ${constraintId} 权重不一致: 期望 ${expectedWeight}, 实际 ${actualConstraint.weight}`
        )
      }

      // 检查描述是否包含关键词
      const keywords =
        DOCUMENT_CONSTRAINT_KEYWORDS[constraintId as keyof typeof DOCUMENT_CONSTRAINT_KEYWORDS]
      if (keywords) {
        const description = actualConstraint.description.toLowerCase()
        const missingKeywords = keywords.filter(
          keyword => !description.includes(keyword.toLowerCase())
        )

        if (missingKeywords.length > 0) {
          warnings.push(
            `硬约束 ${constraintId} 描述可能不完整，缺少关键词: ${missingKeywords.join(', ')}`
          )
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalConstraints: Object.keys(DOCUMENT_HARD_CONSTRAINT_WEIGHTS).length,
        validConstraints: Object.keys(DOCUMENT_HARD_CONSTRAINT_WEIGHTS).length - errors.length,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
    }
  }

  /**
   * 验证软约束配置
   */
  validateSoftConstraints(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 检查软约束权重是否与文档一致
    Object.entries(DOCUMENT_SOFT_CONSTRAINT_WEIGHTS).forEach(([constraintId, expectedWeight]) => {
      const actualConstraint = SOFT_CONSTRAINTS[constraintId as keyof typeof SOFT_CONSTRAINTS]

      if (!actualConstraint) {
        errors.push(`缺少软约束 ${constraintId}`)
        return
      }

      if (actualConstraint.weight !== expectedWeight) {
        errors.push(
          `软约束 ${constraintId} 权重不一致: 期望 ${expectedWeight}, 实际 ${actualConstraint.weight}`
        )
      }

      // 检查描述是否包含关键词
      const keywords =
        DOCUMENT_CONSTRAINT_KEYWORDS[constraintId as keyof typeof DOCUMENT_CONSTRAINT_KEYWORDS]
      if (keywords) {
        const description = actualConstraint.description.toLowerCase()
        const missingKeywords = keywords.filter(
          keyword => !description.includes(keyword.toLowerCase())
        )

        if (missingKeywords.length > 0) {
          warnings.push(
            `软约束 ${constraintId} 描述可能不完整，缺少关键词: ${missingKeywords.join(', ')}`
          )
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalConstraints: Object.keys(DOCUMENT_SOFT_CONSTRAINT_WEIGHTS).length,
        validConstraints: Object.keys(DOCUMENT_SOFT_CONSTRAINT_WEIGHTS).length - errors.length,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
    }
  }

  /**
   * 验证约束权重顺序是否正确
   */
  validateConstraintPriority(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 硬约束权重应该按文档顺序递减：HC7 > HC4 > HC2 > HC3 > HC5 > HC1 > HC6 > HC8
    const hardConstraintOrder = ['HC7', 'HC4', 'HC2', 'HC3', 'HC5', 'HC1', 'HC6', 'HC8']
    for (let i = 0; i < hardConstraintOrder.length - 1; i++) {
      const current = hardConstraintOrder[i]
      const next = hardConstraintOrder[i + 1]

      const currentWeight =
        DOCUMENT_HARD_CONSTRAINT_WEIGHTS[current as keyof typeof DOCUMENT_HARD_CONSTRAINT_WEIGHTS]
      const nextWeight =
        DOCUMENT_HARD_CONSTRAINT_WEIGHTS[next as keyof typeof DOCUMENT_HARD_CONSTRAINT_WEIGHTS]

      if (currentWeight <= nextWeight) {
        errors.push(
          `硬约束权重顺序错误: ${current}(${currentWeight}) 应该大于 ${next}(${nextWeight})`
        )
      }
    }

    // 软约束权重应该按文档顺序递减：SC1 > SC2 > SC3 > ... > SC11
    const softConstraintOrder = [
      'SC1',
      'SC2',
      'SC3',
      'SC4',
      'SC5',
      'SC6',
      'SC7',
      'SC8',
      'SC9',
      'SC10',
      'SC11',
    ]
    for (let i = 0; i < softConstraintOrder.length - 1; i++) {
      const current = softConstraintOrder[i]
      const next = softConstraintOrder[i + 1]

      const currentWeight =
        DOCUMENT_SOFT_CONSTRAINT_WEIGHTS[current as keyof typeof DOCUMENT_SOFT_CONSTRAINT_WEIGHTS]
      const nextWeight =
        DOCUMENT_SOFT_CONSTRAINT_WEIGHTS[next as keyof typeof DOCUMENT_SOFT_CONSTRAINT_WEIGHTS]

      if (currentWeight <= nextWeight) {
        errors.push(
          `软约束权重顺序错误: ${current}(${currentWeight}) 应该大于 ${next}(${nextWeight})`
        )
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalConstraints: hardConstraintOrder.length + softConstraintOrder.length,
        validConstraints: hardConstraintOrder.length + softConstraintOrder.length - errors.length,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
    }
  }

  /**
   * 全面验证约束配置
   */
  validateAll(): ValidationResult {
    const hardResult = this.validateHardConstraints()
    const softResult = this.validateSoftConstraints()
    const priorityResult = this.validateConstraintPriority()

    return {
      isValid: hardResult.isValid && softResult.isValid && priorityResult.isValid,
      errors: [...hardResult.errors, ...softResult.errors, ...priorityResult.errors],
      warnings: [...hardResult.warnings, ...softResult.warnings, ...priorityResult.warnings],
      summary: {
        totalConstraints: hardResult.summary.totalConstraints + softResult.summary.totalConstraints,
        validConstraints: hardResult.summary.validConstraints + softResult.summary.validConstraints,
        errorCount:
          hardResult.summary.errorCount +
          softResult.summary.errorCount +
          priorityResult.summary.errorCount,
        warningCount:
          hardResult.summary.warningCount +
          softResult.summary.warningCount +
          priorityResult.summary.warningCount,
      },
    }
  }

  /**
   * 生成验证报告
   */
  generateReport(): string {
    const result = this.validateAll()

    let report = `# 约束配置验证报告\n\n`
    report += `## 验证概要\n`
    report += `- 总约束数量: ${result.summary.totalConstraints}\n`
    report += `- 有效约束: ${result.summary.validConstraints}\n`
    report += `- 错误数量: ${result.summary.errorCount}\n`
    report += `- 警告数量: ${result.summary.warningCount}\n`
    report += `- 验证状态: ${result.isValid ? '✅ 通过' : '❌ 失败'}\n\n`

    if (result.errors.length > 0) {
      report += `## ❌ 错误列表\n`
      result.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`
      })
      report += `\n`
    }

    if (result.warnings.length > 0) {
      report += `## ⚠️ 警告列表\n`
      result.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`
      })
      report += `\n`
    }

    if (result.isValid) {
      report += `## ✅ 验证通过\n`
      report += `所有约束配置与文档规范保持一致。\n`
    }

    report += `\n---\n`
    report += `验证时间: ${new Date().toLocaleString()}\n`

    return report
  }
}

// 导出单例实例
export const constraintConfigValidator = new ConstraintConfigValidator()
