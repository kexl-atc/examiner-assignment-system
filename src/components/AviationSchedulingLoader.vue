<template>
  <div class="aviation-loader-container">
    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 简化的进度图标 -->
      <div class="simple-icon-container">
        <svg class="spinning-loader" viewBox="0 0 24 24" width="80" height="80">
          <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
        </svg>
      </div>

      <!-- 进度信息 -->
      <div class="progress-info">
        <div class="progress-title">
          <h2>{{ progressTitle }}</h2>
        </div>

        <!-- 进度百分比 - 大号显示 -->
        <div class="progress-percentage-large">{{ formattedProgress }}%</div>

        <!-- 进度条 -->
        <div class="linear-progress-container">
          <div class="linear-progress-bar">
            <div class="linear-progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="assignment-stats">
          <div class="stat-item">
            <span class="stat-number">{{ currentAssignments }}</span>
            <span class="stat-separator">/</span>
            <span class="stat-total">{{ totalAssignments }}</span>
          </div>
          <div class="stat-description">已分配考试</div>
        </div>

        <!-- 状态消息 -->
        <div class="status-message">
          <div class="message-line">{{ statusMessage }}</div>
          <div v-if="scoreInfo" class="score-info">
            <span class="score-item">
              <span class="score-label">硬约束:</span>
              <span class="score-value" :class="{ 'score-good': hardScore === 0 }">{{
                hardScore
              }}</span>
            </span>
            <span class="score-item">
              <span class="score-label">软约束:</span>
              <span class="score-value">{{ formattedSoftScore }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 信息面板 -->
      <div class="info-panels">
        <div class="info-panel" v-for="(panel, index) in infoPanels" :key="index">
          <div class="panel-icon">{{ panel.icon }}</div>
          <div class="panel-content">
            <div class="panel-value">{{ panel.value }}</div>
            <div class="panel-label">{{ panel.label }}</div>
          </div>
        </div>
      </div>

      <!-- 简化的日志显示 -->
      <div v-if="realtimeLogs.length > 0" class="logs-container">
        <div class="logs-title">实时日志</div>
        <div class="logs-list" ref="logsContainerRef">
          <div
            v-for="(log, index) in displayedLogs"
            :key="index"
            class="log-entry"
            :class="`log-${log.type}`"
          >
            <span class="log-time">[{{ log.time }}]</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 完成状态覆盖层 -->
    <transition name="completion-fade">
      <div v-if="isCompleted" class="completion-overlay">
        <div class="completion-content">
          <!-- 成功图标 -->
          <div class="success-icon-container">
            <svg class="success-icon" viewBox="0 0 24 24" width="80" height="80">
              <circle class="success-circle" cx="12" cy="12" r="10" />
              <path class="success-check" d="M7,12L10,15L17,8" />
            </svg>
          </div>

          <!-- 完成标题 -->
          <h2 class="completion-title">✈️ 排班计算完成！</h2>
          <p class="completion-subtitle">系统已为您生成最优排班方案</p>

          <!-- 最终统计信息 -->
          <div class="final-stats">
            <div class="final-stat-card">
              <div class="stat-card-icon">👥</div>
              <div class="stat-card-content">
                <div class="stat-card-value">
                  {{ finalStatistics.assignedStudents || 0 }} /
                  {{ finalStatistics.totalStudents || 0 }}
                </div>
                <div class="stat-card-label">学员分配</div>
              </div>
            </div>

            <div class="final-stat-card">
              <div class="stat-card-icon">📊</div>
              <div class="stat-card-content">
                <div class="stat-card-value">
                  {{ (finalStatistics.completionRate || 0).toFixed(1) }}%
                </div>
                <div class="stat-card-label">完成率</div>
              </div>
            </div>

            <div
              class="final-stat-card"
              :class="{ 'stat-success': finalStatistics.hardConstraintScore === 0 }"
            >
              <div class="stat-card-icon">⚡</div>
              <div class="stat-card-content">
                <div class="stat-card-value">{{ finalStatistics.hardConstraintScore || 0 }}</div>
                <div class="stat-card-label">硬约束</div>
              </div>
            </div>

            <div class="final-stat-card">
              <div class="stat-card-icon">🎯</div>
              <div class="stat-card-content">
                <div class="stat-card-value">{{ formattedFinalSoftScore }}</div>
                <div class="stat-card-label">软约束</div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="completion-actions">
            <button class="view-result-btn" @click="$emit('viewResult')">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="currentColor"
                  d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"
                />
              </svg>
              查看排班结果
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { logService } from '../services/logService'
import { logger } from '../utils/logger'

interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface Props {
  progress?: number
  statusMessage?: string
  currentAssignments?: number
  totalAssignments?: number
  hardScore?: number
  softScore?: number
  realtimeLogs?: LogEntry[]
  isCompleted?: boolean
  finalStatistics?: {
    totalStudents?: number
    assignedStudents?: number
    completionRate?: number
    hardConstraintScore?: number
    softConstraintScore?: number
  }
}

const props = withDefaults(defineProps<Props>(), {
  progress: 0,
  statusMessage: '正在初始化排班系统...',
  currentAssignments: 0,
  totalAssignments: 100,
  hardScore: undefined,
  softScore: undefined,
  realtimeLogs: () => [],
  isCompleted: false,
  finalStatistics: () => ({}),
})

const emit = defineEmits<{
  close: []
  viewResult: []
}>()

// 进度标题
const progressTitle = computed(() => {
  if (props.progress < 10) return '🛫 起飞准备中'
  if (props.progress < 30) return '📡 航线规划中'
  if (props.progress < 50) return '✈️ 航班调度中'
  if (props.progress < 70) return '🎯 优化排班方案'
  if (props.progress < 90) return '📋 完善排班细节'
  return '🏁 即将完成'
})

// 分数信息
const scoreInfo = computed(() => props.hardScore !== undefined || props.softScore !== undefined)

// 格式化软约束得分
const formattedSoftScore = computed(() => {
  if (props.softScore === undefined || props.softScore === null) {
    return '0'
  }
  return Math.abs(props.softScore).toLocaleString()
})

// 格式化最终软约束得分
const formattedFinalSoftScore = computed(() => {
  const score = props.finalStatistics?.softConstraintScore
  if (score === undefined || score === null) {
    return '0'
  }
  return Math.abs(score).toLocaleString()
})

// 🔧 格式化进度百分比 - 只显示整数或最多1位小数
const formattedProgress = computed(() => {
  const p = props.progress || 0
  // 如果进度是整数，直接返回
  if (p % 1 === 0) {
    return Math.round(p)
  }
  // 否则保留1位小数
  return Math.round(p * 10) / 10
})

// 信息面板
const infoPanels = computed(() => {
  // 🔧 格式化进度显示
  const formatProgress = (p: number) => {
    if (p % 1 === 0) {
      return Math.round(p)
    }
    return Math.round(p * 10) / 10
  }
  
  return [
    {
      icon: '👨‍✈️',
      value: props.currentAssignments,
      label: '已分配',
    },
    {
      icon: '📊',
      value: formatProgress(props.progress || 0) + '%',
      label: '完成度',
    },
    {
      icon: '⚡',
      value: props.hardScore === 0 ? '优秀' : '计算中',
      label: '约束状态',
    },
  ]
})

// 日志相关状态
const backendLogs = ref<LogEntry[]>([])
const logUpdateInterval = ref<number | null>(null)

// 合并显示的日志 - 减少到20条
const displayedLogs = computed(() => {
  const realtimeLogs = props.realtimeLogs || []
  const apiLogs = backendLogs.value || []

  if (realtimeLogs.length > 0) {
    return realtimeLogs.slice(-20)
  }

  return apiLogs.slice(-20)
})

// 从后端API获取日志 - 减少获取数量
const fetchBackendLogs = async () => {
  try {
    const logs = await logService.getRecentLogs(20, 'INFO')
    if (logs && logs.length > 0) {
      backendLogs.value = logs.map(
        (log: any) =>
          ({
            time: log.timestamp || log.time || new Date().toISOString(),
            message: log.message || '',
            type: (log.level?.toLowerCase() as LogEntry['type']) || 'info',
          }) as LogEntry
      )
    }
  } catch (error) {
    console.warn('Failed to fetch backend logs:', error)
  }
}

// 启动日志更新 - 延长轮询间隔到5秒
const startLogUpdates = () => {
  fetchBackendLogs()

  logUpdateInterval.value = window.setInterval(() => {
    if (!props.realtimeLogs || props.realtimeLogs.length === 0) {
      fetchBackendLogs()
    }
  }, 5000) // 从3秒改为5秒
}

// 停止日志更新
const stopLogUpdates = () => {
  if (logUpdateInterval.value) {
    clearInterval(logUpdateInterval.value)
    logUpdateInterval.value = null
  }
}

onMounted(() => {
  startLogUpdates()
  logger.debug('性能优化加载器已启动', 'Performance')
})

// 监听排班完成状态
watch(
  () => props.isCompleted,
  completed => {
    if (completed) {
      logger.debug('排班完成，停止日志轮询', 'Performance')
      stopLogUpdates()
    }
  }
)

onUnmounted(() => {
  logger.debug('加载器卸载，清理资源', 'Cleanup')
  stopLogUpdates()
})
</script>

<style scoped>
/* ==================== 性能优化版本 - 移除了所有性能消耗大的效果 ==================== */

.aviation-loader-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  height: auto;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  padding: 20px 0;
  box-sizing: border-box;
}

