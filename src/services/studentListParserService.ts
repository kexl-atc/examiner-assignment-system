/**
 * 学员名单解析服务
 * 支持推荐科室信息解析和验证
 */

import * as XLSX from 'xlsx'
import type {
  EnhancedStudentInfo,
  StudentListParseResult,
  StudentValidationResult,
  BatchValidationResult,
  ValidationError,
  DepartmentValidationRules,
  ParseOptions,
  ImportProgress,
  StudentListStatistics,
  RecommendedDepartments,
} from '../types/studentTypes'
import { ValidationErrorType } from '../types/studentTypes'

/**
 * 学员名单解析服务类
 */
export class StudentListParserService {
  // 默认科室列表
  private readonly defaultDepartments = [
    '区域一室',
    '区域二室',
    '区域三室',
    '区域四室',
    '区域五室',
    '区域六室',
    '区域七室',
    '区域八室',
    '区域九室',
    '区域十室',
  ]

  // 科室互通规则（3室与7室可以互通）
  private readonly crossDepartmentRules = [
    {
      department1: '区域三室',
      department2: '区域七室',
      allowed: true,
      description: '3室与7室考官资源可以互通使用',
    },
  ]

  // 默认解析选项
  private readonly defaultParseOptions: ParseOptions = {
    skipEmptyRows: true,
    trimWhitespace: true,
    validateDepartments: true,
    allowDuplicates: false,
    autoFixFormat: true,
    strictMode: false,
  }

  /**
   * 解析Excel/CSV文件
   */
  async parseFile(
    file: File,
    options: Partial<ParseOptions> = {}
  ): Promise<StudentListParseResult> {
    const startTime = Date.now()
    const parseOptions = { ...this.defaultParseOptions, ...options }

    try {
      // 读取文件内容
      const fileContent = await this.readFileContent(file)

      // 解析文件数据
      const rawData = this.parseFileContent(fileContent, file.name)

      // 验证和转换数据
      const validationResult = await this.validateAndTransformData(rawData, parseOptions)

      const parseTime = Date.now() - startTime

      return {
        success: validationResult.summary.errorCount === 0,
        totalRows: rawData.length,
        validStudents: validationResult.validStudents,
        invalidRows: validationResult.invalidStudents.map(invalid => ({
          rowIndex: invalid.rowIndex,
          rawData: JSON.stringify(invalid.rawData),
          errors: invalid.validationResult.errors.map(e => e.message),
          warnings: invalid.validationResult.warnings.map(w => w.message),
        })),
        summary: {
          validCount: validationResult.summary.validCount,
          invalidCount: validationResult.summary.errorCount,
          duplicateCount: validationResult.summary.duplicateCount,
          missingRecommendationsCount: this.countMissingRecommendations(
            validationResult.validStudents
          ),
        },
        parseTime,
      }
    } catch (error) {
      return {
        success: false,
        totalRows: 0,
        validStudents: [],
        invalidRows: [
          {
            rowIndex: 0,
            rawData: '',
            errors: [`文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`],
            warnings: [],
          },
        ],
        summary: {
          validCount: 0,
          invalidCount: 1,
          duplicateCount: 0,
          missingRecommendationsCount: 0,
        },
        parseTime: Date.now() - startTime,
      }
    }
  }

