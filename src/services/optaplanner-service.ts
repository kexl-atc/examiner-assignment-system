/**
 * OptaPlanner排班服务API
 * 调用OptaPlanner微服务进行排班计算
 */

/**
 * 🔧 端口自动发现：尝试连接多个端口找到可用的后端服务
 */
async function discoverBackendPort(startPort = 8081, endPort = 8090): Promise<number | null> {
  const triedPorts: number[] = []
  
  for (let port = startPort; port <= endPort; port++) {
    triedPorts.push(port)
    try {
      // 使用Promise.race实现超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 1000)
      })
      
      const fetchPromise = fetch(`http://127.0.0.1:${port}/q/health`, {
        method: 'GET',
      })
      
      const response = await Promise.race([fetchPromise, timeoutPromise])
      
      if (response && (response as Response).ok) {
        console.log(`✅ 发现后端服务在端口 ${port}`)
        return port
      }
    } catch (error) {
      // 端口不可用，继续尝试下一个
      continue
    }
  }
  
  console.warn(`⚠️ 端口自动发现失败，已尝试端口: ${triedPorts.join(', ')}`)
  return null
}

/**
 * 🔧 诊断后端连接问题
 */
async function diagnoseBackendConnection(): Promise<string> {
  let diagnosis = '诊断信息：\n'
  
  // 检查是否在Electron环境
  const isElectron = (window as any).electronAPI && (window as any).electronAPI.isElectron
  
  if (!isElectron) {
    diagnosis += '⚠️ 非Electron环境，可能无法连接到后端服务\n'
    return diagnosis
  }
  
  // 尝试获取后端端口
  try {
    if ((window as any).electronAPI?.getBackendPort) {
      const port = await (window as any).electronAPI.getBackendPort()
      if (port && port > 0) {
        diagnosis += `✅ 获取到后端端口: ${port}\n`
        
        // 尝试健康检查
        try {
          const healthResponse = await fetch(`http://127.0.0.1:${port}/q/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          })
          if (healthResponse.ok) {
            diagnosis += `✅ 后端服务健康检查通过\n`
          } else {
            diagnosis += `⚠️ 后端服务健康检查失败: ${healthResponse.status}\n`
          }
        } catch (healthError: any) {
          diagnosis += `❌ 后端服务健康检查失败: ${healthError.message}\n`
        }
      } else {
        diagnosis += `⚠️ 后端端口无效: ${port}\n`
      }
    } else {
      diagnosis += `⚠️ 无法获取后端端口（electronAPI.getBackendPort不存在）\n`
    }
  } catch (portError: any) {
    diagnosis += `❌ 获取后端端口失败: ${portError.message}\n`
  }
  
  // 尝试获取后端状态
  try {
    if ((window as any).electronAPI?.getBackendStatus) {
      const status = await (window as any).electronAPI.getBackendStatus()
      if (status) {
        diagnosis += `\n后端状态：\n`
        diagnosis += `- 端口: ${status.port || '未知'}\n`
        diagnosis += `- 运行中: ${status.isRunning ? '是' : '否'}\n`
        diagnosis += `- 启动时间: ${status.startTime ? new Date(status.startTime).toLocaleString() : '未知'}\n`
        diagnosis += `- 运行时长: ${status.elapsed ? (status.elapsed / 1000).toFixed(2) + '秒' : '未知'}\n`
        
        if (status.error) {
          diagnosis += `\n❌ 检测到错误：\n`
          diagnosis += `- 错误类型: ${status.error.type}\n`
          diagnosis += `- 错误信息: ${status.error.message}\n`
        }
        
        if (status.recentLogs && status.recentLogs.length > 0) {
          diagnosis += `\n最近日志（最后5条）：\n`
          status.recentLogs.slice(-5).forEach((log: string, idx: number) => {
            diagnosis += `${idx + 1}. ${log}\n`
          })
        }
      }
    }
  } catch (statusError: any) {
    diagnosis += `⚠️ 获取后端状态失败: ${statusError.message}\n`
  }
  
  // 尝试端口自动发现
  diagnosis += `\n端口扫描结果：\n`
  const discoveredPort = await discoverBackendPort(8081, 8090)
  if (discoveredPort) {
    diagnosis += `✅ 自动发现后端服务在端口 ${discoveredPort}\n`
  } else {
    diagnosis += `❌ 未发现运行中的后端服务（已扫描8081-8090）\n`
    diagnosis += `\n可能原因：\n`
    diagnosis += `1. 后端服务未启动\n`
    diagnosis += `2. 后端服务启动失败（退出代码1）\n`
    diagnosis += `3. 后端服务启动时间过长\n`
    diagnosis += `4. 防火墙阻止连接\n`
    diagnosis += `5. 端口被其他程序占用\n`
  }
  
  diagnosis += `\n建议操作：\n`
  diagnosis += `1. 检查应用日志文件: %APPDATA%\\examiner-assignment-system\\logs\\backend.log\n`
  diagnosis += `2. 重启应用程序\n`
  diagnosis += `3. 检查系统防火墙设置\n`
  diagnosis += `4. 检查端口占用情况\n`
  
  return diagnosis
}

// OptaPlanner API的基础URL
// Electron环境直接使用localhost，Web环境使用相对路径（通过Vite代理）
// 🔧 修复：等待后端就绪后再获取端口
const getBaseURL = async () => {
  // 检查是否在Electron环境中
  // @ts-ignore - electronAPI是在Electron环境中动态注入的
  const electronAPI = window.electronAPI
  if (electronAPI && electronAPI.isElectron) {
    try {
      // 🔧 关键修复：先检查后端是否已就绪
      if (electronAPI.onBackendReady) {
        // 检查后端状态
        try {
          const status = await electronAPI.getBackendStatus?.()
          if (status && status.isRunning && status.port) {
            process.env.NODE_ENV === 'development' && console.log('✅ OptaPlanner Service: 后端已就绪，端口:', status.port)
            return `http://127.0.0.1:${status.port}/api/schedule`
          }
        } catch (e) {
          // 如果后端未就绪，等待就绪事件
          await new Promise<void>((resolve) => {
            electronAPI.onBackendReady(async () => {
              try {
                const port = await electronAPI.getBackendPort()
                if (port && port > 0) {
                  process.env.NODE_ENV === 'development' && console.log('✅ OptaPlanner Service: 收到后端就绪事件，端口:', port)
                }
                resolve()
              } catch (error) {
                console.warn('⚠️ OptaPlanner Service: 获取端口失败:', error)
                resolve()
              }
            })
          })
        }
      }
      
      // 获取端口（在等待就绪后）
      if (electronAPI.getBackendPort) {
        const port = await electronAPI.getBackendPort()
        if (port && port > 0) {
          process.env.NODE_ENV === 'development' && console.log('✅ OptaPlanner Service获取到后端端口:', port)
          return `http://127.0.0.1:${port}/api/schedule`
        }
      }
    } catch (error) {
      console.warn('⚠️ OptaPlanner Service无法获取后端端口，尝试自动发现:', error)
    }
    
    // 🔧 如果无法获取端口，尝试自动发现
    try {
      const discoveredPort = await discoverBackendPort(8081, 8090)
      if (discoveredPort) {
        console.log(`✅ 自动发现后端服务端口: ${discoveredPort}`)
        return `http://127.0.0.1:${discoveredPort}/api/schedule`
      }
    } catch (error) {
      console.warn('⚠️ 端口自动发现失败:', error)
    }
  }
  
  // Web环境：统一使用相对路径，让HTTP服务器代理处理
  // 🔧 修复：所有Web环境（非Electron）都使用相对路径
  // 这样无论是Vite开发服务器还是SimpleHttpServer，都能正确代理请求
  console.log('🔧 OptaPlanner Service: Web环境，使用相对路径通过HTTP服务器代理')
  return '/api/schedule'
}

