<template>
  <div v-if="visible" class="error-feedback-modal-overlay" @click="closeModal">
    <div class="error-feedback-modal" @click.stop>
      <!-- 模态框头部 -->
      <div class="modal-header">
        <div class="header-content">
          <div class="error-icon">
            <component :is="getErrorIcon()" />
          </div>
          <div class="header-text">
            <h3 class="modal-title">{{ getModalTitle() }}</h3>
            <p class="error-summary">{{ errorSummary }}</p>
          </div>
        </div>
        <button class="close-button" @click="closeModal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- 错误详情 -->
      <div class="modal-body">
        <!-- 冲突统计 -->
        <div v-if="conflicts.length > 0" class="conflict-statistics">
          <h4>冲突统计</h4>
          <div class="stats-grid">
            <div class="stat-item critical" v-if="conflictStats.critical > 0">
              <span class="stat-icon">🚨</span>
              <span class="stat-label">严重冲突</span>
              <span class="stat-value">{{ conflictStats.critical }}</span>
            </div>
            <div class="stat-item high" v-if="conflictStats.high > 0">
              <span class="stat-icon">⚠️</span>
              <span class="stat-label">高级冲突</span>
              <span class="stat-value">{{ conflictStats.high }}</span>
            </div>
            <div class="stat-item medium" v-if="conflictStats.medium > 0">
              <span class="stat-icon">⚡</span>
              <span class="stat-label">中级冲突</span>
              <span class="stat-value">{{ conflictStats.medium }}</span>
            </div>
            <div class="stat-item low" v-if="conflictStats.low > 0">
              <span class="stat-icon">ℹ️</span>
              <span class="stat-label">低级冲突</span>
              <span class="stat-value">{{ conflictStats.low }}</span>
            </div>
          </div>
        </div>

        <!-- 冲突详情列表 -->
        <div v-if="conflicts.length > 0" class="conflicts-section">
          <h4>冲突详情</h4>
          <div class="conflicts-list">
            <div
              v-for="conflict in sortedConflicts"
              :key="conflict.id"
              class="conflict-item"
              :class="conflict.severity.toLowerCase()"
            >
              <div class="conflict-header">
                <div class="conflict-info">
                  <span class="conflict-icon">{{ getConflictIcon(conflict.severity) }}</span>
                  <span class="conflict-type">{{ getConflictTypeLabel(conflict.type) }}</span>
                  <span class="conflict-severity">{{ getSeverityLabel(conflict.severity) }}</span>
                </div>
                <button
                  class="expand-button"
                  @click="toggleConflictExpansion(conflict.id)"
                  :class="{ expanded: expandedConflicts.has(conflict.id) }"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
              </div>

              <div class="conflict-description">
                {{ conflict.description }}
              </div>

              <!-- 展开的详细信息 -->
              <div v-if="expandedConflicts.has(conflict.id)" class="conflict-details">
                <div v-if="conflict.affectedEntities.length > 0" class="affected-entities">
                  <h5>受影响的实体：</h5>
                  <ul>
                    <li v-for="entity in conflict.affectedEntities" :key="entity">{{ entity }}</li>
                  </ul>
                </div>

                <div v-if="conflict.suggestedSolutions.length > 0" class="suggested-solutions">
                  <h5>建议解决方案：</h5>
                  <ol>
                    <li v-for="solution in conflict.suggestedSolutions" :key="solution">
                      {{ solution }}
                    </li>
                  </ol>
                </div>

                <div v-if="conflict.autoResolvable" class="auto-resolve">
                  <button class="auto-resolve-button" @click="autoResolveConflict(conflict)">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M13.5 3.5L6 11l-3.5-3.5"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                      />
                    </svg>
                    自动解决此冲突
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 通用解决建议 -->
        <div class="general-suggestions">
          <h4>通用解决建议</h4>
          <div class="suggestions-list">
            <div
              v-for="suggestion in generalSuggestions"
              :key="suggestion.title"
              class="suggestion-item"
            >
              <div class="suggestion-header">
                <span class="suggestion-icon">{{ suggestion.icon }}</span>
                <span class="suggestion-title">{{ suggestion.title }}</span>
              </div>
              <p class="suggestion-description">{{ suggestion.description }}</p>
              <div v-if="suggestion.actions.length > 0" class="suggestion-actions">
                <button
                  v-for="action in suggestion.actions"
                  :key="action.label"
                  class="suggestion-action-button"
                  @click="executeAction(action)"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 模态框底部 -->
      <div class="modal-footer">
        <button class="secondary-button" @click="exportErrorReport">导出错误报告</button>
        <button class="primary-button" @click="closeModal">我知道了</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ConflictInfo } from '@/types/errorFeedback'

