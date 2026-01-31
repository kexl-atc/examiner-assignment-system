/**
 * 考官分配数据服务
 * 用于在考官分配页面和自动排班页面之间共享数据
 */

import type { StudentInfo } from '../utils/types';
import { normalizeDeptToShort, normalizeDeptToFull } from '../utils/departmentNormalizer';

// 考官分配页面的考生数据结构
export interface AssignmentStudent {
  name: string;
  department: string; // 科室名称，如"一室"、"二室"
  group?: string; // 班组，如"一组"、"二组"
  examiner1?: string; // 考官一科室名称
  examiner2?: string; // 考官二科室名称
  examQuestion?: string; // 考题，如"一"、"二"
}

/**
 * 将科室名称转换为简写格式（使用统一标准化工具）
 */
export function convertDeptNameToShort(deptName: string): string {
  return normalizeDeptToShort(deptName);
}

/**
 * 将简写格式转换为科室名称（使用统一标准化工具）
 */
export function convertShortToDeptName(short: string): string {
  return normalizeDeptToFull(short);
}

/**
 * 将考官分配的考生数据转换为自动排班需要的格式
 */
export function convertAssignmentToSchedule(
  assignmentStudents: AssignmentStudent[],
  options?: {
    defaultGroup?: string;
    generateId?: boolean;
  }
): StudentInfo[] {
  const { defaultGroup = '未知班组', generateId = true } = options || {};
  
  console.log('[convertAssignmentToSchedule] 开始转换数据，考生数量:', assignmentStudents.length);
  console.log('[convertAssignmentToSchedule] defaultGroup参数:', defaultGroup);
  
  return assignmentStudents.map((student, index) => {
    // 转换科室名称
    const deptShort = convertDeptNameToShort(student.department);
    const examiner1Dept = student.examiner1 ? convertDeptNameToShort(student.examiner1) : undefined;
    const examiner2Dept = student.examiner2 ? convertDeptNameToShort(student.examiner2) : undefined;
    
    // 处理班组信息：如果为空字符串、null或undefined，使用默认值
    let groupValue = student.group;
    if (groupValue === null || groupValue === undefined || groupValue === '') {
      groupValue = defaultGroup;
    } else {
      groupValue = groupValue.trim();
    }
    
    console.log(`[convertAssignmentToSchedule] 考生 ${index + 1}:`, {
      name: student.name,
      originalGroup: student.group,
      groupType: typeof student.group,
      groupIsNull: student.group === null,
      groupIsUndefined: student.group === undefined,
      groupIsEmpty: student.group === '',
      willUseGroup: groupValue
    });
    
    // 🔧 关键修复：HC2约束要求考官1必须与学员同科室（或三七互通）
    // examiner1/examiner2 字段来自"考官分配页面"的抽签结果，代表考官2的推荐科室
    // 因此：
    // - recommendedExaminer1Dept 应该是学员自己的科室（HC2要求）
    // - recommendedExaminer2Dept 使用抽签科室1（examiner1Dept），因为考官2必须不同科室
    const actualRecommendedExaminer1Dept = deptShort; // 考官1必须与学员同科室
    const actualRecommendedExaminer2Dept = examiner1Dept; // 考官2使用抽签科室（必须不同科室）
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'assignmentDataService.ts:convertAssignmentToSchedule',message:'converting student data (FIXED)',data:{name:student.name,department:deptShort,group:groupValue,recommendedExaminer1Dept:actualRecommendedExaminer1Dept,recommendedExaminer2Dept:actualRecommendedExaminer2Dept,originalExaminer1:student.examiner1,originalExaminer2:student.examiner2,explanation:'HC2 requires examiner1 to be same dept as student'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'FIX-HC2'})}).catch(()=>{});
    // #endregion
    return {
      id: generateId ? `assignment_${index + 1}` : student.name,
      name: student.name,
      department: deptShort,
      group: groupValue, // 使用处理后的group值
      recommendedExaminer1Dept: actualRecommendedExaminer1Dept, // 🔧 修复：考官1必须与学员同科室
      recommendedExaminer2Dept: actualRecommendedExaminer2Dept, // 考官2使用抽签科室
      // 保留原始数据以便后续使用
      originalExaminers: {
        examiner1: student.examiner1,
        examiner2: student.examiner2,
      },
      // 考试内容配置（默认两天考试）
      examDays: 2,
      day1Subjects: ['现场', '模拟机1'],
      day2Subjects: ['模拟机2', '口试'],
    } as StudentInfo;
  });
}

