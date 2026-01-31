<template>
  <div class="real-time-status-monitor">
    <!-- 连接状态卡片 -->
    <div class="status-card connection-status" :class="connectionStatusClass">
      <div class="status-header">
        <div class="status-icon">
          <div
            class="connection-indicator"
            :class="{ connected: isConnected, connecting: isConnecting }"
          ></div>
        </div>
        <div class="status-info">
          <h3>连接状态</h3>
          <p class="status-text">{{ connectionStatusText }}</p>
        </div>
        <div class="status-actions">
          <button
            v-if="!isConnected && !isConnecting"
            @click="handleConnect"
            class="btn btn-primary btn-sm"
          >
            连接
          </button>
          <button v-if="isConnected" @click="handleDisconnect" class="btn btn-secondary btn-sm">
            断开
          </button>
        </div>
      </div>

      <div class="status-details" v-if="syncState.lastSyncTime">
        <div class="detail-item">
          <span class="label">最后同步:</span>
          <span class="value">{{ formatTime(syncState.lastSyncTime) }}</span>
        </div>
        <div class="detail-item" v-if="activeUserCount > 0">
          <span class="label">在线用户:</span>
          <span class="value">{{ activeUserCount }} 人</span>
        </div>
        <div class="detail-item" v-if="syncState.roomId">
          <span class="label">房间ID:</span>
          <span class="value">{{ syncState.roomId }}</span>
        </div>
      </div>

      <!-- 错误信息 -->
      <div class="error-list" v-if="hasErrors">
        <div class="error-header">
          <span class="error-icon">⚠️</span>
          <span>同步错误 ({{ syncState.syncErrors.length }})</span>
          <button @click="clearErrors" class="btn-clear">清除</button>
        </div>
        <div class="error-items">
          <div
            v-for="(error, index) in syncState.syncErrors.slice(-3)"
            :key="index"
            class="error-item"
          >
            {{ error }}
          </div>
        </div>
      </div>
    </div>

    <!-- 排班进度卡片 -->
    <div class="status-card schedule-progress" v-if="scheduleProgress || adaptiveProgress">
      <div class="status-header">
        <div class="status-icon">
          <div class="progress-icon" :class="currentProgressStatus">
            <span v-if="currentProgressStatus === 'started'">🚀</span>
            <span v-else-if="currentProgressStatus === 'in_progress'">⚙️</span>
            <span v-else-if="currentProgressStatus === 'completed'">✅</span>
            <span v-else-if="currentProgressStatus === 'error'">❌</span>
          </div>
        </div>
        <div class="status-info">
          <h3>排班计算</h3>
          <p class="status-text">{{ currentProgressMessage }}</p>
          <!-- 🚀 分级求解级别显示 -->
          <p class="level-badge" v-if="adaptiveProgress?.currentLevel">
            <span class="level-icon" :class="`level-${adaptiveProgress.currentLevel}`">
              <span v-if="adaptiveProgress.currentLevel === 1">⚡</span>
              <span v-else-if="adaptiveProgress.currentLevel === 2">🔥</span>
              <span v-else-if="adaptiveProgress.currentLevel === 3">🏆</span>
            </span>
            <span class="level-text">{{ adaptiveProgress.levelName }}</span>
          </p>
        </div>
        <div class="status-progress">
          <div class="progress-circle">
            <svg viewBox="0 0 36 36" class="circular-chart">
              <path
                class="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="circle"
                :stroke-dasharray="`${currentProgressPercentage}, 100`"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div class="percentage">{{ Math.round(currentProgressPercentage) }}%</div>
          </div>
        </div>
      </div>

      <!-- 🚀 增强的进度详情 -->
      <div class="progress-details">
        <div class="detail-grid">
          <!-- 🚀 进度阶段信息 -->
          <div class="detail-item stage-info">
            <span class="label">当前阶段:</span>
            <span class="value stage-name">{{ progressAnimation.stageName }}</span>
          </div>
          <div class="detail-item" v-if="progressAnimation.estimatedTimeRemaining.value > 0">
            <span class="label">预计剩余:</span>
            <span class="value time-remaining">{{
              formatMilliseconds(progressAnimation.estimatedTimeRemaining.value)
            }}</span>
          </div>
          <div class="detail-item" v-if="progressAnimation.isStuck.value">
            <span class="label">状态:</span>
            <span class="value stuck-indicator">⚠️ 处理复杂约束中...</span>
          </div>

          <!-- 传统信息 -->
          <div class="detail-item" v-if="scheduleProgress?.details?.totalStudents">
            <span class="label">学员总数:</span>
            <span class="value">{{ scheduleProgress.details.totalStudents }}</span>
          </div>
          <div class="detail-item" v-if="scheduleProgress?.details?.scheduledStudents">
            <span class="label">已排班:</span>
            <span class="value">{{ scheduleProgress.details.scheduledStudents }}</span>
          </div>

          <!-- 🚀 分级求解信息 -->
          <div class="detail-item" v-if="adaptiveProgress?.currentScore">
            <span class="label">当前分数:</span>
            <span class="value score-value" :class="getScoreClass(adaptiveProgress.currentScore)">
              {{ adaptiveProgress.currentScore }}
            </span>
          </div>
          <div class="detail-item" v-if="adaptiveProgress?.quality">
            <span class="label">解质量:</span>
            <span class="value quality-badge" :class="getQualityClass(adaptiveProgress.quality)">
              {{ adaptiveProgress.quality }}
            </span>
          </div>
          <div class="detail-item" v-if="adaptiveProgress?.elapsedTime">
            <span class="label">已用时间:</span>
            <span class="value">{{ formatMilliseconds(adaptiveProgress.elapsedTime) }}</span>
          </div>
          <div class="detail-item" v-if="adaptiveProgress?.confidence">
            <span class="label">置信度:</span>
            <span class="value confidence-value"
              >{{ (adaptiveProgress.confidence * 100).toFixed(0) }}%</span
            >
          </div>
          <div class="detail-item" v-if="adaptiveProgress?.assignmentCount">
            <span class="label">已分配:</span>
            <span class="value">{{ adaptiveProgress.assignmentCount }} 个</span>
          </div>
        </div>
      </div>

      <!-- 🚀 级别升级通知 -->
      <div class="level-upgrade-notice" v-if="lastLevelUpgrade">
        <div class="upgrade-header">
          <span class="upgrade-icon">🔄</span>
          <span class="upgrade-text">级别升级</span>
        </div>
        <div class="upgrade-details">
          <div class="upgrade-path">
            <span class="from-level">{{ lastLevelUpgrade.fromLevelName }}</span>
            <span class="arrow">→</span>
            <span class="to-level">{{ lastLevelUpgrade.toLevelName }}</span>
          </div>
          <div class="upgrade-reason">{{ lastLevelUpgrade.reason }}</div>
        </div>
      </div>
    </div>

    <!-- 约束验证进度卡片 -->
    <div class="status-card validation-progress" v-if="validationProgress">
      <div class="status-header">
        <div class="status-icon">
          <div class="validation-icon" :class="validationProgress.status">
            <span v-if="validationProgress.status === 'started'">🔍</span>
            <span v-else-if="validationProgress.status === 'in_progress'">⚡</span>
            <span v-else-if="validationProgress.status === 'completed'">✅</span>
            <span v-else-if="validationProgress.status === 'error'">❌</span>
          </div>
        </div>
        <div class="status-info">
          <h3>约束验证</h3>
          <p class="status-text">
            已验证 {{ validationProgress.validatedCount }} / {{ validationProgress.totalCount }}
          </p>
        </div>
        <div class="status-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: validationProgress.progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ Math.round(validationProgress.progress) }}%</span>
        </div>
      </div>

      <div class="validation-details" v-if="validationProgress.violations.length > 0">
        <div class="violations-summary">
          <span class="violations-count"
            >发现 {{ validationProgress.violations.length }} 个约束违反</span
          >
          <button @click="showViolationDetails = !showViolationDetails" class="btn-toggle">
            {{ showViolationDetails ? '隐藏' : '显示' }}详情
          </button>
        </div>

        <div class="violations-list" v-if="showViolationDetails">
          <div
            v-for="(violation, index) in validationProgress.violations.slice(0, 5)"
            :key="index"
            class="violation-item"
            :class="violation.severity"
          >
            <div class="violation-type">{{ violation.constraintName }}</div>
            <div class="violation-message">{{ violation.message }}</div>
          </div>
          <div v-if="validationProgress.violations.length > 5" class="more-violations">
            还有 {{ validationProgress.violations.length - 5 }} 个违反...
          </div>
        </div>
      </div>
    </div>

    <!-- 活跃用户列表 -->
    <div class="status-card active-users" v-if="syncState.activeUsers.length > 0">
      <div class="status-header">
        <div class="status-icon">
          <span class="users-icon">👥</span>
        </div>
        <div class="status-info">
          <h3>活跃用户</h3>
          <p class="status-text">{{ activeUserCount }} 人在线</p>
        </div>
      </div>

      <div class="users-list">
        <div
          v-for="userId in syncState.activeUsers"
          :key="userId"
          class="user-item"
          :class="{ 'current-user': userId === syncState.userId }"
        >
          <div class="user-avatar">{{ getUserInitials(userId) }}</div>
          <div class="user-name">{{ userId }}</div>
          <div class="user-status online"></div>
        </div>
      </div>
    </div>

    <!-- 系统统计 -->
    <div class="status-card system-stats">
      <div class="status-header">
        <div class="status-icon">
          <span class="stats-icon">📊</span>
        </div>
        <div class="status-info">
          <h3>系统统计</h3>
          <p class="status-text">实时数据概览</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ stats.totalMessages }}</div>
          <div class="stat-label">消息总数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.syncOperations }}</div>
          <div class="stat-label">同步操作</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ formatDuration(stats.uptime) }}</div>
          <div class="stat-label">运行时间</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.cacheSize }}</div>
          <div class="stat-label">缓存条目</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDataSync, MessageType } from '@/services/dataSyncManager'