interface SuggestionAction {
  label: string
  action: string
  params?: any
}

interface GeneralSuggestion {
  title: string
  icon: string
  description: string
  actions: SuggestionAction[]
}

// Props
interface Props {
  visible: boolean
  errorType: 'constraint_violation' | 'resource_shortage' | 'system_error' | 'validation_error'
  errorMessage: string
  conflicts: ConflictInfo[]
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  errorType: 'system_error',
  errorMessage: '',
  conflicts: () => [],
})

// Emits
const emit = defineEmits<{
  close: []
  autoResolve: [conflict: ConflictInfo]
  executeAction: [action: SuggestionAction]
  exportReport: [data: any]
}>()

// 响应式数据
const expandedConflicts = ref(new Set<string>())

// 计算属性
const errorSummary = computed(() => {
  if (props.conflicts.length === 0) {
    return props.errorMessage || '系统遇到了一个错误'
  }
  return `检测到 ${props.conflicts.length} 个冲突，需要您的注意`
})

const conflictStats = computed(() => {
  const stats = { critical: 0, high: 0, medium: 0, low: 0 }
  props.conflicts.forEach(conflict => {
    switch (conflict.severity) {
      case 'CRITICAL':
        stats.critical++
        break
      case 'HIGH':
        stats.high++
        break
      case 'MEDIUM':
        stats.medium++
        break
      case 'LOW':
        stats.low++
        break
    }
  })
  return stats
})

const sortedConflicts = computed(() => {
  const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
  return [...props.conflicts].sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
})

const generalSuggestions = computed((): GeneralSuggestion[] => {
  const suggestions: GeneralSuggestion[] = []

  if (props.errorType === 'constraint_violation') {
    suggestions.push({
      title: '调整约束配置',
      icon: '⚙️',
      description: '考虑放宽部分软约束的权重，或临时禁用某些非关键约束',
      actions: [
        { label: '打开约束配置', action: 'open_constraint_config' },
        { label: '重置为默认配置', action: 'reset_constraints' },
      ],
    })
  }

  if (props.errorType === 'resource_shortage') {
    suggestions.push({
      title: '增加资源配置',
      icon: '👥',
      description: '检查考官数量和可用时间段，考虑增加备用考官或扩展时间范围',
      actions: [
        { label: '查看考官配置', action: 'view_teachers' },
        { label: '扩展时间范围', action: 'extend_time_range' },
      ],
    })
  }

  suggestions.push({
    title: '联系技术支持',
    icon: '🛠️',
    description: '如果问题持续存在，请联系系统管理员获取专业技术支持',
    actions: [{ label: '生成支持报告', action: 'generate_support_report' }],
  })

  return suggestions
})

// 方法
const getModalTitle = () => {
  const titles = {
    constraint_violation: '约束冲突检测',
    resource_shortage: '资源不足警告',
    system_error: '系统错误',
    validation_error: '数据验证错误',
  }
  return titles[props.errorType] || '系统提示'
}

const getErrorIcon = () => {
  const icons = {
    constraint_violation: 'AlertTriangle',
    resource_shortage: 'Users',
    system_error: 'XCircle',
    validation_error: 'AlertCircle',
  }
  return icons[props.errorType] || 'AlertCircle'
}

const getConflictIcon = (severity: ConflictInfo['severity']) => {
  const icons: Record<ConflictInfo['severity'], string> = {
    CRITICAL: '🚨',
    HIGH: '⚠️',
    MEDIUM: '⚡',
    LOW: 'ℹ️',
  }
  return icons[severity] || 'ℹ️'
}

