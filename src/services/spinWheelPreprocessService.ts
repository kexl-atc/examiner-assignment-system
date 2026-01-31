/**
 * 转盘抽签智能预处理服务
 * 
 * 功能：
 * 1. 根据考试日期分析各科室考官的班组可用性
 * 2. 智能推荐更有可能被成功分配的科室
 * 3. 与后端三级降级策略配合，提高排班成功率
 * 
 * 三级降级策略对应：
 * - 转盘考官一 → Day1考官二 + Day2考官二
 * - 转盘考官二 → Day1备份考官 + Day2备份考官
 */

import { dutyRotationService, type DutySchedule, type GroupStatus } from './dutyRotationService'
import { normalizeDeptToShort } from '../utils/departmentNormalizer'

/**
 * 科室可用性分析结果
 */
export interface DepartmentAvailability {
  department: string
  totalExaminers: number           // 该科室总考官数
  availableExaminers: number       // 可用考官数（非白班）
  highPriorityExaminers: number    // 高优先级考官数（夜班+休息）
  availabilityRatio: number        // 可用比例 (0-1)
  priorityScore: number            // 综合优先级分数 (0-100)
  recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended'
  details: {
    nightShiftCount: number        // 夜班考官数
    restDayCount: number           // 休息考官数
    dayShiftCount: number          // 白班考官数（不可用）
    noGroupCount: number           // 无班组考官数
  }
}

/**
 * 智能推荐结果
 */
export interface SmartRecommendation {
  examiner1Dept: string            // 推荐的考官一科室（转盘考官一）
  examiner2Dept: string            // 推荐的考官二科室（转盘考官二）
  confidence: number               // 推荐置信度 (0-100)
  reasoning: string[]              // 推荐理由
  alternatives: {                  // 备选方案
    examiner1Dept: string
    examiner2Dept: string
    confidence: number
  }[]
  warnings: string[]               // 警告信息
}

/**
 * 考官信息（简化版）
 */
export interface ExaminerInfo {
  id?: string
  name: string
  department: string               // 一、二、三、四、五、六、七
  group: string                    // 一组、二组、三组、四组、无
}

/**
 * 转盘抽签智能预处理服务
 */
export class SpinWheelPreprocessService {
  
  /**
   * 分析指定日期范围内各科室的考官可用性
   * 
   * @param examiners 所有考官列表
   * @param examDates 考试日期列表（通常是连续两天）
   * @returns 各科室可用性分析结果
   */
  analyzeDepartmentAvailability(
    examiners: ExaminerInfo[],
    examDates: string[]
  ): Map<string, DepartmentAvailability> {
    const result = new Map<string, DepartmentAvailability>()
    
    // 按科室分组考官
    const deptExaminers = new Map<string, ExaminerInfo[]>()
    examiners.forEach(examiner => {
      const dept = this.normalizeDepartment(examiner.department)
      if (!deptExaminers.has(dept)) {
        deptExaminers.set(dept, [])
      }
      deptExaminers.get(dept)!.push(examiner)
    })
    
    // 分析每个科室的可用性
    for (const [dept, deptExaminerList] of Array.from(deptExaminers)) {
      const availability = this.analyzeSingleDepartment(deptExaminerList, examDates)
      result.set(dept, {
        department: dept,
        ...availability
      })
    }
    
    return result
  }
  