import {
  scheduleProgressService,
  type ProgressMessage,
  type LevelUpgrade,
} from '../services/scheduleProgressService'
import { useProgressAnimation } from '@/composables/useProgressAnimation'

// 组合式API
const {
  syncState,
  scheduleProgress,
  validationProgress,
  connect,
  disconnect,
  addEventListener,
  removeAllEventListeners,
  isConnected,
  isConnecting,
  hasErrors,
  activeUserCount,
} = useDataSync()

// 响应式数据
const showViolationDetails = ref(false)
const stats = ref({
  totalMessages: 0,
  syncOperations: 0,
  uptime: 0,
  cacheSize: 0,
})

// 🚀 分级求解进度数据
const adaptiveProgress = ref<{
  currentLevel?: number
  levelName?: string
  currentScore?: string
  quality?: string
  elapsedTime?: number
  estimatedRemaining?: number
  confidence?: number
  assignmentCount?: number
} | null>(null)

const lastLevelUpgrade = ref<LevelUpgrade | null>(null)
const progressHistory = ref<ProgressMessage[]>([])

// 🚀 集成平滑进度动画系统
const progressAnimation = useProgressAnimation({
  stages: [
    {
      name: '初始化求解器',
      description: '准备OptaPlanner求解环境...',
      minProgress: 0,
      maxProgress: 10,
      estimatedDuration: 2000,
    },
    {
      name: '分析约束条件',
      description: '解析教师、学员和时间约束...',
      minProgress: 10,
      maxProgress: 25,
      estimatedDuration: 3000,
    },
    {
      name: '构建初始解',
      description: '生成可行的初始排班方案...',
      minProgress: 25,
      maxProgress: 45,
      estimatedDuration: 5000,
    },
    {
      name: '优化求解',
      description: '执行启发式搜索算法...',
      minProgress: 45,
      maxProgress: 85,
      estimatedDuration: 15000,
    },
    {
      name: '精细调优',
      description: '优化解决方案质量...',
      minProgress: 85,
      maxProgress: 96,
      estimatedDuration: 8000,
    },
    {
      name: '生成结果',
      description: '准备最终排班表...',
      minProgress: 96,
      maxProgress: 100,
      estimatedDuration: 2000,
    },
  ],
})

