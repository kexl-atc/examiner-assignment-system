import { ref, computed, watch, onUnmounted } from 'vue'

export interface ProgressStage {
  name: string
  description: string
  minProgress: number
  maxProgress: number
  estimatedDuration: number // 毫秒
}

export interface ProgressAnimationOptions {
  stages?: ProgressStage[]
  easingFunction?: (t: number) => number
  updateInterval?: number
  maxStuckTime?: number // 最大停滞时间，超过后强制推进
}

// 默认进度阶段
const DEFAULT_STAGES: ProgressStage[] = [
  {
    name: '初始化',
    description: '准备求解环境...',
    minProgress: 0,
    maxProgress: 15,
    estimatedDuration: 2000,
  },
  {
    name: '数据分析',
    description: '分析约束条件...',
    minProgress: 15,
    maxProgress: 35,
    estimatedDuration: 5000,
  },
  {
    name: '求解计算',
    description: '执行优化算法...',
    minProgress: 35,
    maxProgress: 85,
    estimatedDuration: 15000,
  },
  {
    name: '结果优化',
    description: '优化解决方案...',
    minProgress: 85,
    maxProgress: 95, // 调整到95%，为最终阶段让出空间
    estimatedDuration: 6000, // 相应减少时间
  },
  {
    name: '完成',
    description: '生成最终结果...',
    minProgress: 95,
    maxProgress: 100,
    estimatedDuration: 2000, // 增加最终阶段时间，确保平滑过渡
  },
]

// 缓动函数 - 基于心理学优化的进度曲线
const easeOutQuart = (t: number): number => {
  return 1 - Math.pow(1 - t, 4)
}

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// 智能缓动函数 - 避免95%停滞，优化最终阶段
const smartEasing = (t: number): number => {
  if (t < 0.7) {
    // 前70%使用较慢的缓动
    return easeInOutCubic(t / 0.7) * 0.85
  } else if (t < 0.95) {
    // 70%-95%区间平滑过渡
    const localT = (t - 0.7) / 0.25
    return 0.85 + easeOutQuart(localT) * 0.1
  } else {
    // 95%-100%使用优化的缓动曲线，确保平滑完成
    const localT = (t - 0.95) / 0.05
    // 使用easeOutQuart确保最后5%有加速效果
    const easedLocalT = easeOutQuart(localT)
    return 0.95 + easedLocalT * 0.05
  }
}

