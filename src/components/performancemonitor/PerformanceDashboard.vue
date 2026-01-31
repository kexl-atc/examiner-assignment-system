<template>
  <div class="performance-dashboard">
    <div class="dashboard-header">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">
        <i class="fas fa-tachometer-alt mr-2"></i>
        性能监控仪表板
      </h2>
      <div class="status-indicator" :class="systemStatus.class">
        <span class="status-dot"></span>
        {{ systemStatus.text }}
      </div>
    </div>

    <div class="metrics-grid">
      <!-- 内存使用监控 -->
      <div class="metric-card">
        <div class="metric-header">
          <h3 class="metric-title">内存使用</h3>
          <div class="metric-value" :class="memoryStatus.class">
            {{ memoryMetrics.usagePercent }}%
          </div>
        </div>
        <div class="metric-chart">
          <div class="memory-bar">
            <div 
              class="memory-fill" 
              :style="{ width: memoryMetrics.usagePercent + '%' }"
              :class="memoryStatus.class"
            ></div>
          </div>
          <div class="memory-details">
            <span>已用: {{ formatBytes(memoryMetrics.used) }}</span>
            <span>总计: {{ formatBytes(memoryMetrics.total) }}</span>
          </div>
        </div>
      </div>

      <!-- 求解器状态 -->
      <div class="metric-card">
        <div class="metric-header">
          <h3 class="metric-title">求解器状态</h3>
          <div class="metric-value" :class="solverStatus.class">
            {{ activeSolvers.length }}
          </div>
        </div>
        <div class="solver-list">
          <div 
            v-for="solver in activeSolvers" 
            :key="solver.id"
            class="solver-item"
          >
            <div class="solver-info">
              <span class="solver-name">{{ solver.name }}</span>
              <span class="solver-progress">{{ solver.progress }}%</span>
            </div>
            <div class="solver-progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: solver.progress + '%' }"
              ></div>
            </div>
          </div>
          <div v-if="activeSolvers.length === 0" class="no-solvers">
            暂无活跃求解器
          </div>
        </div>
      </div>

      <!-- 系统性能指标 -->
      <div class="metric-card">
        <div class="metric-header">
          <h3 class="metric-title">系统性能</h3>
          <div class="metric-value text-blue-600">
            {{ performanceMetrics.score }}
          </div>
        </div>
        <div class="performance-details">
          <div class="performance-item">
            <span class="label">CPU使用率:</span>
            <span class="value">{{ performanceMetrics.cpu }}%</span>
          </div>
          <div class="performance-item">
            <span class="label">响应时间:</span>
            <span class="value">{{ performanceMetrics.responseTime }}ms</span>
          </div>
          <div class="performance-item">
            <span class="label">吞吐量:</span>
            <span class="value">{{ performanceMetrics.throughput }}/s</span>
          </div>
        </div>
      </div>

      <!-- 历史趋势图 -->
      <div class="metric-card chart-card">
        <div class="metric-header">
          <h3 class="metric-title">性能趋势</h3>
          <div class="chart-controls">
            <button 
              v-for="period in timePeriods" 
              :key="period.value"
              @click="selectedPeriod = period.value"
              :class="['period-btn', { active: selectedPeriod === period.value }]"
            >
              {{ period.label }}
            </button>
          </div>
        </div>
        <div class="chart-container">
          <canvas ref="trendChart" width="400" height="200"></canvas>
        </div>
      </div>
    </div>

    <!-- 警告和建议 -->
    <div v-if="alerts.length > 0" class="alerts-section">
      <h3 class="alerts-title">系统警告</h3>
      <div class="alerts-list">
        <div 
          v-for="alert in alerts" 
          :key="alert.id"
          :class="['alert-item', alert.type]"
        >
          <i :class="alert.icon"></i>
          <div class="alert-content">
            <div class="alert-message">{{ alert.message }}</div>
            <div class="alert-suggestion">{{ alert.suggestion }}</div>
          </div>
          <button @click="dismissAlert(alert.id)" class="alert-dismiss">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

// 响应式数据
const memoryMetrics = reactive({
  used: 0,
  total: 0,
  usagePercent: 0
})

