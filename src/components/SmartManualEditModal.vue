<template>
  <div v-if="show" class="modal-overlay smart-edit-overlay" @click="handleOverlayClick">
    <div class="smart-edit-modal responsive-modal" @click.stop>
      <!-- 模态框头部 -->
      <div class="modal-header">
        <div class="header-content">
          <div class="title-section">
            <h2 class="modal-title">
              <Edit class="title-icon" />
              智能人工修改
            </h2>
            <div class="edit-context">
              <span class="context-item">
                <User class="context-icon" />
                {{ editingRecord?.student }}
              </span>
              <span class="context-item">
                <Building class="context-icon" />
                {{ displayDepartment(editingRecord?.department) }}
              </span>
              <span class="context-item">
                <Calendar class="context-icon" />
                {{ formatDate(editingRecord?.examDate) }}
              </span>
            </div>
          </div>
          <button class="modal-close touch-friendly" @click="closeModal">
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- 模态框主体 -->
      <div class="modal-body">
        <!-- 编辑字段信息 -->
        <div class="field-info-section">
          <div class="field-info-card">
            <div class="field-header">
              <span class="field-label">{{ getFieldDisplayName(editingField) }}</span>
              <span class="field-type" :class="getFieldTypeClass(editingField)">
                {{ getFieldType(editingField) }}
              </span>
            </div>
            <div class="current-value">
              <span class="label">当前值：</span>
              <span class="value" :class="{ empty: !currentValue }">
                {{ currentValue || '未分配' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 智能推荐区域 -->
        <div v-if="smartRecommendations.length > 0" class="recommendations-section">
          <div class="section-header">
            <Lightbulb class="section-icon" />
            <h3 class="section-title">智能推荐</h3>
            <span class="recommendation-count">{{ smartRecommendations.length }}个建议</span>
          </div>

          <div class="recommendations-list">
            <div
              v-for="(recommendation, index) in smartRecommendations"
              :key="index"
              class="recommendation-item"
              :class="{
                selected: selectedTeacher === recommendation.teacher.name,
                'priority-high': recommendation.priority === 'high',
                'priority-medium': recommendation.priority === 'medium',
                'priority-low': recommendation.priority === 'low',
              }"
              @click="selectRecommendation(recommendation)"
            >
              <div class="recommendation-header">
                <div class="teacher-info">
                  <span class="teacher-name">{{ recommendation.teacher.name }}</span>
                  <span class="teacher-dept">{{ displayDepartment(recommendation.teacher.department) }}</span>
                </div>
                <div class="recommendation-score">
                  <div class="score-bar">
                    <div class="score-fill" :style="{ width: recommendation.score + '%' }"></div>
                  </div>
                  <span class="score-text">{{ recommendation.score }}%</span>
                </div>
              </div>

              <div class="recommendation-reasons">
                <div
                  v-for="reason in recommendation.reasons"
                  :key="reason.type"
                  class="reason-tag"
                  :class="reason.type"
                >
                  <component :is="getReasonIcon(reason.type)" class="reason-icon" />
                  <span>{{ reason.text }}</span>
                </div>
              </div>

              <div v-if="recommendation.warnings.length > 0" class="recommendation-warnings">
                <div
                  v-for="warning in recommendation.warnings"
                  :key="warning.type"
                  class="warning-item"
                >
                  <AlertTriangle class="warning-icon" />
                  <span>{{ warning.text }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 冲突检测区域 -->
        <div v-if="conflicts.length > 0" class="conflicts-section">
          <div class="section-header">
            <AlertCircle class="section-icon text-red-500" />
            <h3 class="section-title text-red-600">冲突检测</h3>
            <span class="conflict-count">{{ conflicts.length }}个冲突</span>
          </div>

          <div class="conflicts-list">
            <div
              v-for="(conflict, index) in conflicts"
              :key="index"
              class="conflict-item"
              :class="conflict.severity"
            >
              <div class="conflict-header">
                <component :is="getConflictIcon(conflict.type)" class="conflict-icon" />
                <span class="conflict-title">{{ conflict.title }}</span>
                <span class="conflict-severity">{{ conflict.severity }}</span>
              </div>
              <p class="conflict-description">{{ conflict.description }}</p>
              <div v-if="conflict.suggestions.length > 0" class="conflict-suggestions">
                <span class="suggestions-label">建议：</span>
                <ul class="suggestions-list">
                  <li v-for="suggestion in conflict.suggestions" :key="suggestion">
                    {{ suggestion }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- 手动选择区域 -->
        <div class="manual-selection-section">
          <div class="section-header">
            <Users class="section-icon" />
            <h3 class="section-title">手动选择</h3>
            <button class="toggle-all-btn" @click="showAllTeachers = !showAllTeachers">
              {{ showAllTeachers ? '显示推荐' : '显示全部' }}
            </button>
          </div>

          <div class="search-box">
            <Search class="search-icon" />
            <input
              v-model="teacherSearchQuery"
              type="text"
              placeholder="搜索考官姓名或科室..."
              class="search-input"
            />
          </div>

          <div class="teachers-grid">
            <div
              v-for="teacher in filteredTeachers"
              :key="teacher.id"
              class="teacher-card"
              :class="{
                selected: selectedTeacher === teacher.name,
                unavailable: !teacher.available,
                recommended: isRecommended(teacher),
              }"
              @click="selectTeacher(teacher)"
            >
              <div class="teacher-header">
                <span class="teacher-name">{{ teacher.name }}</span>
                <div class="teacher-status">
                  <span v-if="teacher.available" class="status-badge available"> 可用 </span>
                  <span v-else class="status-badge unavailable"> 不可用 </span>
                  <span v-if="isRecommended(teacher)" class="status-badge recommended"> 推荐 </span>
                </div>
              </div>
              <div class="teacher-details">
                <span class="teacher-dept">{{ displayDepartment(teacher.department) }}</span>
                <span class="teacher-workload">工作量: {{ teacher.currentWorkload || 0 }}</span>
              </div>
              <div v-if="teacher.conflictInfo" class="teacher-conflicts">
                <AlertTriangle class="conflict-icon-small" />
                <span class="conflict-text">{{ teacher.conflictInfo }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 提示信息 -->
        <div class="selection-hint">
          <div class="hint-icon">💡</div>
          <div class="hint-text">
            <strong>操作提示：</strong>点击推荐考官或手动选择考官后，将弹出修改原因窗口
          </div>
        </div>
      </div>

      <!-- 模态框底部 -->
      <div class="modal-footer">
        <button class="action-btn secondary-btn mobile-btn" @click="closeModal">关闭</button>
      </div>
    </div>

    <!-- 修改原因弹窗 -->
    <div v-if="showReasonDialog" class="reason-dialog-overlay" @click="cancelReasonDialog">
      <div class="reason-dialog" @click.stop>
        <div class="reason-dialog-header">
          <h3 class="reason-dialog-title">
            <FileText class="title-icon" />
            填写修改原因
          </h3>
          <button class="dialog-close" @click="cancelReasonDialog">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="reason-dialog-body">
          <!-- 选中的考官信息 -->
          <div class="selected-teacher-info">
            <div class="info-label">已选择考官</div>
            <div class="teacher-info-card">
              <div class="teacher-name-large">{{ pendingTeacher?.name }}</div>
              <div class="teacher-dept-large">{{ displayDepartment(pendingTeacher?.department) }}</div>
            </div>
          </div>

          <!-- 冲突提示 -->
          <div v-if="conflicts.length > 0" class="dialog-conflicts">
            <div v-if="hasHardConflicts" class="hard-conflict-alert">
              <AlertCircle class="alert-icon" />
              <div>
                <div class="alert-title">⚠️ 硬约束违反警告</div>
                <div class="alert-desc">
                  检测到硬约束冲突，但<strong style="color: #ef4444">人工修改权限最高</strong
                  >。<br />
                  您可以选择强制保存（将标记为红色）或重新选择考官。
                </div>
              </div>
            </div>
            <div v-else-if="hasSoftConflicts" class="soft-conflict-alert">
              <AlertTriangle class="alert-icon" />
              <div>
                <div class="alert-title">存在软约束提示</div>
                <div class="alert-desc">建议考虑以下问题：</div>
                <ul class="conflict-list">
                  <li v-for="conflict in conflicts" :key="conflict.type">
                    {{ conflict.title }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- 修改原因选择 -->
          <div class="reason-selection">
            <div class="info-label">
              修改原因
              <span class="required-indicator">*</span>
            </div>
            <div class="reason-tags-dialog">
              <button
                v-for="reason in commonReasons"
                :key="reason"
                class="reason-tag-btn-dialog"
                :class="{ selected: selectedReason === reason }"
                @click="selectReason(reason)"
              >
                {{ reason }}
              </button>
            </div>
          </div>

          <!-- 详细说明 -->
          <div class="reason-detail">
            <div class="info-label">详细说明</div>
            <textarea
              v-model="customReason"
              placeholder="请详细说明人工修改的具体原因..."
              class="reason-textarea-dialog"
              rows="4"
            ></textarea>
          </div>
        </div>

        <div class="reason-dialog-footer">
          <button class="dialog-btn cancel-btn" @click="cancelReasonDialog">取消</button>
          <button
            class="dialog-btn confirm-btn"
            @click="confirmReasonDialog"
            :disabled="!selectedReason && !customReason.trim()"
          >
            <template v-if="hasHardConflicts"> ⚡ 强制修改 </template>
            <template v-else-if="hasSoftConflicts"> ⚠️ 强制确认 </template>
            <template v-else> ✅ 确认修改 </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { DateUtils as dateUtils } from '../utils/dateUtils'
import { normalizeDeptToFull, normalizeDeptToShort } from '../utils/departmentNormalizer'

// 🆕 科室名称显示转换函数（统一显示为"区域X室"格式）
const displayDepartment = (dept: string | undefined | null): string => {
  if (!dept) return '-'
  return normalizeDeptToFull(dept)
}
import {
  Edit,
  User,
  Building,
  Calendar,
  X,
  Lightbulb,
  Users,
  Search,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  Star,
  Clock,
  Shield,
  Award,
  Target,
  Zap,
  TrendingUp,
} from 'lucide-vue-next'
import { useResponsive } from '../composables/useResponsive'
import { learningApi } from '../services/learningApi'
import {
  checkManualEditConstraints,
  hasHardConstraintViolations,
  type ConstraintViolation,
} from '../services/manualEditConstraintChecker'
import {
  enhanceTeachersWithShiftInfo,
  getTeacherPriority,
  getTeacherShiftType,
  getTeacherRestDayStatus,
  hasWhiteShiftConflict,
} from '../services/shiftRotationService'

interface Teacher {
  id: string
  name: string
  department: string
  group?: string // 班组：一组、二组、三组、四组、无
  available: boolean
  currentWorkload?: number
  conflictInfo?: string
  specialties?: string[]
  nightShiftPreferred?: boolean
  restDayStatus?: 'first' | 'second' | 'none'
  shiftType?: 'day' | 'night' | 'rest' | 'admin'
  priorityScore?: number
}

interface SmartRecommendation {
  teacher: Teacher
  score: number
  priority: 'high' | 'medium' | 'low'
  reasons: Array<{
    type: string
    text: string
  }>
  warnings: Array<{
    type: string
    text: string
  }>
}

interface Conflict {
  type: string
  severity: 'high' | 'medium' | 'low'
  title: string
  description: string
  suggestions: string[]
}

interface Props {
  show: boolean
  editingRecord: any
  editingField: string
  availableTeachers: Teacher[]
  currentValue?: string
  allScheduleRecords?: any[] // 所有排班记录，用于HC5检查
  smartRecommendations?: SmartRecommendation[]
  conflicts?: Conflict[]
}

interface Emits {
  (e: 'close'): void
  (
    e: 'confirm',
    data: {
      teacher: string
      reason: string
      conflicts: Conflict[]
      isForced: boolean
      wasRecommended?: boolean
      recommendationScore?: number
      recommendationPriority?: string
    }
  ): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { isMobile, modalConfig } = useResponsive()

// 响应式数据
const selectedTeacher = ref('')
const selectedReason = ref('')
const customReason = ref('')
const teacherSearchQuery = ref('')
const showAllTeachers = ref(false)
const smartRecommendations = ref<SmartRecommendation[]>([])
const conflicts = ref<Conflict[]>([])

// 修改原因弹窗控制
const showReasonDialog = ref(false)
const pendingTeacher = ref<Teacher | null>(null)

// 常用修改原因
const commonReasons = [
  '自动排班冲突',
  '考官特殊要求',
  '临时调整',
  '科室协调',
  '工作量平衡',
  '专业匹配优化',
  '紧急替换',
  '其他原因',
]

// 计算属性
const currentValue = computed(() => props.currentValue || '')

const filteredTeachers = computed(() => {
  let teachers = showAllTeachers.value
    ? props.availableTeachers
    : props.availableTeachers.filter(
        t => smartRecommendations.value.some(r => r.teacher.id === t.id) || t.available
      )

  if (teacherSearchQuery.value) {
    const query = teacherSearchQuery.value.toLowerCase()
    teachers = teachers.filter(
      t => t.name.toLowerCase().includes(query) || t.department.toLowerCase().includes(query)
    )
  }

  return teachers.sort((a, b) => {
    // 推荐的考官排在前面
    const aRecommended = isRecommended(a)
    const bRecommended = isRecommended(b)
    if (aRecommended && !bRecommended) return -1
    if (!aRecommended && bRecommended) return 1

    // 可用的排在前面
    if (a.available && !b.available) return -1
    if (!a.available && b.available) return 1

    // 按姓名排序
    return a.name.localeCompare(b.name)
  })
})

const hasConflicts = computed(() => conflicts.value.length > 0)

// 检查是否有硬约束违反（阻止保存）
const hasHardConflicts = computed(() => {
  return conflicts.value.some(
    c => c.severity === 'high' && (c.type.startsWith('HC') || c.title.includes('硬约束'))
  )
})

// 检查是否有软约束提示（警告但不阻止）
const hasSoftConflicts = computed(() => {
  return conflicts.value.some(
    c => c.severity !== 'high' || (!c.type.startsWith('HC') && !c.title.includes('硬约束'))
  )
})

// 方法
const handleOverlayClick = () => {
  if (!isMobile.value) {
    closeModal()
  }
}

const closeModal = () => {
  selectedTeacher.value = ''
  selectedReason.value = ''
  customReason.value = ''
  teacherSearchQuery.value = ''
  showAllTeachers.value = false
  smartRecommendations.value = []
  conflicts.value = []
  emit('close')
}

/**
 * 选择推荐考官，弹出修改原因对话框
 */
const selectRecommendation = (recommendation: SmartRecommendation) => {
  pendingTeacher.value = recommendation.teacher
  checkConflicts(recommendation.teacher)
  showReasonDialog.value = true
}

/**
 * 选择考官，弹出修改原因对话框
 */
const selectTeacher = (teacher: Teacher) => {
  process.env.NODE_ENV === 'development' && console.log('🖱️ [点击考官]', {
    name: teacher.name,
    available: teacher.available,
    isRecommended: isRecommended(teacher),
    group: teacher.group,
    shiftType: teacher.shiftType,
  })

  if (!teacher.available && !isRecommended(teacher)) {
    console.warn('⚠️ [点击被阻止] 考官不可用且不在推荐列表中')
    return
  }

  pendingTeacher.value = teacher
  checkConflicts(teacher)
  showReasonDialog.value = true
  process.env.NODE_ENV === 'development' && console.log('✅ [弹窗打开] showReasonDialog =', showReasonDialog.value)
}

const selectReason = (reason: string) => {
  selectedReason.value = selectedReason.value === reason ? '' : reason
}

/**
 * 确认修改原因对话框
 */
const confirmReasonDialog = async () => {
  const reason = customReason.value.trim() || selectedReason.value

  // 检查是否填写了修改原因
  if (!reason) {
    alert('请填写修改原因')
    return
  }

  // 🚨 检查是否有硬约束违反（改为提醒而非禁止）
  if (hasHardConflicts.value) {
    const hardConflictList = conflicts.value
      .filter((c: any) => c.severity === 'error' || c.severity === 'high' || c.type === 'hard')
      .map((c: any) => `• ${c.title}\n  ${c.description}`)
      .join('\n\n')

    const confirmMessage = `⚠️ 硬约束违反警告\n\n检测到以下硬约束冲突：\n\n${hardConflictList}\n\n⚡ 人工修改权限最高，您可以选择：\n\n✅ 确认修改 - 强制保存此修改（将标记为红色）\n❌ 取消 - 重新选择其他考官\n\n是否确认强制修改？`

    const userConfirmed = confirm(confirmMessage)

    if (!userConfirmed) {
      process.env.NODE_ENV === 'development' && console.log('👤 用户取消了硬约束违反的修改')
      return
    }

    process.env.NODE_ENV === 'development' && console.log('⚡ 用户确认强制修改，忽略硬约束违反')
  }

  if (!pendingTeacher.value) return

  selectedTeacher.value = pendingTeacher.value.name

  // 记录人工修改到学习系统
  try {
    const wasRecommended = isRecommended(pendingTeacher.value)
    const recommendationRank = wasRecommended
      ? smartRecommendations.value.findIndex(r => r.teacher.name === pendingTeacher.value!.name) + 1
      : undefined
    const recommendationScore = wasRecommended
      ? smartRecommendations.value.find(r => r.teacher.name === pendingTeacher.value!.name)?.score
      : undefined

    const editLog = {
      editedBy: '系统用户',
      context: {
        studentName: props.editingRecord?.student || '',
        department: props.editingRecord?.department || '',
        examDate: props.editingRecord?.examDate || '',
        fieldName: props.editingField,
        timeSlot:
          props.editingField === 'examiner1_1' ||
          props.editingField === 'examiner1_2' ||
          props.editingField === 'backup1'
            ? 'day1'
            : 'day2',
      },
      original: {
        value: props.currentValue || null,
      },
      selected: {
        value: pendingTeacher.value.name,
        wasRecommended: wasRecommended,
        recommendationRank: recommendationRank,
        recommendationScore: recommendationScore,
      },
      reason: {
        category: selectedReason.value || '其他原因',
        detail: customReason.value || reason,
      },
      hadConflicts: conflicts.value.length > 0,
      conflicts: conflicts.value.map(c => ({
        type: c.type,
        severity: c.severity,
        title: c.title,
        description: c.description,
      })),
      isForced: hasHardConflicts.value || hasConflicts.value, // 🚨 硬约束违反或有冲突时标记为强制修改
    }

    learningApi.recordManualEdit(editLog).catch(err => {
      console.warn('记录人工修改失败（已保存到本地缓存）:', err)
    })
  } catch (error) {
    console.error('构造修改日志失败:', error)
  }

  // 🎨 评估修改质量
  const recommendation = smartRecommendations.value.find(
    r => r.teacher.name === pendingTeacher.value!.name
  )
  const recommendationScore = recommendation ? recommendation.score : 0
  const recommendationPriority = recommendation ? recommendation.priority : 'none'
  const wasRecommended = !!recommendation

  // 增强的conflicts信息
  const enhancedConflicts = [...conflicts.value]

  // 根据推荐情况添加信息提示
  if (!recommendation && !hasConflicts.value) {
    enhancedConflicts.push({
      type: 'NOT_RECOMMENDED',
      severity: 'low',
      title: '提示：未在推荐列表中',
      description: `${pendingTeacher.value.name} 不在智能推荐列表中，可能存在更优选择`,
      suggestions: ['推荐使用列表顶部的推荐考官'],
    })
  } else if (recommendation && recommendationScore < 70 && recommendationPriority === 'low') {
    enhancedConflicts.push({
      type: 'LOW_RECOMMENDATION',
      severity: 'low',
      title: '提示：推荐优先级较低',
      description: `${pendingTeacher.value.name} 的推荐评分为 ${recommendationScore}%，建议考虑更高优先级的考官`,
      suggestions: ['查看推荐列表中的高优先级选项'],
    })
  }

  // 提交修改（包含推荐信息）
  emit('confirm', {
    teacher: pendingTeacher.value.name,
    reason,
    conflicts: enhancedConflicts,
    isForced: hasHardConflicts.value || hasConflicts.value, // 🚨 硬约束违反或有冲突时标记为强制修改
    // 🆕 新增推荐相关信息
    wasRecommended,
    recommendationScore,
    recommendationPriority,
  })

  // 关闭对话框和模态框
  closeReasonDialog()
  closeModal()
}

/**
 * 取消修改原因对话框
 */
const cancelReasonDialog = () => {
  closeReasonDialog()
}

/**
 * 关闭修改原因对话框
 */
const closeReasonDialog = () => {
  showReasonDialog.value = false
  pendingTeacher.value = null
  selectedReason.value = ''
  customReason.value = ''
}

const isRecommended = (teacher: Teacher) => {
  return smartRecommendations.value.some(r => r.teacher.id === teacher.id)
}

// 字段显示相关
const getFieldDisplayName = (field: string) => {
  const fieldNames: Record<string, string> = {
    examiner1_1: '第一天主考官1',
    examiner1_2: '第一天主考官2',
    backup1: '第一天备用考官',
    examiner2_1: '第二天主考官1',
    examiner2_2: '第二天主考官2',
    backup2: '第二天备用考官',
  }
  return fieldNames[field] || field
}

const getFieldType = (field: string) => {
  if (field.includes('backup')) return '备用考官'
  return '主考官'
}

const getFieldTypeClass = (field: string) => {
  if (field.includes('backup')) return 'backup'
  return 'main'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  // 使用dateUtils格式化日期显示
  return dateUtils.toDisplayDate(dateStr)
}

// 图标获取
const getReasonIcon = (type: string) => {
  const icons: Record<string, any> = {
    department_match: Building,
    workload_balance: TrendingUp,
    specialty_match: Award,
    night_shift_preferred: Clock,
    rest_day_optimal: Star,
    availability: CheckCircle,
    experience: Shield,
    performance: Target,
    efficiency: Zap,
  }
  return icons[type] || Star
}

const getConflictIcon = (type: string) => {
  const icons: Record<string, any> = {
    schedule_conflict: Calendar,
    workload_overload: TrendingUp,
    department_rule: Building,
    availability: Clock,
    constraint_violation: Shield,
  }
  return icons[type] || AlertTriangle
}

/**
 * 精细化智能推荐逻辑
 * 针对不同角色（考官一、考官二、备份考官）提供针对性的推荐
 */
const generateSmartRecommendations = () => {
  if (!props.availableTeachers.length || !props.editingRecord) return

  const recommendations: SmartRecommendation[] = []
  const { editingRecord, editingField } = props

  // 🆕 使用班组轮换服务增强考官数据
  const examDate = editingRecord.examDate
  const enhancedTeachers = enhanceTeachersWithShiftInfo(
    props.availableTeachers as any[],
    examDate
  ) as Teacher[]

  process.env.NODE_ENV === 'development' && console.log('🎯 [班组轮换] 已增强考官数据，考官数量:', enhancedTeachers.length)
  process.env.NODE_ENV === 'development' && console.log('🎯 [班组轮换] 可用考官数量:', enhancedTeachers.filter(t => t.available).length)
  process.env.NODE_ENV === 'development' && console.log(
    '🎯 [班组轮换] 前3个考官状态:',
    enhancedTeachers.slice(0, 3).map(t => ({
      name: t.name,
      available: t.available,
      group: t.group,
      shiftType: t.shiftType,
    }))
  )

  // 解析编辑字段信息
  // 修复：字段判断必须精确，不能使用includes()模糊匹配
  const isDay1 =
    editingField === 'examiner1_1' || editingField === 'examiner1_2' || editingField === 'backup1'
  const isDay2 =
    editingField === 'examiner2_1' || editingField === 'examiner2_2' || editingField === 'backup2'
  const isExaminer1 = editingField === 'examiner1_1' || editingField === 'examiner2_1'
  const isExaminer2 = editingField === 'examiner1_2' || editingField === 'examiner2_2'
  const isBackup = editingField === 'backup1' || editingField === 'backup2'

  // 获取学员推荐科室
  const examiner1RecommendedDept = (editingRecord as any).recommendedExaminer1Dept
  const examiner2RecommendedDept = (editingRecord as any).recommendedExaminer2Dept

  // 🔧 修复：从availableTeachers获取当前已选考官的实时科室信息（而非editingRecord中可能过期的值）
  const getTeacherDeptFromAvailable = (teacherName: string): string => {
    if (!teacherName || !props.availableTeachers) return ''
    const teacher = props.availableTeachers.find((t: Teacher) => t.name === teacherName)
    return teacher ? normalizeDeptToShort(teacher.department) : ''
  }

  // 获取当前已选择的考官姓名
  const day1Examiner1Name = editingRecord.examiner1_1
  const day2Examiner1Name = editingRecord.examiner2_1
  const day1Examiner2Name = editingRecord.examiner1_2
  const day2Examiner2Name = editingRecord.examiner2_2

  // 从availableTeachers获取实时科室信息
  const day1Examiner1Dept = getTeacherDeptFromAvailable(day1Examiner1Name)
  const day2Examiner1Dept = getTeacherDeptFromAvailable(day2Examiner1Name)
  const day1Examiner2Dept = getTeacherDeptFromAvailable(day1Examiner2Name)
  const day2Examiner2Dept = getTeacherDeptFromAvailable(day2Examiner2Name)

  process.env.NODE_ENV === 'development' && console.log('🎯 [精细化推荐] 开始生成推荐:', {
    editingField,
    isDay1,
    isExaminer1,
    isExaminer2,
    isBackup,
    examiner1RecommendedDept,
    examiner2RecommendedDept,
    day1Examiner2Dept,
    day2Examiner2Dept,
  })

  // #region agent log - 假设A&B：检查输入参数和推荐科室字段
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SmartManualEditModal.vue:generateSmartRecommendations',message:'推荐生成入口参数',data:{totalTeachers:props.availableTeachers.length,enhancedTeachersCount:enhancedTeachers.length,availableCount:enhancedTeachers.filter(t=>t.available).length,editingField,studentDept:editingRecord.department,examDate,examiner1RecommendedDept:examiner1RecommendedDept||'未设置',examiner2RecommendedDept:examiner2RecommendedDept||'未设置',isExaminer1,isExaminer2,isBackup},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion

  enhancedTeachers.forEach(teacher => {
    if (!teacher.available) return

    const reasons: Array<{ type: string; text: string }> = []
    const warnings: Array<{ type: string; text: string }> = []
    let score = 50 // 基础分数

    const teacherDept = normalizeDeptToShort(teacher.department)
    const studentDept = normalizeDeptToShort(editingRecord.department)

    // #region agent log - 假设A：检查科室规范化
    if (enhancedTeachers.indexOf(teacher) < 5) { // 只记录前5个考官
      fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SmartManualEditModal.vue:teacherLoop',message:'科室规范化检查',data:{teacherName:teacher.name,rawTeacherDept:teacher.department,normalizedTeacherDept:teacherDept,rawStudentDept:editingRecord.department,normalizedStudentDept:studentDept,available:teacher.available,group:teacher.group,shiftType:teacher.shiftType},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    }
    // #endregion

    // ========================================
    // 考官一：必须与学员同科室
    // ========================================
    if (isExaminer1) {
      // HC2检查：考官1必须与学员同科室（或3/7室互通）
      const isSameDept = teacherDept === studentDept
      const is37Cross =
        (studentDept === '三' || studentDept === '七') &&
        (teacherDept === '三' || teacherDept === '七')

      if (isSameDept) {
        reasons.push({
          type: 'department_match',
          text: '✅ 与学员同科室（HC2要求）',
        })
        score += 30
      } else if (is37Cross) {
        reasons.push({
          type: 'department_match',
          text: '✅ 三七室互通（符合HC2）',
        })
        score += 25
      } else {
        warnings.push({
          type: 'department_mismatch',
          text: '❌ 不与学员同科室（违反HC2）',
        })
        score = 0 // 硬约束违反，不推荐
        return
      }

      // HC7检查：考官1不能与已选择的考官2同科室
      const currentExaminer2Dept = isDay1 ? day1Examiner2Dept : day2Examiner2Dept
      if (currentExaminer2Dept) {
        const examiner2Dept = normalizeDeptToShort(currentExaminer2Dept)
        if (examiner2Dept && teacherDept === examiner2Dept) {
          warnings.push({
            type: 'department_mismatch',
            text: '❌ 与考官2同科室（违反HC7）',
          })
          score = 0 // 硬约束违反，不推荐
          return
        }
      }

      // HC8检查：考官1不能与备份考官是同一人
      const currentBackup = isDay1 ? editingRecord.backup1 : editingRecord.backup2
      if (currentBackup && teacher.name === currentBackup) {
        warnings.push({
          type: 'same_person_conflict',
          text: '❌ 与备份考官是同一人（违反HC8）',
        })
        score = 0 // 硬约束违反，不推荐
        return
      }
    }

    // ========================================
    // 考官二：Day1从考官1推荐科室，Day2从考官2推荐科室
    // ========================================
    else if (isExaminer2) {
      // HC7检查：考官2必须与学员不同科室
      if (teacherDept === studentDept) {
        warnings.push({
          type: 'department_mismatch',
          text: '❌ 与学员同科室（违反HC7）',
        })
        score = 0 // 硬约束违反，不推荐
        return
      } else {
        reasons.push({
          type: 'department_match',
          text: '✅ 与学员不同科室（HC7要求）',
        })
        score += 20
      }

      // HC7检查：考官2不能与已选择的考官1同科室
      const currentExaminer1Dept = isDay1 ? day1Examiner1Dept : day2Examiner1Dept
      if (currentExaminer1Dept) {
        const examiner1Dept = normalizeDeptToShort(currentExaminer1Dept)
        if (examiner1Dept && teacherDept === examiner1Dept) {
          warnings.push({
            type: 'department_mismatch',
            text: '❌ 与考官1同科室（违反HC7）',
          })
          score = 0 // 硬约束违反，不推荐
          return
        }
      }

      // HC8检查：考官2不能与备份考官是同一人
      const currentBackup = isDay1 ? editingRecord.backup1 : editingRecord.backup2
      if (currentBackup && teacher.name === currentBackup) {
        warnings.push({
          type: 'same_person_conflict',
          text: '❌ 与备份考官是同一人（违反HC8）',
        })
        score = 0 // 硬约束违反，不推荐
        return
      }

      // SC2检查：Day1应该来自考官1推荐科室，Day2应该来自考官2推荐科室
      // 注：examiner1RecommendedDept 是给Day1考官二的推荐科室
      //     examiner2RecommendedDept 是给Day2考官二的推荐科室
      const targetRecommendedDept = isDay1
        ? normalizeDeptToShort(examiner1RecommendedDept)
        : normalizeDeptToShort(examiner2RecommendedDept)

      if (targetRecommendedDept && teacherDept === targetRecommendedDept) {
        reasons.push({
          type: 'specialty_match',
          text: `✅ 来自推荐科室「${targetRecommendedDept}室」（SC2优先）`,
        })
        score += 35 // 高权重
      } else if (targetRecommendedDept) {
        // 只有当有推荐科室时才显示警告
        warnings.push({
          type: 'specialty_match',
          text: `ℹ️ 非推荐科室（推荐: ${targetRecommendedDept}室）`,
        })
        score -= 10 // 减少惩罚，因为不是硬约束
      }

      // SC14检查：Day1和Day2考官二应来自不同推荐科室
      if (!isDay1 && day1Examiner2Dept) {
        const day1Dept = normalizeDeptToShort(day1Examiner2Dept)
        const normalizedExaminer1Dept = normalizeDeptToShort(examiner1RecommendedDept)
        const normalizedExaminer2Dept = normalizeDeptToShort(examiner2RecommendedDept)

        // 如果Day1的考官二来自推荐科室池，Day2应该选择另一个推荐科室
        const day1IsInPool =
          day1Dept === normalizedExaminer1Dept || day1Dept === normalizedExaminer2Dept

        if (day1IsInPool) {
          // 如果Day1选了某个推荐科室，Day2应该选另一个
          if (teacherDept !== day1Dept) {
            reasons.push({
              type: 'specialty_match',
              text: `✅ 与Day1考官二「${day1Dept}室」不同（SC14优先）`,
            })
            score += 30
          } else {
            warnings.push({
              type: 'specialty_match',
              text: `⚠️ 与Day1考官二相同科室（建议换科室）`,
            })
            score -= 15
          }
        }
      }
    }

    // ========================================
    // 备份考官：Day1从考官1推荐科室，Day2从考官2推荐科室
    // ========================================
    else if (isBackup) {
      // 获取当前已选考官（用于HC8和HC8b检查）
      const currentExaminer1 = isDay1
        ? editingRecord.examiner1_1
        : editingRecord.examiner2_1
      const currentExaminer2 = isDay1
        ? editingRecord.examiner1_2
        : editingRecord.examiner2_2

      // HC8检查：备份考官不能与考官1是同一人
      if (currentExaminer1 && teacher.name === currentExaminer1) {
        warnings.push({
          type: 'same_person_conflict',
          text: '❌ 与考官1是同一人（违反HC8）',
        })
        score = 0 // 硬约束违反，不推荐
        return
      }

      // HC8检查：备份考官不能与考官2是同一人
      if (currentExaminer2 && teacher.name === currentExaminer2) {
        warnings.push({
          type: 'same_person_conflict',
          text: '❌ 与考官2是同一人（违反HC8）',
        })
        score = 0 // 硬约束违反，不推荐
        return
      }

      // HC8b检查：备份考官不能与考官1同科室
      const currentExaminer1Dept = isDay1 ? day1Examiner1Dept : day2Examiner1Dept
      if (currentExaminer1Dept) {
        const examiner1Dept = normalizeDeptToShort(currentExaminer1Dept)
        if (examiner1Dept && teacherDept === examiner1Dept) {
          warnings.push({
            type: 'department_mismatch',
            text: '❌ 与考官1同科室（违反HC8b）',
          })
          score = 0 // 硬约束违反，不推荐
          return
        }
      }

      // HC8b检查：备份考官不能与考官2同科室
      const currentExaminer2Dept = isDay1 ? day1Examiner2Dept : day2Examiner2Dept
      if (currentExaminer2Dept) {
        const examiner2Dept = normalizeDeptToShort(currentExaminer2Dept)
        if (examiner2Dept && teacherDept === examiner2Dept) {
          warnings.push({
            type: 'department_mismatch',
            text: '❌ 与考官2同科室（违反HC8b）',
          })
          score = 0 // 硬约束违反，不推荐
          return
        }
      }

      // 备份考官必须与学员不同科室
      if (teacherDept === studentDept) {
        warnings.push({
          type: 'department_mismatch',
          text: '❌ 与学员同科室（不推荐作为备份）',
        })
        score -= 20
      } else {
        reasons.push({
          type: 'department_match',
          text: '✅ 与学员不同科室（备份要求）',
        })
        score += 15
      }

      // SC4检查：备份考官也按Day1/Day2区分推荐科室
      const targetRecommendedDept = isDay1
        ? normalizeDeptToShort(examiner1RecommendedDept)
        : normalizeDeptToShort(examiner2RecommendedDept)

      if (targetRecommendedDept && teacherDept === targetRecommendedDept) {
        reasons.push({
          type: 'specialty_match',
          text: `✅ 来自推荐科室「${targetRecommendedDept}室」（SC4优先）`,
        })
        score += 30
      } else if (targetRecommendedDept) {
        // 只有当有推荐科室时才显示提示
        reasons.push({
          type: 'specialty_match',
          text: `ℹ️ 非推荐科室（可用）`,
        })
        // 不扣分，因为备份考官的科室要求较宽松
      }
    }

    // ========================================
    // 通用检查：HC4、HC3、HC9、工作量等
    // ========================================

    // 🆕 HC4: 每名考官每天只能监考一名考生（硬约束）
    if (props.allScheduleRecords && props.allScheduleRecords.length > 0) {
      const sameTeacherSameDay = props.allScheduleRecords.filter((record: any) => {
        if (record.id === editingRecord.id) return false

        const day1HasTeacher =
          record.date1 === examDate &&
          [record.examiner1_1, record.examiner2_1, record.backup1].includes(teacher.name)

        const day2HasTeacher =
          record.date2 === examDate &&
          [record.examiner1_2, record.examiner2_2, record.backup2].includes(teacher.name)

        const legacyHasTeacher =
          record.examDate === examDate &&
          [record.examiner1, record.examiner2, record.backup].includes(teacher.name)

        return day1HasTeacher || day2HasTeacher || legacyHasTeacher
      })

      if (sameTeacherSameDay.length > 0) {
        warnings.push({
          type: 'daily_limit_exceeded',
          text: `❌ 当天已监考${sameTeacherSameDay.length}场（违反HC4）`,
        })
        score = 0 // 硬约束违反，不推荐
        return
      }
    }

    // 🆕 HC3: 白班执勤冲突检查（硬约束）
    if (hasWhiteShiftConflict(teacher, examDate)) {
      warnings.push({
        type: 'white_shift_conflict',
        text: '❌ 白班执勤冲突（违反HC3）',
      })
      score = 0 // 硬约束违反，不推荐
      return
    }

    // 🆕 HC9: 考官不可用期检查（硬约束）🔥 严重遗漏修复
    const unavailableDates =
      (teacher as any).unavailableDates || (teacher as any).unavailablePeriods
    if (unavailableDates && unavailableDates.length > 0) {
      try {
        const examDateObj = new Date(examDate + 'T00:00:00')

        for (const period of unavailableDates) {
          if (!period.startDate || !period.endDate) continue

          const startDate = new Date(period.startDate + 'T00:00:00')
          const endDate = new Date(period.endDate + 'T23:59:59')

          // 检查考试日期是否在不可用期内
          if (examDateObj >= startDate && examDateObj <= endDate) {
            warnings.push({
              type: 'unavailable_date',
              text: `❌ 考官不可用（违反HC9）：${period.reason || '不可用期'}`,
            })
            score = 0 // 硬约束违反，不推荐
            console.warn(`🚫 [HC9智能推荐] ${teacher.name}在${examDate}不可用，不推荐`)
            return
          }
        }
      } catch (error) {
        console.error('[HC9智能推荐] 检查异常:', error)
      }
    }

    // 工作量平衡检查（优化：显示具体数值）
    const currentWorkload = teacher.currentWorkload || 0
    if (currentWorkload < 3) {
      reasons.push({
        type: 'workload_balance',
        text: `📊 工作量轻（${currentWorkload}次）`,
      })
      score += 10
    } else if (currentWorkload >= 3 && currentWorkload <= 5) {
      reasons.push({
        type: 'workload_balance',
        text: `📊 工作量适中（${currentWorkload}次）`,
      })
      score += 5
    } else if (currentWorkload > 5) {
      warnings.push({
        type: 'workload_high',
        text: `⚠️ 工作量较重（${currentWorkload}次）`,
      })
      score -= 5
    }

    // 班组信息显示（优化：增加班组提示）
    if (teacher.group && teacher.group !== '无') {
      const shiftTypeText = teacher.shiftType === 'night' ? '晚班' : 
                            teacher.shiftType === 'rest' ? '休息' : 
                            teacher.shiftType === 'day' ? '白班' : '未知';
      reasons.push({
        type: 'group_info',
        text: `👥 ${teacher.group}（${shiftTypeText}）`,
      })
    } else {
      reasons.push({
        type: 'group_info',
        text: '👥 行政班',
      })
    }

    // 晚班优先检查（SC1: +150分）
    if (teacher.nightShiftPreferred) {
      reasons.push({
        type: 'night_shift_preferred',
        text: '✅ 晚班考官（SC1优先）',
      })
      score += 15
    }

    // 休息日状态检查
    if (teacher.restDayStatus === 'first') {
      reasons.push({
        type: 'rest_day_optimal',
        text: '✅ 休息第一天（SC3优先）',
      })
      score += 12
    } else if (teacher.restDayStatus === 'second') {
      reasons.push({
        type: 'rest_day_optimal',
        text: '✅ 休息第二天（SC5优先）',
      })
      score += 8
    }

    // 确定优先级
    let priority: 'high' | 'medium' | 'low' = 'low'
    if (score >= 80) priority = 'high'
    else if (score >= 60) priority = 'medium'

    recommendations.push({
      teacher,
      score: Math.min(score, 100),
      priority,
      reasons,
      warnings,
    })
  })

  // 按分数排序，取前5个
  const sortedRecommendations = recommendations.sort((a, b) => b.score - a.score).slice(0, 5)

  process.env.NODE_ENV === 'development' && console.log('✅ [精细化推荐] 生成完成，推荐数量:', sortedRecommendations.length)
  sortedRecommendations.forEach((rec, idx) => {
    process.env.NODE_ENV === 'development' && console.log(
      `  ${idx + 1}. ${rec.teacher.name} (${rec.teacher.department}) - 分数:${rec.score}, 班次:${rec.teacher.shiftType}`
    )
  })

  // #region agent log - 假设C&D&E：检查最终推荐结果
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SmartManualEditModal.vue:generateSmartRecommendations:output',message:'推荐结果输出',data:{totalCandidates:recommendations.length,filteredByAvailability:enhancedTeachers.filter(t=>!t.available).length,topRecommendations:sortedRecommendations.map(r=>({name:r.teacher.name,dept:r.teacher.department,score:r.score,priority:r.priority,reasons:r.reasons.map(x=>x.text).join(';'),warnings:r.warnings.map(x=>x.text).join(';')}))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D,E'})}).catch(()=>{});
  // #endregion

  smartRecommendations.value = sortedRecommendations
}

/**
 * 科室名称规范化（与后端保持一致）
 */
const normalizeDepartment = (dept: string | undefined): string => {
  if (!dept) return ''
  return dept
    .trim()
    .replace(/\s+/g, '')
    .replace(/区域/g, '')
    .replace(/室/g, '')
    .replace(/[０-９]/g, (c: string) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

// 冲突检测逻辑 - 使用增强的约束检查器
const checkConflicts = (teacher: Teacher) => {
  process.env.NODE_ENV === 'development' && console.log('🔍 [人工修改] 开始约束检查:', {
    teacher: teacher.name,
    editingField: props.editingField,
    student: props.editingRecord?.student,
  })

  // 使用新的约束检查器
  const violations = checkManualEditConstraints(
    teacher,
    props.editingField,
    props.editingRecord,
    props.allScheduleRecords || [],
    props.availableTeachers // 🆕 传递availableTeachers用于HC7和HC8b检查
  )

  // 转换ConstraintViolation为Conflict格式
  const newConflicts: Conflict[] = violations.map(v => ({
    type: v.constraintId,
    severity: v.severity,
    title: v.title,
    description: v.description,
    suggestions: v.suggestions,
  }))

  process.env.NODE_ENV === 'development' && console.log(`✅ [人工修改] 约束检查完成，发现 ${newConflicts.length} 个问题:`)
  newConflicts.forEach(c => {
    process.env.NODE_ENV === 'development' && console.log(`  ${c.severity === 'high' ? '🚨' : '⚠️'} [${c.type}] ${c.title}`)
  })

  conflicts.value = newConflicts
}

// 监听器
watch(
  () => props.show,
  newShow => {
    if (newShow) {
      selectedTeacher.value = props.currentValue || ''
      generateSmartRecommendations()

      if (selectedTeacher.value) {
        const teacher = props.availableTeachers.find(t => t.name === selectedTeacher.value)
        if (teacher) {
          checkConflicts(teacher)
        }
      }
    }
  }
)

watch(selectedTeacher, newTeacher => {
  if (newTeacher) {
    const teacher = props.availableTeachers.find(t => t.name === newTeacher)
    if (teacher) {
      checkConflicts(teacher)
    }
  } else {
    conflicts.value = []
  }
})
</script>

<style scoped>
.smart-edit-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4;
}

.smart-edit-modal {
  @apply bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col;
  width: min(95vw, 900px);
}

.modal-header {
  @apply bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6;
}

.header-content {
  @apply flex items-start justify-between;
}

.title-section {
  @apply flex-1;
}

.modal-title {
  @apply text-xl font-semibold flex items-center gap-2 mb-3;
}

.title-icon {
  @apply w-5 h-5;
}

.edit-context {
  @apply flex flex-wrap gap-4 text-sm opacity-90;
}

.context-item {
  @apply flex items-center gap-1;
}

.context-icon {
  @apply w-4 h-4;
}

.modal-close {
  @apply p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 字段信息区域 */
.field-info-card {
  @apply bg-gray-50 rounded-lg p-4;
}

.field-header {
  @apply flex items-center justify-between mb-2;
}

.field-label {
  @apply font-medium text-gray-900;
}

.field-type {
  @apply px-2 py-1 rounded text-xs font-medium;
}

.field-type.main {
  @apply bg-blue-100 text-blue-700;
}

.field-type.backup {
  @apply bg-green-100 text-green-700;
}

.current-value {
  @apply flex items-center gap-2;
}

.current-value .label {
  @apply text-sm text-gray-600;
}

.current-value .value {
  @apply font-medium;
}

.current-value .value.empty {
  @apply text-gray-400;
}

/* 推荐区域 */
.section-header {
  @apply flex items-center gap-2 mb-4;
}

.section-icon {
  @apply w-5 h-5 text-blue-600;
}

.section-title {
  @apply text-lg font-semibold text-gray-900;
}

.recommendation-count,
.conflict-count {
  @apply ml-auto text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded;
}

.recommendations-list {
  @apply space-y-3;
}

.recommendation-item {
  @apply border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md;
}

.recommendation-item.selected {
  @apply border-blue-500 bg-blue-50;
}

.recommendation-item.priority-high {
  @apply border-green-300 bg-green-50;
}

.recommendation-item.priority-medium {
  @apply border-yellow-300 bg-yellow-50;
}

.recommendation-item.priority-low {
  @apply border-gray-300;
}

.recommendation-header {
  @apply flex items-center justify-between mb-3;
}

.teacher-info {
  @apply flex flex-col;
}

.teacher-name {
  @apply font-medium text-gray-900;
}

.teacher-dept {
  @apply text-sm text-gray-600;
}

.recommendation-score {
  @apply flex items-center gap-2;
}

.score-bar {
  @apply w-16 h-2 bg-gray-200 rounded-full overflow-hidden;
}

.score-fill {
  @apply h-full bg-gradient-to-r from-green-400 to-green-600 transition-all;
}

.score-text {
  @apply text-sm font-medium text-gray-700;
}

.recommendation-reasons {
  @apply flex flex-wrap gap-2 mb-2;
}

.reason-tag {
  @apply flex items-center gap-1 px-2 py-1 rounded text-xs font-medium;
}

.reason-tag.department_match {
  @apply bg-blue-100 text-blue-700;
}

.reason-tag.workload_balance {
  @apply bg-green-100 text-green-700;
}

.reason-tag.night_shift_preferred {
  @apply bg-purple-100 text-purple-700;
}

.reason-tag.specialty_match {
  @apply bg-orange-100 text-orange-700;
}

.reason-icon {
  @apply w-3 h-3;
}

.recommendation-warnings {
  @apply space-y-1;
}

.warning-item {
  @apply flex items-center gap-2 text-sm text-orange-600;
}

.warning-icon {
  @apply w-4 h-4;
}

/* 冲突区域 */
.conflicts-section .section-icon {
  @apply text-red-500;
}

.conflicts-list {
  @apply space-y-3;
}

.conflict-item {
  @apply border rounded-lg p-4;
}

.conflict-item.high {
  @apply border-red-300 bg-red-50;
}

.conflict-item.medium {
  @apply border-orange-300 bg-orange-50;
}

.conflict-item.low {
  @apply border-yellow-300 bg-yellow-50;
}

.conflict-header {
  @apply flex items-center gap-2 mb-2;
}

.conflict-icon {
  @apply w-4 h-4;
}

.conflict-title {
  @apply font-medium;
}

.conflict-severity {
  @apply ml-auto text-xs px-2 py-1 rounded;
}

.conflict-item.high .conflict-severity {
  @apply bg-red-200 text-red-800;
}

.conflict-item.medium .conflict-severity {
  @apply bg-orange-200 text-orange-800;
}

.conflict-item.low .conflict-severity {
  @apply bg-yellow-200 text-yellow-800;
}

.conflict-description {
  @apply text-sm text-gray-700 mb-2;
}

.conflict-suggestions {
  @apply text-sm;
}

.suggestions-label {
  @apply font-medium text-gray-700;
}

.suggestions-list {
  @apply mt-1 pl-4 space-y-1;
}

/* 手动选择区域 */
.toggle-all-btn {
  @apply ml-auto text-sm text-blue-600 hover:text-blue-800 font-medium;
}

.search-box {
  @apply relative mb-4;
}

.search-icon {
  @apply absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400;
}

.search-input {
  @apply w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.teachers-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3;
}

.teacher-card {
  @apply border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm;
}

.teacher-card.selected {
  @apply border-blue-500 bg-blue-50;
}

.teacher-card.unavailable {
  @apply border-gray-200 bg-gray-50 cursor-not-allowed opacity-60;
}

.teacher-card.recommended {
  @apply border-green-300 bg-green-50;
}

.teacher-header {
  @apply flex items-center justify-between mb-2;
}

.teacher-name {
  @apply font-medium text-gray-900;
}

.teacher-status {
  @apply flex gap-1;
}

.status-badge {
  @apply text-xs px-2 py-1 rounded font-medium;
}

.status-badge.available {
  @apply bg-green-100 text-green-700;
}

.status-badge.unavailable {
  @apply bg-red-100 text-red-700;
}

.status-badge.recommended {
  @apply bg-blue-100 text-blue-700;
}

.teacher-details {
  @apply flex justify-between text-sm text-gray-600 mb-2;
}

.teacher-conflicts {
  @apply flex items-center gap-1 text-xs text-orange-600;
}

.conflict-icon-small {
  @apply w-3 h-3;
}

/* 提示信息区域 */
.selection-hint {
  @apply bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3;
}

.hint-icon {
  @apply text-2xl flex-shrink-0;
}

.hint-text {
  @apply text-sm text-gray-700;
}

.hint-text strong {
  @apply text-blue-700 font-semibold;
}

/* 模态框底部 */
.modal-footer {
  @apply border-t bg-gray-50 p-6 flex items-center justify-end;
}

.action-btn {
  @apply px-4 py-2 rounded-lg font-medium transition-colors;
}

.secondary-btn {
  @apply border border-gray-300 text-gray-700 hover:bg-gray-50;
}

.primary-btn {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed;
}

.primary-btn.has-conflicts {
  @apply bg-orange-600 hover:bg-orange-700;
}

/* 移动端优化 */
@media (max-width: 767px) {
  .smart-edit-modal {
    width: 95vw;
    max-height: 95vh;
  }

  .modal-header {
    @apply p-4;
  }

  .modal-title {
    @apply text-lg;
  }

  .edit-context {
    @apply flex-col gap-2;
  }

  .modal-body {
    @apply p-4 space-y-4;
  }

  .teachers-grid {
    @apply grid-cols-1;
  }

  .modal-footer {
    @apply flex-col gap-4 items-stretch p-4;
  }

  .footer-actions {
    @apply flex-col;
  }

  .action-btn {
    @apply w-full py-3;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .recommendation-item,
  .teacher-card,
  .reason-tag-btn {
    @apply min-h-[44px];
  }
}

/* 修改原因弹窗样式 */
.reason-dialog-overlay {
  @apply fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4;
  animation: fadeIn 0.2s ease-out;
}

.reason-dialog {
  @apply bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col;
  width: min(90vw, 500px);
  max-height: 90vh;
  animation: slideUp 0.3s ease-out;
}

.reason-dialog-header {
  @apply bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 flex items-center justify-between;
}

.reason-dialog-title {
  @apply text-lg font-semibold flex items-center gap-2;
}

.dialog-close {
  @apply p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors;
}

.reason-dialog-body {
  @apply p-6 space-y-5 overflow-y-auto;
  flex: 1;
}

.selected-teacher-info {
  @apply space-y-2;
}

.info-label {
  @apply text-sm font-medium text-gray-700 flex items-center gap-1;
}

.required-indicator {
  @apply text-red-500;
}

.teacher-info-card {
  @apply bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-300;
}

.teacher-name-large {
  @apply text-xl font-bold text-gray-900 mb-1;
}

.teacher-dept-large {
  @apply text-sm text-gray-600;
}

.dialog-conflicts {
  @apply space-y-3;
}

.hard-conflict-alert {
  @apply flex items-start gap-3 bg-red-50 border-2 border-red-300 rounded-lg p-4;
}

.soft-conflict-alert {
  @apply flex items-start gap-3 bg-orange-50 border-2 border-orange-300 rounded-lg p-4;
}

.alert-icon {
  @apply w-5 h-5 flex-shrink-0 mt-0.5;
}

.hard-conflict-alert .alert-icon {
  @apply text-red-600;
}

.soft-conflict-alert .alert-icon {
  @apply text-orange-600;
}

.alert-title {
  @apply font-semibold text-gray-900 mb-1;
}

.alert-desc {
  @apply text-sm text-gray-700;
}

.conflict-list {
  @apply mt-2 pl-4 space-y-1 text-sm text-gray-600;
  list-style-type: disc;
}

.reason-selection {
  @apply space-y-2;
}

.reason-tags-dialog {
  @apply flex flex-wrap gap-2;
}

.reason-tag-btn-dialog {
  @apply px-3 py-2 text-sm border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors;
}

.reason-tag-btn-dialog.selected {
  @apply border-blue-500 bg-blue-50 text-blue-700 font-medium;
}

.reason-detail {
  @apply space-y-2;
}

.reason-textarea-dialog {
  @apply w-full p-3 border-2 border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all;
}

.reason-dialog-footer {
  @apply border-t bg-gray-50 p-5 flex gap-3;
}

.dialog-btn {
  @apply flex-1 px-4 py-3 rounded-lg font-medium transition-colors;
}

.cancel-btn {
  @apply border-2 border-gray-300 text-gray-700 hover:bg-gray-100;
}

.confirm-btn {
  @apply bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed;
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

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端适配 */
@media (max-width: 767px) {
  .reason-dialog {
    width: 95vw;
  }

  .reason-dialog-header {
    @apply p-4;
  }

  .reason-dialog-title {
    @apply text-base;
  }

  .reason-dialog-body {
    @apply p-4 space-y-4;
  }

  .reason-dialog-footer {
    @apply flex-col p-4;
  }

  .dialog-btn {
    @apply w-full;
  }
}
</style>
