import { apiService } from './api-service';

// API响应类型
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

export interface InstructorAssignmentRequest {
  action: string;
  student_dept?: string;
  available_rooms?: string[];
  exclude_examiner?: string;
  assignment_type?: number;
  examiner1?: string;
  examiner2?: string;
  department?: string;
  // 🆕 智能推荐参考字段
  preferred_room?: string;           // 智能推荐的科室
  recommendation_confidence?: number; // 推荐置信度
}

export interface InstructorAssignmentResult {
  success: boolean;
  error?: string;
  suggested_room?: string;
  reason?: string;
  available_count?: number;
  valid?: boolean;
  errors?: string[];
  warnings?: string[];
  details?: any;
  interconnected?: string[];
}

export interface InstructorAssignmentConfig {
  departmentList?: any[];
  interconnectGroups?: any[];
  examQuestionCount?: number;
}

export const instructorAssignmentService = {
  run(request: InstructorAssignmentRequest) {
    return apiService.post<InstructorAssignmentResult>('/instructor-assignment/run', request);
  },
  
  // 保存科室代码配置
  async saveDepartmentCodes(departments: any[]): Promise<APIResponse<void>> {
    try {
      return await apiService.post<void>('/instructor-assignment/config/departments', { departments });
    } catch (error) {
      // 如果后端不支持，静默失败（配置已保存到localStorage）
      console.warn('保存科室代码配置到后端失败，已保存到本地:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      };
    }
  },
  
  // 保存互通设置
  async saveInterconnectGroups(groups: any[]): Promise<APIResponse<void>> {
    try {
      return await apiService.post<void>('/instructor-assignment/config/interconnect', { groups });
    } catch (error) {
      // 如果后端不支持，静默失败（配置已保存到localStorage）
      console.warn('保存互通设置到后端失败，已保存到本地:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      };
    }
  },
  
  // 保存考题配置
  async saveExamQuestionCount(count: number): Promise<APIResponse<void>> {
    try {
      return await apiService.post<void>('/instructor-assignment/config/exam-question-count', { count });
    } catch (error) {
      // 如果后端不支持，静默失败（配置已保存到localStorage）
      console.warn('保存考题配置到后端失败，已保存到本地:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error' 
        } 
      };
    }
  }
};
