/**
 * 🚀 v6.1.3优化: 后端连接诊断工具
 * 诊断后端服务连接问题，提供清晰的错误提示和解决方案
 */

export interface BackendStatus {
  isRunning: boolean
  port: number
  url: string
  responseTime?: number
  error?: string
  suggestions: string[]
}

export interface DiagnosticResult {
  status: 'ok' | 'error' | 'warning'
  message: string
  details: BackendStatus
  steps: string[]
}

/**
 * 后端诊断器类
 */
class BackendDiagnostics {
  private commonPorts = [8082, 8081, 8080, 3000, 5173]
  private lastCheck: number = 0
  private checkCache: Map<number, BackendStatus> = new Map()
  private cacheTTL = 10000 // 10秒缓存

  /**
   * 检查后端服务状态
   */
  async checkBackendStatus(port?: number): Promise<BackendStatus> {
    const targetPort = port || this.detectPort()
    const cacheKey = targetPort
    const now = Date.now()

    // 检查缓存
    const cached = this.checkCache.get(cacheKey)
    if (cached && now - this.lastCheck < this.cacheTTL) {
      return cached
    }

    const url = `http://127.0.0.1:${targetPort}/api/health`
    const status: BackendStatus = {
      isRunning: false,
      port: targetPort,
      url: `http://127.0.0.1:${targetPort}/api`,
      suggestions: [],
    }

    try {
      const startTime = performance.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3秒超时

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      })

      clearTimeout(timeoutId)
      const responseTime = performance.now() - startTime

      if (response.ok) {
        status.isRunning = true
        status.responseTime = responseTime
        status.suggestions = ['后端服务运行正常']
      } else {
        status.error = `HTTP ${response.status}: ${response.statusText}`
        status.suggestions = this.generateSuggestions(targetPort, 'http_error')
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        status.error = '连接超时（3秒）'
        status.suggestions = this.generateSuggestions(targetPort, 'timeout')
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
        status.error = '连接被拒绝，后端服务可能未启动'
        status.suggestions = this.generateSuggestions(targetPort, 'connection_refused')
      } else {
        status.error = error.message || '未知错误'
        status.suggestions = this.generateSuggestions(targetPort, 'unknown')
      }
    }

    // 更新缓存
    this.checkCache.set(cacheKey, status)
    this.lastCheck = now

    return status
  }

  /**
   * 检测后端端口
   */
  private detectPort(): number {
    // 检查环境变量
    const metaEnv = (import.meta as any)?.env
    const envPort = Number(metaEnv?.VITE_BACKEND_PORT)
    if (Number.isFinite(envPort) && envPort > 0) {
      return envPort
    }

    // 检查Electron环境
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
      const electronPort = (window as any).electronAPI?.getBackendPort?.()
      if (electronPort && Number.isFinite(electronPort)) {
        return electronPort
      }
    }

    // 默认端口
    const isDev = Boolean(metaEnv?.DEV)
    return isDev ? 8081 : 8082
  }

  /**
   * 扫描常用端口
   */
  async scanPorts(): Promise<BackendStatus[]> {
    const results: BackendStatus[] = []

    for (const port of this.commonPorts) {
      const status = await this.checkBackendStatus(port)
      results.push(status)
      
      // 如果找到运行中的服务，可以提前返回
      if (status.isRunning) {
        break
      }
    }

    return results
  }

  /**
   * 生成诊断建议
   */
  private generateSuggestions(port: number, errorType: string): string[] {
    const suggestions: string[] = []

    switch (errorType) {
      case 'connection_refused':
        suggestions.push(`检查后端服务是否在端口 ${port} 上运行`)
        suggestions.push('确认后端服务已启动（检查控制台或日志）')
        suggestions.push(`尝试访问 http://127.0.0.1:${port}/api/health 验证服务状态`)
        suggestions.push('检查防火墙是否阻止了连接')
        suggestions.push('如果是Electron环境，确认后端进程已启动')
        break

      case 'timeout':
        suggestions.push('后端服务响应超时，可能正在处理大量请求')
        suggestions.push('检查后端服务是否卡死或负载过高')
        suggestions.push('查看后端日志，确认是否有错误')
        break

      case 'http_error':
        suggestions.push('后端服务已启动，但返回了错误状态')
        suggestions.push('检查后端服务日志，查看具体错误')
        suggestions.push('确认API路径是否正确')
        break

      default:
        suggestions.push('检查网络连接')
        suggestions.push('检查后端服务是否正常运行')
        suggestions.push('查看浏览器控制台和后端日志')
    }

    return suggestions
  }

  /**
   * 完整诊断
   */
  async diagnose(): Promise<DiagnosticResult> {
    const detectedPort = this.detectPort()
    const status = await this.checkBackendStatus(detectedPort)

    let result: DiagnosticResult

    if (status.isRunning) {
      result = {
        status: 'ok',
        message: `后端服务运行正常（端口 ${status.port}，响应时间 ${status.responseTime?.toFixed(0)}ms）`,
        details: status,
        steps: [],
      }
    } else {
      // 尝试扫描其他端口
      const scanResults = await this.scanPorts()
      const runningService = scanResults.find(s => s.isRunning)

      if (runningService) {
        result = {
          status: 'warning',
          message: `检测到后端服务运行在端口 ${runningService.port}，但配置的端口是 ${detectedPort}`,
          details: runningService,
          steps: [
            `更新配置，使用端口 ${runningService.port}`,
            `或启动后端服务在端口 ${detectedPort}`,
          ],
        }
      } else {
        result = {
          status: 'error',
          message: `后端服务未运行（已检查端口: ${this.commonPorts.join(', ')}）`,
          details: status,
          steps: [
            '启动后端服务',
            `确认后端服务监听在端口 ${detectedPort}`,
            '检查后端服务日志，确认启动状态',
            '如果是开发环境，运行后端启动命令',
            '如果是生产环境，检查服务是否已部署',
          ],
        }
      }
    }

    return result
  }

  /**
   * 获取友好的错误消息
   */
  getFriendlyErrorMessage(error: any): string {
    if (!error) return '未知错误'

    const errorMessage = error.message || String(error)

    if (errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('Failed to fetch')) {
      return '无法连接到后端服务，请确认后端服务已启动'
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
      return '请求超时，后端服务可能无响应'
    }

    if (errorMessage.includes('404')) {
      return '请求的API端点不存在'
    }

    if (errorMessage.includes('500')) {
      return '后端服务内部错误'
    }

    return errorMessage
  }
}

// 导出单例实例
export const backendDiagnostics = new BackendDiagnostics()

// 导出便捷方法
export const checkBackendStatus = (port?: number) => backendDiagnostics.checkBackendStatus(port)
export const diagnoseBackend = () => backendDiagnostics.diagnose()
export const scanBackendPorts = () => backendDiagnostics.scanPorts()
export const getFriendlyErrorMessage = (error: any) => backendDiagnostics.getFriendlyErrorMessage(error)

// 在开发环境暴露到全局
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  ;(window as any).__backendDiagnostics = {
    check: checkBackendStatus,
    diagnose: diagnoseBackend,
    scan: scanBackendPorts,
  }
  console.log('💡 提示: 使用 window.__backendDiagnostics.diagnose() 诊断后端连接问题')
}

