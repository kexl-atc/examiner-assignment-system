<template>
  <div :class="['loading-spinner', size, { 'fullscreen': fullscreen }]">
    <el-icon class="spinner-icon" :size="iconSize">
      <Loading />
    </el-icon>
    <div v-if="text" class="loading-text">{{ text }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'

interface Props {
  size?: 'small' | 'medium' | 'large'
  text?: string
  fullscreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  text: '',
  fullscreen: false,
})

const iconSize = computed(() => {
  switch (props.size) {
    case 'small':
      return 16
    case 'medium':
      return 24
    case 'large':
      return 32
    default:
      return 24
  }
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
}

.loading-spinner.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 9999;
}

.spinner-icon {
  animation: rotate 1s linear infinite;
  color: var(--el-color-primary);
}

.loading-text {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

