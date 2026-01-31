<template>
  <!-- 弹窗遮罩层 -->
  <div v-if="violations.length > 0" class="violation-modal-overlay" @click="handleOverlayClick">
    <div class="constraint-violation-modal" @click.stop>
      <!-- 弹窗头部 -->
      <div class="modal-header">
        <div class="alert-header">
          <AlertTriangle class="w-5 h-5 text-red-500" />
          <h3 class="alert-title">约束违反提醒</h3>
        </div>
        <button @click="$emit('dismiss')" class="close-button" title="关闭">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 新增：汇总统计区域 -->
      <div class="violation-summary" v-if="violationStats">
        <div class="summary-item">
          <span class="summary-label">总计问题:</span>
          <span class="summary-value">{{ violationStats.total }}个</span>
        </div>
        <div class="summary-item" v-if="violationStats.high > 0">
          <span class="summary-label">严重:</span>
          <span class="summary-value critical">{{ violationStats.high }}个</span>
        </div>
        <div class="summary-item" v-if="violationStats.medium > 0">
          <span class="summary-label">中等:</span>
          <span class="summary-value warning">{{ violationStats.medium }}个</span>
        </div>
        <div class="summary-item" v-if="violationStats.low > 0">
          <span class="summary-label">轻微:</span>
          <span class="summary-value info">{{ violationStats.low }}个</span>
        </div>
      </div>

      <!-- 弹窗内容 -->
      <div class="modal-content">
        <div class="violations-list">
          <div
            v-for="violation in violations"
            :key="violation.id"
            class="violation-item"
            :class="`violation-${violation.type}`"
          >
            <div class="violation-icon">
              <Calendar v-if="violation.type === 'holiday'" class="w-4 h-4" />
              <Clock v-else-if="violation.type === 'weekend'" class="w-4 h-4" />
              <Users v-else-if="violation.type === 'teacher'" class="w-4 h-4" />
              <AlertCircle v-else class="w-4 h-4" />
            </div>

            <div class="violation-content">
              <div class="violation-title">{{ violation.title }}</div>
              <div class="violation-message">{{ violation.message }}</div>

              <!-- 显示统计信息（如果有） -->
              <div v-if="violation.stats" class="violation-stats">
                <span class="stats-item">总计: {{ violation.stats.total }}</span>
                <span v-if="violation.stats.critical > 0" class="stats-item critical"
                  >严重: {{ violation.stats.critical }}</span
                >
                <span v-if="violation.stats.minor > 0" class="stats-item minor"
                  >轻微: {{ violation.stats.minor }}</span
                >
              </div>

              <div v-if="violation.details" class="violation-details">
                <div v-for="detail in violation.details" :key="detail" class="detail-item">
                  • {{ detail }}
                </div>
              </div>
              <div v-if="violation.suggestion" class="violation-suggestion">
                <strong>建议：</strong>{{ violation.suggestion }}
              </div>
            </div>

            <button
              v-if="violation.fixable"
              @click="$emit('fix-violation', violation)"
              class="fix-button"
              :title="`修复${violation.title}`"
            >
              <Wrench class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="alert-actions">
          <button @click="$emit('fix-all')" class="btn-fix-all" v-if="hasFixableViolations">
            批量修复
          </button>
          <button @click="$emit('dismiss')" class="btn-dismiss">我知道了</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, Calendar, Clock, Users, AlertCircle, Wrench, X } from 'lucide-vue-next'
import { computed } from 'vue'

interface ConstraintViolation {
  id: string
  type: 'holiday' | 'weekend' | 'teacher' | 'workload' | 'department' | 'other' | 'info'
  severity: 'high' | 'medium' | 'low'
  title: string
  message: string
  details?: string[]
  suggestion?: string
  affectedDates?: string[]
  affectedTeachers?: string[]
  affectedStudents?: string[]
  fixable?: boolean
  stats?: {
    total: number
    critical: number
    minor: number
  }
}

interface Props {
  violations: ConstraintViolation[]
}

const props = defineProps<Props>()

defineEmits<{
  'fix-violation': [violation: ConstraintViolation]
  'fix-all': []
  dismiss: []
}>()

// 计算违反统计信息
const violationStats = computed(() => {
  if (props.violations.length === 0) return null

  const stats = {
    total: props.violations.length,
    high: props.violations.filter(v => v.severity === 'high').length,
    medium: props.violations.filter(v => v.severity === 'medium').length,
    low: props.violations.filter(v => v.severity === 'low').length,
  }

  return stats
})

// 检查是否有可修复的违反
const hasFixableViolations = computed(() => {
  return props.violations.some(v => v.fixable)
})

// 处理遮罩层点击
const handleOverlayClick = () => {
  // 点击遮罩层关闭弹窗
  // 可以选择是否允许点击遮罩层关闭，这里先禁用
  // emit('dismiss')
}
</script>