const performanceMetrics = reactive({
  cpu: 0,
  responseTime: 0,
  throughput: 0,
  score: 'A+'
})

interface SolverInfo {
  id: string
  name: string
  progress: number
}

interface AlertInfo {
  id: string
  type: string
  icon: string
  message: string
  suggestion: string
}

const activeSolvers = ref<SolverInfo[]>([])
const alerts = ref<AlertInfo[]>([])
const selectedPeriod = ref('1h')
const trendChart = ref<HTMLCanvasElement | null>(null)

// 时间周期选项
const timePeriods = [
  { label: '1小时', value: '1h' },
  { label: '6小时', value: '6h' },
  { label: '24小时', value: '24h' },
  { label: '7天', value: '7d' }
]

// 计算属性
const systemStatus = computed(() => {
  if (memoryMetrics.usagePercent > 90) {
    return { class: 'status-critical', text: '系统负载过高' }
  } else if (memoryMetrics.usagePercent > 70) {
    return { class: 'status-warning', text: '系统负载较高' }
  } else {
    return { class: 'status-normal', text: '系统运行正常' }
  }
})

const memoryStatus = computed(() => {
  if (memoryMetrics.usagePercent > 90) {
    return { class: 'text-red-600 bg-red-100' }
  } else if (memoryMetrics.usagePercent > 70) {
    return { class: 'text-yellow-600 bg-yellow-100' }
  } else {
    return { class: 'text-green-600 bg-green-100' }
  }
})

const solverStatus = computed(() => {
  const count = activeSolvers.value.length
  if (count > 3) {
    return { class: 'text-red-600' }
  } else if (count > 1) {
    return { class: 'text-yellow-600' }
  } else {
    return { class: 'text-green-600' }
  }
})

// 方法
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const updateMetrics = async () => {
  try {
    // 模拟获取性能数据
    const response = await fetch('/api/performance/metrics')
    if (response.ok) {
      const data = await response.json()
      
      // 更新内存指标
      memoryMetrics.used = data.memory.used
      memoryMetrics.total = data.memory.total
      memoryMetrics.usagePercent = Math.round((data.memory.used / data.memory.total) * 100)
      
      // 更新性能指标
      performanceMetrics.cpu = data.cpu
      performanceMetrics.responseTime = data.responseTime
      performanceMetrics.throughput = data.throughput
      performanceMetrics.score = data.score
      
      // 更新求解器状态
      activeSolvers.value = data.solvers || []
      
      // 检查警告
      checkAlerts(data)
    }
  } catch (error) {
    console.error('获取性能指标失败:', error)
    // 使用模拟数据
    updateMockMetrics()
  }
}

const updateMockMetrics = () => {
  // 模拟数据更新
  memoryMetrics.used = Math.random() * 1000 * 1024 * 1024 // 随机内存使用
  memoryMetrics.total = 2048 * 1024 * 1024 // 2GB总内存
  memoryMetrics.usagePercent = Math.round((memoryMetrics.used / memoryMetrics.total) * 100)
  
  performanceMetrics.cpu = Math.round(Math.random() * 100)
  performanceMetrics.responseTime = Math.round(Math.random() * 1000)
  performanceMetrics.throughput = Math.round(Math.random() * 100)
  
  // 模拟求解器数据
  const solverCount = Math.floor(Math.random() * 3)
  activeSolvers.value = Array.from({ length: solverCount }, (_, i) => ({
    id: `solver-${i}`,
    name: `求解器-${i + 1}`,
    progress: Math.round(Math.random() * 100)
  }))
}

const checkAlerts = (data: any) => {
  const newAlerts = []
  
  if (memoryMetrics.usagePercent > 90) {
    newAlerts.push({
      id: 'memory-high',
      type: 'critical',
      icon: 'fas fa-exclamation-triangle',
      message: '内存使用率过高',
      suggestion: '建议清理缓存或增加内存配置'
    })
  }
  
  if (activeSolvers.value.length > 3) {
    newAlerts.push({
      id: 'solver-overload',
      type: 'warning',
      icon: 'fas fa-cogs',
      message: '并发求解器过多',
      suggestion: '建议限制同时运行的求解器数量'
    })
  }
  
  if (performanceMetrics.responseTime > 5000) {
    newAlerts.push({
      id: 'response-slow',
      type: 'warning',
      icon: 'fas fa-clock',
      message: '系统响应时间过长',
      suggestion: '建议检查网络连接和服务器负载'
    })
  }
  
  alerts.value = newAlerts
}

