/**
 * 数据管理API服务
 * 提供考官、学员、值班等数据的前端API接口
 */

import { apiService } from './api-service'

// 基础数据类型定义
export interface Department {
  id: number
  code: string
  name: string
  description?: string
}

export interface Group {
  id: number
  code: string
  name: string
  description?: string
}

export interface Teacher {
  id?: number
  teacherId: string
  name: string
  department: Department
  group?: Group
  workload: number
  consecutiveDays: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Student {
  id?: number
  studentId: string
  name: string
  department: Department
  group: Group
  recommendedExaminer1Dept?: Department
  recommendedExaminer2Dept?: Department
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface TimeSlot {
  id: number
  date: string
  startTime: string
  endTime: string
  isWorkday: boolean
  isHoliday: boolean
}

export interface DutySchedule {
  id?: number
  teacher: Teacher
  dutyDate: string
  shiftType: 'DAY' | 'NIGHT' | 'OFF'
  createdAt?: string
  updatedAt?: string
}

export interface ExamAssignment {
  id?: number
  student: Student
  timeSlot?: TimeSlot
  examiner1?: Teacher
  examiner2?: Teacher
  backupExaminer?: Teacher
  status: 'PENDING' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED'
  createdAt?: string
  updatedAt?: string
}

export interface Statistics {
  totalTeachers: number
  totalStudents: number
  totalAssignments: number
  completedAssignments: number
  completionRate: number
}

/**
 * 数据管理API服务类
 */
export class DataManagementApiService {
  private baseUrl = '/data'

  //
  /**
   * 获取所有活跃教师
   */
  async getAllTeachers(): Promise<Teacher[]> {
    const response = await apiService.get(`${this.baseUrl}/teachers`)
    return response.data as Teacher[]
  }

  /**
   * 根据科室获取考官
   */
  async getTeachersByDepartment(departmentCode: string): Promise<Teacher[]> {
    const response = await apiService.get(`${this.baseUrl}/teachers/department/${departmentCode}`)
    return response.data as Teacher[]
  }

  /**
   * 保存考官（新增或更新）
   */
  async saveTeacher(teacher: Teacher): Promise<Teacher> {
    if (teacher.id) {
      const response = await apiService.put(`${this.baseUrl}/teachers/${teacher.id}`, teacher)
      return response.data as Teacher
    } else {
      const response = await apiService.post(`${this.baseUrl}/teachers`, teacher)
      return response.data as Teacher
    }
  }

  /**
   * 删除考官
   */
  async deleteTeacher(teacherId: number): Promise<void> {
    await apiService.delete(`${this.baseUrl}/teachers/${teacherId}`)
  }

  /**
   * 批量导入考官
   */
  async importTeachers(teachers: any[]): Promise<string> {
    const response = await apiService.post(`${this.baseUrl}/teachers/import`, teachers)
    return response.data as string
  }

  //
  /**
   * 获取所有活跃学生
   */
  async getAllStudents(): Promise<Student[]> {
    const response = await apiService.get(`${this.baseUrl}/students`)
    return response.data as Student[]
  }

  /**
   * 根据科室获取学员
   */
  async getStudentsByDepartment(departmentCode: string): Promise<Student[]> {
    const response = await apiService.get(`${this.baseUrl}/students/department/${departmentCode}`)
    return response.data as Student[]
  }

  /**
   * 保存学员（新增或更新）
   */
  async saveStudent(student: Student): Promise<Student> {
    if (student.id) {
      const response = await apiService.put(`${this.baseUrl}/students/${student.id}`, student)
      return response.data as Student
    } else {
      const response = await apiService.post(`${this.baseUrl}/students`, student)
      return response.data as Student
    }
  }

  /**
   * 删除学员
   */
  async deleteStudent(studentId: number): Promise<void> {
    await apiService.delete(`${this.baseUrl}/students/${studentId}`)
  }

  /**
   * 批量导入学员
   */
  async importStudents(students: any[]): Promise<string> {
    const response = await apiService.post(`${this.baseUrl}/students/import`, students)
    return response.data as string
  }

  //
  /**
   * 获取所有科目
   */
  async getAllDepartments(): Promise<Department[]> {
    const response = await apiService.get(`${this.baseUrl}/departments`)
    return response.data as Department[]
  }

  /**
   * 获取所有班级
   */
  async getAllGroups(): Promise<Group[]> {
    const response = await apiService.get(`${this.baseUrl}/groups`)
    return response.data as Group[]
  }

  /**
   * 获取所有时间段
   */
  async getAllTimeSlots(): Promise<TimeSlot[]> {
    const response = await apiService.get(`${this.baseUrl}/timeslots`)
    return response.data as TimeSlot[]
  }

  //
  /**
   * 获取值班数据
   */
  async getDutySchedules(startDate: string, endDate: string): Promise<DutySchedule[]> {
    const response = await apiService.get(
      `${this.baseUrl}/duties?startDate=${startDate}&endDate=${endDate}`
    )
    return response.data as DutySchedule[]
  }

  /**
   * 批量导入值班数据
   */
  async importDutySchedules(duties: any[]): Promise<string> {
    const response = await apiService.post(`${this.baseUrl}/duties/import`, duties)
    return response.data as string
  }

  //
  /**
   * 获取所有考试分配
   */
  async getAllAssignments(): Promise<ExamAssignment[]> {
    const response = await apiService.get(`${this.baseUrl}/assignments`)
    return response.data as ExamAssignment[]
  }

  /**
   * 根据学员获取考试分配
   */
  async getAssignmentsByStudent(studentId: number): Promise<ExamAssignment[]> {
    const response = await apiService.get(`${this.baseUrl}/assignments/student/${studentId}`)
    return response.data as ExamAssignment[]
  }

  //
  /**
   * 获取统计数据
   */
  async getStatistics(): Promise<Statistics> {
    const response = await apiService.get(`${this.baseUrl}/statistics`)
    return response.data as Statistics
  }

  //
  /**
   * 导出考官数据为Domain对象格式
   */
  async exportTeachersAsDomainObjects(): Promise<any[]> {
    const response = await apiService.get(`${this.baseUrl}/export/teachers`)
    return response.data as any[]
  }

  /**
   * 导出学员数据为Domain对象格式
   */
  async exportStudentsAsDomainObjects(): Promise<any[]> {
    const response = await apiService.get(`${this.baseUrl}/export/students`)
    return response.data as any[]
  }
}

// 导出单例实例
export const dataManagementApi = new DataManagementApiService()