  /**
   * 分析单个科室的可用性
   */
  private analyzeSingleDepartment(
    examiners: ExaminerInfo[],
    examDates: string[]
  ): Omit<DepartmentAvailability, 'department'> {
    const totalExaminers = examiners.length
    
    // 统计各类考官数量（取所有日期的最差情况）
    let minAvailable = Infinity
    let minHighPriority = Infinity
    let totalNightShift = 0
    let totalRestDay = 0
    let totalDayShift = 0
    let totalNoGroup = 0
    
    for (const dateStr of examDates) {
      let nightShiftCount = 0
      let restDayCount = 0
      let dayShiftCount = 0
      let noGroupCount = 0
      
      for (const examiner of examiners) {
        const group = examiner.group
        
        // 无班组考官
        if (!group || group === '无' || group === '') {
          noGroupCount++
          continue
        }
        
        // 获取该日期的班组状态
        const dutySchedule = dutyRotationService.calculateDutySchedule(dateStr)
        
        if (group === dutySchedule.dayShift) {
          dayShiftCount++
        } else if (group === dutySchedule.nightShift) {
          nightShiftCount++
        } else if (dutySchedule.restGroups.includes(group)) {
          restDayCount++
        }
      }
      
      // 可用考官 = 夜班 + 休息 + 无班组
      const availableThisDate = nightShiftCount + restDayCount + noGroupCount
      // 高优先级考官 = 夜班 + 休息
      const highPriorityThisDate = nightShiftCount + restDayCount
      
      // 取最差情况
      minAvailable = Math.min(minAvailable, availableThisDate)
      minHighPriority = Math.min(minHighPriority, highPriorityThisDate)
      
      // 累加详情
      totalNightShift += nightShiftCount
      totalRestDay += restDayCount
      totalDayShift += dayShiftCount
      totalNoGroup += noGroupCount
    }
    
    // 计算平均值用于详情显示
    const avgDays = examDates.length || 1
    const details = {
      nightShiftCount: Math.round(totalNightShift / avgDays),
      restDayCount: Math.round(totalRestDay / avgDays),
      dayShiftCount: Math.round(totalDayShift / avgDays),
      noGroupCount: Math.round(totalNoGroup / avgDays),
    }
    
    // 如果没有日期，使用总数
    if (minAvailable === Infinity) {
      minAvailable = totalExaminers
      minHighPriority = 0
    }
    
    // 计算可用比例
    const availabilityRatio = totalExaminers > 0 ? minAvailable / totalExaminers : 0
    
    // 计算综合优先级分数
    const priorityScore = this.calculatePriorityScore(
      totalExaminers,
      minAvailable,
      minHighPriority
    )
    
    // 生成推荐等级
    const recommendation = this.getRecommendationLevel(priorityScore, minAvailable)
    
    return {
      totalExaminers,
      availableExaminers: minAvailable,
      highPriorityExaminers: minHighPriority,
      availabilityRatio,
      priorityScore,
      recommendation,
      details,
    }
  }
  
  /**
   * 计算综合优先级分数
   */
  private calculatePriorityScore(
    total: number,
    available: number,
    highPriority: number
  ): number {
    if (total === 0) return 0
    
    // 基础分：可用比例 * 50
    const baseScore = (available / total) * 50
    
    // 高优先级加分：高优先级比例 * 30
    const priorityBonus = (highPriority / total) * 30
    
    // 绝对数量加分：每个可用考官2分，最高20分
    const countBonus = Math.min(available * 2, 20)
    
    return Math.round(baseScore + priorityBonus + countBonus)
  }
  
  /**
   * 获取推荐等级
   */
  private getRecommendationLevel(
    priorityScore: number,
    availableCount: number
  ): DepartmentAvailability['recommendation'] {
    if (availableCount < 1) return 'not_recommended'
    if (priorityScore >= 70) return 'highly_recommended'
    if (priorityScore >= 50) return 'recommended'
    if (priorityScore >= 30) return 'acceptable'
    return 'not_recommended'
  }
  
