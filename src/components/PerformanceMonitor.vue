<template>
  <div class="performance-monitor">
    <!-- 性能监控头部 -->
    <div class="monitor-header">
      <h2>🚀 性能监控中心</h2>
      <div class="status-indicators">
        <div class="status-item" :class="overallStatus">
          <span class="status-dot"></span>
          <span>系统状态: {{ overallStatusText }}</span>
        </div>
        <div class="status-item">
          <span>评分: {{ performanceScore }}/100</span>
        </div>
      </div>
    </div>

    <!-- 快速性能检查 -->
    <div class="quick-check-section">
      <div class="section-header">
        <h3>⚡ 快速性能检查</h3>
        <button @click="runQuickCheck" :disabled="isRunningQuickCheck" class="btn btn-primary">
          {{ isRunningQuickCheck ? '检查中...' : '开始检查' }}
        </button>
      </div>

      <div v-if="quickCheckResult" class="quick-check-result">
        <div class="score-display">
          <div class="score-circle" :class="getScoreClass(quickCheckResult.score)">
            {{ quickCheckResult.score }}
          </div>
          <div class="score-details">
            <h4>性能评分</h4>
            <p>{{ getScoreDescription(quickCheckResult.score) }}</p>
          </div>
        </div>

        <div class="issues-recommendations">
          <div class="issues" v-if="quickCheckResult.issues.length">
            <h4>🔍 发现的问题</h4>
            <ul>
              <li v-for="issue in quickCheckResult.issues" :key="issue">{{ issue }}</li>
            </ul>
          </div>

          <div class="recommendations" v-if="quickCheckResult.recommendations.length">
            <h4>💡 优化建议</h4>
            <ul>
              <li v-for="rec in quickCheckResult.recommendations" :key="rec">{{ rec }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 完整性能测试 -->
    <div class="full-test-section">
      <div class="section-header">
        <h3>🧪 完整性能测试</h3>
        <div class="test-controls">
          <button
            @click="runFullTest"
            :disabled="testSuite.isRunning.value"
            class="btn btn-secondary"
          >
            {{ testSuite.isRunning.value ? '测试中...' : '运行完整测试' }}
          </button>
          <button
            @click="saveBaseline"
            :disabled="!testSuite.lastSummary.value"
            class="btn btn-outline"
          >
            保存基准
          </button>
        </div>
      </div>

      <!-- 测试进度 -->
      <div v-if="testSuite.isRunning.value" class="test-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: testSuite.progress.value + '%' }"></div>
        </div>
        <p>{{ testSuite.currentPhase.value || '准备中...' }}</p>
      </div>

      <!-- 测试结果 -->
      <div v-if="testSuite.lastSummary.value" class="test-results">
        <div class="results-grid">
          <div class="result-card">
            <h4>总体评分</h4>
            <div class="metric-value">{{ testSuite.lastSummary.value.overallScore }}/100</div>
          </div>
          <div class="result-card">
            <h4>测试通过率</h4>
            <div class="metric-value">
              {{
                Math.round(
                  (testSuite.lastSummary.value.passedTests /
                    testSuite.lastSummary.value.totalTests) *
                    100
                )
              }}%
            </div>
          </div>
          <div class="result-card">
            <h4>性能回归</h4>
            <div
              class="metric-value"
              :class="testSuite.lastSummary.value.regressions > 0 ? 'error' : 'success'"
            >
              {{ testSuite.lastSummary.value.regressions }}
            </div>
          </div>
          <div class="result-card">
            <h4>性能提升</h4>
            <div class="metric-value success">{{ testSuite.lastSummary.value.improvements }}</div>
          </div>
        </div>

        <!-- 下载报告 -->
        <div class="report-actions" v-if="testSuite.lastReport.value">
          <button @click="downloadHTMLReport" class="btn btn-primary">📄 下载HTML报告</button>
          <button @click="downloadJSONReport" class="btn btn-outline">📊 下载JSON数据</button>
        </div>
      </div>
    </div>

    <!-- 实时性能指标 -->
    <div class="realtime-metrics">
      <h3>📊 实时性能指标</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <h4>内存使用</h4>
          <div class="metric-display">
            <div class="metric-value">{{ formatMemory(realtimeMetrics.memoryUsage) }}</div>
            <div class="metric-trend" :class="getMemoryTrend()">
              {{ getMemoryTrend() === 'up' ? '↗️' : getMemoryTrend() === 'down' ? '↘️' : '➡️' }}
            </div>
          </div>
          <div class="metric-bar">
            <div
              class="metric-fill"
              :style="{
                width:
                  Math.min((realtimeMetrics.memoryUsage / (100 * 1024 * 1024)) * 100, 100) + '%',
              }"
            ></div>
          </div>
        </div>

        <div class="metric-card">
          <h4>网络请求</h4>
          <div class="metric-display">
            <div class="metric-value">{{ realtimeMetrics.networkRequests }}</div>
            <div class="metric-unit">个</div>
          </div>
        </div>

        <div class="metric-card">
          <h4>DOM节点</h4>
          <div class="metric-display">
            <div class="metric-value">{{ realtimeMetrics.domNodes }}</div>
            <div class="metric-unit">个</div>
          </div>
        </div>

        <div class="metric-card">
          <h4>FPS</h4>
          <div class="metric-display">
            <div class="metric-value">{{ realtimeMetrics.fps }}</div>
            <div class="metric-unit">fps</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 优化建议 -->
    <div class="optimization-suggestions" v-if="optimizationSuggestions.length">
      <h3>💡 智能优化建议</h3>
      <div class="suggestions-list">
        <div
          v-for="suggestion in optimizationSuggestions"
          :key="suggestion.id"
          class="suggestion-card"
          :class="suggestion.priority"
        >
          <div class="suggestion-header">
            <h4>{{ suggestion.title }}</h4>
            <span class="priority-badge">{{ getPriorityText(suggestion.priority) }}</span>
          </div>
          <p class="suggestion-description">{{ suggestion.description }}</p>
          <div class="suggestion-actions">
            <button @click="applySuggestion(suggestion)" class="btn btn-sm btn-primary">
              应用建议
            </button>
            <button @click="dismissSuggestion(suggestion.id)" class="btn btn-sm btn-outline">
              忽略
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { usePerformanceTestSuite } from '@/utils/performanceTestSuite'
import { quickPerformanceCheck } from '@/utils/performanceTestSuite'
import { usePerformanceReporter } from '@/utils/performanceReporter'

