/**
 * 🚀 v6.1.3优化: 统一响应格式工具
 * 提供统一的API响应格式和响应处理
 */

/**
 * 统一API响应接口
 */
export interface UnifiedResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    type?: string
    details?: any
  }
  meta?: {
    timestamp?: string
    requestId?: string
    total?: number
    page?: number
    pageSize?: number
    [key: string]: any
  }
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> extends UnifiedResponse<T[]> {
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
    timestamp?: string
    requestId?: string
    [key: string]: any
  }
}

/**
 * 响应格式化器类
 */
class ResponseFormatter {
  /**
   * 创建成功响应
   */
  static success<T>(
    data: T,
    meta?: UnifiedResponse<T>['meta']
  ): UnifiedResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    }
  }

  /**
   * 创建失败响应
   */
  static error(
    message: string,
    code?: string,
    type?: string,
    details?: any,
    meta?: UnifiedResponse['meta']
  ): UnifiedResponse {
    return {
      success: false,
      error: {
        message,
        code,
        type,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    }
  }

  /**
   * 创建分页响应
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    meta?: Omit<PaginatedResponse<T>['meta'], 'total' | 'page' | 'pageSize' | 'totalPages'>
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / pageSize)

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
        timestamp: new Date().toISOString(),
        ...meta,
      },
    }
  }

  /**
   * 转换API响应为标准格式
   */
  static fromAPIResponse<T>(response: any): UnifiedResponse<T> {
    // 如果已经是标准格式，直接返回
    if (response && typeof response === 'object' && 'success' in response) {
      return response as UnifiedResponse<T>
    }

    // 如果响应有data字段，认为是成功响应
    if (response && typeof response === 'object' && 'data' in response) {
      return {
        success: true,
        data: response.data as T,
        meta: response.meta || { timestamp: new Date().toISOString() },
      }
    }

    // 如果响应有error字段，认为是错误响应
    if (response && typeof response === 'object' && 'error' in response) {
      return {
        success: false,
        error: response.error,
        meta: response.meta || { timestamp: new Date().toISOString() },
      }
    }

    // 其他情况，认为是成功响应，整个响应作为data
    return {
      success: true,
      data: response as T,
      meta: { timestamp: new Date().toISOString() },
    }
  }

  /**
   * 检查响应是否成功
   */
  static isSuccess(response: UnifiedResponse): boolean {
    return response.success === true
  }

  /**
   * 获取响应数据（如果成功）
   */
  static getData<T>(response: UnifiedResponse<T>): T | undefined {
    return response.success ? response.data : undefined
  }

  /**
   * 获取错误信息（如果失败）
   */
  static getError(response: UnifiedResponse): UnifiedResponse['error'] | undefined {
    return response.success ? undefined : response.error
  }
}

export default ResponseFormatter

