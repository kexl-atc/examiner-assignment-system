<template>
  <div class="spin-wheel-container">
    <div class="wheel-wrapper" ref="wheelWrapper" :style="wrapperStyle">
      <canvas
        ref="wheelCanvas"
        :width="size"
        :height="size"
        :style="{ width: size + 'px', height: size + 'px' }"
        class="wheel-canvas"
        :class="{ spinning: isSpinning }"
      ></canvas>
      <div class="wheel-pointer"></div>
    </div>
    <!-- 移除旋转遮罩层以提升性能，转盘旋转本身已足够清晰 -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';

interface Props {
  rooms: string[];
  roomLabels?: string[];
  size?: number;
  colors?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  size: 400,
  colors: () => [],
  roomLabels: () => [],
});

const emit = defineEmits<{
  finished: [index: number];
}>();

const wheelCanvas = ref<HTMLCanvasElement | null>(null);
const wheelWrapper = ref<HTMLDivElement | null>(null);
const isSpinning = ref(false);

const wrapperStyle = computed(() => {
  const pointerHalf = Math.max(10, Math.round(props.size * 0.03));
  const pointerHeight = Math.max(18, Math.round(props.size * 0.065));
  const center = Math.max(22, Math.round(props.size * 0.06));
  return {
    '--wheel-pointer-half': `${pointerHalf}px`,
    '--wheel-pointer-height': `${pointerHeight}px`,
    '--wheel-center-radius': `${center}px`,
  } as Record<string, string>;
});

let currentAngle = 0;
let targetAngle = 0;
let startAngle = 0;
let animationProgress = 0;
let animationDuration = 3000; // 3秒
let animationStartTime = 0;
let animationFrameId: number | null = null;
let selectedIndex = -1;
let stopOvershootDeg = 0;
let maxAnimationTime = 6000;
let animationTimeoutId: number | null = null;

let angleAtTargetUpdateRequest: number | null = null;

let wheelBufferCanvas: HTMLCanvasElement | null = null;
let wheelBufferKey = '';
let expectedWheelBufferKey = '';

const normalizeDeg = (deg: number): number => {
  return ((deg % 360) + 360) % 360;
};

const generateColors = (count: number): string[] => {
  const baseColors = [
    '#4CAF50', '#FFC107', '#9C27B0', '#2196F3', '#F44336',
    '#00BCD4', '#FF5722', '#795548', '#607D8B', '#8BC34A',
    '#FF9800', '#E91E63', '#3F51B5', '#009688', '#CDDC39',
    '#FFEB3B', '#673AB7', '#FFCDD2', '#F8BBD0', '#E1BEE7',
    '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2',
    '#B2DFDB', '#C8E6C9', '#DCEDC8', '#F0F4C3', '#FFF9C4',
    '#FFECB3', '#FFE0B2', '#FFCCBC', '#D7CCC8', '#F5F5F5',
  ];
  
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
};

const getEffectiveColors = (): string[] => {
  if (props.colors.length > 0) {
    return props.colors;
  }
  return generateColors(props.rooms.length);
};

const ensureWheelBuffer = () => {
  if (wheelBufferCanvas && wheelBufferKey === expectedWheelBufferKey) return;

  wheelBufferKey = expectedWheelBufferKey;
  wheelBufferCanvas = document.createElement('canvas');
  wheelBufferCanvas.width = props.size;
  wheelBufferCanvas.height = props.size;

  const ctx = wheelBufferCanvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const centerX = props.size / 2;
  const centerY = props.size / 2;
  const radius = props.size / 2 - 20;
  const sectorAngle = (2 * Math.PI) / props.rooms.length;
  const effectiveColors = getEffectiveColors();

  const fontSize = Math.max(12, Math.round(props.size * 0.032));

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, props.size, props.size);
  ctx.translate(centerX, centerY);

  for (let i = 0; i < props.rooms.length; i++) {
    const startA = i * sectorAngle - Math.PI / 2;
    const endA = (i + 1) * sectorAngle - Math.PI / 2;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startA, endA);
    ctx.closePath();

    ctx.fillStyle = effectiveColors[i % effectiveColors.length];
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate((startA + endA) / 2);
    ctx.translate(radius * 0.7, 0);
    ctx.rotate(Math.PI / 2);

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelText = props.roomLabels[i] || props.rooms[i];
    ctx.fillText(labelText, 0, 0);
    ctx.restore();
  }
};