// Props
const props = defineProps<{
  sessionId?: string // 外部传入的sessionId，用于连接WebSocket
}>()

// 计算属性
const connectionStatusClass = computed(() => ({
  'status-connected': isConnected.value,
  'status-connecting': isConnecting.value,
  'status-disconnected': !isConnected.value && !isConnecting.value,
  'status-error': hasErrors.value,
}))

const connectionStatusText = computed(() => {
  if (isConnected.value) return '已连接'
  if (isConnecting.value) return '连接中...'
  if (hasErrors.value) return '连接错误'
  return '未连接'
})

// 🚀 分级求解相关计算属性
const currentProgressStatus = computed(() => {
  if (adaptiveProgress.value) {
    if (adaptiveProgress.value.currentLevel === 3) return 'completed'
    return 'in_progress'
  }
  return scheduleProgress.value?.status || 'started'
})

const currentProgressMessage = computed(() => {
  // 优先显示动画系统的阶段描述
  if (progressAnimation.stageDescription.value && progressAnimation.progressPercentage.value > 0) {
    return progressAnimation.stageDescription.value
  }

  if (adaptiveProgress.value) {
    return `正在${adaptiveProgress.value.levelName}求解中...`
  }
  return scheduleProgress.value?.message || '准备中...'
})

// 🚀 使用平滑动画的进度百分比
const currentProgressPercentage = computed(() => {
  return progressAnimation.progressPercentage.value
})