// 🔧 修复：每次调用时都重新获取最新的URL，而不是缓存
const getOptaPlannerBaseURL = async () => {
  return await getBaseURL()
}

// 添加详细的日志记录器
class OptaPlannerLogger {
  private static instance: OptaPlannerLogger
  private logs: Array<{
    timestamp: string
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
    message: string
    data?: any
  }> = []

  static getInstance(): OptaPlannerLogger {
    if (!OptaPlannerLogger.instance) {
      OptaPlannerLogger.instance = new OptaPlannerLogger()
    }
    return OptaPlannerLogger.instance
  }

  log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? JSON.stringify(data, null, 2) : undefined,
    }

    this.logs.push(logEntry)

    // 控制台输出
    const emoji = {
      INFO: '📝',
      WARN: '⚠️',
      ERROR: '❌',
      DEBUG: '🔍',
    }

    process.env.NODE_ENV === 'development' && console.log(`${emoji[level]} [OptaPlanner-${level}] ${message}`)
    if (data) {
      process.env.NODE_ENV === 'development' && console.log('📊 数据详情:', data)
    }

    // 保持日志数量在合理范围内
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-50)
    }
  }

  getLogs(): Array<{ timestamp: string; level: string; message: string; data?: any }> {
    return [...this.logs]
  }

  clearLogs() {
    this.logs = []
  }
}

// 请求和响应类型定义
export interface OptaPlannerStudent {
  id: string
  name: string
  department: string
  group: string
  examDays?: number
  day1Subjects?: string  // 🆕 第一天考试科目（JSON格式字符串）
  day2Subjects?: string  // 🆕 第二天考试科目（JSON格式字符串）
  recommendedExaminer1Dept?: string
  recommendedExaminer2Dept?: string
  recommendedBackupDept?: string
  // ✨ 方案A：前端智能日期选择推荐的考试日期
  recommendedExamDate1?: string
  recommendedExamDate2?: string
}

export interface OptaPlannerTeacher {
  id: string
  name: string
  department: string
  group: string
  skills?: string[]
  workload?: number
  consecutiveDays?: number
  // 🆕 不可用期列表
  unavailablePeriods?: Array<{
    id: string
    startDate: string // YYYY-MM-DD
    endDate: string // YYYY-MM-DD
    reason: string
    createdAt?: string
  }>
}

export interface HardSoftScore {
  hardScore: number
  softScore: number
}

export interface OptaPlannerConstraints {
  // 硬约束
  workdaysOnlyExam: boolean // HC1: 工作日考试限制
  examinerDepartmentRules: boolean // HC2: 考官科室规则
  twoMainExaminersRequired: boolean // HC3: 考官配备要求
  noDayShiftExaminer: boolean // HC4: 白班禁止规则

  // 软约束权重
  allowDept37CrossUseWeight: HardSoftScore // SC4: 三七室互通
  preferNoGroupTeachersWeight: HardSoftScore // SC6: 无班组优先
  // 新增时间集中度约束
  timeConcentrationWeight: HardSoftScore
}

export interface OptaPlannerRequest {
  students: OptaPlannerStudent[]
  teachers: OptaPlannerTeacher[]
  startDate: string
  endDate: string
  examDates?: string[]
  constraints?: Partial<OptaPlannerConstraints>
  solverConfig?: {
    timeoutSeconds?: number
    maxIterations?: number
    enableMultiThreading?: boolean
    mode?: 'fast' | 'balanced' | 'optimal' | 'auto' | 'deep' | 'adaptive'
    description?: string
    solvingMode?: string  // 后端使用的求解模式标识
  }
}