const drawWheel = () => {
  const canvas = wheelCanvas.value;
  if (!canvas || props.rooms.length === 0) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  ensureWheelBuffer();

  const centerX = props.size / 2;
  const centerY = props.size / 2;
  const centerRadius = Math.max(22, Math.round(props.size * 0.06));

  // 使用白色填充代替clearRect，性能更好
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, props.size, props.size);

  if (wheelBufferCanvas) {
    ctx.save();
    ctx.translate(centerX, centerY);
    const renderAngle = normalizeDeg(currentAngle);
    ctx.rotate((renderAngle * Math.PI) / 180);
    ctx.drawImage(wheelBufferCanvas, -centerX, -centerY);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = Math.max(2, Math.round(props.size * 0.004));
  ctx.stroke();
};

const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeOutQuart = (t: number): number => {
  return 1 - Math.pow(1 - t, 4);
};

const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const smoothDecelerate = (t: number): number => {
  return 1 - Math.pow(1 - t, 4);
};

// 用于跟踪目标角度是否在动画中更新
let targetAngleUpdated = false;
let originalTargetAngle = 0;

const getDesiredRotation = (index: number): number => {
  const sectorAngle = 360 / props.rooms.length;
  return -(index + 0.5) * sectorAngle;
};

const snapAngleToSelected = () => {
  if (selectedIndex < 0 || props.rooms.length === 0) {
    return;
  }
  const desiredRotation = getDesiredRotation(selectedIndex);
  const k = Math.round((currentAngle - desiredRotation) / 360);
  const snapped = k * 360 + desiredRotation;
  const sectorAngle = 360 / props.rooms.length;
  const epsilon = Math.min(0.3, sectorAngle * 0.01);
  currentAngle = normalizeDeg(snapped) + epsilon;
  targetAngle = currentAngle;
};

const animate = (timestamp: number) => {
  if (animationStartTime === 0) {
    animationStartTime = timestamp;
    originalTargetAngle = targetAngle;
    
    if (animationTimeoutId) {
      clearTimeout(animationTimeoutId);
    }
    animationTimeoutId = window.setTimeout(() => {
      if (isSpinning.value && animationFrameId !== null) {
        finishAnimation();
      }
    }, maxAnimationTime);
  }

  const elapsed = timestamp - animationStartTime;
  
  // 当目标角度更新时，平滑过渡而不是重启动画
  if (targetAngleUpdated && targetAngle !== originalTargetAngle) {
    // 保持当前速度，平滑过渡到新目标
    const remainingProgress = 1 - animationProgress;
    startAngle = currentAngle;
    originalTargetAngle = targetAngle;
    // 根据剩余进度计算新的动画时长，保持平滑
    animationDuration = Math.max(2000, 3000 * remainingProgress);
    animationStartTime = timestamp;
    animationProgress = 0;
    targetAngleUpdated = false;
    
    if (animationTimeoutId) {
      clearTimeout(animationTimeoutId);
    }
    animationTimeoutId = window.setTimeout(() => {
      if (isSpinning.value && animationFrameId !== null) {
        finishAnimation();
      }
    }, maxAnimationTime);
  }
  
  animationProgress = Math.min(elapsed / animationDuration, 1);

  // 使用单一平滑的缓动函数，移除回弹效果
  const eased = smoothDecelerate(animationProgress);
  currentAngle = startAngle + (targetAngle - startAngle) * eased;

  drawWheel();

  if (animationProgress < 1) {
    animationFrameId = requestAnimationFrame(animate);
  } else {
    finishAnimation();
  }
};

// 抽取动画结束逻辑
const finishAnimation = () => {
  currentAngle = targetAngle;
  if (selectedIndex >= 0) {
    snapAngleToSelected();
  }
  isSpinning.value = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (animationTimeoutId) {
    clearTimeout(animationTimeoutId);
    animationTimeoutId = null;
  }
  animationStartTime = 0;
  targetAngleUpdated = false;
  drawWheel();
  if (selectedIndex >= 0) {
    emit('finished', selectedIndex);
  }
};

