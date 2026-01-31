/**
 * OptaPlanner数据转换器
 * 将前端数据格式转换为OptaPlanner服务所需的格式
 */

import type { OptaPlannerStudent, OptaPlannerTeacher } from './optaplanner-service'
import { normalizeDepartment } from '../utils/departmentDebugger'

export class OptaPlannerDataConverter {
  /**
   * 转换学员数据为OptaPlanner格式
   */
  static convertStudents(students: any[]): OptaPlannerStudent[] {
    const converted = students.map(student => {
      const originalDept = student.department
      const normalizedDept = normalizeDepartment(student.department) || student.department || '未知科室'
      
      // 🔍 调试日志：记录科室转换
      if (originalDept !== normalizedDept) {
        console.log(`🔄 [科室标准化] 学员 ${student.name}: "${originalDept}" → "${normalizedDept}"`)
      }
      
      return {
        id: student.id || `student_${student.name || 'unknown'}`,
        name: student.name || '未知学员',
        // 🔧 修复：标准化科室名称，确保与后端匹配
        department: normalizedDept,
        group: student.group || '无',
        // 🆕 必填字段：考试科目
        day1Subjects: student.day1Subjects || '["现场", "模拟机1"]',
        day2Subjects: student.day2Subjects || '["模拟机2", "口试"]',
        // 🔧 修复：推荐科室也需要标准化
        recommendedExaminer1Dept: normalizeDepartment(student.recommendedExaminer1Dept) || student.recommendedExaminer1Dept,
        recommendedExaminer2Dept: normalizeDepartment(student.recommendedExaminer2Dept) || student.recommendedExaminer2Dept,
        recommendedBackupDept: normalizeDepartment(student.recommendedBackupDept) || student.recommendedBackupDept,
        // ✨ 方案A：传递前端智能日期选择的推荐
        recommendedExamDate1: student.recommendedExamDate1,
        recommendedExamDate2: student.recommendedExamDate2,
      }
    })
    
    // 🔍 统计转换后的科室分布
    const deptCount = new Map<string, number>()
    converted.forEach(s => {
      const count = deptCount.get(s.department) || 0
      deptCount.set(s.department, count + 1)
    })
    console.log('📊 [学员科室分布]', Object.fromEntries(deptCount))
    
    return converted
  }

  /**
   * 转换考官数据为OptaPlanner格式
   */
  static convertTeachers(teachers: any[]): OptaPlannerTeacher[] {
    const converted = teachers.map(teacher => {
      const originalDept = teacher.department
      const normalizedDept = normalizeDepartment(teacher.department) || teacher.department || '未知科室'
      
      // 🔍 调试日志：记录科室转换
      if (originalDept !== normalizedDept) {
        console.log(`🔄 [科室标准化] 考官 ${teacher.name}: "${originalDept}" → "${normalizedDept}"`)
      }
      
      return {
        id: teacher.id || `teacher_${teacher.name || 'unknown'}`,
        name: teacher.name || '未知考官',
        // 🔧 修复：标准化科室名称，确保与后端匹配
        department: normalizedDept,
        group: teacher.group || '无',
        skills: teacher.skills || [],
        workload: teacher.workload || 0,
        consecutiveDays: teacher.consecutiveDays || 0,
        // 🔧 关键修复：传递不可用期数据
        unavailablePeriods: teacher.unavailablePeriods || [],
      }
    })
    
    // 🔍 统计转换后的科室分布
    const deptCount = new Map<string, number>()
    converted.forEach(t => {
      const count = deptCount.get(t.department) || 0
      deptCount.set(t.department, count + 1)
    })
    console.log('📊 [考官科室分布]', Object.fromEntries(deptCount))
    
    return converted
  }

  /**
   * 转换排班结果为前端格式
   */
  static convertScheduleResult(optaPlannerResult: any): any {
    if (!optaPlannerResult || !optaPlannerResult.assignments) {
      return {
        success: false,
        message: '无效的排班结果',
        assignments: [],
        statistics: {
          totalStudents: 0,
          assignedStudents: 0,
          unassignedStudents: 0,
          completionPercentage: 0,
        },
      }
    }

    return {
      success: optaPlannerResult.success,
      message: optaPlannerResult.message,
      score: optaPlannerResult.score, // ✨ 关键修复：传递score字段
      assignments: optaPlannerResult.assignments.map((assignment: any) => ({
        id: assignment.id,
        studentId: assignment.student?.id,
        studentName: assignment.student?.name,
        studentDepartment: assignment.student?.department, // ✨ 新增：直接携带学员科室
        examType: assignment.examType,
        examDate: assignment.examDate,
        examiner1: {
          id: assignment.examiner1?.id,
          name: assignment.examiner1?.name,
          department: assignment.examiner1?.department,
        },
        examiner2: {
          id: assignment.examiner2?.id,
          name: assignment.examiner2?.name,
          department: assignment.examiner2?.department,
        },
        backupExaminer: {
          id: assignment.backupExaminer?.id,
          name: assignment.backupExaminer?.name,
          department: assignment.backupExaminer?.department,
        },
        timeSlot: assignment.timeSlot,
        location: assignment.location,
      })),
      statistics: optaPlannerResult.statistics,
      conflicts: optaPlannerResult.conflicts || [],
      warnings: optaPlannerResult.warnings || [],
    }
  }
}

// 导出默认实例
export const optaPlannerDataConverter = new OptaPlannerDataConverter()