<script lang="ts">
import { holidayService } from '../services/holidayService'

export interface ConstraintViolation {
  id: string
  type: 'holiday' | 'weekend' | 'teacher' | 'workload' | 'department' | 'other' | 'info'
  severity: 'high' | 'medium' | 'low' | 'error' | 'warning' | 'hard' | 'soft'
  title: string
  message: string
  description?: string
  count?: number
  details?: string[]
  suggestion?: string
  affectedDates?: string[]
  affectedTeachers?: string[]
  affectedStudents?: string[]
  fixable?: boolean
  stats?: {
    total: number
    critical: number
    minor: number
  }
  relatedDate?: string
  relatedStudent?: string
  relatedTeacher?: string
  constraintName?: string
  constraint?: string
  affectedEntities?: string[]
}

// 创建节假日违反提示
export function createHolidayViolation(dates: string[]): ConstraintViolation {
  const holidayDates = dates.filter(date => holidayService.isHoliday(date))

  if (holidayDates.length === 0) {
    return {
      id: 'no-holiday-violation',
      type: 'other',
      severity: 'low',
      title: '无节假日违反',
      message: '所选日期不包含节假日',
    }
  }

  const holidayDetails = holidayDates.map(date => {
    const holidayInfo = holidayService.getHolidayInfo(date)
    return `${date}（${holidayInfo?.name || '节假日'}）`
  })

  return {
    id: 'holiday-violation',
    type: 'holiday',
    severity: 'high',
    title: 'HC2约束违反：法定节假日不安排考试',
    message: holidayService.getMultipleHolidayViolationMessage(holidayDates),
    details: holidayDetails,
    suggestion: '请选择工作日进行考试安排，避开所有法定节假日',
    affectedDates: holidayDates,
    fixable: true,
  }
}

// 创建周末违反提示
export function createWeekendViolation(
  dates: string[],
  hasAdminExaminers: boolean = false
): ConstraintViolation {
  const weekendDates = dates.filter(date => {
    const dayOfWeek = new Date(date).getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
  })

  if (weekendDates.length === 0) {
    return {
      id: 'no-weekend-violation',
      type: 'other',
      severity: 'low',
      title: '无周末违反',
      message: '所选日期不包含周末',
    }
  }

  const weekendDetails = weekendDates.map(date => {
    const dayOfWeek = new Date(date).getDay()
    const dayName = dayOfWeek === 0 ? '周日' : '周六'
    return `${date}（${dayName}）`
  })

  // 如果有行政班考官参与周末考试，则为违反约束
  if (hasAdminExaminers) {
    return {
      id: 'weekend-admin-violation',
      type: 'weekend',
      severity: 'high',
      title: 'HC1约束违反：行政班考官周末不参加考试',
      message: `行政班考官（工作日上班，不受四班组轮班制度限制）在周末不能参与考试：${weekendDetails.join('、')}`,
      details: weekendDetails,
      suggestion: '请为周末考试安排四班组考官（一组、二组、三组、四组），或将考试调整到工作日',
      affectedDates: weekendDates,
      fixable: true,
    }
  }

  // 周末考试本身是允许的，只是提醒
  return {
    id: 'weekend-info',
    type: 'info',
    severity: 'low',
    title: '周末考试安排',
    message: `已安排周末考试：${weekendDetails.join('、')}`,
    details: weekendDetails,
    suggestion: '周末考试已安排，请确保考官非行政人员',
    affectedDates: weekendDates,
    fixable: false,
  }
}

