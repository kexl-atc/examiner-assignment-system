<template>
  <el-dialog
    v-model="visible"
    title="考题配置"
    width="450px"
    @close="handleClose"
  >
    <div class="exam-config">
      <div class="info-section mb-4">
        <el-alert
          title="考题数量配置"
          description="设置系统中有几套考题。分配考官二时，将从配置的考题中随机选择。"
          type="info"
          :closable="false"
        />
      </div>

      <el-card class="current-config-card mb-4">
        <template #header>
          <span>当前配置</span>
        </template>
        <div class="current-config-content">
          <p class="text-lg font-bold text-blue-600">
            当前考题数量：{{ examCount }}套
          </p>
        </div>
      </el-card>

      <el-card class="config-card">
        <template #header>
          <span>设置考题数量</span>
        </template>
        <div class="config-content">
          <p class="mb-3 text-sm text-gray-600">选择系统中的考题套数（1-10套）：</p>
          <div class="spinner-section">
            <span class="mr-2">考题数量：</span>
            <el-input-number
              v-model="examCount"
              :min="1"
              :max="10"
              :step="1"
              size="large"
              style="width: 120px"
            />
            <span class="ml-2">套</span>
          </div>
          <p class="mt-3 text-sm text-gray-500 italic">
            例如：设置为3套时，分配考官二时将随机分配考题一、二、三
          </p>
        </div>
      </el-card>

      <div class="action-buttons mt-4">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps<{
  modelValue: boolean;
  currentCount?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'save': [count: number];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const examCount = ref(2);

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loadCurrentConfig();
  }
});

watch(() => props.currentCount, () => {
  if (props.modelValue) {
    loadCurrentConfig();
  }
});

const loadCurrentConfig = () => {
  examCount.value = props.currentCount || 2;
};

const saveConfig = () => {
  if (examCount.value < 1 || examCount.value > 10) {
    ElMessage.warning('考题数量必须在1-10之间');
    return;
  }
  
  emit('save', examCount.value);
  ElMessage.success(`考题配置已保存！当前设置：${examCount.value}套考题`);
  handleClose();
};

const handleClose = () => {
  visible.value = false;
};
</script>

<style scoped>
.exam-config {
  padding: 10px 0;
}

.info-section {
  margin-bottom: 20px;
}

.current-config-card,
.config-card {
  margin-bottom: 20px;
}

.current-config-content {
  padding: 10px 0;
}

.config-content {
  padding: 10px 0;
}

.spinner-section {
  display: flex;
  align-items: center;
  margin: 15px 0;
}

.action-buttons {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>

