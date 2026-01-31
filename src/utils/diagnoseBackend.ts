/**
 * 后端连接诊断工具
 * 用于诊断前端无法连接后端服务的问题
 */

export async function diagnoseBackendConnection(): Promise<{
  success: boolean
  port: number | null
  endpoints: {
    url: string
    status: 'success' | 'failed' | 'unknown'
    statusCode?: number
    error?: string
  }[]
  baseUrl: string
  electronAPI: boolean
}> {
  const result = {
    success: false,
    port: null as number | null,
    endpoints: [] as any[],
    baseUrl: '',
    electronAPI: false,
  }

  try {
    // 检查是否在Electron环境
    const electronAPI = (window as any).electronAPI
    result.electronAPI = !!(electronAPI && electronAPI.isElectron)

    // 获取端口
    if (result.electronAPI && electronAPI.getBackendPort) {
      try {
        result.port = await electronAPI.getBackendPort()
      } catch (e) {
        console.error('获取端口失败:', e)
      }
    }

    // 如果没有端口，使用默认8081
    const port = result.port || 8081
    result.baseUrl = `http://127.0.0.1:${port}`

    // 测试各个端点
    const endpointsToTest = [
      '/schedule/health',
      '/api/logs/recent',
      '/api/schedule/progress/test-session',
      '/schedule/solve', // POST endpoint
    ]

    for (const endpoint of endpointsToTest) {
      const url = `${result.baseUrl}${endpoint}`
      const endpointResult = {
        url,
        status: 'unknown' as 'success' | 'failed' | 'unknown',
        statusCode: undefined as number | undefined,
        error: undefined as string | undefined,
      }

      try {
        const method = endpoint.includes('/solve') ? 'POST' : 'GET'
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
          // 对于POST请求，发送空对象
          body: method === 'POST' ? JSON.stringify({}) : undefined,
        })

        endpointResult.statusCode = response.status
        endpointResult.status = response.ok ? 'success' : 'failed'

        if (!response.ok) {
          endpointResult.error = `HTTP ${response.status}: ${response.statusText}`
        }
      } catch (e) {
        endpointResult.status = 'failed'
        endpointResult.error = e instanceof Error ? e.message : String(e)
      }

      result.endpoints.push(endpointResult)
    }

    // 如果至少有一个端点成功，认为诊断成功
    result.success = result.endpoints.some((e) => e.status === 'success')
  } catch (e) {
    console.error('诊断过程出错:', e)
  }

  return result
}

export function formatDiagnosisReport(
  diagnosis: Awaited<ReturnType<typeof diagnoseBackendConnection>>
): string {
  let report = '=== 后端连接诊断报告 ===\n\n'

  report += `Electron环境: ${diagnosis.electronAPI ? '是' : '否'}\n`
  report += `检测到的端口: ${diagnosis.port || '未检测到（使用默认8081）'}\n`
  report += `基础URL: ${diagnosis.baseUrl}\n\n`

  report += '端点测试结果:\n'
  for (const endpoint of diagnosis.endpoints) {
    const icon = endpoint.status === 'success' ? '✅' : endpoint.status === 'failed' ? '❌' : '❓'
    report += `${icon} ${endpoint.url}\n`
    if (endpoint.statusCode) {
      report += `   状态码: ${endpoint.statusCode}\n`
    }
    if (endpoint.error) {
      report += `   错误: ${endpoint.error}\n`
    }
  }

  report += `\n总体状态: ${diagnosis.success ? '✅ 后端可访问' : '❌ 后端不可访问'}\n`

  return report
}