// 创建主考官不足违反提示
export function createInsufficientExaminersViolation(assignments: any[]): ConstraintViolation {
  // 更严格的验证逻辑，避免误报
  const incompleteAssignments = assignments.filter(assignment => {
    // 跳过空或无效的分配
    if (!assignment || !assignment.studentName) {
      return false
    }

    // 检查是否缺少主考官 - 更准确的验证
    const hasExaminer1 =
      assignment.examiner1 &&
      assignment.examiner1 !== '未分配' &&
      assignment.examiner1 !== '未分组' &&
      assignment.examiner1 !== null &&
      assignment.examiner1 !== undefined &&
      (typeof assignment.examiner1 === 'string' ? assignment.examiner1.trim() !== '' : true)

    const hasExaminer2 =
      assignment.examiner2 &&
      assignment.examiner2 !== '未分配' &&
      assignment.examiner2 !== '未分组' &&
      assignment.examiner2 !== null &&
      assignment.examiner2 !== undefined &&
      (typeof assignment.examiner2 === 'string' ? assignment.examiner2.trim() !== '' : true)

    // 只有当两个考官都缺失时才认为是严重违反
    const isCritical = !hasExaminer1 && !hasExaminer2
    // 或者只缺一个考官但是是必需的
    const isMissing = !hasExaminer1 || !hasExaminer2

    return isMissing
  })

  // 如果没有违反，返回成功状态
  if (incompleteAssignments.length === 0) {
    return {
      id: 'no-examiner-violation',
      type: 'other',
      severity: 'low',
      title: '主考官配备完整',
      message: '所有学员都已配备两名主考官',
    }
  }

  // 分类违反严重程度
  const criticalViolations = incompleteAssignments.filter(assignment => {
    const hasExaminer1 =
      assignment.examiner1 && assignment.examiner1 !== '未分配' && assignment.examiner1 !== '未分组'
    const hasExaminer2 =
      assignment.examiner2 && assignment.examiner2 !== '未分配' && assignment.examiner2 !== '未分组'
    return !hasExaminer1 && !hasExaminer2 // 两个考官都缺失
  })

  const minorViolations = incompleteAssignments.filter(assignment => {
    const hasExaminer1 =
      assignment.examiner1 && assignment.examiner1 !== '未分配' && assignment.examiner1 !== '未分组'
    const hasExaminer2 =
      assignment.examiner2 && assignment.examiner2 !== '未分配' && assignment.examiner2 !== '未分组'
    return (hasExaminer1 && !hasExaminer2) || (!hasExaminer1 && hasExaminer2) // 只缺一个考官
  })

  // 只显示最多5个具体违反详情，避免信息过载
  const maxDetailsToShow = 5
  const violationDetails = incompleteAssignments.slice(0, maxDetailsToShow).map(assignment => {
    const missing = []
    if (
      !assignment.examiner1 ||
      assignment.examiner1 === '未分配' ||
      assignment.examiner1 === '未分组' ||
      assignment.examiner1 === null ||
      assignment.examiner1 === undefined ||
      (typeof assignment.examiner1 === 'string' && assignment.examiner1.trim() === '')
    ) {
      missing.push('考官一')
    }
    if (
      !assignment.examiner2 ||
      assignment.examiner2 === '未分配' ||
      assignment.examiner2 === '未分组' ||
      assignment.examiner2 === null ||
      assignment.examiner2 === undefined ||
      (typeof assignment.examiner2 === 'string' && assignment.examiner2.trim() === '')
    ) {
      missing.push('考官二')
    }
    return `${assignment.studentName}缺少${missing.join('、')}`
  })

  // 如果违反数量很多，添加省略提示
  if (incompleteAssignments.length > maxDetailsToShow) {
    violationDetails.push(
      `...还有${incompleteAssignments.length - maxDetailsToShow}个学员存在类似问题`
    )
  }

  // 根据严重程度确定标题和严重性
  const severity = criticalViolations.length > 0 ? 'high' : 'medium'
  const title =
    criticalViolations.length > 0 ? 'HC2约束违反：主考官严重不足' : 'HC2约束违反：部分主考官缺失'

  let message = ''
  if (criticalViolations.length > 0) {
    message = `发现${criticalViolations.length}个学员完全缺少主考官，${minorViolations.length}个学员部分缺少主考官`
  } else {
    message = `发现${incompleteAssignments.length}个学员部分缺少主考官配备`
  }

  return {
    id: 'main-examiners-violation',
    type: 'teacher',
    severity,
    title,
    message,
    details: violationDetails,
    suggestion: '请为所有学员分配足够的主考官。考官一必须与学员同科室，考官二必须与学员不同科室。',
    affectedStudents: incompleteAssignments.map(a => a.studentName || a.student),
    fixable: true,
    // 添加统计信息
    stats: {
      total: incompleteAssignments.length,
      critical: criticalViolations.length,
      minor: minorViolations.length,
    },
  }
}

// 新增：约束违反过滤和合并函数
export function filterAndMergeViolations(violations: ConstraintViolation[]): ConstraintViolation[] {
  // 过滤掉低严重性的违反（除非没有其他违反）
  const highPriorityViolations = violations.filter(v => v.severity === 'high')
  const mediumPriorityViolations = violations.filter(v => v.severity === 'medium')
  const lowPriorityViolations = violations.filter(v => v.severity === 'low')

  let filteredViolations: ConstraintViolation[] = []

  // 优先显示高严重性违反
  if (highPriorityViolations.length > 0) {
    filteredViolations = highPriorityViolations
    // 如果高严重性违反不多，可以添加一些中等严重性的
    if (highPriorityViolations.length <= 2 && mediumPriorityViolations.length > 0) {
      filteredViolations = [...filteredViolations, ...mediumPriorityViolations.slice(0, 2)]
    }
  } else if (mediumPriorityViolations.length > 0) {
    filteredViolations = mediumPriorityViolations.slice(0, 3) // 最多显示3个中等违反
  } else {
    filteredViolations = lowPriorityViolations.slice(0, 1) // 最多显示1个低级违反
  }

  // 合并相似类型的违反
  const mergedViolations = mergeViolationsByType(filteredViolations)

  return mergedViolations
}

