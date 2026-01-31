<template>
  <div class="enhanced-progress-container">
    <!-- 主进度条 -->
    <div class="progress-bar-wrapper">
      <div class="progress-bar">
        <div 
          class="progress-fill"
          :style="{ width: `${currentProgress}%` }"
          :class="{ 'indeterminate': !isDeterministic }"
        ></div>
      </div>
      <div class="progress-text">
        {{ formattedProgress }}%
      </div>
    </div>

    <!-- 阶段信息 -->
    <div class="phase-info">
      <div class="phase-name">{{ phaseInfo.description }}</div>
      <div class="phase-message" v-if="progressMessage">{{ progressMessage }}</div>
    </div>

    <!-- 详细信息（可展开） -->
    <div v-if="detailsVisible" class="details-panel">
      <div class="detail-item">
        <span class="detail-label">已用时间:</span>
        <span class="detail-value">{{ formatElapsedTime(elapsedTime) }}</span>
      </div>
      <div class="detail-item" v-if="stepCount > 0">
        <span class="detail-label">求解步数:</span>
        <span class="detail-value">{{ stepCount }}</span>
      </div>
      <div class="detail-item" v-if="currentScore">
        <span class="detail-label">当前分数:</span>
        <span class="detail-value">{{ currentScore }}</span>
      </div>
    </div>

    <!-- 安慰性信息（长时间运行时显示） -->
    <div v-if="showComfortMessage" class="comfort-message">
      💡 正在进行深度优化，寻找最佳方案...
    </div>

    <!-- 阶段指示器 -->
    <div class="phase-indicators">
      <div 
        v-for="phase in allPhasesStatus" 
        :key="phase.name"
        class="phase-indicator"
        :class="{
          'active': phase.isActive,
          'completed': phase.isCompleted
        }"
      >
        <div class="indicator-dot"></div>
        <div class="indicator-label">{{ phase.description }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSmartProgress } from '../composables/useSmartProgress'

// Props
const props = defineProps<{
  // 可选的外部控制
}>()

// Emits
const emit = defineEmits<{
  (e: 'complete'): void
  (e: 'phaseChange', phase: string): void
}>()

// 使用智能进度管理器
const {
  currentProgress,
  currentPhase,
  progressMessage,
  isDeterministic,
  phaseInfo,
  allPhasesStatus,
  setProgress,
  reset,
} = useSmartProgress()

// 额外状态
const elapsedTime = ref(0)
const stepCount = ref(0)
const currentScore = ref('')
const startTime = ref(Date.now())
const detailsVisible = ref(false)

// 定时器
let elapsedTimer: NodeJS.Timeout | null = null

// 渐进式信息披露
const showComfortMessage = computed(() => elapsedTime.value > 30000)  // 30秒后显示

// 初始化
onMounted(() => {
  // 更新已用时间
  elapsedTimer = setInterval(() => {
    elapsedTime.value = Date.now() - startTime.value
    
    // 5秒后显示详情
    if (elapsedTime.value > 5000 && !detailsVisible.value) {
      detailsVisible.value = true
    }
  }, 1000)
})

// 清理
onUnmounted(() => {
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
  }
})

// 监听阶段变化
watch(() => phaseInfo.value.name, (newPhase, oldPhase) => {
  if (oldPhase && newPhase !== oldPhase) {
    emit('phaseChange', newPhase)
  }
})

// 监听完成
watch(currentProgress, (progress) => {
  if (progress >= 100) {
    emit('complete')
  }
})

// 🔧 格式化进度百分比 - 只显示整数或最多1位小数
const formattedProgress = computed(() => {
  const p = currentProgress.value || 0
  // 如果进度是整数，直接返回
  if (p % 1 === 0) {
    return Math.round(p)
  }
  // 否则保留1位小数
  return Math.round(p * 10) / 10
})

// 格式化时间
function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${seconds}秒`
}

// 暴露方法给父组件
defineExpose({
  setProgress,
  reset,
  updateMetrics: (metrics: {
    stepCount?: number
    score?: string
  }) => {
    if (metrics.stepCount !== undefined) {
      stepCount.value = metrics.stepCount
    }
    if (metrics.score !== undefined) {
      currentScore.value = metrics.score
    }
  },
})
</script>

<style scoped>
.enhanced-progress-container {
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.progress-bar {
  flex: 1;
  height: 24px;
  background: #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
  border-radius: 12px;
}

.progress-fill.indeterminate {
  animation: indeterminate 1.5s ease-in-out infinite;
}

@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.progress-text {
  font-size: 18px;
  font-weight: 600;
  color: #667eea;
  min-width: 50px;
  text-align: right;
}

.phase-info {
  margin-bottom: 16px;
}

.phase-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.phase-message {
  font-size: 14px;
  color: #666;
}

.details-panel {
  background: #f9fafb;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 14px;
}

.detail-label {
  color: #666;
}

.detail-value {
  color: #333;
  font-weight: 500;
}

.comfort-message {
  background: #fffbeb;
  border: 1px solid #fbbf24;
  color: #92400e;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  text-align: center;
}

.phase-indicators {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.phase-indicator {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

.phase-indicator::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: #e5e7eb;
  z-index: -1;
}

.phase-indicator:last-child::after {
  display: none;
}

.indicator-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e5e7eb;
  transition: all 0.3s ease;
}

.phase-indicator.active .indicator-dot {
  width: 16px;
  height: 16px;
  background: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
}

.phase-indicator.completed .indicator-dot {
  background: #10b981;
}

.indicator-label {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  max-width: 100px;
}

.phase-indicator.active .indicator-label {
  color: #667eea;
  font-weight: 600;
}

.phase-indicator.completed .indicator-label {
  color: #10b981;
}
</style>


