<template>
  <div class="dashboard-filter">
    <div class="filter-header">
      <h3 class="filter-title">数据筛选</h3>
      <button class="reset-btn" @click="resetFilters" :disabled="!hasActiveFilters">
        <RotateCcw class="w-4 h-4 mr-1" />
        重置
      </button>
    </div>

    <div class="filter-grid">
      <!-- 时间范围筛选 -->
      <div class="filter-group">
        <label class="filter-label">时间范围</label>
        <select v-model="localFilters.timeRange" class="filter-select">
          <option value="day">今日</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="quarter">本季</option>
          <option value="year">本年</option>
          <option value="custom">自定义</option>
        </select>
      </div>

      <!-- 自定义日期范围 -->
      <div v-if="localFilters.timeRange === 'custom'" class="filter-group">
        <label class="filter-label">开始日期</label>
        <input type="date" v-model="localFilters.startDate" class="filter-input" />
      </div>

      <div v-if="localFilters.timeRange === 'custom'" class="filter-group">
        <label class="filter-label">结束日期</label>
        <input type="date" v-model="localFilters.endDate" class="filter-input" />
      </div>

      <!-- 考官筛选 -->
      <div class="filter-group">
        <label class="filter-label">考官</label>
        <select v-model="localFilters.examinerIds" class="filter-select" multiple>
          <option v-for="examiner in examiners" :key="examiner.id" :value="examiner.id">
            {{ examiner.name }}
          </option>
        </select>
      </div>

      <!-- 考试类型筛选 -->
      <div class="filter-group">
        <label class="filter-label">考试类型</label>
        <select v-model="localFilters.examType" class="filter-select">
          <option value="">全部类型</option>
          <option value="theory">理论考试</option>
          <option value="practice">实操考试</option>
          <option value="interview">面试考核</option>
        </select>
      </div>

      <!-- 科室筛选 -->
      <div class="filter-group">
        <label class="filter-label">科室</label>
        <select v-model="localFilters.departments" class="filter-select" multiple>
          <option value="computer">计算机科学系</option>
          <option value="math">数学系</option>
          <option value="physics">物理系</option>
          <option value="chemistry">化学系</option>
          <option value="biology">生物系</option>
        </select>
      </div>
    </div>

    <div class="filter-actions">
      <button class="btn btn-primary" @click="applyFilters">
        <Filter class="w-4 h-4 mr-2" />
        应用筛选
      </button>

      <button class="btn btn-secondary" @click="exportData">
        <Download class="w-4 h-4 mr-2" />
        导出数据
      </button>
    </div>

    <!-- 活跃筛选标签 -->
    <div v-if="hasActiveFilters" class="active-filters">
      <div class="active-filters-header">
        <span class="active-filters-title">当前筛选条件</span>
      </div>
      <div class="filter-tags">
        <span
          v-if="localFilters.timeRange && localFilters.timeRange !== 'custom'"
          class="filter-tag"
        >
          时间: {{ timeRangeLabels[localFilters.timeRange] }}
          <button @click="removeFilter('timeRange')" class="tag-close">
            <X class="w-3 h-3" />
          </button>
        </span>

        <span
          v-if="localFilters.timeRange === 'custom' && localFilters.startDate"
          class="filter-tag"
        >
          开始: {{ formatDate(localFilters.startDate) }}
          <button @click="removeFilter('startDate')" class="tag-close">
            <X class="w-3 h-3" />
          </button>
        </span>

        <span v-if="localFilters.timeRange === 'custom' && localFilters.endDate" class="filter-tag">
          结束: {{ formatDate(localFilters.endDate) }}
          <button @click="removeFilter('endDate')" class="tag-close">
            <X class="w-3 h-3" />
          </button>
        </span>

        <span
          v-if="localFilters.examinerIds && localFilters.examinerIds.length > 0"
          class="filter-tag"
        >
          考官: {{ localFilters.examinerIds.length }} 人
          <button @click="removeFilter('examinerIds')" class="tag-close">
            <X class="w-3 h-3" />
          </button>
        </span>

        <span v-if="localFilters.examType" class="filter-tag">
          类型: {{ examTypeLabels[localFilters.examType] }}
          <button @click="removeFilter('examType')" class="tag-close">
            <X class="w-3 h-3" />
          </button>
        </span>

        <span
          v-if="localFilters.departments && localFilters.departments.length > 0"
          class="filter-tag"
        >
          科室: {{ localFilters.departments.length }} 个
          <button @click="removeFilter('departments')" class="tag-close">
            <X class="w-3 h-3" />
          </button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Filter, Download, RotateCcw, X } from 'lucide-vue-next'
import { DateUtils as dateUtils } from '../../utils/dateUtils'
import type { DashboardFilter } from '../../types/statistics'

interface Props {
  modelValue: DashboardFilter
  examiners: Array<{ id: string; name: string }>
}

interface Emits {
  (e: 'update:modelValue', value: DashboardFilter): void
  (e: 'filter', value: DashboardFilter): void
  (e: 'export', value: DashboardFilter): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localFilters = ref<DashboardFilter>({ ...props.modelValue })

const timeRangeLabels: Record<string, string> = {
  day: '今日',
  week: '本周',
  month: '本月',
  quarter: '本季',
  year: '本年',
  custom: '自定义',
}

const examTypeLabels: Record<string, string> = {
  theory: '理论考试',
  practice: '实操考试',
  interview: '面试考核',
}

const hasActiveFilters = computed(() => {
  return Object.values(localFilters.value).some(
    value =>
      value !== undefined &&
      value !== '' &&
      value !== null &&
      (Array.isArray(value) ? value.length > 0 : true)
  )
})

watch(
  () => props.modelValue,
  newValue => {
    localFilters.value = { ...newValue }
  }
)

const applyFilters = () => {
  emit('update:modelValue', { ...localFilters.value })
  emit('filter', { ...localFilters.value })
}

const resetFilters = () => {
  localFilters.value = {}
  emit('update:modelValue', {})
  emit('filter', {})
}

const exportData = () => {
  emit('export', { ...localFilters.value })
}

const removeFilter = (key: keyof DashboardFilter) => {
  localFilters.value[key] = undefined
  applyFilters()
}

const formatDate = (dateString: string): string => {
  // 使用dateUtils格式化日期显示
  return dateUtils.toDisplayDate(dateString)
}
</script>

<style scoped>
.dashboard-filter {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  padding: 1.5rem;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.filter-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.reset-btn {
  display: flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
  color: #4b5563;
  border: none;
  background: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  color: #1f2937;
  background: #f3f4f6;
}

.reset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 768px) {
  .filter-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .filter-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .filter-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.filter-select,
.filter-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
}

.filter-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.btn {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.active-filters {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.active-filters-header {
  margin-bottom: 0.5rem;
}

.active-filters-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  background: #dbeafe;
  color: #1e40af;
  font-size: 0.875rem;
  border-radius: 9999px;
}

.tag-close {
  margin-left: 0.25rem;
  color: #3b82f6;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 9999px;
  padding: 0.125rem;
  transition: color 0.2s ease;
}

.tag-close:hover {
  color: #1e40af;
}
</style>