/**
 * 将自动排班的考生数据转换为考官分配格式
 */
export function convertScheduleToAssignment(
  scheduleStudents: StudentInfo[]
): AssignmentStudent[] {
  return scheduleStudents.map(student => ({
    name: student.name,
    department: convertShortToDeptName(student.department),
    examiner1: student.recommendedExaminer1Dept 
      ? convertShortToDeptName(student.recommendedExaminer1Dept) 
      : undefined,
    examiner2: student.recommendedExaminer2Dept 
      ? convertShortToDeptName(student.recommendedExaminer2Dept) 
      : undefined,
  }));
}

/**
 * 数据存储服务
 * 使用localStorage存储考官分配数据，供自动排班页面使用
 */
const STORAGE_KEY = 'assignment_data_for_schedule';

export const assignmentDataService = {
  /**
   * 保存考官分配数据
   */
  saveAssignmentData(students: AssignmentStudent[]): void {
    try {
      console.log('[saveAssignmentData] 开始保存数据，考生数量:', students.length);
      console.log('[saveAssignmentData] 第一个考生:', students[0]);
      console.log('[saveAssignmentData] 第一个考生的group:', students[0].group);
      console.log('[saveAssignmentData] 第一个考生的group类型:', typeof students[0].group);
      
      const data = {
        students,
        timestamp: Date.now(),
        version: '1.0',
      };
      
      const dataStr = JSON.stringify(data);
      console.log('[saveAssignmentData] 序列化后的数据长度:', dataStr.length);
      console.log('[saveAssignmentData] 序列化后的第一个考生:', JSON.parse(dataStr).students[0]);
      
      localStorage.setItem(STORAGE_KEY, dataStr);
      
      console.log('[saveAssignmentData] 数据已保存到localStorage');
    } catch (error) {
      console.error('保存考官分配数据失败:', error);
    }
  },

  /**
   * 获取考官分配数据
   */
  getAssignmentData(): AssignmentStudent[] | null {
    try {
      console.log('[getAssignmentData] 开始从localStorage获取数据');
      
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr) {
        console.log('[getAssignmentData] localStorage中没有数据');
        return null;
      }
      
      console.log('[getAssignmentData] 从localStorage读取到的数据长度:', dataStr.length);
      
      const data = JSON.parse(dataStr);
      console.log('[getAssignmentData] 解析后的数据:', data);
      console.log('[getAssignmentData] 第一个考生:', data.students[0]);
      console.log('[getAssignmentData] 第一个考生的group:', data.students[0].group);
      console.log('[getAssignmentData] 第一个考生的group类型:', typeof data.students[0].group);
      
      return data.students || null;
    } catch (error) {
      console.error('获取考官分配数据失败:', error);
      return null;
    }
  },

  /**
   * 清除考官分配数据
   */
  clearAssignmentData(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('清除考官分配数据失败:', error);
    }
  },

  /**
   * 检查是否有可用的考官分配数据
   */
  hasAssignmentData(): boolean {
    return this.getAssignmentData() !== null;
  },

  /**
   * 获取数据时间戳
   */
  getDataTimestamp(): number | null {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr) return null;
      
      const data = JSON.parse(dataStr);
      return data.timestamp || null;
    } catch (error) {
      return null;
    }
  },
};