// 响应式数据
const isRunningQuickCheck = ref(false)
const quickCheckResult = ref<{
  score: number
  issues: string[]
  recommendations: string[]
} | null>(null)

const realtimeMetrics = ref({
  memoryUsage: 0,
  networkRequests: 0,
  domNodes: 0,
  fps: 0,
})

const memoryHistory = ref<number[]>([])
const performanceScore = ref(85)

// 优化建议
const optimizationSuggestions = ref([
  {
    id: 'virtual-scroll',
    title: '实施虚拟滚动',
    description: '对大列表使用虚拟滚动技术，显著提升渲染性能',
    priority: 'high' as const,
    category: 'performance',
  },
  {
    id: 'code-splitting',
    title: '代码分割优化',
    description: '实施路由级别的代码分割，减少初始包大小',
    priority: 'medium' as const,
    category: 'bundle',
  },
  {
    id: 'image-optimization',
    title: '图片优化',
    description: '使用WebP格式和懒加载技术优化图片加载',
    priority: 'low' as const,
    category: 'assets',
  },
])

// 使用性能测试套件
const testSuite = usePerformanceTestSuite({
  iterations: 5,
  includeComponentTests: true,
  includeNetworkTests: true,
  includeMemoryTests: true,
  generateReport: true,
  exportFormats: ['html', 'json'],
})

const reporter = usePerformanceReporter()

// 计算属性
const overallStatus = computed(() => {
  if (performanceScore.value >= 80) return 'good'
  if (performanceScore.value >= 60) return 'warning'
  return 'error'
})

const overallStatusText = computed(() => {
  if (performanceScore.value >= 80) return '良好'
  if (performanceScore.value >= 60) return '一般'
  return '需要优化'
})

// 方法
const runQuickCheck = async () => {
  isRunningQuickCheck.value = true
  try {
    const result = await quickPerformanceCheck()
    quickCheckResult.value = result
    performanceScore.value = result.score
  } catch (error) {
    console.error('快速检查失败:', error)
  } finally {
    isRunningQuickCheck.value = false
  }
}

const runFullTest = async () => {
  try {
    const result = await testSuite.runFullSuite()
    performanceScore.value = result.summary.overallScore
  } catch (error) {
    console.error('完整测试失败:', error)
  }
}

const saveBaseline = () => {
  if (testSuite.lastSummary.value) {
    // 这里需要从测试结果中提取基准数据
    process.env.NODE_ENV === 'development' && console.log('保存基准数据...')
  }
}

const downloadHTMLReport = () => {
  if (testSuite.lastReport.value) {
    reporter.downloadReport(testSuite.lastReport.value, 'html')
  }
}

const downloadJSONReport = () => {
  if (testSuite.lastReport.value) {
    reporter.downloadReport(testSuite.lastReport.value, 'json')
  }
}

const applySuggestion = (suggestion: any) => {
  process.env.NODE_ENV === 'development' && console.log('应用建议:', suggestion.title)
  // 这里可以集成具体的优化实施逻辑
}

const dismissSuggestion = (id: string) => {
  const index = optimizationSuggestions.value.findIndex(s => s.id === id)
  if (index > -1) {
    optimizationSuggestions.value.splice(index, 1)
  }
}

