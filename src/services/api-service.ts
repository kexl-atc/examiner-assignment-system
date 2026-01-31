/**
 * 优化后的API服务类
 * 统一接口管理、错误处理、缓存策略和性能监控
 */

import type { Teacher, ScheduleResponse, Student, PerformanceMetrics } from '../types'

// 临时实现性能监控器
const performanceMonitor = {
  mark: (name: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name)
    }
  },
  measure: (name: string, startMark: string, endMark: string) => {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark)
      } catch (e) {
        console.warn('Performance measure failed:', e)
      }
    }
  },
  record: (metrics: PerformanceMetrics) => {
    process.env.NODE_ENV === 'development' && console.log('Performance metrics:', metrics)
  },
}

// 临时实现缓存管理器
const getCacheManager = () => ({
  get: (key: string) => null,
  set: (key: string, value: any, ttl?: number) => {},
  delete: (key: string) => {},
  clear: () => {},
  getStats: () => ({
    hitRate: 0,
    total: 0,
    hits: 0,
    misses: 0,
  }),
})

// API错误类 - 增强错误处理
class APIError extends Error {
  public readonly timestamp: string
  public readonly requestId?: string
  public readonly context?: any

  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly originalError?: Error,
    context?: any
  ) {
    super(message)
    this.name = 'APIError'
    this.timestamp = new Date().toISOString()
    this.requestId = this.generateRequestId()
    this.context = context

    // 保持错误堆栈信息
    if (originalError && originalError.stack) {
      this.stack = originalError.stack
    }
  }

  // 生成请求ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 获取HTTP状态码描述
  getStatusText(): string {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    }

    return this.status ? statusTexts[this.status] || 'Unknown Status' : 'No Status'
  }

  // 获取详细错误信息
  getDetailedMessage(): string {
    let details = `[${this.code || 'API_ERROR'}] ${this.message}`

    if (this.status) {
      details += `\nHTTP状态: ${this.status} ${this.getStatusText()}`
    }

    if (this.requestId) {
      details += `\n请求ID: ${this.requestId}`
    }

    if (this.context) {
      details += `\n上下文: ${JSON.stringify(this.context, null, 2)}`
    }

    if (this.originalError) {
      details += `\n原始错误: ${this.originalError.message}`
    }

    details += `\n时间: ${this.timestamp}`

    return details
  }

  // 判断是否为网络错误
  isNetworkError(): boolean {
    return !this.status || this.status >= 500
  }

  // 判断是否为客户端错误
  isClientError(): boolean {
    return this.status !== undefined && this.status >= 400 && this.status < 500
  }

  // 判断是否为服务器错误
  isServerError(): boolean {
    return this.status !== undefined && this.status >= 500
  }

  // 转换为可序列化的对象
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      statusText: this.getStatusText(),
      code: this.code,
      requestId: this.requestId,
      timestamp: this.timestamp,
      context: this.context,
      originalError: this.originalError?.message,
      isNetworkError: this.isNetworkError(),
      isClientError: this.isClientError(),
      isServerError: this.isServerError(),
    }
  }
}

// API响应接口
interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
  meta?: {
    total?: number
    page?: number
    pageSize?: number
  }
}

// 请求配置接口
interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  timeout?: number
  cache?: boolean
  cacheTTL?: number
  retries?: number
  retryDelay?: number
}

// 排班相关接口
interface ScheduleRequest {
  startDate: string
  endDate: string
  constraints?: any
  advanced?: {
    timeout: number
    maxIterations: number
    convergenceThreshold: number
    parallelComputing: boolean
  }
}

/**
 * API服务类
 */
class APIService {
  private baseURL: string
  private defaultTimeout: number
  private cacheManager = getCacheManager()
  private requestId = 0
  private metrics: PerformanceMetrics
  private backendPort = 8082 // 默认端口，将动态获取
  private portInitialized = false // 端口初始化标志
  private pendingPortInit: Promise<void> | null = null // 端口初始化Promise