/* 主内容 */
.main-content {
  position: relative;
  z-index: 1;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  flex: 1;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* 简化的旋转图标 */
.simple-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
}

.spinning-loader {
  animation: spin 1.5s linear infinite;
  color: #3b82f6;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 进度信息 */
.progress-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.progress-title h2 {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

/* 进度百分比 */
.progress-percentage-large {
  font-size: 64px;
  font-weight: 900;
  color: #3b82f6;
  line-height: 1;
  margin: 12px 0;
}

/* 进度条 */
.linear-progress-container {
  width: 100%;
  max-width: 450px;
  margin: 12px 0;
}

.linear-progress-bar {
  position: relative;
  width: 100%;
  height: 12px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.linear-progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 12px;
  transition: width 0.5s ease;
}

/* 统计信息 */
.assignment-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-weight: 700;
}

.stat-number {
  font-size: 32px;
  color: #3b82f6;
}

.stat-separator {
  font-size: 24px;
  color: #64748b;
}

.stat-total {
  font-size: 28px;
  color: #8b5cf6;
}

.stat-description {
  font-size: 14px;
  color: #94a3b8;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* 状态消息 */
.status-message {
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.message-line {
  font-size: 16px;
  color: #e2e8f0;
  margin-bottom: 12px;
}

.score-info {
  display: flex;
  gap: 24px;
  justify-content: center;
  padding: 12px 24px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.score-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-label {
  font-size: 14px;
  color: #94a3b8;
}

.score-value {
  font-size: 16px;
  font-weight: 600;
  color: #f59e0b;
}

.score-value.score-good {
  color: #10b981;
}

/* 信息面板 */
.info-panels {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  max-width: 600px;
}

.info-panel {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  min-width: 140px;
  flex: 1 1 auto;
}

.panel-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.panel-content {
  flex: 1;
}

.panel-value {
  font-size: 18px;
  font-weight: 700;
  color: #3b82f6;
  line-height: 1.2;
}

.panel-label {
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

/* 简化的日志显示 */
.logs-container {
  width: 100%;
  max-width: 700px;
  margin-top: 20px;
}

.logs-title {
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.logs-list {
  max-height: 300px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.log-entry {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #94a3b8;
  opacity: 0.8;
}

.log-time {
  color: #64748b;
  flex-shrink: 0;
}

.log-message {
  color: #e2e8f0;
}

.log-entry.log-success .log-message {
  color: #10b981;
}

.log-entry.log-error .log-message {
  color: #ef4444;
}

.log-entry.log-warning .log-message {
  color: #f59e0b;
}

/* 完成状态覆盖层 */
.completion-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.completion-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px;
  max-width: 800px;
}

.success-icon-container {
  position: relative;
}

.success-icon {
  color: #10b981;
}

.success-circle {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-dasharray: 63;
  stroke-dashoffset: 63;
  animation: drawCircle 0.6s ease forwards;
}

@keyframes drawCircle {
  to {
    stroke-dashoffset: 0;
  }
}

.success-check {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  animation: drawCheck 0.4s 0.6s ease forwards;
}

@keyframes drawCheck {
  to {
    stroke-dashoffset: 0;
  }
}

.completion-title {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.completion-subtitle {
  font-size: 16px;
  color: #94a3b8;
  margin: 0;
}

.final-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  width: 100%;
  margin-top: 20px;
}

.final-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.final-stat-card.stat-success {
  border-color: rgba(16, 185, 129, 0.5);
  background: rgba(16, 185, 129, 0.1);
}

.stat-card-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.stat-card-content {
  flex: 1;
}

.stat-card-value {
  font-size: 20px;
  font-weight: 700;
  color: #3b82f6;
  line-height: 1.2;
}

.final-stat-card.stat-success .stat-card-value {
  color: #10b981;
}

.stat-card-label {
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.completion-actions {
  margin-top: 20px;
}

.view-result-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.view-result-btn:hover {
  transform: translateY(-2px);
  opacity: 0.9;
}

.view-result-btn svg {
  flex-shrink: 0;
}

/* 过渡动画 */
.completion-fade-enter-active,
.completion-fade-leave-active {
  transition: opacity 0.3s ease;
}

.completion-fade-enter-from,
.completion-fade-leave-to {
  opacity: 0;
}

/* 滚动条样式 */
.logs-list::-webkit-scrollbar {
  width: 8px;
}

.logs-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.logs-list::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.5);
  border-radius: 4px;
}

.logs-list::-webkit-scrollbar-thumb:hover {
  background: rgba(59, 130, 246, 0.7);
}
</style>
