<template>
  <div :class="['skeleton-screen', variant, { 'animated': animated }]">
    <!-- 表格骨架屏 -->
    <div v-if="variant === 'table'" class="skeleton-table">
      <div v-for="i in rows" :key="i" class="skeleton-row">
        <div
          v-for="j in columns"
          :key="j"
          class="skeleton-cell"
          :style="{ width: cellWidths[j - 1] || '100px' }"
        ></div>
      </div>
    </div>

    <!-- 卡片骨架屏 -->
    <div v-else-if="variant === 'card'" class="skeleton-card">
      <div v-for="i in rows" :key="i" class="skeleton-card-item">
        <div class="skeleton-card-header"></div>
        <div class="skeleton-card-body">
          <div class="skeleton-line" style="width: 80%"></div>
          <div class="skeleton-line" style="width: 60%"></div>
          <div class="skeleton-line" style="width: 90%"></div>
        </div>
      </div>
    </div>

    <!-- 列表骨架屏 -->
    <div v-else-if="variant === 'list'" class="skeleton-list">
      <div v-for="i in rows" :key="i" class="skeleton-list-item">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line" style="width: 70%"></div>
          <div class="skeleton-line" style="width: 50%"></div>
        </div>
      </div>
    </div>

    <!-- 自定义骨架屏 -->
    <div v-else class="skeleton-custom">
      <div
        v-for="i in rows"
        :key="i"
        class="skeleton-line"
        :style="{ width: lineWidths[i - 1] || '100%' }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'table' | 'card' | 'list' | 'custom'
  rows?: number
  columns?: number
  cellWidths?: string[]
  lineWidths?: string[]
  animated?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'custom',
  rows: 3,
  columns: 4,
  cellWidths: () => [],
  lineWidths: () => [],
  animated: true,
})
</script>

<style scoped>
.skeleton-screen {
  width: 100%;
  padding: 16px;
}

.skeleton-screen.animated .skeleton-line,
.skeleton-screen.animated .skeleton-cell,
.skeleton-screen.animated .skeleton-card-header,
.skeleton-screen.animated .skeleton-card-body,
.skeleton-screen.animated .skeleton-avatar {
  background: linear-gradient(
    90deg,
    var(--el-fill-color-light) 25%,
    var(--el-fill-color) 50%,
    var(--el-fill-color-light) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-line {
  height: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  margin-bottom: 12px;
}

.skeleton-table {
  width: 100%;
}

.skeleton-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.skeleton-cell {
  height: 40px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  flex: 1;
}

.skeleton-card {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.skeleton-card-item {
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
}

.skeleton-card-header {
  height: 120px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  margin-bottom: 12px;
}

.skeleton-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-list-item {
  display: flex;
  gap: 12px;
  align-items: center;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--el-fill-color-light);
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>