// 方法
const handleConnect = () => {
  const userId = 'user_' + Math.random().toString(36).substr(2, 9)
  const roomId = 'schedule_room'
  connect(userId, roomId)
}

const handleDisconnect = () => {
  disconnect()
}

const clearErrors = () => {
  syncState.syncErrors.splice(0)
}

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

const getUserInitials = (userId: string) => {
  return userId.substring(0, 2).toUpperCase()
}

// 🚀 分级求解相关方法
const getScoreClass = (score: string) => {
  if (score.includes('-')) {
    const softScore = parseInt(score.split('/')[1] || '0')
    if (softScore >= -20) return 'excellent'
    if (softScore >= -100) return 'good'
    return 'fair'
  }
  return 'perfect'
}

const getQualityClass = (quality: string) => {
  if (quality.includes('完美') || quality.includes('优秀')) return 'excellent'
  if (quality.includes('良好')) return 'good'
  if (quality.includes('可接受')) return 'fair'
  return 'poor'
}

const formatMilliseconds = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${seconds}秒`
}

// WebSocket消息处理
const handleWebSocketMessage = (message: ProgressMessage) => {
  progressHistory.value.push(message)

  switch (message.type) {
    case 'progress':
      const progressData = message.data as any
      adaptiveProgress.value = {
        currentLevel: progressData.currentLevel,
        levelName: progressData.levelName,
        currentScore: progressData.currentScore,
        elapsedTime: progressData.elapsedTime,
        estimatedRemaining: progressData.estimatedRemaining,
      }

      // 🚀 更新平滑进度动画
      if (progressData.elapsedTime && progressData.estimatedRemaining) {
        progressAnimation.setProgressByTime(
          progressData.elapsedTime,
          progressData.elapsedTime + progressData.estimatedRemaining
        )
      } else if (progressData.progress !== undefined) {
        progressAnimation.setProgress(progressData.progress / 100)
      }
      break

    case 'intermediate_result':
      const result = message.data as any
      adaptiveProgress.value = {
        ...adaptiveProgress.value,
        currentScore: result.score,
        quality: result.quality,
        confidence: result.confidence,
        assignmentCount: result.assignmentCount,
        elapsedTime: result.elapsedTime,
      }

      // 🚀 基于中间结果更新进度
      if (result.elapsedTime && result.estimatedTotal) {
        progressAnimation.setProgressByTime(result.elapsedTime, result.estimatedTotal)
      }
      break

    case 'level_upgrade':
      lastLevelUpgrade.value = message.data as LevelUpgrade
      // 3秒后自动隐藏升级通知
      setTimeout(() => {
        lastLevelUpgrade.value = null
      }, 3000)
      break

    case 'final_result':
      // 🚀 最终结果 - 完成进度动画
      process.env.NODE_ENV === 'development' && console.log('✅ 求解完成:', message.data)
      progressAnimation.complete()
      break

    case 'started':
      // 🚀 开始求解 - 重置进度动画
      progressAnimation.reset()
      progressAnimation.setProgress(0.05) // 开始时显示5%
      break

    case 'error':
      // 🚀 错误处理 - 停止进度动画
      console.error('❌ 求解错误:', message.data)
      break
  }
}

// 🚀 监听sessionId变化
watch(
  () => props.sessionId,
  async newSessionId => {
    if (newSessionId) {
      process.env.NODE_ENV === 'development' && console.log('📡 [RealTimeMonitor] 连接WebSocket:', newSessionId)
      try {
        await scheduleProgressService.connect(newSessionId)
        scheduleProgressService.onProgress(handleWebSocketMessage)
      } catch (error) {
        console.error('❌ [RealTimeMonitor] WebSocket连接失败:', error)
      }
    }
  },
  { immediate: true }
)

// 生命周期
onMounted(() => {
  // 添加消息监听器
  addEventListener(MessageType.CONNECT, () => {
    stats.value.totalMessages++
  })

  addEventListener(MessageType.DATA_SYNC, () => {
    stats.value.syncOperations++
    stats.value.totalMessages++
  })

  // 启动统计更新
  const statsInterval = setInterval(() => {
    stats.value.uptime++
    // 这里可以从dataSyncManager获取实际的缓存大小
    stats.value.cacheSize = Math.floor(Math.random() * 50) + 10 // 模拟数据
  }, 1000)

  // 清理定时器
  onUnmounted(() => {
    clearInterval(statsInterval)
    removeAllEventListeners()
    // 🚀 断开WebSocket连接
    scheduleProgressService.disconnect()
  })
})
</script>

<style scoped>
.real-time-status-monitor {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  padding: 20px;
}

.status-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: all 0.3s ease;
}

.status-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.status-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.status-icon {
  flex-shrink: 0;
}

.connection-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ccc;
  position: relative;
}

.connection-indicator.connected {
  background: #4caf50;
  animation: pulse 2s infinite;
}

.connection-indicator.connecting {
  background: #ff9800;
  animation: blink 1s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0.3;
  }
}

.status-info {
  flex: 1;
}

.status-info h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.status-text {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.status-actions {
  flex-shrink: 0;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #1976d2;
  color: white;
}

.btn-primary:hover {
  background: #1565c0;
}

.btn-secondary {
  background: #757575;
  color: white;
}

.btn-secondary:hover {
  background: #616161;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.status-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-item .label {
  font-size: 12px;
  color: #999;
}

.detail-item .value {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.detail-item .value.error {
  color: #f44336;
}

.error-list {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ffebee;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.error-icon {
  font-size: 16px;
}

.btn-clear {
  margin-left: auto;
  padding: 2px 8px;
  background: #ffcdd2;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.error-items {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.error-item {
  padding: 8px;
  background: #ffebee;
  border-radius: 4px;
  font-size: 12px;
  color: #c62828;
}

.progress-circle {
  position: relative;
  width: 60px;
  height: 60px;
}

.circular-chart {
  width: 100%;
  height: 100%;
}

.circle-bg {
  fill: none;
  stroke: #eee;
  stroke-width: 3.8;
}

.circle {
  fill: none;
  stroke: #4caf50;
  stroke-width: 2.8;
  stroke-linecap: round;
  animation: progress 1s ease-in-out;
}

.percentage {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  font-weight: 500;
  color: #666;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.violations-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.violations-count {
  font-size: 14px;
  color: #f44336;
  font-weight: 500;
}

.btn-toggle {
  padding: 4px 8px;
  background: #e3f2fd;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.violations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.violation-item {
  padding: 10px;
  border-radius: 6px;
  border-left: 4px solid #f44336;
}

.violation-item.high {
  background: #ffebee;
  border-left-color: #f44336;
}

.violation-item.medium {
  background: #fff3e0;
  border-left-color: #ff9800;
}

.violation-item.low {
  background: #f3e5f5;
  border-left-color: #9c27b0;
}

.violation-type {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.violation-message {
  font-size: 12px;
  color: #666;
}

.users-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 12px;
}

.user-item.current-user {
  background: #e3f2fd;
  border: 1px solid #1976d2;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #1976d2;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}

.user-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4caf50;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1976d2;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

/* 状态样式 */
.status-connected {
  border-left: 4px solid #4caf50;
}

.status-connecting {
  border-left: 4px solid #ff9800;
}

.status-disconnected {
  border-left: 4px solid #757575;
}

.status-error {
  border-left: 4px solid #f44336;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .real-time-status-monitor {
    grid-template-columns: 1fr;
    padding: 10px;
  }

  .status-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .status-actions {
    align-self: flex-end;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}

/* 🚀 进度阶段样式 */
.stage-info .stage-name {
  font-weight: 600;
  color: #1976d2;
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.time-remaining {
  font-weight: 600;
  color: #4caf50;
  font-family: 'Courier New', monospace;
}

.stuck-indicator {
  color: #ff9800;
  font-weight: 600;
  animation: pulse 2s ease-in-out infinite;
}

/* 🚀 分级求解样式 */
.level-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.level-icon {
  font-size: 18px;
  animation: pulse 2s ease-in-out infinite;
}

.level-icon.level-1 {
  color: #ffd700; /* 金色 */
}

.level-icon.level-2 {
  color: #ff6b6b; /* 红色 */
}

.level-icon.level-3 {
  color: #9b59b6; /* 紫色 */
}

.level-text {
  font-size: 12px;
  font-weight: 600;
  color: #666;
}

/* 分数显示 */
.score-value {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 13px;
}

.score-value.perfect {
  color: #4caf50;
}

.score-value.excellent {
  color: #8bc34a;
}

.score-value.good {
  color: #ff9800;
}

.score-value.fair {
  color: #f44336;
}

/* 质量徽章 */
.quality-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.quality-badge.excellent {
  background: #e8f5e9;
  color: #4caf50;
}

.quality-badge.good {
  background: #fff3e0;
  color: #ff9800;
}

.quality-badge.fair {
  background: #ffebee;
  color: #f44336;
}

.quality-badge.poor {
  background: #f5f5f5;
  color: #999;
}

/* 置信度显示 */
.confidence-value {
  font-weight: 600;
  color: #1976d2;
}

/* 级别升级通知 */
.level-upgrade-notice {
  margin-top: 12px;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
  animation: slideInUp 0.5s ease-out;
}

.upgrade-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 8px;
}

.upgrade-icon {
  font-size: 18px;
  animation: rotate 2s linear infinite;
}

.upgrade-text {
  font-size: 14px;
}

.upgrade-details {
  font-size: 13px;
}

.upgrade-path {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.from-level,
.to-level {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-weight: 500;
}

.arrow {
  font-size: 16px;
  font-weight: bold;
}

.upgrade-reason {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.9;
  line-height: 1.4;
}

/* 动画 */
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes slideInUp {
  0% {
    transform: translateY(20px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