const dismissAlert = (alertId: string) => {
  alerts.value = alerts.value.filter(alert => alert.id !== alertId)
}

const initChart = () => {
  if (!trendChart.value) return

  new Chart(trendChart.value, {
    type: 'line',
    data: {
      labels: Array.from({ length: 20 }, (_, i) => `${i * 5}min`),
      datasets: [
        {
          label: '内存使用率',
          data: Array.from({ length: 20 }, () => Math.random() * 100),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'CPU使用率',
          data: Array.from({ length: 20 }, () => Math.random() * 100),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100
        }
      }
    }
  })
}

// 生命周期
let updateInterval: NodeJS.Timeout

onMounted(async () => {
  await nextTick()
  initChart()
  updateMetrics()
  updateInterval = setInterval(updateMetrics, 5000) // 每5秒更新一次
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped>
.performance-dashboard {
  @apply p-6 bg-gray-50 dark:bg-gray-900 min-h-screen;
}

.dashboard-header {
  @apply flex justify-between items-center mb-6;
}

.status-indicator {
  @apply flex items-center px-3 py-1 rounded-full text-sm font-medium;
}

.status-normal {
  @apply bg-green-100 text-green-800;
}

.status-warning {
  @apply bg-yellow-100 text-yellow-800;
}

.status-critical {
  @apply bg-red-100 text-red-800;
}

.status-dot {
  @apply w-2 h-2 rounded-full mr-2;
  background-color: currentColor;
}

.metrics-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6;
}

.metric-card {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4;
}

.chart-card {
  @apply lg:col-span-2;
}

.metric-header {
  @apply flex justify-between items-center mb-4;
}

.metric-title {
  @apply text-sm font-medium text-gray-600 dark:text-gray-400;
}

.metric-value {
  @apply text-2xl font-bold;
}

.memory-bar {
  @apply w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2;
}

.memory-fill {
  @apply h-full transition-all duration-300 rounded-full;
}

.memory-details {
  @apply flex justify-between text-xs text-gray-500 dark:text-gray-400;
}

.solver-list {
  @apply space-y-2;
}

.solver-item {
  @apply p-2 bg-gray-50 dark:bg-gray-700 rounded;
}

.solver-info {
  @apply flex justify-between text-sm mb-1;
}

.solver-progress-bar {
  @apply w-full h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-blue-500 transition-all duration-300;
}

.no-solvers {
  @apply text-center text-gray-500 dark:text-gray-400 text-sm py-4;
}

.performance-details {
  @apply space-y-2;
}

.performance-item {
  @apply flex justify-between text-sm;
}

.label {
  @apply text-gray-600 dark:text-gray-400;
}

.value {
  @apply font-medium text-gray-900 dark:text-white;
}

.chart-controls {
  @apply flex space-x-2;
}

.period-btn {
  @apply px-3 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors;
}

.period-btn.active {
  @apply bg-blue-500 text-white border-blue-500;
}

.chart-container {
  @apply h-48;
}

.alerts-section {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4;
}

.alerts-title {
  @apply text-lg font-medium text-gray-900 dark:text-white mb-4;
}

.alerts-list {
  @apply space-y-3;
}

.alert-item {
  @apply flex items-start p-3 rounded-lg border;
}

.alert-item.critical {
  @apply bg-red-50 border-red-200 text-red-800;
}

.alert-item.warning {
  @apply bg-yellow-50 border-yellow-200 text-yellow-800;
}

.alert-content {
  @apply flex-1 ml-3;
}

.alert-message {
  @apply font-medium;
}

.alert-suggestion {
  @apply text-sm opacity-75 mt-1;
}

.alert-dismiss {
  @apply ml-3 p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors;
}
</style>