  /**
   * 为学员生成智能推荐
   * 
   * @param studentDept 学员所在科室
   * @param examiners 所有考官列表
   * @param examDates 考试日期列表
   * @returns 智能推荐结果
   */
  generateSmartRecommendation(
    studentDept: string,
    examiners: ExaminerInfo[],
    examDates: string[]
  ): SmartRecommendation {
    const normalizedStudentDept = this.normalizeDepartment(studentDept)
    
    // 分析所有科室的可用性
    const availability = this.analyzeDepartmentAvailability(examiners, examDates)
    
    // 获取学员科室可用性（用于考官一）
    const studentDeptAvailability = availability.get(normalizedStudentDept)
    
    // 获取其他科室可用性（用于考官二）
    const otherDepts: DepartmentAvailability[] = []
    for (const [dept, avail] of Array.from(availability)) {
      if (dept !== normalizedStudentDept && this.canBeExaminer2Dept(normalizedStudentDept, dept)) {
        otherDepts.push(avail)
      }
    }
    
    // 按优先级分数排序
    otherDepts.sort((a, b) => b.priorityScore - a.priorityScore)
    
    const warnings: string[] = []
    const reasoning: string[] = []
    
    // 检查学员科室（考官一来源）
    if (!studentDeptAvailability || studentDeptAvailability.availableExaminers < 1) {
      warnings.push(`学员科室(${normalizedStudentDept})可用考官不足`)
    } else {
      reasoning.push(`学员科室(${normalizedStudentDept})有${studentDeptAvailability.availableExaminers}名可用考官`)
    }
    
    // 选择最佳考官二科室
    const bestExaminer2Dept = otherDepts[0]
    if (!bestExaminer2Dept || bestExaminer2Dept.availableExaminers < 1) {
      warnings.push('其他科室可用考官不足')
    }
    
    // 根据三级降级策略：
    // - 考官一（转盘考官一）应来自高优先级科室
    // - 考官二（转盘考官二）也应来自高优先级科室
    
    // 推荐考官一科室（理想情况：学员同科室）
    const examiner1Dept = normalizedStudentDept
    reasoning.push(`考官一推荐科室: ${examiner1Dept} (学员同科室，符合HC2硬约束)`)
    
    // 推荐考官二科室（选择最高优先级的其他科室）
    const examiner2Dept = bestExaminer2Dept?.department || ''
    if (examiner2Dept) {
      reasoning.push(`考官二推荐科室: ${examiner2Dept} (优先级分数: ${bestExaminer2Dept.priorityScore})`)
      reasoning.push(`  - 可用考官: ${bestExaminer2Dept.availableExaminers}名`)
      reasoning.push(`  - 高优先级考官: ${bestExaminer2Dept.highPriorityExaminers}名`)
    }
    
    // 计算置信度
    const confidence = this.calculateConfidence(
      studentDeptAvailability,
      bestExaminer2Dept
    )
    
    // 生成备选方案
    const alternatives = otherDepts.slice(1, 4).map(dept => ({
      examiner1Dept,
      examiner2Dept: dept.department,
      confidence: this.calculateConfidence(studentDeptAvailability, dept)
    }))
    
    return {
      examiner1Dept,
      examiner2Dept,
      confidence,
      reasoning,
      alternatives,
      warnings,
    }
  }
  
  /**
   * 计算推荐置信度
   */
  private calculateConfidence(
    examiner1DeptAvail?: DepartmentAvailability,
    examiner2DeptAvail?: DepartmentAvailability
  ): number {
    if (!examiner1DeptAvail || !examiner2DeptAvail) return 0
    
    // 基于两个科室的优先级分数计算
    const avgScore = (examiner1DeptAvail.priorityScore + examiner2DeptAvail.priorityScore) / 2
    
    // 确保至少有足够的考官
    const minExaminers = Math.min(
      examiner1DeptAvail.availableExaminers,
      examiner2DeptAvail.availableExaminers
    )
    
    if (minExaminers < 1) return 10
    if (minExaminers < 2) return Math.min(avgScore, 50)
    
    return Math.min(avgScore, 95)
  }
  
