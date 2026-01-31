/**
 * 🚀 v6.1.3优化: 输入验证工具
 * 提供统一的输入验证功能，增强数据安全性
 */

export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
  message?: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 输入验证器类
 */
class InputValidator {
  /**
   * 验证单个值
   */
  validate(value: any, rules: ValidationRule | ValidationRule[]): ValidationResult {
    const ruleList = Array.isArray(rules) ? rules : [rules]
    const errors: string[] = []

    for (const rule of ruleList) {
      // 必填验证
      if (rule.required && (value === null || value === undefined || value === '')) {
        errors.push(rule.message || '此字段为必填项')
        continue
      }

      // 如果值为空且不是必填，跳过其他验证
      if (value === null || value === undefined || value === '') {
        continue
      }

      // 最小值验证
      if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
        errors.push(rule.message || `值不能小于 ${rule.min}`)
      }

      // 最大值验证
      if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
        errors.push(rule.message || `值不能大于 ${rule.max}`)
      }

      // 最小长度验证
      if (rule.minLength !== undefined) {
        const length = typeof value === 'string' ? value.length : String(value).length
        if (length < rule.minLength) {
          errors.push(rule.message || `长度不能少于 ${rule.minLength} 个字符`)
        }
      }

      // 最大长度验证
      if (rule.maxLength !== undefined) {
        const length = typeof value === 'string' ? value.length : String(value).length
        if (length > rule.maxLength) {
          errors.push(rule.message || `长度不能超过 ${rule.maxLength} 个字符`)
        }
      }

      // 正则表达式验证
      if (rule.pattern) {
        const strValue = String(value)
        if (!rule.pattern.test(strValue)) {
          errors.push(rule.message || '格式不正确')
        }
      }

      // 自定义验证
      if (rule.custom) {
        const result = rule.custom(value)
        if (result !== true) {
          errors.push(typeof result === 'string' ? result : rule.message || '验证失败')
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 验证对象（多个字段）
   */
  validateObject(
    data: Record<string, any>,
    rules: Record<string, ValidationRule | ValidationRule[]>
  ): ValidationResult {
    const errors: string[] = []

    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = data[field]
      const result = this.validate(value, fieldRules)

      if (!result.valid) {
        errors.push(...result.errors.map(err => `${field}: ${err}`))
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * 常用验证规则
   */
  rules = {
    required: (message?: string): ValidationRule => ({
      required: true,
      message: message || '此字段为必填项',
    }),

    email: (message?: string): ValidationRule => ({
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: message || '请输入有效的邮箱地址',
    }),

    phone: (message?: string): ValidationRule => ({
      pattern: /^1[3-9]\d{9}$/,
      message: message || '请输入有效的手机号码',
    }),

    url: (message?: string): ValidationRule => ({
      pattern: /^https?:\/\/.+/,
      message: message || '请输入有效的URL地址',
    }),

    number: (message?: string): ValidationRule => ({
      custom: (value) => {
        return !isNaN(Number(value)) || (message || '请输入有效的数字')
      },
    }),

    integer: (message?: string): ValidationRule => ({
      custom: (value) => {
        return Number.isInteger(Number(value)) || (message || '请输入整数')
      },
    }),

    positive: (message?: string): ValidationRule => ({
      custom: (value) => {
        const num = Number(value)
        return (num > 0) || (message || '请输入正数')
      },
    }),

    min: (min: number, message?: string): ValidationRule => ({
      min,
      message: message || `值不能小于 ${min}`,
    }),

    max: (max: number, message?: string): ValidationRule => ({
      max,
      message: message || `值不能大于 ${max}`,
    }),

    minLength: (minLength: number, message?: string): ValidationRule => ({
      minLength,
      message: message || `长度不能少于 ${minLength} 个字符`,
    }),

    maxLength: (maxLength: number, message?: string): ValidationRule => ({
      maxLength,
      message: message || `长度不能超过 ${maxLength} 个字符`,
    }),
  }
}

// 导出单例实例
export const inputValidator = new InputValidator()

// 导出便捷方法
export const validate = (value: any, rules: ValidationRule | ValidationRule[]) =>
  inputValidator.validate(value, rules)

export const validateObject = (
  data: Record<string, any>,
  rules: Record<string, ValidationRule | ValidationRule[]>
) => inputValidator.validateObject(data, rules)