export function useProgressAnimation(options: ProgressAnimationOptions = {}) {
  const {
    stages = DEFAULT_STAGES,
    easingFunction = smartEasing,
    updateInterval = 100,
    maxStuckTime = 30000, // 30秒后强制推进
  } = options

  // 响应式状态
  const rawProgress = ref(0) // 原始进度 (0-1)
  const animatedProgress = ref(0) // 动画进度 (0-100)
  const currentStage = ref<ProgressStage>(stages[0])
  const isStuck = ref(false)
  const lastUpdateTime = ref(Date.now())
  const stuckStartTime = ref<number | null>(null)

  // 动画控制
  let animationFrame: number | null = null
  let lastRawProgress = 0
  let targetProgress = 0
  let animationStartTime = 0
  let animationDuration = 1000 // 默认1秒动画时间

  // 计算当前阶段
  const updateCurrentStage = (progress: number) => {
    const progressPercent = progress * 100
    const stage =
      stages.find(s => progressPercent >= s.minProgress && progressPercent <= s.maxProgress) ||
      stages[stages.length - 1]

    if (stage !== currentStage.value) {
      currentStage.value = stage
    }
  }

  // 检测停滞状态
  const checkStuckState = () => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateTime.value

    if (timeSinceLastUpdate > maxStuckTime && rawProgress.value < 1) {
      if (!isStuck.value) {
        isStuck.value = true
        stuckStartTime.value = now
        console.warn('🚨 进度停滞检测：超过最大等待时间，启用强制推进模式')
      }

      // 强制推进逻辑：缓慢增加进度
      const stuckDuration = now - (stuckStartTime.value || now)
      const forceIncrement = Math.min(0.01, stuckDuration / 100000) // 最多每秒增加1%
      rawProgress.value = Math.min(0.99, rawProgress.value + forceIncrement)
    } else if (isStuck.value && timeSinceLastUpdate < 5000) {
      // 恢复正常状态
      isStuck.value = false
      stuckStartTime.value = null
      process.env.NODE_ENV === 'development' && console.log('✅ 进度恢复正常')
    }
  }

  // 动画更新函数
  const updateAnimation = () => {
    const now = Date.now()
    const elapsed = now - animationStartTime
    const progress = Math.min(1, elapsed / animationDuration)

    // 应用缓动函数
    const easedProgress = easingFunction(progress)
    const currentAnimatedProgress =
      lastRawProgress + (targetProgress - lastRawProgress) * easedProgress

    animatedProgress.value = Math.min(100, currentAnimatedProgress * 100)

    // 检查停滞状态
    checkStuckState()

    if (progress < 1) {
      animationFrame = requestAnimationFrame(updateAnimation)
    }
  }

  // 启动动画
  const startAnimation = (newProgress: number) => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }

    lastRawProgress = rawProgress.value
    targetProgress = newProgress
    animationStartTime = Date.now()

    // 根据进度差异调整动画时间
    const progressDiff = Math.abs(targetProgress - lastRawProgress)
    animationDuration = Math.max(500, Math.min(2000, progressDiff * 3000))

    updateAnimation()
  }

  // 设置进度
  const setProgress = (progress: number, forceUpdate = false) => {
    const clampedProgress = Math.max(0, Math.min(1, progress))

    // 防止进度倒退（除非强制更新）
    if (!forceUpdate && clampedProgress < rawProgress.value) {
      return
    }

    rawProgress.value = clampedProgress
    lastUpdateTime.value = Date.now()

    // 更新当前阶段
    updateCurrentStage(clampedProgress)

    // 启动平滑动画
    startAnimation(clampedProgress)
  }

  // 基于时间的进度设置（用于替代原有的时间比例计算）
  const setProgressByTime = (elapsedTime: number, estimatedTotal: number) => {
    if (estimatedTotal <= 0) return

    const rawTimeProgress = elapsedTime / estimatedTotal

    // 应用智能映射，避免95%停滞，优化最终阶段
    let mappedProgress: number

    if (rawTimeProgress < 0.5) {
      // 前50%时间映射到0-60%进度
      mappedProgress = rawTimeProgress * 1.2
    } else if (rawTimeProgress < 0.8) {
      // 50%-80%时间映射到60-85%进度
      mappedProgress = 0.6 + (rawTimeProgress - 0.5) * 0.83
    } else if (rawTimeProgress < 0.95) {
      // 80%-95%时间映射到85-95%进度
      mappedProgress = 0.85 + (rawTimeProgress - 0.8) * 0.67
    } else if (rawTimeProgress < 1.0) {
      // 95%-100%时间映射到95-99.5%进度，保留最后0.5%给complete()函数
      const finalProgress = (rawTimeProgress - 0.95) / 0.05
      // 使用easeOutQuart确保平滑过渡到99.5%
      const easedFinalProgress = easeOutQuart(finalProgress)
      mappedProgress = 0.95 + easedFinalProgress * 0.045 // 95% + 4.5% = 99.5%
    } else {
      // 超过100%时间时，保持在99.5%，等待complete()调用
      mappedProgress = 0.995
    }

    setProgress(mappedProgress)
  }

  // 完成进度 - 优化最终阶段动画
  const complete = () => {
    // 首先确保进度至少到达99.5%
    if (rawProgress.value < 0.995) {
      setProgress(0.995, true)
    }

    // 延迟一点时间后平滑过渡到100%
    setTimeout(() => {
      setProgress(1, true)
      // 再延迟一点时间确保动画完成
      setTimeout(() => {
        animatedProgress.value = 100
      }, 300)
    }, 200)
  }

  // 重置进度
  const reset = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
    rawProgress.value = 0
    animatedProgress.value = 0
    currentStage.value = stages[0]
    isStuck.value = false
    stuckStartTime.value = null
    lastUpdateTime.value = Date.now()
  }

  // 计算属性
  const progressPercentage = computed(() => Math.round(animatedProgress.value))
  const stageDescription = computed(() => currentStage.value.description)
  const stageName = computed(() => currentStage.value.name)

  const estimatedTimeRemaining = computed(() => {
    if (rawProgress.value >= 1) return 0

    const currentStageProgress =
      (animatedProgress.value - currentStage.value.minProgress) /
      (currentStage.value.maxProgress - currentStage.value.minProgress)
    const stageTimeRemaining = currentStage.value.estimatedDuration * (1 - currentStageProgress)

    // 加上后续阶段的预估时间
    const remainingStages = stages.filter(s => s.minProgress > animatedProgress.value)
    const remainingStagesTime = remainingStages.reduce(
      (sum, stage) => sum + stage.estimatedDuration,
      0
    )

    return Math.max(0, stageTimeRemaining + remainingStagesTime)
  })

  // 清理函数
  onUnmounted(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
  })

  return {
    // 状态
    progressPercentage,
    currentStage: computed(() => currentStage.value),
    stageName,
    stageDescription,
    isStuck: computed(() => isStuck.value),
    estimatedTimeRemaining,

    // 方法
    setProgress,
    setProgressByTime,
    complete,
    reset,

    // 原始值（用于调试）
    rawProgress: computed(() => rawProgress.value),
    animatedProgress: computed(() => animatedProgress.value),
  }
}