export interface OptaPlannerExamAssignment {
  id: string
  student: OptaPlannerStudent
  examType: 'day1' | 'day2'
  subjects: string[]
  examDate: string
  examiner1: OptaPlannerTeacher
  examiner2: OptaPlannerTeacher
  backupExaminer: OptaPlannerTeacher
  location: string
  timeSlot: {
    start: string
    end: string
    period: 'morning' | 'afternoon' | 'evening'
  }
}

export interface OptaPlannerResponse {
  success: boolean
  message?: string
  assignments: OptaPlannerExamAssignment[]
  executionTime?: number
  algorithmUsed?: string
  conflicts?: any[]
  warnings?: any[]
  score?: string | { hardScore: number; softScore: number } // 添加score属性支持
  examSchedule?: {
    assignments: OptaPlannerExamAssignment[]
  }
  statistics?: {
    totalStudents: number
    assignedStudents: number
    unassignedStudents: number
    totalTeachers: number
    activeTeachers: number
    averageWorkload: number
    maxWorkload: number
    finalScore?:
      | string
      | {
          hardScore: number
          softScore: number
        }
    completionPercentage: number
    solvingTimeMillis: number
    hardConstraintViolations: number
    softConstraintViolations: number
  }
}

/**
 * OptaPlanner排班服务类
 */
export class OptaPlannerService {
  private baseUrl: string
  private logger = OptaPlannerLogger.getInstance()
  private initialized = false

  constructor(baseUrl?: string) {
    // Web环境：使用相对路径，让HTTP服务器代理处理
    if (!baseUrl) {
      baseUrl = '/api/schedule'
    }
    this.baseUrl = baseUrl
    this.logger.log('INFO', `OptaPlanner服务初始化，基础URL: ${this.baseUrl}`)
    this.initializeBaseUrl()
  }

  /**
   * 异步初始化基础URL
   */
  private async initializeBaseUrl(): Promise<void> {
    if (this.initialized) return

    try {
      this.baseUrl = await getOptaPlannerBaseURL() // 🔧 使用新的函数名
      this.initialized = true
      this.logger.log('INFO', `OptaPlanner服务URL已更新: ${this.baseUrl}`)
    } catch (error) {
      this.logger.log('WARN', 'OptaPlanner服务URL初始化失败，使用默认值', error)
    }
  }

  /**
   * 🔧 修复：每次调用前都重新获取最新URL，确保端口正确
   */
  private async getLatestBaseUrl(): Promise<string> {
    try {
      const latestUrl = await getOptaPlannerBaseURL()
      // 如果URL变化了，更新baseUrl
      if (latestUrl !== this.baseUrl) {
        this.logger.log('INFO', `检测到端口变化: ${this.baseUrl} -> ${latestUrl}`)
        this.baseUrl = latestUrl
      }
      return latestUrl
    } catch (error) {
      this.logger.log('WARN', '获取最新URL失败，使用缓存值', error)
      return this.baseUrl
    }
  }

  /**
   * 确保服务已初始化
   * 🔧 修复：每次都重新获取端口，避免端口不匹配
   */
  private async ensureInitialized(): Promise<void> {
    // 🔧 每次都重新获取端口，确保使用正确的端口
    try {
      const latestUrl = await getOptaPlannerBaseURL()
      this.baseUrl = latestUrl
      
      // 🔧 检查后端状态（Electron环境）
      const isElectron = (window as any).electronAPI && (window as any).electronAPI.isElectron
      if (isElectron && (window as any).electronAPI?.getBackendStatus) {
        try {
          const status = await (window as any).electronAPI.getBackendStatus()
          if (status && !status.isRunning) {
            this.logger.log('WARN', '后端服务未运行', status)
            // 如果后端未运行，尝试等待一下
            await new Promise(resolve => setTimeout(resolve, 2000))
            // 再次检查
            const status2 = await (window as any).electronAPI.getBackendStatus()
            if (status2 && !status2.isRunning) {
              throw new Error('后端服务未运行，请重启应用程序')
            }
          }
        } catch (statusError: any) {
          this.logger.log('WARN', '检查后端状态失败', statusError)
        }
      }
      
      if (!this.initialized) {
        this.initialized = true
        this.logger.log('INFO', `OptaPlanner服务已初始化，使用URL: ${this.baseUrl}`)
      }
    } catch (error) {
      // 如果获取失败，使用默认值
      if (!this.initialized) {
        // Web环境：使用相对路径
        this.baseUrl = '/api/schedule'
        this.initialized = true
        this.logger.log('WARN', 'OptaPlanner服务初始化失败，使用默认URL', error)
      }
    }
  }