  constructor(baseURL?: string, timeout = 15000) {
    // Electron环境使用127.0.0.1（避免IPv6问题），Web环境使用相对路径
    // 🔧 局域网优化：增加默认超时时间到15秒（原10秒）
    if (!baseURL) {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
        baseURL = `http://127.0.0.1:${this.backendPort}/api`
      } else {
        baseURL = '/api'
      }
    }
    this.baseURL = baseURL
    this.defaultTimeout = timeout
    this.metrics = {
      apiCalls: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
      cacheHits: { total: 0, hitRate: 0 },
      errors: { total: 0, byType: {} },
      systemHealth: { memoryUsage: 0, cpuUsage: 0, diskUsage: 0 },
    }

    // 🔧 在Electron环境中异步初始化端口
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      this.initializePort()
    }
  }

  /**
   * 初始化后端端口（Electron环境）
   * 🔧 修复：等待后端实际启动完成，而不仅仅是获取端口号
   */
  private async initializePort(): Promise<void> {
    // 如果已经在初始化中，返回现有Promise
    if (this.pendingPortInit) {
      return this.pendingPortInit
    }

    // 如果已经初始化完成，直接返回
    if (this.portInitialized) {
      return Promise.resolve()
    }

    // 开始初始化
    this.pendingPortInit = (async () => {
      try {
        if (
          typeof window !== 'undefined' &&
          (window as any).electronAPI?.isElectron
        ) {
          // 🔧 关键修复：等待后端就绪事件，而不仅仅是获取端口号
          if ((window as any).electronAPI?.onBackendReady) {
            // 等待后端就绪
            await new Promise<void>((resolve) => {
              // 检查后端是否已经就绪
              const checkBackendStatus = async () => {
                try {
                  const status = await (window as any).electronAPI.getBackendStatus()
                  if (status && status.isRunning && status.port) {
                    // 后端已就绪，使用当前端口
                    this.backendPort = status.port
                    this.baseURL = `http://127.0.0.1:${this.backendPort}/api`
                    console.log('✅ API Service: 后端已就绪，端口:', this.backendPort)
                    resolve()
                    return
                  }
                } catch (e) {
                  // 忽略错误，继续等待事件
                }
                
                // 如果后端未就绪，监听就绪事件
                (window as any).electronAPI.onBackendReady(async () => {
                  try {
                    const port = await (window as any).electronAPI.getBackendPort()
                    if (port && port > 0) {
                      this.backendPort = port
                      this.baseURL = `http://127.0.0.1:${this.backendPort}/api`
                      console.log('✅ API Service: 收到后端就绪事件，端口:', this.backendPort)
                    }
                  } catch (error) {
                    console.warn('⚠️ API Service: 获取端口失败:', error)
                    this.backendPort = 8081
                    this.baseURL = `http://127.0.0.1:${this.backendPort}/api`
                  }
                  resolve()
                })
              }
              
              checkBackendStatus()
            })
          } else if ((window as any).electronAPI?.getBackendPort) {
            // 降级方案：如果没有onBackendReady，直接获取端口（向后兼容）
            const port = await (window as any).electronAPI.getBackendPort()
            if (port && port > 0) {
              this.backendPort = port
              this.baseURL = `http://127.0.0.1:${this.backendPort}/api`
              console.log('✅ API Service已获取动态端口:', this.backendPort)
            }
          }
        }
        this.portInitialized = true
      } catch (error) {
        console.warn('⚠️ API Service无法获取后端端口，使用默认端口8081:', error)
        this.backendPort = 8081
        this.baseURL = `http://127.0.0.1:${this.backendPort}/api`
        this.portInitialized = true
      } finally {
        this.pendingPortInit = null
      }
    })()

    return this.pendingPortInit
  }

  /**
   * 等待端口初始化完成
   */
  private async waitForPort(): Promise<void> {
    if (this.portInitialized) {
      return
    }

    if (this.pendingPortInit) {
      await this.pendingPortInit
    }
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestId}`
  }

  /**
   * 构建完整URL
   */
  private buildURL(endpoint: string): string {
    return `${this.baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(url: string, config: RequestConfig): string {
    const method = config.method || 'GET'
    return `api_${method}_${url}`
  }

  /**
   * 核心请求方法 - 增强错误处理
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {},
    data?: any
  ): Promise<APIResponse<T>> {
    // 🔧 在Electron环境中，确保端口已初始化
    await this.waitForPort()

    const requestId = this.generateRequestId()
    const startTime = performance.now()
    const url = this.buildURL(endpoint)
    const method = config.method || 'GET'

    const requestContext = {
      url,
      method,
      endpoint,
      headers: config.headers,
      timestamp: new Date().toISOString(),
      requestId,
    }

    // 性能埋点
    performanceMonitor.mark(`api-start-${requestId}`)

    try {
      // 缓存检查
      if (config.cache && method === 'GET') {
        const cacheKey = this.getCacheKey(url, config)
        const cached = this.cacheManager.get(cacheKey) as APIResponse<T> | null

        if (cached) {
          this.metrics.cacheHits.total++
          process.env.NODE_ENV === 'development' && console.log(`📦 [API] 缓存命中: ${endpoint}`)
          return cached
        }
      }

      // 构建请求选项
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...config.headers,
        },
        signal: AbortSignal.timeout(config.timeout || this.defaultTimeout),
      }

      if (data && method !== 'GET') {
        if (data instanceof FormData) {
          // FormData情况下，移除Content-Type让浏览器自动设置
          delete (requestOptions.headers as any)['Content-Type']
          requestOptions.body = data
        } else {
          requestOptions.body = JSON.stringify(data)
        }
      }

      // 发送请求
      const response = await fetch(url, requestOptions)

      // 处理响应
      if (!response.ok) {
        let errorData: any = {}
        const contentType = response.headers.get('content-type')

        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json()
          } else {
            errorData = { message: await response.text() }
          }
        } catch (parseError) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
        }

        throw new APIError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code || `HTTP_${response.status}`,
          undefined,
          {
            ...requestContext,
            responseStatus: response.status,
            responseStatusText: response.statusText,
            responseHeaders: {},
            errorData,
          }
        )
      }

      // 解析响应数据
      let responseData: any
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      const result: APIResponse<T> = {
        success: true,
        data: responseData.data || responseData,
        meta: responseData.meta,
      }

      // 缓存响应
      if (config.cache && method === 'GET') {
        const cacheKey = this.getCacheKey(url, config)
        const ttl = config.cacheTTL || 300000 // 默认5分钟
        this.cacheManager.set(cacheKey, result, ttl)
      }

      // 更新指标
      this.updateMetrics(true, performance.now() - startTime)

      return result
    } catch (error) {
      let apiError: APIError

      if (error instanceof APIError) {
        apiError = error
      } else {
        // 处理网络错误
        if (error instanceof TypeError && error.message.includes('fetch')) {
          apiError = new APIError(
            '网络连接失败，请检查网络连接',
            undefined,
            'NETWORK_ERROR',
            error as Error,
            requestContext
          )
        }
        // 处理请求超时
        else if (error instanceof Error && error.name === 'AbortError') {
          apiError = new APIError(
            '请求超时，请稍后重试',
            undefined,
            'TIMEOUT_ERROR',
            error as Error,
            requestContext
          )
        }
        // 处理其他错误
        else {
          apiError = new APIError(
            error instanceof Error ? error.message : '请求处理失败',
            undefined,
            'REQUEST_ERROR',
            error as Error,
            requestContext
          )
        }
      }

      // 更新指标
      this.updateMetrics(false, performance.now() - startTime, apiError.code)

      console.error(`❌ [API] 请求失败: ${endpoint}`, apiError.getDetailedMessage())

      return {
        success: false,
        error: apiError,
      }
    } finally {
      // 性能埋点
      performanceMonitor.mark(`api-end-${requestId}`)

      try {
        performance.measure(`api-${requestId}`, `api-start-${requestId}`, `api-end-${requestId}`)
      } catch {
        // 忽略测量错误
      }
    }
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(success: boolean, responseTime: number, errorType?: string): void {
    this.metrics.apiCalls.total++

    if (success) {
      this.metrics.apiCalls.successful++
    } else {
      this.metrics.apiCalls.failed++
      this.metrics.errors.total++

      if (errorType) {
        this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1
      }
    }

    // 更新平均响应时间
    const totalCalls = this.metrics.apiCalls.total
    const currentAvg = this.metrics.apiCalls.averageResponseTime
    this.metrics.apiCalls.averageResponseTime =
      (currentAvg * (totalCalls - 1) + responseTime) / totalCalls
  }

  //
  /**
   * 执行自动排班
   */
  async executeScheduling(request: ScheduleRequest): Promise<APIResponse<ScheduleResponse>> {
    return this.request<ScheduleResponse>(
      '/scheduling/execute',
      {
        method: 'POST',
        timeout: 30000, // 排班可能需要更长时间
        cache: false,
      },
      request
    )
  }

  /**
   * 获取排班结果
   */
  async getSchedule(scheduleId: string): Promise<APIResponse<ScheduleResponse>> {
    return this.request<ScheduleResponse>(`/scheduling/${scheduleId}`, {
      method: 'GET',
      cache: true,
      cacheTTL: 600000, // 10分钟缓存
    })
  }

  /**
   * 获取排班历史
   */
  async getScheduleHistory(params?: {
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
  }): Promise<APIResponse<ScheduleResponse[]>> {
    const query = new URLSearchParams(params as any).toString()
    return this.request<ScheduleResponse[]>(`/scheduling/history?${query}`, {
      method: 'GET',
      cache: true,
      cacheTTL: 300000, // 5分钟缓存
    })
  }

  /**
   * 取消排班
   */
  async cancelSchedule(scheduleId: string): Promise<APIResponse<void>> {
    return this.request<void>(`/scheduling/${scheduleId}/cancel`, {
      method: 'POST',
      cache: false,
    })
  }

  /**
   * 获取约束配置
   */
  async getConstraintConfiguration(): Promise<APIResponse<any>> {
    return this.request<any>('/schedule/constraints', {
      method: 'GET',
      cache: true,
      cacheTTL: 300000, // 5分钟缓存
    })
  }

  /**
   * 更新约束配置
   */
  async updateConstraintConfiguration(
    config: any
  ): Promise<APIResponse<{ success: boolean; message: string }>> {
    return this.request<{ success: boolean; message: string }>(
      '/schedule/constraints',
      {
        method: 'PUT',
        cache: false,
      },
      config
    )
  }

  //
  /**
   * 获取考官列表
   */
  async getTeachers(params?: {
    page?: number
    pageSize?: number
    department?: string
    search?: string
  }): Promise<APIResponse<Teacher[]>> {
    const query = new URLSearchParams(params as any).toString()
    return this.request<Teacher[]>(`/teachers?${query}`, {
      method: 'GET',
      cache: true,
      cacheTTL: 300000,
    })
  }

  /**
   * 获取考官详情
   */
  async getTeacher(teacherId: string): Promise<APIResponse<Teacher>> {
    return this.request<Teacher>(`/teachers/${teacherId}`, {
      method: 'GET',
      cache: true,
      cacheTTL: 600000,
    })
  }

  /**
   * 创建考官
   */
  async createTeacher(teacher: Omit<Teacher, 'id'>): Promise<APIResponse<Teacher>> {
    return this.request<Teacher>(
      '/teachers',
      {
        method: 'POST',
        cache: false,
      },
      teacher
    )
  }

  /**
   * 更新考官
   */
  async updateTeacher(teacherId: string, teacher: Partial<Teacher>): Promise<APIResponse<Teacher>> {
    return this.request<Teacher>(
      `/teachers/${teacherId}`,
      {
        method: 'PUT',
        cache: false,
      },
      teacher
    )
  }

  /**
   * 删除考官
   */
  async deleteTeacher(teacherId: string): Promise<APIResponse<void>> {
    return this.request<void>(`/teachers/${teacherId}`, {
      method: 'DELETE',
      cache: false,
    })
  }

  /**
   * 批量导入考官
   */
  async importTeachers(file: File): Promise<APIResponse<{ imported: number; errors: string[] }>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.request<{ imported: number; errors: string[] }>(
      '/api/data/teachers/import',
      {
        method: 'POST',
        headers: {}, // 让浏览器自动设置Content-Type
        timeout: 60000, // 导入可能需要更长时间
        cache: false,
      },
      formData
    )
  }

  //
  /**
   * 获取学员列表
   */
  async getStudents(params?: {
    page?: number
    pageSize?: number
    class?: string
    examType?: string
    status?: string
    search?: string
  }): Promise<APIResponse<Student[]>> {
    const query = new URLSearchParams(params as any).toString()
    return this.request<Student[]>(`/students?${query}`, {
      method: 'GET',
      cache: true,
      cacheTTL: 300000,
    })
  }

  /**
   * 批量导入学员
   */
  async importStudents(file: File): Promise<APIResponse<{ imported: number; errors: string[] }>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.request<{ imported: number; errors: string[] }>(
      '/data/students/import',
      {
        method: 'POST',
        headers: {},
        timeout: 60000,
        cache: false,
      },
      formData
    )
  }

  //
  /**
   * 获取首页统计数据
   */
  async getOverviewStats(): Promise<
    APIResponse<{
      totalTeachers: number
      totalStudents: number
      activeSchedules: number
      completedExams: number
      teacherTrend: number
      studentTrend: number
      scheduleTrend: number
      examTrend: number
    }>
  > {
    return this.request('/overview/stats', {
      method: 'GET',
      cache: true,
      cacheTTL: 60000, // 1分钟缓存
    })
  }

  /**
   * 获取最近活动
   */
  async getRecentActivities(): Promise<
    APIResponse<
      Array<{
        id: string
        type: 'schedule' | 'exam' | 'teacher' | 'student'
        title: string
        description: string
        timestamp: string
        status: 'success' | 'warning' | 'error' | 'info'
      }>
    >
  > {
    return this.request('/overview/activities', {
      method: 'GET',
      cache: true,
      cacheTTL: 30000, // 30秒缓存
    })
  }

  /**
   * 获取图表数据
   */
  async getChartData(type: 'schedule' | 'exam' | 'performance'): Promise<
    APIResponse<{
      labels: string[]
      datasets: Array<{
        label: string
        data: number[]
        backgroundColor?: string
        borderColor?: string
      }>
    }>
  > {
    return this.request(`/overview/charts/${type}`, {
      method: 'GET',
      cache: true,
      cacheTTL: 300000, // 5分钟缓存
    })
  }

  //
  /**
   * 获取系统性能指标
   */
  async getPerformanceMetrics(): Promise<APIResponse<PerformanceMetrics>> {
    return this.request<PerformanceMetrics>('/performance/metrics', {
      method: 'GET',
      cache: true,
      cacheTTL: 30000, // 30秒缓存
    })
  }

  /**
   * 获取当前API服务指标
   */
  getLocalMetrics(): PerformanceMetrics {
    // 更新缓存命中率
    const cacheStats = this.cacheManager.getStats()
    this.metrics.cacheHits.hitRate = cacheStats.hitRate

    return { ...this.metrics }
  }

  /**
   * 重置本地指标
   */
  resetLocalMetrics(): void {
    this.metrics = {
      apiCalls: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
      cacheHits: { total: 0, hitRate: 0 },
      errors: { total: 0, byType: {} },
      systemHealth: { memoryUsage: 0, cpuUsage: 0, diskUsage: 0 },
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cacheManager.clear()
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<APIResponse<{ status: string; timestamp: string }>> {
    return this.request<{ status: string; timestamp: string }>('/health', {
      method: 'GET',
      timeout: 5000,
      cache: false,
    })
  }

  //
  /**
   * GET请求
   */
  async get<T>(endpoint: string, config: RequestConfig = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST' }, data)
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT' }, data)
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string, config: RequestConfig = {}): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }

  /**
   * PATCH请求
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH' }, data)
  }
}

// 创建API服务实例
const apiService = new APIService()

// 导出API服务实例和类型
export default apiService
export { APIService }

// 创建并导出默认实例
export { apiService }
export type {
  APIError,
  APIResponse,
  RequestConfig,
  ScheduleRequest,
  ScheduleResponse,
  Teacher,
  Student,
  PerformanceMetrics,
}