  /**
   * 读取文件内容
   */
  private async readFileContent(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        if (e.target?.result) {
          resolve(e.target.result as ArrayBuffer)
        } else {
          reject(new Error('文件读取失败'))
        }
      }
      reader.onerror = () => reject(new Error('文件读取错误'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 解析文件内容
   */
  private parseFileContent(content: ArrayBuffer, fileName: string): any[] {
    const workbook = XLSX.read(content, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // 转换为JSON格式
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    }) as any[][]

    if (jsonData.length === 0) {
      throw new Error('文件内容为空')
    }

    // 获取表头
    const headers = jsonData[0] as string[]

    // 转换数据行
    const dataRows = jsonData.slice(1).map((row, index) => {
      const rowData: any = {}
      headers.forEach((header, colIndex) => {
        rowData[header] = row[colIndex] || ''
      })
      rowData._rowIndex = index + 2 // Excel行号从2开始（跳过表头）
      return rowData
    })

    return dataRows
  }

  /**
   * 验证和转换数据
   */
  private async validateAndTransformData(
    rawData: any[],
    options: ParseOptions
  ): Promise<BatchValidationResult> {
    const validStudents: EnhancedStudentInfo[] = []
    const invalidStudents: Array<{
      rowIndex: number
      rawData: any
      validationResult: StudentValidationResult
    }> = []

    const seenIds = new Set<string>()
    let duplicateCount = 0
    let errorCount = 0
    let warningCount = 0

    // 部门统计
    const departmentStats: Record<
      string,
      {
        studentCount: number
        examiner1Recommendations: Record<string, number>
        examiner2Recommendations: Record<string, number>
      }
    > = {}

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]

      // 跳过空行
      if (options.skipEmptyRows && this.isEmptyRow(row)) {
        continue
      }

      // 验证单个学员数据
      const validationResult = await this.validateStudentData(row, options)

      if (validationResult.isValid && validationResult.student) {
        const student = validationResult.student

        // 检查重复ID
        if (seenIds.has(student.id)) {
          duplicateCount++
          if (!options.allowDuplicates) {
            invalidStudents.push({
              rowIndex: row._rowIndex || i + 1,
              rawData: row,
              validationResult: {
                isValid: false,
                errors: [
                  {
                    type: ValidationErrorType.DUPLICATE_ENTRY,
                    field: 'id',
                    value: student.id,
                    message: `学员ID重复: ${student.id}`,
                    severity: 'error',
                  },
                ],
                warnings: [],
                suggestions: ['请检查学员ID是否重复', '确保每个学员有唯一的ID'],
              },
            })
            errorCount++
            continue
          }
        }

        seenIds.add(student.id)
        validStudents.push(student)

        // 更新部门统计
        this.updateDepartmentStatistics(student, departmentStats)

        // 统计警告
        warningCount += validationResult.warnings.length
      } else {
        invalidStudents.push({
          rowIndex: row._rowIndex || i + 1,
          rawData: row,
          validationResult,
        })
        errorCount++
      }
    }

