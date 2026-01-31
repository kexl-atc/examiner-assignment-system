<template>
  <div class="error-message">
    <el-alert
      :title="title"
      :description="message"
      type="error"
      :closable="closable"
      :show-icon="showIcon"
      @close="handleClose"
    >
      <template v-if="details" #default>
        <div class="error-details">
          <div class="error-main">{{ message }}</div>
          <el-collapse v-if="hasDetails" class="error-collapse">
            <el-collapse-item title="详细信息" name="details">
              <pre class="error-details-content">{{ formattedDetails }}</pre>
            </el-collapse-item>
          </el-collapse>
        </div>
      </template>
    </el-alert>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  message: string
  details?: any
  closable?: boolean
  showIcon?: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '错误',
  closable: true,
  showIcon: true,
})

const emit = defineEmits<Emits>()

const hasDetails = computed(() => {
  return props.details !== undefined && props.details !== null
})

const formattedDetails = computed(() => {
  if (!hasDetails.value) return ''
  
  if (typeof props.details === 'string') {
    return props.details
  }
  
  try {
    return JSON.stringify(props.details, null, 2)
  } catch {
    return String(props.details)
  }
})

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
.error-message {
  margin: 16px 0;
}

.error-details {
  width: 100%;
}

.error-main {
  margin-bottom: 8px;
}

.error-collapse {
  margin-top: 8px;
}

.error-details-content {
  margin: 0;
  padding: 8px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>