const startPreparing = () => {
  if (isSpinning.value) {
    return;
  }

  ensureWheelBuffer();

  isSpinning.value = true;
  startAngle = currentAngle;
  selectedIndex = -1; // 重置选中索引
  
  // 预旋转：持续旋转直到API返回结果
  const preRotations = 3; // 增加预旋转圈数，给API调用更多时间
  targetAngle = currentAngle + preRotations * 360;
  originalTargetAngle = targetAngle;
  stopOvershootDeg = 0;
  targetAngleUpdated = false;
  
  animationDuration = 4000; // 更长的预旋转时间
  animationProgress = 0;
  animationStartTime = 0;
  
  nextTick(() => {
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(animate);
    }
  });
};

// 旋转到指定索引（API返回后调用）
const spinTo = (index: number) => {
  if (index < 0 || index >= props.rooms.length) {
    console.error(`[SpinWheel] 无效的索引: ${index}, 扇区总数: ${props.rooms.length}`);
    return;
  }

  selectedIndex = index;

  const sectorAngle = 360 / props.rooms.length;
  
  // 转盘绘制时，扇区 0 从 -90°（12点钟方向）开始，顺时针排列
  // 扇区 index 的起始角度 = index * sectorAngle - 90°
  // 扇区 index 的中心角度 = (index + 0.5) * sectorAngle - 90°
  // 扇区 index 的结束角度 = (index + 1) * sectorAngle - 90°
  
  // 指针固定在顶部（12点钟方向，即 -90° 或 270°）
  // 要让扇区 index 的中心对齐到指针，转盘需要旋转的角度：
  // 旋转后：扇区中心角度 + 旋转角度 = -90° (mod 360)
  // 所以：旋转角度 = -90° - 扇区中心角度 (mod 360)
  
  // 计算目标旋转角度（归一化到 [0, 360) 范围）
  let desiredRotation = getDesiredRotation(index);
  desiredRotation = ((desiredRotation % 360) + 360) % 360;

  // 获取当前角度的归一化值
  const currentNorm = ((currentAngle % 360) + 360) % 360;
  
  // 计算从当前角度到目标角度的增量（确保正向旋转）
  let delta = desiredRotation - currentNorm;
  while (delta < 0) delta += 360;

  // 从当前位置继续旋转，至少再转2圈
  const fullRotations = 2;
  const newTargetAngle = currentAngle + fullRotations * 360 + delta;

  // 移除过冲效果，使用平滑减速
  stopOvershootDeg = 0;

  if (isSpinning.value && animationFrameId !== null) {
    // 动画进行中，平滑更新目标
    targetAngle = newTargetAngle;
    targetAngleUpdated = true;
  } else {
    startAngle = currentAngle;
    targetAngle = newTargetAngle;
    animationDuration = 3500; // 稍长的动画时间，更平滑
    animationProgress = 0;
    animationStartTime = 0;
    isSpinning.value = true;
    ensureWheelBuffer();
    animationFrameId = requestAnimationFrame(animate);
  }
};

// 暴露方法给父组件
defineExpose({
  spinTo,
  startPreparing,
});

// 监听rooms变化，重新绘制
watch(
  () => [props.size, props.rooms, props.colors] as const,
  () => {
    expectedWheelBufferKey = `${props.size}|${props.rooms.join('|')}|${props.colors.join('|')}`;
    wheelBufferKey = '';
    nextTick(() => {
      ensureWheelBuffer();
      drawWheel();
    });
  },
  { deep: true, immediate: true }
);

onMounted(() => {
  nextTick(() => {
    drawWheel();
  });
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  if (animationTimeoutId !== null) {
    clearTimeout(animationTimeoutId);
  }
});
</script>

<style scoped>
.spin-wheel-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
}

.wheel-wrapper {
  position: relative;
  display: inline-block;
  /* GPU加速 */
  will-change: transform;
  transform: translateZ(0);
}

.wheel-canvas {
  display: block;
  border-radius: 50%;
  box-shadow: 0 12px 26px rgba(17, 24, 39, 0.16);
  /* GPU加速优化 */
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.wheel-canvas.spinning {
  /* 移除性能消耗大的滤镜，改用轻量级效果 */
  /* filter: brightness(1.08) saturate(1.06); */
}

.wheel-pointer {
  position: absolute;
  top: calc(var(--wheel-pointer-height) * -0.35);
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: var(--wheel-pointer-half) solid transparent;
  border-right: var(--wheel-pointer-half) solid transparent;
  border-top: var(--wheel-pointer-height) solid var(--el-color-primary, #409eff);
  z-index: 10;
  filter: drop-shadow(0 6px 14px rgba(64, 158, 255, 0.35));
}

/* 旋转遮罩层已移除以提升性能 */
</style>