    return {
      totalProcessed: rawData.length,
      validStudents,
      invalidStudents,
      summary: {
        validCount: validStudents.length,
        errorCount,
        warningCount,
        duplicateCount,
      },
      departmentStatistics: departmentStats,
    }
  }

  /**
   * 验证单个学员数据
   */
  private async validateStudentData(
    row: any,
    options: ParseOptions
  ): Promise<StudentValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: string[] = []

    try {
      // 解析基础信息
      const studentInfo = this.parseBasicStudentInfo(row, errors, warnings, options)
      if (!studentInfo) {
        return { isValid: false, errors, warnings, suggestions }
      }

      // 解析推荐科室信息
      const recommendedDepartments = this.parseRecommendedDepartments(
        row,
        errors,
        warnings,
        options
      )

      // 验证推荐科室规则
      if (recommendedDepartments) {
        this.validateRecommendationRules(studentInfo, recommendedDepartments, errors, warnings)
      }

      // 生成建议
      this.generateSuggestions(studentInfo, recommendedDepartments, suggestions, warnings)

      const enhancedStudent: EnhancedStudentInfo = {
        ...studentInfo,
        recommendedDepartments: recommendedDepartments || {
          examiner1Department: '',
          examiner2Department: '',
        },
        originalData: JSON.stringify(row),
      }

      return {
        isValid: errors.length === 0,
        student: enhancedStudent,
        errors,
        warnings,
        suggestions,
      }
    } catch (error) {
      errors.push({
        type: ValidationErrorType.INVALID_FORMAT,
        field: 'general',
        value: row,
        message: `数据解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        severity: 'error',
      })

      return { isValid: false, errors, warnings, suggestions }
    }
  }

  /**
   * 解析基础学员信息
   */
  private parseBasicStudentInfo(
    row: any,
    errors: ValidationError[],
    warnings: ValidationError[],
    options: ParseOptions
  ): any | null {
    const student: any = {}

    // 解析姓名
    const name = this.extractValue(
      row,
      ['姓名', '学员姓名', 'name', '名字'],
      options.trimWhitespace
    )
    if (!name) {
      errors.push({
        type: ValidationErrorType.MISSING_REQUIRED_FIELD,
        field: 'name',
        value: name,
        message: '学员姓名不能为空',
        severity: 'error',
      })
      return null
    }
    student.name = name

    // 生成ID（如果没有提供）
    const id =
      this.extractValue(row, ['ID', 'id', '学员ID', '编号'], options.trimWhitespace) ||
      this.generateStudentId(name)
    student.id = id

    // 解析科室
    const department = this.extractValue(
      row,
      ['科室', '部门', 'department', '所属科室'],
      options.trimWhitespace
    )
    if (!department) {
      errors.push({
        type: ValidationErrorType.MISSING_REQUIRED_FIELD,
        field: 'department',
        value: department,
        message: '学员科室不能为空',
        severity: 'error',
      })
      return null
    }

    // 验证科室有效性
    if (options.validateDepartments && !this.isValidDepartment(department)) {
      if (options.autoFixFormat) {
        const fixedDept = this.fixDepartmentName(department)
        if (fixedDept) {
          student.department = fixedDept
          warnings.push({
            type: ValidationErrorType.INVALID_FORMAT,
            field: 'department',
            value: department,
            message: `科室名称已自动修正: ${department} -> ${fixedDept}`,
            severity: 'warning',
          })
        } else {
          errors.push({
            type: ValidationErrorType.INVALID_DEPARTMENT,
            field: 'department',
            value: department,
            message: `无效的科室名称: ${department}`,
            suggestion: `可用科室: ${this.defaultDepartments.join(', ')}`,
            severity: 'error',
          })
          return null
        }
      } else {
        errors.push({
          type: ValidationErrorType.INVALID_DEPARTMENT,
          field: 'department',
          value: department,
          message: `无效的科室名称: ${department}`,
          suggestion: `可用科室: ${this.defaultDepartments.join(', ')}`,
          severity: 'error',
        })
        return null
      }
    } else {
      student.department = department
    }

    // 解析班组
    const group = this.extractValue(row, ['班组', '组别', 'group', '小组'], options.trimWhitespace)
    if (!group) {
      errors.push({
        type: ValidationErrorType.MISSING_REQUIRED_FIELD,
        field: 'group',
        value: group,
        message: '学员班组不能为空',
        severity: 'error',
      })
      return null
    }
    student.group = group

    // 解析可选字段
    // 移除联系方式字段的提取
    // student.phone = this.extractValue(row, ['电话', '手机', 'phone', '联系电话'], options.trimWhitespace)
    // student.email = this.extractValue(row, ['邮箱', 'email', '电子邮件'], options.trimWhitespace)
    student.examType =
      this.extractValue(row, ['考试类型', 'examType', '考试形式'], options.trimWhitespace) ||
      'practical'

    return student
  }

  /**
   * 解析推荐科室信息
   * 支持格式：张三，区域一室，三组，考官一：区域三室，考官二：区域七室
   */
  private parseRecommendedDepartments(
    row: any,
    errors: ValidationError[],
    warnings: ValidationError[],
    options: ParseOptions
  ): RecommendedDepartments | null {
    // 尝试从多个可能的字段中提取推荐科室信息
    const recommendationText = this.extractValue(
      row,
      [
        '推荐科室',
        '考官推荐',
        'recommendations',
        '考官安排',
        '考官一',
        '考官二',
        'examiner1',
        'examiner2',
      ],
      options.trimWhitespace
    )

    if (!recommendationText) {
      // 尝试从完整行数据中解析
      const fullRowText = Object.values(row).join('，')
      return this.parseRecommendationsFromText(fullRowText, errors, warnings)
    }

    return this.parseRecommendationsFromText(recommendationText, errors, warnings)
  }

  /**
   * 从文本中解析推荐科室信息
   */
  private parseRecommendationsFromText(
    text: string,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): RecommendedDepartments | null {
    if (!text) return null

    const recommendations: Partial<RecommendedDepartments> = {}

    // 正则表达式匹配模式
    const patterns = [
      // 考官一：区域三室，考官二：区域七室
      /考官一[：:]\s*([^，,]+)[，,]?\s*考官二[：:]\s*([^，,]+)/,
      // 考官1：区域三室，考官2：区域七室
      /考官1[：:]\s*([^，,]+)[，,]?\s*考官2[：:]\s*([^，,]+)/,
      // examiner1: 区域三室, examiner2: 区域七室
      /examiner1[：:]\s*([^，,]+)[，,]?\s*examiner2[：:]\s*([^，,]+)/i,
    ]

    let matched = false
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        recommendations.examiner1Department = this.cleanDepartmentName(match[1])
        recommendations.examiner2Department = this.cleanDepartmentName(match[2])
        matched = true
        break
      }
    }

    // 如果没有匹配到标准格式，尝试提取科室名称
    if (!matched) {
      const departmentMatches = this.extractDepartmentsFromText(text)
      if (departmentMatches.length >= 2) {
        recommendations.examiner1Department = departmentMatches[0]
        recommendations.examiner2Department = departmentMatches[1]
        if (departmentMatches.length > 2) {
          recommendations.backupDepartment = departmentMatches[2]
        }

        warnings.push({
          type: ValidationErrorType.INVALID_FORMAT,
          field: 'recommendations',
          value: text,
          message: '推荐科室格式不标准，已尝试自动解析',
          suggestion: '建议使用标准格式：考官一：区域三室，考官二：区域七室',
          severity: 'warning',
        })
      } else {
        warnings.push({
          type: ValidationErrorType.MISSING_RECOMMENDATIONS,
          field: 'recommendations',
          value: text,
          message: '未能解析推荐科室信息',
          suggestion: '请确保包含考官一和考官二的推荐科室',
          severity: 'warning',
        })
        return null
      }
    }

    // 验证解析结果
    if (!recommendations.examiner1Department || !recommendations.examiner2Department) {
      errors.push({
        type: ValidationErrorType.MISSING_RECOMMENDATIONS,
        field: 'recommendations',
        value: text,
        message: '推荐科室信息不完整',
        suggestion: '必须包含考官一和考官二的推荐科室',
        severity: 'error',
      })
      return null
    }

    return recommendations as RecommendedDepartments
  }

  /**
   * 从文本中提取科室名称
   */
  private extractDepartmentsFromText(text: string): string[] {
    const departments: string[] = []

    for (const dept of this.defaultDepartments) {
      if (text.includes(dept)) {
        departments.push(dept)
      }
    }

    // 去重并保持顺序
    return [...new Set(departments)]
  }

  /**
   * 清理科室名称
   */
  private cleanDepartmentName(name: string): string {
    return name.trim().replace(/[，,。.；;]/g, '')
  }

  /**
   * 验证推荐科室规则
   */
  private validateRecommendationRules(
    student: any,
    recommendations: RecommendedDepartments,
    errors: ValidationError[],
    warnings: ValidationError[]
  ) {
    // 规则1: 考官1必须与学员同科室（或3室7室互通）
    if (!this.isValidExaminer1Department(student.department, recommendations.examiner1Department)) {
      errors.push({
        type: ValidationErrorType.SAME_DEPARTMENT_CONFLICT,
        field: 'examiner1Department',
        value: recommendations.examiner1Department,
        message: `考官1推荐科室(${recommendations.examiner1Department})与学员科室(${student.department})不匹配`,
        suggestion: '考官1必须与学员同科室，或使用3室7室互通规则',
        severity: 'error',
      })
    }

    // 规则2: 考官2必须与学员不同科室
    if (student.department === recommendations.examiner2Department) {
      errors.push({
        type: ValidationErrorType.SAME_DEPARTMENT_CONFLICT,
        field: 'examiner2Department',
        value: recommendations.examiner2Department,
        message: `考官2推荐科室(${recommendations.examiner2Department})不能与学员科室(${student.department})相同`,
        suggestion: '考官2必须来自不同科室',
        severity: 'error',
      })
    }

    // 规则3: 考官1和考官2必须来自不同科室
    if (recommendations.examiner1Department === recommendations.examiner2Department) {
      errors.push({
        type: ValidationErrorType.SAME_DEPARTMENT_CONFLICT,
        field: 'recommendations',
        value: `${recommendations.examiner1Department} vs ${recommendations.examiner2Department}`,
        message: '考官1和考官2不能来自同一科室',
        suggestion: '请为考官1和考官2选择不同的科室',
        severity: 'error',
      })
    }

    // 规则4: 验证科室有效性
    const invalidDepts = [
      recommendations.examiner1Department,
      recommendations.examiner2Department,
      recommendations.backupDepartment,
    ].filter(dept => dept && !this.isValidDepartment(dept))

    if (invalidDepts.length > 0) {
      errors.push({
        type: ValidationErrorType.INVALID_DEPARTMENT,
        field: 'recommendations',
        value: invalidDepts.join(', '),
        message: `推荐科室无效: ${invalidDepts.join(', ')}`,
        suggestion: `可用科室: ${this.defaultDepartments.join(', ')}`,
        severity: 'error',
      })
    }
  }

  /**
   * 验证考官1科室是否有效
   */
  private isValidExaminer1Department(studentDept: string, examiner1Dept: string): boolean {
    // 同科室
    if (studentDept === examiner1Dept) {
      return true
    }

    // 3室7室互通
    if (
      (studentDept === '区域三室' && examiner1Dept === '区域七室') ||
      (studentDept === '区域七室' && examiner1Dept === '区域三室')
    ) {
      return true
    }

    return false
  }

  /**
   * 生成优化建议
   */
  private generateSuggestions(
    student: any,
    recommendations: RecommendedDepartments | null,
    suggestions: string[],
    warnings: ValidationError[]
  ) {
    if (!recommendations) {
      suggestions.push('建议补充完整的推荐科室信息')
      return
    }

    // 基于科室分布给出建议
    if (student.department === '区域三室' || student.department === '区域七室') {
      suggestions.push('可以利用3室7室互通规则增加考官选择灵活性')
    }

    // 基于警告给出建议
    if (warnings.length > 0) {
      suggestions.push('建议检查并修正数据格式问题')
    }

    // 推荐备份考官
    if (!recommendations.backupDepartment) {
      const availableDepts = this.defaultDepartments.filter(
        dept =>
          dept !== student.department &&
          dept !== recommendations.examiner1Department &&
          dept !== recommendations.examiner2Department
      )
      if (availableDepts.length > 0) {
        suggestions.push(`建议配备备份考官，可选科室: ${availableDepts.slice(0, 3).join(', ')}`)
      }
    }
  }

  /**
   * 工具方法
   */
  private extractValue(row: any, keys: string[], trim: boolean = true): string {
    for (const key of keys) {
      const value = row[key]
      if (value !== undefined && value !== null && value !== '') {
        return trim ? String(value).trim() : String(value)
      }
    }
    return ''
  }

  private isEmptyRow(row: any): boolean {
    return Object.values(row).every(
      value => value === undefined || value === null || String(value).trim() === ''
    )
  }

  private isValidDepartment(dept: string): boolean {
    return this.defaultDepartments.includes(dept)
  }

  private fixDepartmentName(dept: string): string | null {
    // 尝试修正常见的科室名称错误
    const fixes: Record<string, string> = {
      一室: '区域一室',
      二室: '区域二室',
      三室: '区域三室',
      四室: '区域四室',
      五室: '区域五室',
      六室: '区域六室',
      七室: '区域七室',
      八室: '区域八室',
      九室: '区域九室',
      十室: '区域十室',
      '1室': '区域一室',
      '2室': '区域二室',
      '3室': '区域三室',
      '4室': '区域四室',
      '5室': '区域五室',
      '6室': '区域六室',
      '7室': '区域七室',
      '8室': '区域八室',
      '9室': '区域九室',
      '10室': '区域十室',
    }

    return fixes[dept] || null
  }

  private generateStudentId(name: string): string {
    const timestamp = Date.now().toString().slice(-6)
    const nameHash = name
      .split('')
      .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) & 0xfffff, 0)
      .toString(16)
      .slice(-4)
    return `STU_${nameHash}_${timestamp}`
  }

  private countMissingRecommendations(students: EnhancedStudentInfo[]): number {
    return students.filter(
      student =>
        !student.recommendedDepartments.examiner1Department ||
        !student.recommendedDepartments.examiner2Department
    ).length
  }

  private updateDepartmentStatistics(student: EnhancedStudentInfo, stats: Record<string, any>) {
    const dept = student.department
    if (!stats[dept]) {
      stats[dept] = {
        studentCount: 0,
        examiner1Recommendations: {},
        examiner2Recommendations: {},
      }
    }

    stats[dept].studentCount++

    const e1Dept = student.recommendedDepartments.examiner1Department
    const e2Dept = student.recommendedDepartments.examiner2Department

    if (e1Dept) {
      stats[dept].examiner1Recommendations[e1Dept] =
        (stats[dept].examiner1Recommendations[e1Dept] || 0) + 1
    }

    if (e2Dept) {
      stats[dept].examiner2Recommendations[e2Dept] =
        (stats[dept].examiner2Recommendations[e2Dept] || 0) + 1
    }
  }

  /**
   * 获取学员名单统计信息
   */
  getStatistics(students: EnhancedStudentInfo[]): StudentListStatistics {
    const stats: StudentListStatistics = {
      totalStudents: students.length,
      departmentDistribution: {},
      groupDistribution: {},
      examTypeDistribution: {},
      recommendationCoverage: {
        examiner1: 0,
        examiner2: 0,
        backup: 0,
        complete: 0,
      },
      validationSummary: {
        fullyValid: 0,
        hasWarnings: 0,
        hasErrors: 0,
        needsReview: 0,
      },
    }

    students.forEach(student => {
      // 科室分布
      stats.departmentDistribution[student.department] =
        (stats.departmentDistribution[student.department] || 0) + 1

      // 班组分布
      stats.groupDistribution[student.group] = (stats.groupDistribution[student.group] || 0) + 1

      // 考试类型分布
      const examType = student.examType || 'practical'
      stats.examTypeDistribution[examType] = (stats.examTypeDistribution[examType] || 0) + 1

      // 推荐覆盖率
      if (student.recommendedDepartments.examiner1Department) {
        stats.recommendationCoverage.examiner1++
      }
      if (student.recommendedDepartments.examiner2Department) {
        stats.recommendationCoverage.examiner2++
      }
      if (student.recommendedDepartments.backupDepartment) {
        stats.recommendationCoverage.backup++
      }
      if (
        student.recommendedDepartments.examiner1Department &&
        student.recommendedDepartments.examiner2Department
      ) {
        stats.recommendationCoverage.complete++
      }
    })

    return stats
  }
}

// 导出默认实例
export const studentListParserService = new StudentListParserService()