  /**
   * 检查OptaPlanner服务健康状态
   */
  async checkHealth(): Promise<boolean> {
    try {
      // 🔧 修复：使用最新的基础URL进行健康检查
      const latestBaseUrl = await this.getLatestBaseUrl()
      this.logger.log('DEBUG', '开始检查OptaPlanner服务健康状态', { baseUrl: latestBaseUrl })

      // 🔧 修复：使用正确的Quarkus健康检查路径
      const healthUrl = latestBaseUrl.replace('/api/schedule', '/q/health/ready')
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const isHealthy = response.ok
      this.logger.log(
        isHealthy ? 'INFO' : 'ERROR',
        `OptaPlanner服务健康检查${isHealthy ? '成功' : '失败'}`,
        {
          status: response.status,
          statusText: response.statusText,
          url: `${latestBaseUrl.replace('/api/schedule', '/q/health/ready')}`,
        }
      )

      return isHealthy
    } catch (error) {
      this.logger.log('ERROR', 'OptaPlanner服务健康检查异常', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        url: `${await this.getLatestBaseUrl()}/health`,
      })
      return false
    }
  }

  /**
   * 验证请求数据格式
   */
  private validateRequest(request: OptaPlannerRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!request.students || !Array.isArray(request.students)) {
      errors.push('学员数据无效或为空')
    } else if (request.students.length === 0) {
      errors.push('学员列表为空')
    }

    if (!request.teachers || !Array.isArray(request.teachers)) {
      errors.push('考官数据无效或为空')
    } else if (request.teachers.length === 0) {
      errors.push('考官列表为空')
    }

    if (!request.startDate) {
      errors.push('开始日期未设置')
    }

    if (!request.endDate) {
      errors.push('结束日期未设置')
    }

    if (
      request.startDate &&
      request.endDate &&
      new Date(request.startDate) >= new Date(request.endDate)
    ) {
      errors.push('开始日期必须早于结束日期')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * 生成排班计划 - 支持实时进度回调
   */
  async generateSchedule(
    request: OptaPlannerRequest,
    onProgress?: (progress: {
      percentage: number
      currentSolution?: OptaPlannerResponse
      message?: string
      score?: { hardScore: number; softScore: number }
    }) => void
  ): Promise<OptaPlannerResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await this.ensureInitialized() // 🔧 确保使用正确端口的基础URL

    try {
      this.logger.log('INFO', `开始生成排班计划 [${requestId}]`, {
        studentsCount: request.students?.length || 0,
        teachersCount: request.teachers?.length || 0,
        dateRange: `${request.startDate} ~ ${request.endDate}`,
        hasProgressCallback: !!onProgress,
      })

      // 验证请求数据
      const validation = this.validateRequest(request)
      if (!validation.valid) {
        const errorMsg = `请求数据验证失败: ${validation.errors.join(', ')}`
        this.logger.log('ERROR', errorMsg, { requestId, errors: validation.errors })
        throw new Error(errorMsg)
      }

      this.logger.log('DEBUG', `请求数据验证通过 [${requestId}]`)

      // 如果有进度回调，使用流式处理
      if (onProgress) {
        this.logger.log('DEBUG', `使用进度回调模式 [${requestId}]`)
        return await this.generateScheduleWithProgress(request, onProgress, requestId)
      }

      // 🔧 修复：每次调用前都重新获取最新端口，确保端口正确
      const currentUrl = await this.getLatestBaseUrl()
      
      // 记录请求详情
      this.logger.log('DEBUG', `发送排班请求 [${requestId}]`, {
        url: `${currentUrl}/solve`,
        method: 'POST',
        requestData: {
          studentsCount: request.students.length,
          teachersCount: request.teachers.length,
          startDate: request.startDate,
          endDate: request.endDate,
          constraints: request.constraints,
          solverConfig: request.solverConfig,
        },
      })

      // 🔧 修复：使用最新获取的URL
      const requestUrl = `${currentUrl}/solve`
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'optaplanner-service.ts:generateSchedule',
          message: 'Preparing fetch request',
          data: { 
            currentUrl, 
            requestUrl, 
            isElectron: !!(window as any).electronAPI?.isElectron,
            requestId,
            timestamp: Date.now() 
          },
          sessionId: 'debug-session',
          runId: 'fetch-request',
          hypothesisId: 'A'
        })
      }).catch(() => {})
      // #endregion
      
      // 🔍 检查教师不可用期数据
      const teachersWithUnavailable = request.teachers.filter(
        t => t.unavailablePeriods && t.unavailablePeriods.length > 0
      )
      if (teachersWithUnavailable.length > 0) {
        this.logger.log('INFO', `发送 ${teachersWithUnavailable.length} 个考官的不可用期数据`, {
          teachers: teachersWithUnavailable.map(t => ({
            name: t.name,
            periods: t.unavailablePeriods,
          })),
        })
      } else {
        this.logger.log('WARN', '没有考官设置不可用期！')
      }

      let __sid_main = (window as any).__opta_session_id
      const mainHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      }
      if (!__sid_main) {
        const gen =
          window.crypto && (window.crypto as any).randomUUID
            ? (window.crypto as any).randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2)
        ;(window as any).__opta_session_id = gen
        __sid_main = gen
      }
      if (__sid_main) mainHeaders['X-Session-Id'] = __sid_main

      // 🔧 修复：使用最新获取的URL，如果失败则尝试端口自动发现
      let response: Response
      let finalUrl = currentUrl
      
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'optaplanner-service.ts:generateSchedule',
            message: 'Starting fetch request',
            data: { 
              url: `${currentUrl}/solve`,
              method: 'POST',
              headers: Object.keys(mainHeaders),
              requestId,
              timestamp: Date.now() 
            },
            sessionId: 'debug-session',
            runId: 'fetch-request',
            hypothesisId: 'B'
          })
        }).catch(() => {})
        // #endregion
        
        response = await fetch(`${currentUrl}/solve`, {
          method: 'POST',
          headers: mainHeaders,
          body: JSON.stringify({
            ...request,
            solverConfig: {
              ...(request.solverConfig || {}),
              mode: request.solverConfig?.mode || 'adaptive',
            },
          }),
        })
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'optaplanner-service.ts:generateSchedule',
            message: 'Fetch request completed',
            data: { 
              url: `${currentUrl}/solve`,
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              requestId,
              timestamp: Date.now() 
            },
            sessionId: 'debug-session',
            runId: 'fetch-request',
            hypothesisId: 'B'
          })
        }).catch(() => {})
        // #endregion
      } catch (fetchError: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'optaplanner-service.ts:generateSchedule',
            message: 'Fetch request failed',
            data: { 
              url: `${currentUrl}/solve`,
              errorName: fetchError?.name,
              errorMessage: fetchError?.message,
              errorStack: fetchError?.stack,
              isTypeError: fetchError?.name === 'TypeError',
              includesFetch: fetchError?.message?.includes('fetch'),
              requestId,
              timestamp: Date.now() 
            },
            sessionId: 'debug-session',
            runId: 'fetch-error',
            hypothesisId: 'C'
          })
        }).catch(() => {})
        // #endregion
        
        // 🔧 如果连接失败（Failed to fetch），尝试端口自动发现
        if (fetchError?.message?.includes('fetch') || fetchError?.name === 'TypeError') {
          this.logger.log('WARN', `连接失败，尝试自动发现后端端口 [${requestId}]`, fetchError)
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'optaplanner-service.ts:generateSchedule',
              message: 'Starting port discovery',
              data: { 
                currentUrl,
                requestId,
                timestamp: Date.now() 
              },
              sessionId: 'debug-session',
              runId: 'port-discovery',
              hypothesisId: 'C'
            })
          }).catch(() => {})
          // #endregion
          
          const discoveredPort = await discoverBackendPort(8081, 8090)
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'optaplanner-service.ts:generateSchedule',
              message: 'Port discovery result',
              data: { 
                discoveredPort,
                requestId,
                timestamp: Date.now() 
              },
              sessionId: 'debug-session',
              runId: 'port-discovery',
              hypothesisId: 'C'
            })
          }).catch(() => {})
          // #endregion
          
          if (discoveredPort) {
            // 在 Web 环境中，如果使用代理，应该使用相对路径
            const isWebEnv = !(window as any).electronAPI?.isElectron
            if (isWebEnv) {
              finalUrl = '/api/schedule'
            } else {
              finalUrl = `http://127.0.0.1:${discoveredPort}/api/schedule`
            }
            this.baseUrl = finalUrl
            this.logger.log('INFO', `自动发现端口成功，使用端口 ${discoveredPort} [${requestId}]`)
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: 'optaplanner-service.ts:generateSchedule',
                message: 'Retrying fetch with discovered port',
                data: { 
                  finalUrl,
                  isWebEnv,
                  requestId,
                  timestamp: Date.now() 
                },
                sessionId: 'debug-session',
                runId: 'retry-fetch',
                hypothesisId: 'C'
              })
            }).catch(() => {})
            // #endregion
            
            // 重试请求
            response = await fetch(`${finalUrl}/solve`, {
              method: 'POST',
              headers: mainHeaders,
              body: JSON.stringify({
                ...request,
                solverConfig: {
                  ...(request.solverConfig || {}),
                  mode: request.solverConfig?.mode || 'adaptive',
                },
              }),
            })
          } else {
            // 🔧 端口发现失败，提供详细的诊断信息
            const diagnosis = await diagnoseBackendConnection()
            const errorMsg = `无法连接到后端服务\n\n${diagnosis}\n\n原始错误: ${fetchError.message}`
            this.logger.log('ERROR', errorMsg, { requestId, diagnosis })
            throw new Error(errorMsg)
          }
        } else {
          throw fetchError
        }
      }

      this.logger.log('DEBUG', `收到响应 [${requestId}]`, {
        url: finalUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (!response.ok) {
        let errorDetails = ''
        try {
          errorDetails = await response.text()
        } catch (e) {
          errorDetails = '无法读取错误详情'
        }

        const errorMsg = `OptaPlanner服务请求失败: ${response.status} ${response.statusText}`
        this.logger.log('ERROR', errorMsg, {
          requestId,
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          url: `${this.baseUrl}/solve`,
        })

        throw new Error(`${errorMsg} - ${errorDetails}`)
      }

      const result: OptaPlannerResponse = await response.json()

      this.logger.log('INFO', `排班计算完成 [${requestId}]`, {
        success: result.success,
        assignmentsCount: result.assignments?.length || 0,
        executionTime: result.executionTime,
        algorithmUsed: result.algorithmUsed,
        statistics: result.statistics,
      })

      if (result.conflicts && result.conflicts.length > 0) {
        this.logger.log('WARN', `发现冲突 [${requestId}]`, {
          conflictsCount: result.conflicts.length,
          conflicts: result.conflicts,
        })
      }

      if (result.warnings && result.warnings.length > 0) {
        this.logger.log('WARN', `发现警告 [${requestId}]`, {
          warningsCount: result.warnings.length,
          warnings: result.warnings,
        })
      }

      return result
    } catch (error) {
      const errorMessage = (error as Error).message
      
      this.logger.log('ERROR', `排班计算异常 [${requestId}]`, {
        error: errorMessage,
        stack: (error as Error).stack,
        requestData: {
          studentsCount: request.students?.length || 0,
          teachersCount: request.teachers?.length || 0,
          dateRange: `${request.startDate} ~ ${request.endDate}`,
        },
      })

      // 🔧 如果是连接错误，提供详细的诊断信息
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('无法连接到后端服务')) {
        try {
          const diagnosis = await diagnoseBackendConnection()
          throw new Error(`排班服务调用失败: ${errorMessage}\n\n${diagnosis}`)
        } catch (diagnosisError) {
          // 如果诊断失败，仍然抛出原始错误
          throw new Error(`排班服务调用失败: ${errorMessage}`)
        }
      }
      
      throw new Error(`排班服务调用失败: ${errorMessage}`)
    }
  }

  /**
   * 带实时进度的排班生成 - 使用同步API + 模拟进度展示
   */
  private async generateScheduleWithProgress(
    request: OptaPlannerRequest,
    onProgress: (progress: {
      percentage: number
      currentSolution?: OptaPlannerResponse
      message?: string
      score?: { hardScore: number; softScore: number }
    }) => void,
    requestId: string
  ): Promise<OptaPlannerResponse> {
    const students = request.students
    const teachers = request.teachers

    // 🔧 修复：每次调用前都获取最新的基础URL，确保端口正确
    const latestBaseUrl = await this.getLatestBaseUrl()

    this.logger.log('DEBUG', `开始进度模式排班 [${requestId}]`, {
      studentsCount: students.length,
      teachersCount: teachers.length,
    })

    // 🚀 优化进度更新步骤 - 大幅缩短延迟时间
    const progressSteps = [
      { percentage: 10, message: '正在初始化排班问题...', delay: 100 },
      { percentage: 20, message: '正在生成初始解...', delay: 150 },
      { percentage: 35, message: '正在优化硬约束...', delay: 200 },
      { percentage: 50, message: '正在优化软约束...', delay: 250 },
      { percentage: 65, message: '正在平衡工作负载...', delay: 200 },
      { percentage: 80, message: '正在最终优化...', delay: 150 },
      { percentage: 95, message: '正在生成最终结果...', delay: 100 },
    ]
    let currentStepIndex = 0
    let progressTimer: NodeJS.Timeout | null = null

    const updateProgress = () => {
      if (currentStepIndex >= progressSteps.length) {
        return
      }

      const step = progressSteps[currentStepIndex]

      this.logger.log('DEBUG', `进度更新 [${requestId}]`, {
        percentage: step.percentage,
        message: step.message,
        step: currentStepIndex + 1,
        totalSteps: progressSteps.length,
      })

      onProgress({
        percentage: step.percentage,
        message: step.message,
      })

      currentStepIndex += 1

      if (currentStepIndex < progressSteps.length) {
        progressTimer = setTimeout(updateProgress, step.delay)
      }
    }

    progressTimer = setTimeout(updateProgress, 50)

    try {
      // 调用同步排班API
      this.logger.log('INFO', `调用同步排班API [${requestId}]`)

      let __sid_progress = (window as any).__opta_session_id
      const progressHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Request-ID': requestId,
      }
      if (!__sid_progress) {
        const gen =
          window.crypto && (window.crypto as any).randomUUID
            ? (window.crypto as any).randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2)
        ;(window as any).__opta_session_id = gen
        __sid_progress = gen
      }
      if (__sid_progress) progressHeaders['X-Session-Id'] = __sid_progress

      // 🔧 修复：使用最新获取的URL
      const currentUrl = await this.getLatestBaseUrl()
      const response = await fetch(`${currentUrl}/solve`, {
        method: 'POST',
        headers: progressHeaders,
        credentials: 'same-origin',
        mode: 'cors',
        body: JSON.stringify({
          ...request,
          solverConfig: {
            ...(request.solverConfig || {}),
            mode: request.solverConfig?.mode || 'adaptive',
          },
        }),
      })

      // 清理进度定时器
      if (progressTimer) {
        clearTimeout(progressTimer)
      }

      this.logger.log('DEBUG', `同步API响应 [${requestId}]`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (!response.ok) {
        let errorDetails = ''
        try {
          errorDetails = await response.text()
        } catch (e) {
          errorDetails = '无法读取错误详情'
        }

        const errorMsg = `OptaPlanner服务请求失败: ${response.status} ${response.statusText}`
        this.logger.log('ERROR', errorMsg, {
          requestId,
          status: response.status,
          statusText: response.statusText,
          errorDetails,
          url: `${this.baseUrl}/solve`,
        })

        throw new Error(`${errorMsg} - ${errorDetails}`)
      }

      const result: OptaPlannerResponse = await response.json()

      // 最终进度更新
      onProgress({
        percentage: 100,
        currentSolution: result,
        message: '排班完成！',
        score:
          typeof result.statistics?.finalScore === 'object'
            ? result.statistics.finalScore
            : undefined,
      })

      this.logger.log('INFO', `进度模式排班完成 [${requestId}]`, {
        success: result.success,
        assignmentsCount: result.assignments?.length || 0,
        executionTime: result.executionTime,
        finalScore: result.statistics?.finalScore,
      })

      return result
    } catch (error) {
      // 清理进度定时器
      if (progressTimer) {
        clearTimeout(progressTimer)
      }

      this.logger.log('ERROR', `进度模式排班异常 [${requestId}]`, {
        error: (error as Error).message,
        stack: (error as Error).stack,
      })

      throw new Error(`排班服务调用失败: ${(error as Error).message}`)
    }
  }

  /**
   * 获取智能时间段推荐
   */
  async getOptimalTimeSlotRecommendations(request: OptaPlannerRequest): Promise<{
    success: boolean
    message: string
    recommendations: Array<{
      startDate: string
      endDate: string
      qualityScore: number
      successProbability: number
      conflictAnalysis: {
        totalConflicts: number
        resourceShortage: number
        dutyRotationConflicts: number
      }
      resourceSufficiency: {
        totalSufficiency: number
        departmentSufficiency: { [key: string]: number }
      }
      recommendation: string
    }>
  }> {
    const requestId = `timeslot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      this.logger.log('INFO', `获取智能时间段推荐 [${requestId}]`, {
        studentsCount: request.students?.length || 0,
        teachersCount: request.teachers?.length || 0,
        dateRange: `${request.startDate} ~ ${request.endDate}`,
      })

      const response = await fetch(`${this.baseUrl}/recommend-timeslots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(request),
      })

      this.logger.log('DEBUG', `时间段推荐响应 [${requestId}]`, {
        status: response.status,
        statusText: response.statusText,
      })

      if (!response.ok) {
        let errorDetails = ''
        try {
          errorDetails = await response.text()
        } catch (e) {
          errorDetails = '无法读取错误详情'
        }

        const errorMsg = `智能推荐请求失败: ${response.status} ${response.statusText}`
        this.logger.log('ERROR', errorMsg, {
          requestId,
          status: response.status,
          statusText: response.statusText,
          errorDetails,
        })

        throw new Error(`${errorMsg} - ${errorDetails}`)
      }

      const result = await response.json()
      this.logger.log('INFO', `智能时间段推荐完成 [${requestId}]`, {
        success: result.success,
        recommendationsCount: result.recommendations?.length || 0,
      })

      return result
    } catch (error) {
      this.logger.log('ERROR', `智能时间段推荐异常 [${requestId}]`, {
        error: (error as Error).message,
        stack: (error as Error).stack,
      })
      throw new Error(`智能推荐服务调用失败: ${(error as Error).message}`)
    }
  }

  /**
   * 获取学员个性化推荐
   */
  async getStudentPersonalizedRecommendations(request: OptaPlannerRequest): Promise<{
    success: boolean
    message: string
    studentRecommendations: {
      [studentId: string]: Array<{
        startDate: string
        endDate: string
        qualityScore: number
        conflictLevel: 'low' | 'medium' | 'high'
        recommendation: string
      }>
    }
  }> {
    const requestId = `student_rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      this.logger.log('INFO', `获取学员个性化推荐 [${requestId}]`, {
        studentsCount: request.students?.length || 0,
        teachersCount: request.teachers?.length || 0,
      })

      const response = await fetch(`${this.baseUrl}/recommend-student-timeslots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(request),
      })

      this.logger.log('DEBUG', `学员推荐响应 [${requestId}]`, {
        status: response.status,
        statusText: response.statusText,
      })

      if (!response.ok) {
        let errorDetails = ''
        try {
          errorDetails = await response.text()
        } catch (e) {
          errorDetails = '无法读取错误详情'
        }

        const errorMsg = `学员个性化推荐请求失败: ${response.status} ${response.statusText}`
        this.logger.log('ERROR', errorMsg, {
          requestId,
          status: response.status,
          statusText: response.statusText,
          errorDetails,
        })

        throw new Error(`${errorMsg} - ${errorDetails}`)
      }

      const result = await response.json()
      this.logger.log('INFO', `学员个性化推荐完成 [${requestId}]`, {
        success: result.success,
        studentsWithRecommendations: Object.keys(result.studentRecommendations || {}).length,
      })

      return result
    } catch (error) {
      this.logger.log('ERROR', `学员个性化推荐异常 [${requestId}]`, {
        error: (error as Error).message,
        stack: (error as Error).stack,
      })
      throw new Error(`学员个性化推荐服务调用失败: ${(error as Error).message}`)
    }
  }

  /**
   * 异步生成排班计划
   */
  async generateScheduleAsync(
    request: OptaPlannerRequest
  ): Promise<{ success: boolean; problemId: string; message: string }> {
    const requestId = `async_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    await this.ensureInitialized() // 🔧 确保使用正确端口的基础URL

    try {
      this.logger.log('INFO', `异步排班请求 [${requestId}]`, {
        studentsCount: request.students?.length || 0,
        teachersCount: request.teachers?.length || 0,
        dateRange: `${request.startDate} ~ ${request.endDate}`,
      })

      // 🔑 关键：为异步接口也传入 X-Session-Id，保证后端绑定日志会话
      let __sid_async = (window as any).__opta_session_id
      if (!__sid_async) {
        const gen =
          window.crypto && (window.crypto as any).randomUUID
            ? (window.crypto as any).randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2)
        ;(window as any).__opta_session_id = gen
        __sid_async = gen
      }

      const response = await fetch(`${this.baseUrl}/solve-async`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Request-ID': requestId,
          'X-Session-Id': __sid_async,
        },
        credentials: 'same-origin',
        mode: 'cors',
        body: JSON.stringify(request),
      })

      this.logger.log('DEBUG', `异步排班响应 [${requestId}]`, {
        status: response.status,
        statusText: response.statusText,
      })

      if (!response.ok) {
        let errorDetails = ''
        try {
          errorDetails = await response.text()
        } catch (e) {
          errorDetails = '无法读取错误详情'
        }

        const errorMsg = `OptaPlanner异步服务请求失败: ${response.status} ${response.statusText}`
        this.logger.log('ERROR', errorMsg, {
          requestId,
          status: response.status,
          statusText: response.statusText,
          errorDetails,
        })

        throw new Error(`${errorMsg} - ${errorDetails}`)
      }

      const result = await response.json()
      this.logger.log('INFO', `异步排班任务提交成功 [${requestId}]`, {
        success: result.success,
        problemId: result.problemId,
      })

      return result
    } catch (error) {
      this.logger.log('ERROR', `异步排班请求异常 [${requestId}]`, {
        error: (error as Error).message,
        stack: (error as Error).stack,
      })
      throw new Error(`异步排班服务调用失败: ${(error as Error).message}`)
    }
  }

  /**
   * 获取排班结果
   */
  async getScheduleResult(problemId: string): Promise<OptaPlannerResponse> {
    try {
      await this.ensureInitialized() // 🔧 确保使用正确端口的基础URL
      this.logger.log('DEBUG', `获取排班结果`, { problemId })

      const response = await fetch(`${this.baseUrl}/result/${problemId}`)

      this.logger.log('DEBUG', `排班结果响应`, {
        problemId,
        status: response.status,
        statusText: response.statusText,
      })

      if (!response.ok) {
        let errorDetails = ''
        try {
          errorDetails = await response.text()
        } catch (e) {
          errorDetails = '无法读取错误详情'
        }

        const errorMsg = `获取排班结果失败: ${response.status} ${response.statusText}`
        this.logger.log('ERROR', errorMsg, {
          problemId,
          status: response.status,
          statusText: response.statusText,
          errorDetails,
        })

        throw new Error(`${errorMsg} - ${errorDetails}`)
      }

      const result = await response.json()
      this.logger.log('INFO', `排班结果获取成功`, {
        problemId,
        success: result.success,
        assignmentsCount: result.assignments?.length || 0,
      })

      return result
    } catch (error) {
      this.logger.log('ERROR', `获取排班结果异常`, {
        problemId,
        error: (error as Error).message,
        stack: (error as Error).stack,
      })
      throw new Error(`获取排班结果失败: ${(error as Error).message}`)
    }
  }

  /**
   * 取消排班任务
   */
  async cancelSchedule(problemId: string): Promise<boolean> {
    try {
      this.logger.log('DEBUG', `取消排班任务`, { problemId })

      const response = await fetch(`${this.baseUrl}/cancel/${problemId}`, {
        method: 'DELETE',
      })

      const success = response.ok
      this.logger.log(success ? 'INFO' : 'WARN', `排班任务取消${success ? '成功' : '失败'}`, {
        problemId,
        status: response.status,
        statusText: response.statusText,
      })

      return success
    } catch (error) {
      this.logger.log('ERROR', `取消排班任务异常`, {
        problemId,
        error: (error as Error).message,
      })
      return false
    }
  }

  /**
   * 获取服务状态
   */
  async getServiceStatus(): Promise<any> {
    try {
      await this.ensureInitialized() // 🔧 确保使用正确端口的基础URL
      this.logger.log('DEBUG', '获取服务状态')

      const response = await fetch(`${this.baseUrl}/status`)

      this.logger.log('DEBUG', '服务状态响应', {
        status: response.status,
        statusText: response.statusText,
      })

      if (!response.ok) {
        const errorMsg = `获取服务状态失败: ${response.status}`
        this.logger.log('ERROR', errorMsg, {
          status: response.status,
          statusText: response.statusText,
        })
        throw new Error(errorMsg)
      }

      const result = await response.json()
      this.logger.log('INFO', '服务状态获取成功', result)

      return result
    } catch (error) {
      this.logger.log('ERROR', '获取服务状态异常', {
        error: (error as Error).message,
        stack: (error as Error).stack,
      })
      throw error
    }
  }

  /**
   * 获取服务日志
   */
  getServiceLogs(): Array<{ timestamp: string; level: string; message: string; data?: any }> {
    return this.logger.getLogs()
  }

  /**
   * 清理服务日志
   */
  clearServiceLogs() {
    this.logger.clearLogs()
  }

  /**
   * 诊断服务连接
   */
  async diagnoseConnection(): Promise<{
    healthy: boolean
    baseUrl: string
    endpoints: Array<{
      path: string
      status: 'ok' | 'error' | 'timeout'
      responseTime?: number
      error?: string
    }>
  }> {
    const diagnosis = {
      healthy: false,
      baseUrl: this.baseUrl,
      endpoints: [] as Array<{
        path: string
        status: 'ok' | 'error' | 'timeout'
        responseTime?: number
        error?: string
      }>,
    }

    const testEndpoints = ['/health', '/status', '/generate', '/solve']

    this.logger.log('INFO', '开始诊断服务连接', { baseUrl: this.baseUrl, endpoints: testEndpoints })

    for (const endpoint of testEndpoints) {
      const startTime = Date.now()
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: endpoint === '/generate' || endpoint === '/solve' ? 'POST' : 'GET',
          headers: { 'Content-Type': 'application/json' },
          body:
            endpoint === '/generate' || endpoint === '/solve'
              ? JSON.stringify({
                  students: [],
                  teachers: [],
                  startDate: '2025-01-01',
                  endDate: '2025-01-02',
                })
              : undefined,
          signal: AbortSignal.timeout(5000), // 5秒超时
        })

        const responseTime = Date.now() - startTime
        diagnosis.endpoints.push({
          path: endpoint,
          status: response.ok ? 'ok' : 'error',
          responseTime,
          error: response.ok ? undefined : `${response.status} ${response.statusText}`,
        })

        if (response.ok && endpoint === '/health') {
          diagnosis.healthy = true
        }
      } catch (error) {
        const responseTime = Date.now() - startTime
        diagnosis.endpoints.push({
          path: endpoint,
          status: responseTime > 4900 ? 'timeout' : 'error',
          responseTime,
          error: (error as Error).message,
        })
      }
    }

    this.logger.log('INFO', '服务连接诊断完成', diagnosis)
    return diagnosis
  }
}

/**
 * 计算时间集中度评分
 * 用于前端预评估和后端约束验证
 * @param examAssignments 考试分配结果
 * @param weight 权重（默认60）
 * @returns 时间集中度惩罚分数
 */
export function calculateTimeConcentrationScore(
  examAssignments: Array<{ examDate: string }>,
  weight: number = 60
): { score: number; dailyCount: Record<string, number>; stdDev: number } {
  const dailyExamCount: Record<string, number> = {}

  // 统计每日考试数量
  examAssignments.forEach(assignment => {
    const date = assignment.examDate
    dailyExamCount[date] = (dailyExamCount[date] || 0) + 1
  })

  const counts = Object.values(dailyExamCount)

  if (counts.length <= 1) {
    return { score: 0, dailyCount: dailyExamCount, stdDev: 0 }
  }

  const avg = counts.reduce((a, b) => a + b, 0) / counts.length
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length
  const stdDev = Math.sqrt(variance)

  // 计算惩罚分：标准差越大，惩罚越重
  const penalty = Math.round(stdDev * weight)

  return {
    score: -penalty, // 返回负数表示惩罚
    dailyCount: dailyExamCount,
    stdDev: Math.round(stdDev * 100) / 100,
  }
}

// 导出默认实例
export const optaPlannerService = new OptaPlannerService()