// 辅助函数
const formatMemory = (bytes: number): string => {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)}MB`
}

const getMemoryTrend = (): 'up' | 'down' | 'stable' => {
  if (memoryHistory.value.length < 2) return 'stable'
  const recent = memoryHistory.value.slice(-2)
  const diff = recent[1] - recent[0]
  const threshold = recent[0] * 0.05 // 5% 变化阈值

  if (diff > threshold) return 'up'
  if (diff < -threshold) return 'down'
  return 'stable'
}

const getScoreClass = (score: number): string => {
  if (score >= 80) return 'good'
  if (score >= 60) return 'warning'
  return 'error'
}

const getScoreDescription = (score: number): string => {
  if (score >= 90) return '性能优秀'
  if (score >= 80) return '性能良好'
  if (score >= 70) return '性能一般'
  if (score >= 60) return '需要优化'
  return '性能较差'
}

const getPriorityText = (priority: string): string => {
  const map = { high: '高', medium: '中', low: '低' }
  return map[priority as keyof typeof map] || priority
}

// 实时监控
let monitoringInterval: NodeJS.Timeout | null = null

const startRealtimeMonitoring = () => {
  monitoringInterval = setInterval(() => {
    // 更新内存使用
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory
      realtimeMetrics.value.memoryUsage = memory.usedJSHeapSize
      memoryHistory.value.push(memory.usedJSHeapSize)

      // 保持历史记录在合理范围内
      if (memoryHistory.value.length > 60) {
        memoryHistory.value = memoryHistory.value.slice(-60)
      }
    }

    // 更新网络请求数
    const resourceEntries = performance.getEntriesByType('resource')
    realtimeMetrics.value.networkRequests = resourceEntries.length

    // 更新DOM节点数
    realtimeMetrics.value.domNodes = document.querySelectorAll('*').length

    // 计算FPS（简化版本）
    const now = performance.now()
    realtimeMetrics.value.fps = Math.round(1000 / 16.67) // 假设60fps
  }, 1000)
}

const stopRealtimeMonitoring = () => {
  if (monitoringInterval) {
    clearInterval(monitoringInterval)
    monitoringInterval = null
  }
}

// 生命周期
onMounted(() => {
  startRealtimeMonitoring()
  // 自动运行快速检查
  runQuickCheck()
})

onUnmounted(() => {
  stopRealtimeMonitoring()
})
</script>

<style scoped>
.performance-monitor {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.monitor-header h2 {
  margin: 0;
  font-size: 24px;
}

.status-indicators {
  display: flex;
  gap: 20px;
  align-items: center;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.status-item.good .status-dot {
  background: #4ade80;
}
.status-item.warning .status-dot {
  background: #fbbf24;
}
.status-item.error .status-dot {
  background: #ef4444;
}

.quick-check-section,
.full-test-section,
.realtime-metrics,
.optimization-suggestions {
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  color: #374151;
  font-size: 18px;
}

.test-controls {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-outline {
  background: transparent;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.quick-check-result {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  align-items: start;
}

.score-display {
  display: flex;
  align-items: center;
  gap: 15px;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  color: white;
}

.score-circle.good {
  background: #10b981;
}
.score-circle.warning {
  background: #f59e0b;
}
.score-circle.error {
  background: #ef4444;
}

.score-details h4 {
  margin: 0 0 5px 0;
  color: #374151;
}

.score-details p {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.issues-recommendations {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.issues h4,
.recommendations h4 {
  margin: 0 0 10px 0;
  color: #374151;
  font-size: 16px;
}

.issues ul,
.recommendations ul {
  margin: 0;
  padding-left: 20px;
}

.issues li {
  color: #dc2626;
  margin-bottom: 5px;
}

.recommendations li {
  color: #059669;
  margin-bottom: 5px;
}

.test-progress {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.test-results {
  margin-top: 20px;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.result-card {
  padding: 15px;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
}

.result-card h4 {
  margin: 0 0 10px 0;
  color: #6b7280;
  font-size: 14px;
  font-weight: normal;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #374151;
}

.metric-value.success {
  color: #10b981;
}
.metric-value.error {
  color: #ef4444;
}

.report-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.metric-card {
  padding: 15px;
  background: #f9fafb;
  border-radius: 8px;
}

.metric-card h4 {
  margin: 0 0 10px 0;
  color: #6b7280;
  font-size: 14px;
}

.metric-display {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 10px;
}

.metric-display .metric-value {
  font-size: 20px;
  font-weight: bold;
  color: #374151;
}

.metric-unit,
.metric-trend {
  font-size: 12px;
  color: #6b7280;
}

.metric-trend.up {
  color: #ef4444;
}
.metric-trend.down {
  color: #10b981;
}

.metric-bar {
  width: 100%;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}

.suggestions-list {
  display: grid;
  gap: 15px;
}

.suggestion-card {
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid;
}

.suggestion-card.high {
  background: #fef2f2;
  border-color: #ef4444;
}

.suggestion-card.medium {
  background: #fffbeb;
  border-color: #f59e0b;
}

.suggestion-card.low {
  background: #f0fdf4;
  border-color: #10b981;
}

.suggestion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.suggestion-header h4 {
  margin: 0;
  color: #374151;
  font-size: 16px;
}

.priority-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.suggestion-card.high .priority-badge {
  background: #ef4444;
}
.suggestion-card.medium .priority-badge {
  background: #f59e0b;
}
.suggestion-card.low .priority-badge {
  background: #10b981;
}

.suggestion-description {
  margin: 0 0 15px 0;
  color: #6b7280;
  line-height: 1.5;
}

.suggestion-actions {
  display: flex;
  gap: 10px;
}
</style>
