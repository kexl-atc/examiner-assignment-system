/**
 * 智能进度管理Composable
 * 基于大厂实践的进度显示优化
 */

import { ref, computed } from 'vue'

export interface ProgressPhase {
  name: string
  description: string
  minProgress: number
  maxProgress: number
  isDeterministic: boolean
}

export interface ProgressOptions {
  estimatedDuration?: number
  enableAdaptive?: boolean
}

export function useSmartProgress(options: ProgressOptions = {}) {
  const { estimatedDuration = 30000, enableAdaptive = true } = options

  // 状态
  const currentProgress = ref(0)
  const currentPhase = ref<ProgressPhase>({
    name: 'init',
    description: '初始化中...',
    minProgress: 0,
    maxProgress: 10,
    isDeterministic: true
  })
  const progressMessage = ref('')
  const isDeterministic = ref(true)
  const startTime = ref<number>(0)
  const totalAssignments = ref(0)
  const actualAssignmentCount = ref(0)

  // 阶段定义
  const phases: ProgressPhase[] = [
    {
      name: 'init',
      description: '初始化求解器...',
      minProgress: 0,
      maxProgress: 10,
      isDeterministic: true
    },
    {
      name: 'construction',
      description: '构造初始解...',
      minProgress: 10,
      maxProgress: 40,
      isDeterministic: true
    },
    {
      name: 'local-search',
      description: '局部搜索优化...',
      minProgress: 40,
      maxProgress: 90,
      isDeterministic: false
    },
    {
      name: 'post-processing',
      description: '后处理中...',
      minProgress: 90,
      maxProgress: 100,
      isDeterministic: true
    }
  ]

  // 计算属性
  const phaseInfo = computed(() => currentPhase.value)
  
  const allPhasesStatus = computed(() => {
    return phases.map(phase => ({
      ...phase,
      isActive: phase.name === currentPhase.value.name,
      isCompleted: phase.maxProgress <= currentProgress.value
    }))
  })

  // 方法
  function setProgress(progress: number, phase?: string, message?: string) {
    // 🔧 优化：平滑进度更新，避免跳跃
    const targetProgress = Math.max(0, Math.min(100, progress))
    const current = currentProgress.value
    
    // 如果进度差距很大，平滑过渡
    if (Math.abs(targetProgress - current) > 10) {
      // 差距大时，每次最多增长5%
      const increment = targetProgress > current ? 5 : -5
      currentProgress.value = Math.max(0, Math.min(100, current + increment))
    } else {
      // 差距小时，直接设置
      currentProgress.value = targetProgress
    }
    
    if (phase) {
      const foundPhase = phases.find(p => p.name === phase)
      if (foundPhase) {
        currentPhase.value = foundPhase
      }
    }
    
    if (message) {
      progressMessage.value = message
    }
    
    // 根据进度自动判断阶段
    if (!phase) {
      for (const p of phases) {
        if (currentProgress.value >= p.minProgress && currentProgress.value < p.maxProgress) {
          currentPhase.value = p
          isDeterministic.value = p.isDeterministic
          break
        }
      }
    }
  }

  function setPhase(phaseName: string) {
    const phase = phases.find(p => p.name === phaseName)
    if (phase) {
      currentPhase.value = phase
      isDeterministic.value = phase.isDeterministic
      currentProgress.value = phase.minProgress
    }
  }

  function setTotalAssignments(count: number) {
    totalAssignments.value = count
  }

  function setActualAssignmentCount(count: number) {
    actualAssignmentCount.value = count
    
    // 在构造阶段，根据实际分配数量更新进度
    if (currentPhase.value.name === 'construction' && totalAssignments.value > 0) {
      const constructionProgress = (count / totalAssignments.value) * 30 + 10 // 10-40%
      setProgress(Math.min(40, constructionProgress))
    }
  }

  function start() {
    startTime.value = Date.now()
    setPhase('construction')
    progressMessage.value = '开始求解...'
  }

  function pause() {
    progressMessage.value = '已暂停'
  }

  function complete() {
    currentProgress.value = 100
    setPhase('post-processing')
    progressMessage.value = '完成'
  }

  function reset() {
    currentProgress.value = 0
    setPhase('init')
    progressMessage.value = ''
    startTime.value = 0
    totalAssignments.value = 0
    actualAssignmentCount.value = 0
  }

  // 向后兼容的属性
  const progress = computed({
    get: () => currentProgress.value,
    set: (value) => setProgress(value)
  })

  const currentStage = computed(() => ({
    value: {
      name: currentPhase.value.name,
      desc: currentPhase.value.description,
      progress: currentProgress.value
    }
  }))

  const estimatedAssignmentCount = computed(() => totalAssignments.value)

  return {
    // 新API
    currentProgress,
    currentPhase,
    progressMessage,
    isDeterministic,
    phaseInfo,
    allPhasesStatus,
    setProgress,
    setPhase,
    setTotalAssignments,
    setActualAssignmentCount,
    start,
    pause,
    complete,
    reset,
    
    // 向后兼容API
    progress,
    currentStage,
    estimatedAssignmentCount
  }
}