const getConflictTypeLabel = (type: ConflictInfo['type']) => {
  const labels: Record<ConflictInfo['type'], string> = {
    hard_constraint: '硬约束冲突',
    soft_constraint: '软约束冲突',
    resource_conflict: '资源冲突',
    scheduling_conflict: '排班冲突',
    examiner_time_conflict: '考官时间冲突',
  }
  return labels[type] || type
}

const getSeverityLabel = (severity: ConflictInfo['severity']) => {
  const labels: Record<ConflictInfo['severity'], string> = {
    CRITICAL: '严重',
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
  }
  return labels[severity] || severity
}

const toggleConflictExpansion = (conflictId: string) => {
  if (expandedConflicts.value.has(conflictId)) {
    expandedConflicts.value.delete(conflictId)
  } else {
    expandedConflicts.value.add(conflictId)
  }
}

const autoResolveConflict = (conflict: ConflictInfo) => {
  emit('autoResolve', conflict)
}

const executeAction = (action: SuggestionAction) => {
  emit('executeAction', action)
}

const exportErrorReport = () => {
  const reportData = {
    timestamp: new Date().toISOString(),
    errorType: props.errorType,
    errorMessage: props.errorMessage,
    conflicts: props.conflicts,
    conflictStats: conflictStats.value,
  }
  emit('exportReport', reportData)
}

const closeModal = () => {
  expandedConflicts.value.clear()
  emit('close')
}

// 监听器
watch(
  () => props.visible,
  newVisible => {
    if (!newVisible) {
      expandedConflicts.value.clear()
    }
  }
)
</script>

<style scoped>
.error-feedback-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.error-feedback-modal {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  max-height: 90vh;
  width: 90%;
  overflow: hidden;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
}

.error-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fef2f2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dc2626;
  font-size: 24px;
}

.header-text {
  flex: 1;
}

.modal-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.error-summary {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.close-button {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.conflict-statistics {
  margin-bottom: 24px;
}

.conflict-statistics h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-item {
  padding: 12px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid;
}

.stat-item.critical {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.stat-item.high {
  background: #fffbeb;
  border-color: #fed7aa;
  color: #d97706;
}

.stat-item.medium {
  background: #f0f9ff;
  border-color: #bae6fd;
  color: #0284c7;
}

.stat-item.low {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #059669;
}

.stat-icon {
  font-size: 16px;
}

.stat-label {
  font-size: 14px;
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  margin-left: auto;
}

.conflicts-section {
  margin-bottom: 24px;
}

.conflicts-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.conflicts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conflict-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.conflict-item.critical {
  border-color: #fecaca;
  background: #fef2f2;
}

.conflict-item.high {
  border-color: #fed7aa;
  background: #fffbeb;
}

.conflict-item.medium {
  border-color: #bae6fd;
  background: #f0f9ff;
}

.conflict-item.low {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.conflict-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.conflict-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.conflict-icon {
  font-size: 16px;
}

.conflict-type {
  font-weight: 500;
  color: #374151;
}

.conflict-severity {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.1);
  color: #374151;
}

.expand-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.expand-button:hover {
  background: rgba(0, 0, 0, 0.1);
}

.expand-button.expanded svg {
  transform: rotate(180deg);
}

.conflict-description {
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

.conflict-details {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.conflict-details h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.affected-entities ul,
.suggested-solutions ol {
  margin: 0;
  padding-left: 20px;
  color: #6b7280;
  font-size: 14px;
}

.affected-entities li,
.suggested-solutions li {
  margin-bottom: 4px;
}

.auto-resolve {
  margin-top: 12px;
}

.auto-resolve-button {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.auto-resolve-button:hover {
  background: #059669;
}

.general-suggestions h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.suggestion-item {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.suggestion-icon {
  font-size: 16px;
}

.suggestion-title {
  font-weight: 500;
  color: #374151;
}

.suggestion-description {
  margin: 0 0 12px 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
}

.suggestion-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.suggestion-action-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-action-button:hover {
  background: #2563eb;
}

.modal-footer {
  padding: 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.secondary-button {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-button:hover {
  background: #e5e7eb;
}

.primary-button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-button:hover {
  background: #2563eb;
}
</style>