  /**
   * 检查科室是否可以作为考官二科室
   * 考官二必须与学员科室不同（特殊情况：三室七室可以互相担任）
   */
  private canBeExaminer2Dept(studentDept: string, examinerDept: string): boolean {
    if (studentDept === examinerDept) {
      return false
    }
    
    // HC2约束：考官2与学员不同科室（三室七室互通情况除外）
    // 注意：三室七室互通规则主要针对考官1，考官2仍需不同科室
    return true
  }
  
  /**
   * 标准化科室名称（使用统一标准化工具）
   */
  private normalizeDepartment(dept: string): string {
    return normalizeDeptToShort(dept)
  }
  
  /**
   * 批量生成学员的智能推荐
   */
  batchGenerateRecommendations(
    students: Array<{ id: string; name: string; department: string }>,
    examiners: ExaminerInfo[],
    examDates: string[]
  ): Map<string, SmartRecommendation> {
    const recommendations = new Map<string, SmartRecommendation>()
    
    // 预计算科室可用性（避免重复计算）
    const availability = this.analyzeDepartmentAvailability(examiners, examDates)
    
    for (const student of students) {
      const recommendation = this.generateSmartRecommendation(
        student.department,
        examiners,
        examDates
      )
      recommendations.set(student.id, recommendation)
    }
    
    return recommendations
  }
  
  /**
   * 生成科室可用性报告
   */
  generateAvailabilityReport(
    examiners: ExaminerInfo[],
    examDates: string[]
  ): {
    summary: string
    details: DepartmentAvailability[]
    recommendations: string[]
    warnings: string[]
  } {
    const availability = this.analyzeDepartmentAvailability(examiners, examDates)
    const details = Array.from(availability.values()).sort(
      (a, b) => b.priorityScore - a.priorityScore
    )
    
    const recommendations: string[] = []
    const warnings: string[] = []
    
    // 分析最佳科室
    const highlyRecommended = details.filter(d => d.recommendation === 'highly_recommended')
    const notRecommended = details.filter(d => d.recommendation === 'not_recommended')
    
    if (highlyRecommended.length > 0) {
      recommendations.push(
        `强烈推荐科室: ${highlyRecommended.map(d => d.department + '室').join('、')}`
      )
    }
    
    if (notRecommended.length > 0) {
      warnings.push(
        `不推荐科室: ${notRecommended.map(d => d.department + '室').join('、')} (可用考官不足)`
      )
    }
    
    // 计算总体可用率
    const totalExaminers = details.reduce((sum, d) => sum + d.totalExaminers, 0)
    const totalAvailable = details.reduce((sum, d) => sum + d.availableExaminers, 0)
    const overallAvailabilityRate = totalExaminers > 0 
      ? Math.round((totalAvailable / totalExaminers) * 100) 
      : 0
    
    const summary = `考试日期: ${examDates.join(' ~ ')} | ` +
      `总考官: ${totalExaminers}名 | ` +
      `可用考官: ${totalAvailable}名 | ` +
      `整体可用率: ${overallAvailabilityRate}%`
    
    if (overallAvailabilityRate < 50) {
      warnings.push(`整体可用率较低(${overallAvailabilityRate}%)，建议调整考试日期`)
    }
    
    return {
      summary,
      details,
      recommendations,
      warnings,
    }
  }
}

// 导出单例实例
export const spinWheelPreprocessService = new SpinWheelPreprocessService()

// 导出便捷方法
export const analyzeExaminerAvailability = (
  examiners: ExaminerInfo[],
  examDates: string[]
) => spinWheelPreprocessService.analyzeDepartmentAvailability(examiners, examDates)

export const getSmartRecommendation = (
  studentDept: string,
  examiners: ExaminerInfo[],
  examDates: string[]
) => spinWheelPreprocessService.generateSmartRecommendation(studentDept, examiners, examDates)

export const generateAvailabilityReport = (
  examiners: ExaminerInfo[],
  examDates: string[]
) => spinWheelPreprocessService.generateAvailabilityReport(examiners, examDates)