// 合并相同类型的违反
function mergeViolationsByType(violations: ConstraintViolation[]): ConstraintViolation[] {
  const violationGroups = new Map<string, ConstraintViolation[]>()

  // 按类型分组
  violations.forEach(violation => {
    const key = `${violation.type}-${violation.severity}`
    if (!violationGroups.has(key)) {
      violationGroups.set(key, [])
    }
    violationGroups.get(key)!.push(violation)
  })

  const mergedViolations: ConstraintViolation[] = []

  // 合并每个组
  violationGroups.forEach(group => {
    if (group.length === 1) {
      mergedViolations.push(group[0])
    } else {
      // 合并多个相同类型的违反
      const merged = mergeViolationGroup(group)
      mergedViolations.push(merged)
    }
  })

  return mergedViolations
}

// 合并违反组
function mergeViolationGroup(violations: ConstraintViolation[]): ConstraintViolation {
  const firstViolation = violations[0]
  const totalAffected = violations.reduce((sum, v) => sum + (v.affectedStudents?.length || 0), 0)

  return {
    ...firstViolation,
    id: `merged-${firstViolation.type}-${Date.now()}`,
    title: `${firstViolation.title} (${violations.length}个相关问题)`,
    message: `发现${violations.length}个相关约束违反，共影响${totalAffected}个学员`,
    details: [
      `合并了${violations.length}个相似的约束违反问题：`,
      ...violations.slice(0, 3).map(v => `• ${v.message}`),
      ...(violations.length > 3 ? [`• ...还有${violations.length - 3}个类似问题`] : []),
    ],
    affectedStudents: violations.reduce((all: string[], v) => {
      return [...all, ...(v.affectedStudents || [])]
    }, []),
  }
}
</script>

<style scoped>
/* 弹窗遮罩层 */
.violation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

/* 弹窗主体 */
.constraint-violation-modal {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideIn 0.3s ease-out;
}

/* 弹窗头部 */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fef2f2;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-title {
  font-size: 18px;
  font-weight: 600;
  color: #dc2626;
  margin: 0;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

/* 汇总统计区域 */
.violation-summary {
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.summary-value {
  font-size: 14px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: #e5e7eb;
  color: #374151;
}

.summary-value.critical {
  background: #fee2e2;
  color: #dc2626;
}

.summary-value.warning {
  background: #fef3c7;
  color: #d97706;
}

.summary-value.info {
  background: #dbeafe;
  color: #2563eb;
}

/* 弹窗内容 */
.modal-content {
  max-height: 50vh;
  overflow-y: auto;
  padding: 0;
}

/* 违反列表 */
.violations-list {
  padding: 20px 24px;
}

.violation-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 12px;
  background: #ffffff;
  transition: all 0.2s;
}

.violation-item:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.violation-item.violation-holiday {
  border-left: 4px solid #dc2626;
}

.violation-item.violation-weekend {
  border-left: 4px solid #d97706;
}

.violation-item.violation-teacher {
  border-left: 4px solid #7c3aed;
}

.violation-icon {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 2px;
  color: #6b7280;
}

.violation-content {
  flex: 1;
}

.violation-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.violation-message {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
  line-height: 1.5;
}

/* 违反统计信息 */
.violation-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.stats-item {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 3px;
  background: #f3f4f6;
  color: #374151;
  font-weight: 500;
}

.stats-item.critical {
  background: #fee2e2;
  color: #dc2626;
}

.stats-item.minor {
  background: #fef3c7;
  color: #d97706;
}

.violation-details {
  margin-bottom: 8px;
}

.detail-item {
  font-size: 13px;
  color: #4b5563;
  margin-bottom: 4px;
  padding-left: 8px;
}

.violation-suggestion {
  font-size: 13px;
  color: #059669;
  background: #d1fae5;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #10b981;
}

.fix-button {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  border-radius: 6px;
  cursor: pointer;
  color: #059669;
  transition: all 0.2s;
  margin-top: 2px;
}

.fix-button:hover {
  background: #f0fdf4;
  border-color: #10b981;
  color: #047857;
}

/* 操作按钮区域 */
.alert-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.btn-fix-all {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #10b981;
  background: #10b981;
  color: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-fix-all:hover {
  background: #059669;
  border-color: #059669;
}

.btn-dismiss {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-dismiss:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .constraint-violation-modal {
    width: 95%;
    max-height: 90vh;
  }

  .violation-summary {
    flex-direction: column;
    gap: 8px;
  }

  .violation-item {
    flex-direction: column;
    gap: 8px;
  }

  .alert-actions {
    flex-direction: column;
  }
}
</style>
