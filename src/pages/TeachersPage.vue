<template>
  <div class="app-container">
    <!-- 侧边栏-->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo-container">
          <div class="logo-icon">
            <img src="/icon.png" alt="系统图标" class="logo-img" />
          </div>
          <div class="logo-text" v-show="!sidebarCollapsed">
            <h1 class="system-title">考试自动排班助手</h1>
            <p class="system-subtitle">Examiner Assignment Assistant</p>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-items">
          <router-link to="/" class="nav-item">
            <Home class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">首页</span>
          </router-link>
          <router-link to="/teachers" class="nav-item nav-item-active">
            <Users class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">考官管理</span>
          </router-link>
          <router-link to="/instructor-assignment" class="nav-item">
            <Shuffle class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">考官分配</span>
          </router-link>
          <router-link to="/schedules" class="nav-item">
            <Calendar class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">自动排班</span>
          </router-link>
          <!-- 隐藏数据统计页面 -->
          <!-- <router-link to="/statistics" class="nav-item">
            <BarChart class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">数据统计</span>
          </router-link> -->
        </div>
      </nav>

      <!-- 版本号显示 -->
      <div class="sidebar-footer" v-show="!sidebarCollapsed">
        <div class="version-info">
          <span class="version-label">版本</span>
          <span class="version-number">v{{ appVersion }}</span>
        </div>
      </div>

      <!-- 侧边栏收缩按钮-->
      <div class="sidebar-toggle" @click="toggleSidebar">
        <ChevronLeft class="toggle-icon" :class="{ rotated: sidebarCollapsed }" />
      </div>
    </aside>

    <!-- 主内容区域-->
    <div class="main-content">
      <!-- 页面标题区-->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">考官管理</h1>
          <div class="storage-info">
            <div class="storage-stats" v-if="storageStats.cacheHits !== undefined">
              <span class="stats-item">缓存命中: {{ storageStats.cacheHits }}</span>
              <span class="stats-item">数据大小: {{ storageStats.dataSize }}</span>
              <span class="stats-item"> 命中率: {{ storageStats.cacheHitRate }} </span>
            </div>
            <div class="auto-cleanup-info">
              <span class="info-icon">ℹ️</span>
              <span class="info-text">过期的不可用日期将在每日凌晨零点自动清理并恢复可用状态</span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="action-btn action-btn-secondary"
            :class="{ disabled: !hasSelectedTeachers }"
            @click="deleteSelectedTeachers"
          >
            <Trash2 class="btn-icon" />
            <span>删除</span>
          </button>
          <button class="action-btn action-btn-secondary" @click="importTeachers">
            <Download class="btn-icon" />
            <span>导入</span>
          </button>
          <button class="action-btn action-btn-secondary" @click="exportTeachers">
            <Upload class="btn-icon" />
            <span>导出</span>
          </button>
          <button class="action-btn action-btn-primary" @click="showAddTeacherModal">
            <Plus class="btn-icon" />
            <span>新增考官</span>
          </button>
        </div>
      </div>

      <!-- 隐藏的文件输入-->
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls,.csv"
        style="display: none"
        @change="handleFileUpload"
      />

      <!-- 考官表格 -->
      <div class="table-container">
        <table class="teachers-table">
          <thead>
            <tr>
              <th class="checkbox-column">
                <input
                  type="checkbox"
                  @change="toggleSelectAll"
                  :checked="teachers.length > 0 && teachers.every(t => t.selected)"
                />
              </th>
              <th>姓名</th>
              <th>所在科室</th>
              <th>所在班组</th>
              <th>当日班次</th>
              <th>不可用日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="teacher in teachers"
              :key="teacher.id"
              :class="{ selected: teacher.selected }"
            >
              <td class="checkbox-column">
                <input
                  type="checkbox"
                  v-model="teacher.selected"
                  @change="toggleTeacherSelect(teacher)"
                />
              </td>
              <td>{{ teacher.name }}</td>
              <td>{{ displayDepartment(teacher.department) }}</td>
              <td>{{ teacher.group }}</td>
              <td>{{ teacher.shift }}</td>
              <td>
                <div class="unavailable-dates-cell">
                  <div
                    v-if="teacher.unavailablePeriods && teacher.unavailablePeriods.length > 0"
                    class="dates-list"
                  >
                    <div
                      v-for="period in teacher.unavailablePeriods"
                      :key="period.id"
                      class="date-item"
                      :title="period.reason"
                    >
                      <span class="date-range">
                        {{ period.startDate }}
                        <span v-if="period.startDate !== period.endDate">
                          ~ {{ period.endDate }}</span
                        >
                      </span>
                      <span v-if="period.reason" class="date-reason">{{ period.reason }}</span>
                    </div>
                  </div>
                  <span v-else class="no-dates">-</span>
                  <button
                    @click="openUnavailableModal(teacher)"
                    class="manage-dates-btn"
                    :title="
                      teacher.unavailablePeriods && teacher.unavailablePeriods.length > 0
                        ? '管理不可用期'
                        : '添加不可用期'
                    "
                  >
                    <Settings class="btn-icon-small" />
                  </button>
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <button
                    class="action-btn-small action-btn-edit"
                    @click="editTeacher(teacher)"
                    title="编辑考官"
                  >
                    <Edit class="action-icon" />
                  </button>
                  <button
                    class="action-btn-small action-btn-danger"
                    @click="deleteSingleTeacher(teacher)"
                    title="删除考官"
                  >
                    <Trash2 class="action-icon" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="teachers.length === 0">
              <td colspan="7" class="empty-state">
                <div class="empty-content">
                  <Users class="empty-icon" />
                  <p>暂无考官数据</p>
                  <button class="action-btn action-btn-primary" @click="showAddTeacherModal">
                    <Plus class="btn-icon" />
                    <span>添加第一个考官</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增/编辑考官弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click="closeAddModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ isEditMode ? '编辑考官' : '新增考官' }}</h2>
          <button class="modal-close" @click="closeAddModal">
            <X class="close-icon" />
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveNewTeacher">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">姓名 *</label>
                <input
                  type="text"
                  v-model="newTeacher.name"
                  class="form-input"
                  placeholder="请输入考官姓名"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">所在科室 *</label>
                <select v-model="newTeacher.department" class="form-select" required>
                  <option value="">请选择科室</option>
                  <option value="区域一室">区域一室</option>
                  <option value="区域二室">区域二室</option>
                  <option value="区域三室">区域三室</option>
                  <option value="区域四室">区域四室</option>
                  <option value="区域五室">区域五室</option>
                  <option value="区域六室">区域六室</option>
                  <option value="区域七室">区域七室</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">所在班组</label>
                <select
                  v-model="newTeacher.group"
                  class="form-select"
                  @change="updateShiftForGroup"
                >
                  <option value="">请选择班组</option>
                  <option value="一组">一组</option>
                  <option value="二组">二组</option>
                  <option value="三组">三组</option>
                  <option value="四组">四组</option>
                  <option value="行政班">行政班</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">当日班次</label>
                <input
                  type="text"
                  :value="newTeacher.shift"
                  class="form-input"
                  placeholder="根据班组自动显示"
                  readonly
                  disabled
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group full-width">
                <label class="form-label">状态</label>
                <div class="radio-group">
                  <label class="radio-item">
                    <input type="radio" v-model="newTeacher.status" value="可用" />
                    <span class="radio-text">可用</span>
                  </label>
                  <label class="radio-item">
                    <input type="radio" v-model="newTeacher.status" value="不可用" />
                    <span class="radio-text">不可用</span>
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="action-btn action-btn-secondary" @click="closeAddModal">
            取消
          </button>
          <button type="button" class="action-btn action-btn-primary" @click="saveTeacher">
            {{ isEditMode ? '保存修改' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content modal-small" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">确认删除</h2>
          <button class="modal-close" @click="cancelDelete">
            <X class="close-icon" />
          </button>
        </div>
        <div class="modal-body">
          <div class="confirm-content">
            <AlertCircle class="confirm-icon" />
            <p class="confirm-text">
              {{
                deleteTarget
                  ? `确定要删除考官「${deleteTarget.name}」吗？`
                  : `确定要删除选中的 ${selectedTeachers.length} 个考官吗？`
              }}
            </p>
            <p class="confirm-warning">此操作不可撤销，请谨慎操作。</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="action-btn action-btn-secondary" @click="cancelDelete">
            取消
          </button>
          <button type="button" class="action-btn action-btn-danger" @click="confirmDelete">
            确认删除
          </button>
        </div>
      </div>
    </div>

    <!-- 🆕 不可用期设置弹窗 -->
    <div v-if="showUnavailableModal" class="modal-overlay" @click="closeUnavailableModal">
      <div class="modal-content modal-medium" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">管理不可用期 - {{ currentTeacherForUnavailable?.name }}</h2>
          <button class="modal-close" @click="closeUnavailableModal">
            <X class="close-icon" />
          </button>
        </div>
        <div class="modal-body">
          <!-- 添加新不可用期 -->
          <div class="unavailable-form">
            <h3 class="form-section-title">添加不可用期</h3>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">开始日期 <span class="required">*</span></label>
                <input
                  type="date"
                  v-model="newUnavailablePeriod.startDate"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">结束日期 <span class="required">*</span></label>
                <input
                  type="date"
                  v-model="newUnavailablePeriod.endDate"
                  class="form-input"
                  :min="newUnavailablePeriod.startDate"
                  required
                />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">原因/备注</label>
              <textarea
                v-model="newUnavailablePeriod.reason"
                class="form-textarea"
                placeholder="请输入不可用的原因，如：请假、培训、出差等"
                rows="3"
              ></textarea>
            </div>
            <button
              type="button"
              class="action-btn action-btn-primary"
              @click="addUnavailablePeriod"
            >
              <Plus class="btn-icon" />
              <span>添加不可用期</span>
            </button>
          </div>

          <!-- 不可用期列表 -->
          <div
            class="unavailable-list"
            v-if="
              currentTeacherForUnavailable?.unavailablePeriods &&
              currentTeacherForUnavailable.unavailablePeriods.length > 0
            "
          >
            <h3 class="form-section-title">当前不可用期</h3>
            <div class="unavailable-items">
              <div
                v-for="period in currentTeacherForUnavailable.unavailablePeriods"
                :key="period.id"
                class="unavailable-item"
                :class="{ 'period-expired': isPeriodExpired(period) }"
              >
                <div class="item-content">
                  <div class="item-dates">
                    <span class="date-label">日期:</span>
                    <span class="date-value">{{ period.startDate }}</span>
                    <span v-if="period.startDate !== period.endDate" class="date-separator"
                      >至</span
                    >
                    <span v-if="period.startDate !== period.endDate" class="date-value">{{
                      period.endDate
                    }}</span>
                    <span v-if="isPeriodExpired(period)" class="expired-badge">已过期</span>
                  </div>
                  <div class="item-reason">
                    <span class="reason-label">原因:</span>
                    <span class="reason-value">{{ period.reason }}</span>
                  </div>
                </div>
                <button
                  class="item-delete-btn"
                  @click="removeUnavailablePeriod(currentTeacherForUnavailable!, period.id)"
                  title="删除"
                >
                  <Trash2 class="delete-icon" />
                </button>
              </div>
            </div>
          </div>
          <div v-else class="unavailable-empty">
            <p>暂无不可用期记录</p>
          </div>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="action-btn action-btn-secondary"
            @click="closeUnavailableModal"
          >
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 🆕 导入重复数据确认弹窗 -->
    <div v-if="showDuplicateConfirmModal" class="modal-overlay" @click="closeDuplicateConfirmModal">
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">导入数据检测</h2>
          <button class="modal-close" @click="closeDuplicateConfirmModal">
            <X class="close-icon" />
          </button>
        </div>
        <div class="modal-body">
          <div v-if="duplicateDataAnalysis" class="duplicate-analysis">
            <!-- 统计信息 -->
            <div class="analysis-summary">
              <div class="summary-item">
                <span class="summary-label">总计：</span>
                <span class="summary-value">{{ duplicateDataAnalysis.items.length }} 条</span>
              </div>
              <div class="summary-item success">
                <span class="summary-label">新数据：</span>
                <span class="summary-value">{{ duplicateDataAnalysis.newCount }} 条</span>
              </div>
              <div class="summary-item warning" v-if="duplicateDataAnalysis.duplicateCount > 0">
                <span class="summary-label">重复：</span>
                <span class="summary-value">{{ duplicateDataAnalysis.duplicateCount }} 条</span>
              </div>
              <div class="summary-item error" v-if="duplicateDataAnalysis.anomalyCount > 0">
                <span class="summary-label">异常：</span>
                <span class="summary-value">{{ duplicateDataAnalysis.anomalyCount }} 条</span>
              </div>
            </div>

            <!-- 处理方式选择 -->
            <div class="import-options">
              <h3 class="options-title">请选择处理方式：</h3>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" value="new-only" v-model="selectedDuplicateAction" />
                  <span class="radio-label">
                    <strong>仅导入新数据</strong>
                    <small>（推荐）跳过所有重复和异常数据，只导入新的考官信息</small>
                  </span>
                </label>
                <label class="radio-option">
                  <input type="radio" value="skip" v-model="selectedDuplicateAction" />
                  <span class="radio-label">
                    <strong>跳过重复项</strong>
                    <small>保留现有数据，导入所有新数据（包括异常数据）</small>
                  </span>
                </label>
                <label class="radio-option">
                  <input type="radio" value="overwrite" v-model="selectedDuplicateAction" />
                  <span class="radio-label">
                    <strong>覆盖现有数据</strong>
                    <small>用新数据替换重复项（谨慎使用）</small>
                  </span>
                </label>
              </div>
            </div>

            <!-- 详细数据列表 -->
            <div class="data-details">
              <h3 class="details-title">数据详情：</h3>
              <div class="details-list">
                <div
                  v-for="(item, index) in duplicateDataAnalysis.items"
                  :key="index"
                  class="detail-item"
                  :class="{
                    'item-new': !item.isDuplicate && !item.isAnomaly,
                    'item-duplicate': item.isDuplicate,
                    'item-anomaly': item.isAnomaly,
                  }"
                >
                  <div class="item-info">
                    <span class="item-name">{{ item.importedTeacher.name }}</span>
                    <span class="item-dept">{{ displayDepartment(item.importedTeacher.department) }}</span>
                    <span class="item-group">{{ item.importedTeacher.group }}</span>
                    <span class="item-status">{{ item.importedTeacher.status }}</span>
                  </div>
                  <div class="item-badges">
                    <span v-if="!item.isDuplicate && !item.isAnomaly" class="badge badge-new"
                      >新数据</span
                    >
                    <span v-if="item.isDuplicate" class="badge badge-duplicate">重复</span>
                    <span v-if="item.isAnomaly" class="badge badge-anomaly">异常</span>
                  </div>
                  <div v-if="item.anomalyReasons.length > 0" class="item-errors">
                    <span
                      v-for="(reason, idx) in item.anomalyReasons"
                      :key="idx"
                      class="error-reason"
                    >
                      {{ reason }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="action-btn action-btn-secondary"
            @click="closeDuplicateConfirmModal"
          >
            取消
          </button>
          <button
            type="button"
            class="action-btn action-btn-primary"
            @click="handleDuplicateImport"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  Home,
  Users,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronDown,
  Trash2,
  Download,
  Upload,
  Plus,
  X,
  Check,
  AlertCircle,
  BarChart,
  Edit,
  Shuffle,
} from 'lucide-vue-next'
import {
  calculateDutySchedule,
  getGroupDutySchedule,
  updateTeacherShift,
  type Teacher,
  type DutySchedule,
  type UnavailablePeriod,
} from '../utils/scheduleService'
import {
  unifiedStorageService,
  type ExtendedTeacher,
  type UnifiedStorageConfig,
  type StorageStats,
} from '../services/unifiedStorageService'
import { useSidebarAutoCollapse } from '../composables/useSidebarAutoCollapse'
import { useResponsive } from '../composables/useResponsive'
import { DateUtils as dateUtils } from '../utils/dateUtils'
import { normalizeDeptToFull } from '../utils/departmentNormalizer'

// 🆕 科室名称显示转换函数（统一显示为"区域X室"格式）
const displayDepartment = (dept: string | undefined): string => {
  if (!dept) return '未分配科室'
  return normalizeDeptToFull(dept)
}

// 使用响应式功能
const { isMobile, isTablet, isDesktop, modalConfig } = useResponsive()

// 🆕 重复数据分析结果类型
interface DuplicateItem {
  importedTeacher: Teacher
  existingTeacher: Teacher | null
  isDuplicate: boolean
  isAnomaly: boolean
  anomalyReasons: string[]
}

interface DuplicateAnalysisResult {
  hasDuplicates: boolean
  hasAnomalies: boolean
  duplicateCount: number
  newCount: number
  anomalyCount: number
  items: DuplicateItem[]
}

// 考官数据类型定义 - 现在使用集中化的类型定义

// 应用版本号 - 从 package.json 自动读取
const appVersion = ref(import.meta.env.VITE_APP_VERSION || '6.1.0')

// 响应式数据
const sidebarCollapsed = ref(false)
const dropdownOpen = ref(false)
const selectedStatus = ref('可用')
const showAddModal = ref(false)
const showDeleteConfirm = ref(false)
const deleteTarget = ref<Teacher | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isEditMode = ref(false) // 🆕 是否为编辑模式
const editingTeacherId = ref<string | null>(null) // 🆕 正在编辑的考官ID

// 🆕 导入重复检测相关数据
const showDuplicateConfirmModal = ref(false)
const pendingImportData = ref<Teacher[]>([])
const duplicateDataAnalysis = ref<DuplicateAnalysisResult | null>(null)
const selectedDuplicateAction = ref<'overwrite' | 'skip' | 'new-only' | 'manual'>('new-only')

// 🆕 不可用期管理相关数据
const showUnavailableModal = ref(false)
const currentTeacherForUnavailable = ref<Teacher | null>(null)
const newUnavailablePeriod = ref<{
  startDate: string
  endDate: string
  reason: string
}>({
  startDate: '',
  endDate: '',
  reason: '',
})

// 自动收缩侧边栏功能
const { checkContentOverflowDelayed, triggerCheck } = useSidebarAutoCollapse(
  '.app-container',
  '.teachers-table',
  () => sidebarCollapsed.value,
  (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed
  },
  {
    enableLogging: false,
  }
)

// 存储配置
const storageStats = ref<StorageStats>({
  environment: 'web',
  primary: 'localStorage',
  cacheHits: 0,
  cacheMisses: 0,
  cacheHitRate: '0%',
  avgResponseTime: 0,
  dataSize: '0 B',
})

// 初始化存储服务
const initStorageService = async () => {
  try {
    // 统一存储服务已经是单例，直接初始化
    await unifiedStorageService.init()

    // 获取存储统计信息
    storageStats.value = unifiedStorageService.getStorageStats()
    process.env.NODE_ENV === 'development' && console.log('统一存储服务初始化完成', storageStats.value)
  } catch (error) {
    console.error('存储服务初始化失败', error)
  }
}

// 从存储加载考官数据
const loadTeachersFromStorage = async (): Promise<Teacher[]> => {
  try {
    const teachers = await unifiedStorageService.loadTeachers()
    process.env.NODE_ENV === 'development' && console.log('从存储加载考官数据', teachers.length, '条记录')
    // 使用集中化服务更新所有考官的班次（确保班次是最新的）
    // 🆕 同时确保所有考官都有unavailablePeriods字段
    return teachers.map((teacher: ExtendedTeacher) => {
      const updatedTeacher = updateTeacherShift(teacher as Teacher)
      if (!updatedTeacher.unavailablePeriods) {
        updatedTeacher.unavailablePeriods = []
      }
      return updatedTeacher
    })
  } catch (error) {
    console.error('加载考官数据失败:', error)
    return []
  }
}

// 保存考官数据到存储
const saveTeachersToStorage = async (teacherList: ExtendedTeacher[]) => {
  try {
    await unifiedStorageService.saveTeachers(teacherList)
    // 更新存储统计信息
    storageStats.value = unifiedStorageService.getStorageStats()
  } catch (error) {
    console.error('保存考官数据失败:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    alert('数据保存失败: ' + errorMessage)
  }
}

// 考官列表数据 - 异步加载
const teachers = ref<Teacher[]>([])
const isLoading = ref(true)

// 初始化考官数据
const initializeTeachers = async () => {
  isLoading.value = true
  try {
    await initStorageService()
    const loadedTeachers = await loadTeachersFromStorage()
    teachers.value = loadedTeachers

    // 数据加载完成后检查是否需要自动收缩侧边栏
    checkContentOverflowDelayed(300)
  } catch (error) {
    console.error('初始化考官数据失败', error)
  } finally {
    isLoading.value = false
  }
}

// 防抖保存函数 - 避免频繁保存影响性能
let saveTimeout: NodeJS.Timeout | null = null
const debouncedSave = async (teacherList: Teacher[]) => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(async () => {
    await saveTeachersToStorage(teacherList)
  }, 500) // 500ms防抖延迟
}

// 监听考官数据变化，使用防抖机制自动保存
watch(
  teachers,
  newTeachers => {
    if (!isLoading.value) {
      // 避免初始化时触发保存
      debouncedSave(newTeachers)
    }
  },
  { deep: true }
)

// 数据存储状态检查
const checkDataStorage = () => {
  process.env.NODE_ENV === 'development' && console.log('=== 数据存储状态检查 ===')
  process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('当前考官数据数量:', teachers.value.length)
  process.env.NODE_ENV === 'development' && console.log('考官数据详情:', teachers.value)

  // 检查localStorage中是否有相关数据
  const localStorageKeys = Object.keys(localStorage).filter(
    key => key.includes('teacher') || key.includes('examiner') || key.includes('schedule')
  )
  process.env.NODE_ENV === 'development' && console.log('localStorage相关数据:', localStorageKeys)

  // 检查sessionStorage中是否有相关数据
  const sessionStorageKeys = Object.keys(sessionStorage).filter(
    key => key.includes('teacher') || key.includes('examiner') || key.includes('schedule')
  )
  process.env.NODE_ENV === 'development' && console.log('sessionStorage相关数据:', sessionStorageKeys)

  process.env.NODE_ENV === 'development' && console.log('=== 数据存储检查完成 ===')
}

// 清除所有测试数据
const clearAllData = () => {
  process.env.NODE_ENV === 'development' && console.log('=== 开始清除测试数据 ===')

  // 清空考官列表（这会触发watch自动保存空数组到localStorage）
  teachers.value = []

  // 额外确保清除localStorage中的考官数据
  localStorage.removeItem('examiner_teachers')
  process.env.NODE_ENV === 'development' && console.log('已清除localStorage中的考官数据')

  // 清除其他相关数据
  const localStorageKeys = Object.keys(localStorage).filter(
    key => key.includes('teacher') || key.includes('examiner') || key.includes('schedule')
  )
  localStorageKeys.forEach(key => {
    localStorage.removeItem(key)
    process.env.NODE_ENV === 'development' && console.log(`已清除localStorage数据: ${key}`)
  })

  // 清除sessionStorage中的相关数据
  const sessionStorageKeys = Object.keys(sessionStorage).filter(
    key => key.includes('teacher') || key.includes('examiner') || key.includes('schedule')
  )
  sessionStorageKeys.forEach(key => {
    sessionStorage.removeItem(key)
    process.env.NODE_ENV === 'development' && console.log(`已清除sessionStorage数据: ${key}`)
  })

  process.env.NODE_ENV === 'development' && console.log('=== 测试数据清除完成 ===')
  console.log('当前考官数据数量:', teachers.value.length)

  alert('所有数据已清除完毕！数据将不再持久化保存')
}

// 新增考官表单数据
const newTeacher = ref<Partial<Teacher>>({
  name: '',
  department: '',
  group: '',
  shift: '',
  status: '可用',
})

// 计算属性
const selectedTeachers = computed(() => teachers.value.filter(teacher => teacher.selected))

const hasSelectedTeachers = computed(() => selectedTeachers.value.length > 0)

// 切换侧边栏状态
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 切换下拉菜单
const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

// 选择状态
const selectStatus = (status: string) => {
  selectedStatus.value = status
  dropdownOpen.value = false
}

// 全选/取消全选
const toggleSelectAll = () => {
  const allSelected = teachers.value.every(teacher => teacher.selected)
  teachers.value.forEach(teacher => {
    teacher.selected = !allSelected
  })
}

// 切换单个考官选择状态
const toggleTeacherSelect = (teacher: Teacher) => {
  teacher.selected = !teacher.selected
}

// 显示新增考官弹窗
const showAddTeacherModal = () => {
  isEditMode.value = false
  editingTeacherId.value = null
  newTeacher.value = {
    name: '',
    department: '',
    group: '',
    shift: '',
    status: '可用',
  }
  showAddModal.value = true
}

// 🆕 显示编辑考官弹窗
const editTeacher = (teacher: Teacher) => {
  isEditMode.value = true
  editingTeacherId.value = teacher.id
  newTeacher.value = {
    name: teacher.name,
    department: teacher.department,
    group: teacher.group,
    shift: teacher.shift,
    status: teacher.status,
  }
  showAddModal.value = true
}

// 根据班组更新当日班次
const updateShiftForGroup = () => {
  if (!newTeacher.value.group) {
    newTeacher.value.shift = ''
    return
  }

  // 使用集中化的调度服务计算当日班次
  const today = new Date()
  const groupSchedule = getGroupDutySchedule(today, newTeacher.value.group)

  if (groupSchedule) {
    newTeacher.value.shift = groupSchedule.status
  } else {
    newTeacher.value.shift = '未排班'
  }
}

// 关闭新增/编辑考官弹窗
const closeAddModal = () => {
  showAddModal.value = false
  isEditMode.value = false
  editingTeacherId.value = null
  newTeacher.value = {
    name: '',
    department: '',
    group: '',
    shift: '',
    status: '可用',
  }
}

// 🆕 保存考官（支持新增和编辑）
const saveTeacher = () => {
  if (!newTeacher.value.name || !newTeacher.value.department || !newTeacher.value.group) {
    alert('请填写必要信息（姓名、科室、班组）')
    return
  }

  if (isEditMode.value && editingTeacherId.value) {
    // 编辑模式：更新现有考官
    const index = teachers.value.findIndex(t => t.id === editingTeacherId.value)
    if (index > -1) {
      const existingTeacher = teachers.value[index]
      const updatedTeacher: Teacher = {
        id: existingTeacher.id,
        name: newTeacher.value.name!,
        department: newTeacher.value.department!,
        group: newTeacher.value.group!,
        shift: '',
        status: newTeacher.value.status || '可用',
        selected: existingTeacher.selected,
        unavailablePeriods: existingTeacher.unavailablePeriods || [], // 保留不可用期，如果没有则初始化为空数组
      }

      // 使用集中化服务更新班次
      teachers.value[index] = updateTeacherShift(updatedTeacher)
      closeAddModal()
      alert('考官信息已更新')
    }
  } else {
    // 新增模式：添加新考官
    const baseTeacher: Teacher = {
      id: Date.now().toString(),
      name: newTeacher.value.name!,
      department: newTeacher.value.department!,
      group: newTeacher.value.group!,
      shift: '',
      status: newTeacher.value.status || '可用',
      selected: false,
      unavailablePeriods: [], // 🆕 初始化为空数组
    }

    // 使用集中化服务确保班次计算一致性
    const teacher = updateTeacherShift(baseTeacher)

    teachers.value.push(teacher)
    closeAddModal()
    alert('考官添加成功')
  }
}

// 保留旧函数名以兼容表单的 @submit
const saveNewTeacher = saveTeacher

// 删除选中的考官
const deleteSelectedTeachers = () => {
  if (!hasSelectedTeachers.value) {
    alert('请先选择要删除的考官')
    return
  }

  showDeleteConfirm.value = true
}

// 删除单个考官
const deleteSingleTeacher = (teacher: Teacher) => {
  deleteTarget.value = teacher
  showDeleteConfirm.value = true
}

// 确认删除
const confirmDelete = () => {
  if (deleteTarget.value) {
    // 删除单个考官
    const index = teachers.value.findIndex(t => t.id === deleteTarget.value!.id)
    if (index > -1) {
      teachers.value.splice(index, 1)
    }
  } else {
    // 删除选中的考官
    teachers.value = teachers.value.filter(teacher => !teacher.selected)
  }

  showDeleteConfirm.value = false
  deleteTarget.value = null
  alert('删除成功')
}

// 取消删除
const cancelDelete = () => {
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

// 导入考官数据
const importTeachers = () => {
  fileInput.value?.click()
}

// 处理文件上传（支持XLSX和CSV格式）
const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // 支持XLSX和CSV文件导入
  const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
  const isCSV = file.name.endsWith('.csv')

  if (!isXLSX && !isCSV) {
    alert('请选择Excel文件(.xlsx, .xls)或CSV文件')
    return
  }

  try {
    let importedTeachers: Teacher[] = []

    if (isXLSX) {
      // 处理Excel文件
      importedTeachers = await handleXLSXImport(file)
    } else {
      // 处理CSV文件
      importedTeachers = await handleCSVImport(file)
    }

    if (importedTeachers.length > 0) {
      // 🆕 检测重复和异常数据
      const duplicateAnalysis = analyzeDuplicateData(importedTeachers)

      if (duplicateAnalysis.hasDuplicates || duplicateAnalysis.hasAnomalies) {
        // 显示重复确认对话框
        pendingImportData.value = importedTeachers
        duplicateDataAnalysis.value = duplicateAnalysis
        showDuplicateConfirmModal.value = true
      } else {
        // 没有重复，直接导入
        teachers.value.push(...importedTeachers)
        alert(`成功导入 ${importedTeachers.length} 条考官数据！`)
      }
    } else {
      alert('没有有效的数据可导入')
    }
  } catch (error) {
    console.error('导入文件时出错', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    alert('导入失败，请检查文件格式是否正确：' + errorMessage)
  }

  target.value = '' // 清空文件输入
}

// 处理XLSX文件导入
const handleXLSXImport = async (file: File): Promise<Teacher[]> => {
  const XLSX = await import('xlsx')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // 转换为JSON数据
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length < 2) {
          reject(new Error('Excel文件格式不正确，至少需要标题行和一行数据'))
          return
        }

        const rawHeaders = jsonData[0] as any[]
        const headers = rawHeaders.map(h => String(h || '').trim()).filter(h => h)
        const expectedHeaders = ['姓名', '所在科室', '所在班组', '状态']

        process.env.NODE_ENV === 'development' && console.log('Excel导入调试信息:')
        process.env.NODE_ENV === 'development' && console.log('原始标题:', rawHeaders)
        process.env.NODE_ENV === 'development' && console.log('处理后标题', headers)

        // 创建列标题映射，支持多种可能的列名
        const headerMapping: { [key: string]: string[] } = {
          姓名: ['姓名', '名字', 'name', '考官姓名', '员工姓名', '人员姓名'],
          所在科室: ['所在科室', '科室', '部门', 'department', '所属科室', '工作科室'],
          所在班组: ['所在班组', '班组', 'group', '组别', '小组', '工作组'],
          状态: ['状态', 'status', '可用状态', '考官状态', '工作状态'],
        }

        // 查找实际的列索引
        const columnIndexes: { [key: string]: number } = {}
        Object.keys(headerMapping).forEach(standardHeader => {
          const possibleNames = headerMapping[standardHeader]
          for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toLowerCase().trim()
            const found = possibleNames.some(name => {
              const nameLower = name.toLowerCase()
              return (
                header === nameLower || header.includes(nameLower) || nameLower.includes(header)
              )
            })
            if (found) {
              columnIndexes[standardHeader] = i
              process.env.NODE_ENV === 'development' && console.log(`找到列映射: ${standardHeader} -> 第${i}列(${headers[i]})`)
              break
            }
          }
        })

        process.env.NODE_ENV === 'development' && console.log('列索引映射', columnIndexes)

        // 验证必要的列是否存在
        const requiredHeaders = ['姓名', '所在科室', '所在班组']
        const missingHeaders = requiredHeaders.filter(header => columnIndexes[header] === undefined)
        if (missingHeaders.length > 0) {
          const actualHeaders = headers.join(', ')
          const debugInfo = `\n\n调试信息:\n- 实际列数: ${headers.length}\n- 实际列标题: [${actualHeaders}]\n- 缺少的列: [${missingHeaders.join(', ')}]\n- 支持的姓名列格式: ${headerMapping['姓名'].join(', ')}`
          reject(
            new Error(
              `Excel文件缺少必要的列：${missingHeaders.join(', ')}${debugInfo}\n\n提示：请确保Excel文件包含必要的列，列标题可以是中文或英文`
            )
          )
          return
        }

        const importedTeachers: Teacher[] = []

        // 处理数据行
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[]
          if (!row || row.length === 0) continue

          // 使用列索引映射提取数据
          const name = String(row[columnIndexes['姓名']] || '').trim()
          const rawDepartment = String(row[columnIndexes['所在科室']] || '').trim()
          const rawGroup = String(row[columnIndexes['所在班组']] || '').trim()
          const status = String(row[columnIndexes['状态']] || '').trim()

          // 🔧 规范化科室名称
          const department = normalizeDepartmentName(rawDepartment)
          
          // 🔧 新增：规范化班组名称（支持"一"、"二"、"三"、"四"简写）
          const group = normalizeGroupName(rawGroup)

          // 验证必要字段
          if (!name || !department || !group) {
            console.warn(
              `第${i + 1}行数据不完整，跳过：姓名=${name}, 科室=${department}, 班组=${group}`
            )
            continue
          }

          const baseTeacher: Teacher = {
            id: Date.now().toString() + '_' + i,
            name: name,
            department: department,
            group: group,
            shift: '', // 将通过updateTeacherShift自动计算
            status: (status === '不可用' ? '不可用' : '可用') as '可用' | '不可用',
            selected: false,
          }

          // 使用集中化服务更新班次
          const teacher = updateTeacherShift(baseTeacher)
          importedTeachers.push(teacher)
        }

        resolve(importedTeachers)
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    }

    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 处理CSV文件导入
const handleCSVImport = async (file: File): Promise<Teacher[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = e => {
      try {
        const text = e.target?.result as string
        if (!text) {
          reject(new Error('文件内容为空'))
          return
        }

        // 解析CSV内容
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length < 2) {
          reject(new Error('CSV文件格式不正确，至少需要标题行和一行数据'))
          return
        }

        // 解析标题行
        const headers = parseCSVLine(lines[0])
        const expectedHeaders = ['姓名', '所在科室', '所在班组', '状态']

        // 验证必要的列是否存在
        const requiredHeaders = ['姓名', '所在科室', '所在班组']
        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header))
        if (missingHeaders.length > 0) {
          reject(
            new Error(
              `CSV文件缺少必要的列：${missingHeaders.join(', ')}\n\n期望的列：${expectedHeaders.join(', ')}`
            )
          )
          return
        }

        // 解析数据行
        const importedTeachers: Teacher[] = []

        for (let i = 1; i < lines.length; i++) {
          try {
            const values = parseCSVLine(lines[i])
            if (values.length === 0) continue

            // 创建考官对象
            const teacherData: any = {}
            headers.forEach((header, index) => {
              teacherData[header] = values[index] || ''
            })

            // 验证必要字段
            if (!teacherData['姓名'] || !teacherData['所在科室'] || !teacherData['所在班组']) {
              console.warn(`第${i + 1}行数据不完整，跳过`)
              continue
            }

            // 🔧 规范化科室名称
            const rawDepartment = teacherData['所在科室'].trim()
            const normalizedDepartment = normalizeDepartmentName(rawDepartment)
            
            // 🔧 新增：规范化班组名称
            const rawGroup = teacherData['所在班组'].trim()
            const normalizedGroup = normalizeGroupName(rawGroup)

            const baseTeacher: Teacher = {
              id: Date.now().toString() + '_' + i,
              name: teacherData['姓名'].trim(),
              department: normalizedDepartment,
              group: normalizedGroup,
              shift: '', // 将通过updateTeacherShift自动计算
              status: (teacherData['状态'] === '不可用' ? '不可用' : '可用') as '可用' | '不可用',
              selected: false,
            }

            // 使用集中化服务更新班次
            const teacher = updateTeacherShift(baseTeacher)
            importedTeachers.push(teacher)
          } catch (error) {
            console.error(`解析第${i + 1}行数据时出错:`, error)
          }
        }

        resolve(importedTeachers)
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    }

    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file, 'utf-8')
  })
}

// 规范化科室名称为"区域X室"格式
const normalizeDepartmentName = (rawName: string): string => {
  if (!rawName || !rawName.trim()) {
    return ''
  }

  const name = rawName.trim().toLowerCase()

  // 🔧 新增：检测非法科室名称（考试科目）
  const illegalKeywords = ['模拟机', '现场', '口试', '理论', '实操', '实践', '笔试']
  for (const keyword of illegalKeywords) {
    if (name.includes(keyword.toLowerCase())) {
      console.error(`🚨 [数据错误] 考官科室不能是考试科目: "${rawName}"`)
      throw new Error(
        `数据错误：考官科室 "${rawName}" 是考试科目，不是科室名称！\n请检查CSV文件中"所在科室"列的数据。`
      )
    }
  }

  // 🔧 修复：定义科室名称映射规则 - 统一标准化为单个中文数字
  // 必须与学员导入保持一致！
  const departmentMapping: { [key: string]: string } = {
    // 标准格式 - 标准化为单个中文数字
    区域一室: '一',
    区域二室: '二',
    区域三室: '三',
    区域四室: '四',
    区域五室: '五',
    区域六室: '六',
    区域七室: '七',
    区域八室: '八',
    区域九室: '九',
    区域十室: '十',

    // 数字格式变体
    区域1室: '一',
    区域2室: '二',
    区域3室: '三',
    区域4室: '四',
    区域5室: '五',
    区域6室: '六',
    区域7室: '七',
    区域8室: '八',
    区域9室: '九',
    区域10室: '十',

    // 简化格式（一室、二室等）
    一室: '一',
    二室: '二',
    三室: '三',
    四室: '四',
    五室: '五',
    六室: '六',
    七室: '七',
    八室: '八',
    九室: '九',
    十室: '十',
    
    // 🔧 新增：数字简写格式（1室、2室等）
    '1室': '一',
    '2室': '二',
    '3室': '三',
    '4室': '四',
    '5室': '五',
    '6室': '六',
    '7室': '七',
    '8室': '八',
    '9室': '九',
    '10室': '十',

    // 英文数字格式
    区域1: '一',
    区域2: '二',
    区域3: '三',
    区域4: '四',
    区域5: '五',
    区域6: '六',
    区域7: '七',
    区域8: '八',
    区域9: '九',
    区域10: '十',

    // 部门格式
    第一区域: '一',
    第二区域: '二',
    第三区域: '三',
    第四区域: '四',
    第五区域: '五',
    第六区域: '六',
    第七区域: '七',
    第八区域: '八',
    第九区域: '九',
    第十区域: '十',

    // 其他可能的格式
    '1区': '一',
    '2区': '二',
    '3区': '三',
    '4区': '四',
    '5区': '五',
    '6区': '六',
    '7区': '七',
    '8区': '八',
    '9区': '九',
    '10区': '十',

    一区: '一',
    二区: '二',
    三区: '三',
    四区: '四',
    五区: '五',
    六区: '六',
    七区: '七',
    八区: '八',
    九区: '九',
    十区: '十',
    
    // 🔧 新增：支持仅数字格式
    '1': '一',
    '2': '二',
    '3': '三',
    '4': '四',
    '5': '五',
    '6': '六',
    '7': '七',
    '8': '八',
    '9': '九',
    '10': '十',
  }

  // 直接匹配
  const directMatch = departmentMapping[name]
  if (directMatch) {
    return directMatch
  }

  // 🔧 修复：模糊匹配 - 统一标准化为单个中文数字（与学员保持一致）
  const numberPatterns = [
    { pattern: /区域?[一1]/, target: '一' },
    { pattern: /区域?[二2]/, target: '二' },
    { pattern: /区域?[三3]/, target: '三' },
    { pattern: /区域?[四4]/, target: '四' },
    { pattern: /区域?[五5]/, target: '五' },
    { pattern: /区域?[六6]/, target: '六' },
    { pattern: /区域?[七7]/, target: '七' },
    { pattern: /区域?[八8]/, target: '八' },
    { pattern: /区域?[九9]/, target: '九' },
    { pattern: /区域?[十10]/, target: '十' },
  ]

  for (const { pattern, target } of numberPatterns) {
    if (pattern.test(name)) {
      process.env.NODE_ENV === 'development' && console.log(`科室名称规范化: "${rawName}" -> "${target}"`)
      return target
    }
  }

  // 如果无法识别，返回原始值并记录日志
  console.warn(`无法识别的科室名称格式: "${rawName}"，保持原样`)
  return rawName.trim()
}

// 🆕 规范化班组名称（支持简写）
const normalizeGroupName = (rawName: string): string => {
  if (!rawName || !rawName.trim()) {
    return '一组' // 默认值
  }

  const name = rawName.trim()

  // 定义班组名称映射规则
  const groupMapping: { [key: string]: string } = {
    // 标准格式（已经是正确格式）
    '一组': '一组',
    '二组': '二组',
    '三组': '三组',
    '四组': '四组',
    
    // 🔧 新增：简写格式（一、二、三、四）
    '一': '一组',
    '二': '二组',
    '三': '三组',
    '四': '四组',
    
    // 数字格式
    '1组': '一组',
    '2组': '二组',
    '3组': '三组',
    '4组': '四组',
    '1': '一组',
    '2': '二组',
    '3': '三组',
    '4': '四组',
    
    // 特殊班组（保持原样）
    '白班': '白班',
    '日常班': '日常班',
    '晚班': '晚班',
    '周末班': '周末班',
    '行政班': '行政班',
    '无': '无'
  }

  // 直接匹配
  const directMatch = groupMapping[name]
  if (directMatch) {
    if (name !== directMatch) {
      process.env.NODE_ENV === 'development' && console.log(`🔄 [班组标准化] 考官班组 "${name}" → "${directMatch}"`)
    }
    return directMatch
  }

  // 如果无法识别，返回原始值并记录日志
  console.warn(`⚠️ 无法识别的班组格式: "${rawName}"，保持原样`)
  return rawName.trim()
}

// 🆕 分析导入数据中的重复和异常情况
const analyzeDuplicateData = (importedTeachers: Teacher[]): DuplicateAnalysisResult => {
  const items: DuplicateItem[] = []
  let duplicateCount = 0
  let newCount = 0
  let anomalyCount = 0

  for (const imported of importedTeachers) {
    // 查找是否存在重复（基于姓名+科室+班组）
    const existing = teachers.value.find(
      t =>
        t.name === imported.name &&
        t.department === imported.department &&
        t.group === imported.group
    )

    // 检测数据异常
    const anomalyReasons: string[] = []

    // 异常1：姓名为空
    if (!imported.name || imported.name.trim() === '') {
      anomalyReasons.push('姓名为空')
    }

    // 异常2：科室异常
    if (!imported.department || imported.department.trim() === '') {
      anomalyReasons.push('科室为空')
    }

    // 异常3：班组异常
    const validGroups = ['一组', '二组', '三组', '四组', '行政班', '无']
    if (!imported.group || !validGroups.includes(imported.group)) {
      anomalyReasons.push(`班组"${imported.group}"不合法（应为：${validGroups.join('、')}）`)
    }

    // 异常4：与现有数据冲突但信息不一致
    if (existing) {
      if (existing.status !== imported.status) {
        anomalyReasons.push(`状态冲突：现有"${existing.status}" vs 导入"${imported.status}"`)
      }
    }

    const isDuplicate = !!existing
    const isAnomaly = anomalyReasons.length > 0

    if (isDuplicate) duplicateCount++
    else newCount++

    if (isAnomaly) anomalyCount++

    items.push({
      importedTeacher: imported,
      existingTeacher: existing || null,
      isDuplicate,
      isAnomaly,
      anomalyReasons,
    })
  }

  return {
    hasDuplicates: duplicateCount > 0,
    hasAnomalies: anomalyCount > 0,
    duplicateCount,
    newCount,
    anomalyCount,
    items,
  }
}

// 🆕 处理重复数据导入确认
const handleDuplicateImport = () => {
  if (!duplicateDataAnalysis.value || pendingImportData.value.length === 0) return

  const action = selectedDuplicateAction.value
  const analysis = duplicateDataAnalysis.value

  let importedCount = 0
  let skippedCount = 0
  let overwrittenCount = 0

  switch (action) {
    case 'overwrite':
      // 全部覆盖：删除重复项，导入所有数据
      for (const item of analysis.items) {
        if (item.isDuplicate && item.existingTeacher) {
          const index = teachers.value.findIndex(t => t.id === item.existingTeacher!.id)
          if (index > -1) {
            teachers.value[index] = item.importedTeacher
            overwrittenCount++
          }
        } else {
          teachers.value.push(item.importedTeacher)
          importedCount++
        }
      }
      alert(`导入完成！新增${importedCount}条，覆盖${overwrittenCount}条数据`)
      break

    case 'skip':
      // 全部跳过：保留现有数据，只导入新数据
      for (const item of analysis.items) {
        if (!item.isDuplicate) {
          teachers.value.push(item.importedTeacher)
          importedCount++
        } else {
          skippedCount++
        }
      }
      alert(`导入完成！新增${importedCount}条，跳过${skippedCount}条重复数据`)
      break

    case 'new-only':
      // 仅导入新数据：不导入任何重复项
      for (const item of analysis.items) {
        if (!item.isDuplicate && !item.isAnomaly) {
          teachers.value.push(item.importedTeacher)
          importedCount++
        } else if (item.isDuplicate) {
          skippedCount++
        }
      }
      alert(`导入完成！新增${importedCount}条，跳过${skippedCount}条数据（包含重复和异常）`)
      break

    case 'manual':
      // 手动选择模式暂不实现，默认采用new-only策略
      alert('手动选择模式开发中，将采用"仅导入新数据"策略')
      for (const item of analysis.items) {
        if (!item.isDuplicate && !item.isAnomaly) {
          teachers.value.push(item.importedTeacher)
          importedCount++
        }
      }
      break
  }

  // 关闭对话框并清理数据
  closeDuplicateConfirmModal()
}

// 🆕 关闭重复确认对话框
const closeDuplicateConfirmModal = () => {
  showDuplicateConfirmModal.value = false
  pendingImportData.value = []
  duplicateDataAnalysis.value = null
  selectedDuplicateAction.value = 'new-only'
}

// 🆕 打开不可用期设置对话框
const openUnavailableModal = (teacher: Teacher) => {
  currentTeacherForUnavailable.value = teacher
  // 初始化为今天的日期 - 使用dateUtils获取标准日期格式
  const today = dateUtils.toStandardDate(new Date())
  newUnavailablePeriod.value = {
    startDate: today,
    endDate: today,
    reason: '',
  }
  showUnavailableModal.value = true
}

// 🆕 关闭不可用期设置对话框
const closeUnavailableModal = () => {
  showUnavailableModal.value = false
  currentTeacherForUnavailable.value = null
  newUnavailablePeriod.value = {
    startDate: '',
    endDate: '',
    reason: '',
  }
}

// 🆕 添加不可用期
const addUnavailablePeriod = () => {
  if (!currentTeacherForUnavailable.value) return

  const { startDate, endDate, reason } = newUnavailablePeriod.value

  // 验证必填字段
  if (!startDate || !endDate) {
    alert('请选择开始日期和结束日期')
    return
  }

  // 验证日期顺序 - 使用dateUtils比较日期
  if (dateUtils.compareDates(startDate, endDate) > 0) {
    alert('开始日期不能晚于结束日期')
    return
  }

  // 创建不可用期对象
  const period: UnavailablePeriod = {
    id: Date.now().toString(),
    startDate,
    endDate,
    reason: reason || '未填写原因',
    createdAt: dateUtils.toStandardDate(new Date()),
  }

  // 初始化不可用期数组（如果不存在）
  if (!currentTeacherForUnavailable.value.unavailablePeriods) {
    currentTeacherForUnavailable.value.unavailablePeriods = []
  }

  // 添加不可用期
  currentTeacherForUnavailable.value.unavailablePeriods.push(period)

  // 更新考官状态为不可用（如果有不可用期）
  if (currentTeacherForUnavailable.value.unavailablePeriods.length > 0) {
    currentTeacherForUnavailable.value.status = '不可用'
  }

  // 🔧 关键修复：保存到localStorage
  saveTeachersToStorage(teachers.value)

  closeUnavailableModal()
  alert(`已为考官「${currentTeacherForUnavailable.value.name}」添加不可用期`)
}

// 🆕 删除不可用期
const removeUnavailablePeriod = (teacher: Teacher, periodId: string) => {
  if (!teacher.unavailablePeriods) return

  const index = teacher.unavailablePeriods.findIndex(p => p.id === periodId)
  if (index > -1) {
    const removedPeriod = teacher.unavailablePeriods[index]
    teacher.unavailablePeriods.splice(index, 1)

    // 如果没有不可用期了，自动更新状态为可用
    if (teacher.unavailablePeriods.length === 0 && teacher.status === '不可用') {
      teacher.status = '可用'
      alert(`不可用期已删除，考官「${teacher.name}」已恢复为可用状态`)
    } else {
      alert('不可用期已删除')
    }

    // 🔧 关键修复：保存到localStorage
    saveTeachersToStorage(teachers.value)

    process.env.NODE_ENV === 'development' && console.log(
      `✅ 已删除考官「${teacher.name}」的不可用期: ${removedPeriod.startDate} ~ ${removedPeriod.endDate}`
    )
  }
}

// 🆕 检查不可用期是否已过期
const isPeriodExpired = (period: UnavailablePeriod): boolean => {
  // 使用dateUtils检查日期是否已过期
  return dateUtils.isDateInPast(period.endDate)
}

// 🆕 检查考官在指定日期是否可用
const isTeacherAvailableOnDate = (teacher: Teacher, date: string): boolean => {
  if (!teacher.unavailablePeriods || teacher.unavailablePeriods.length === 0) {
    return true
  }

  // 使用dateUtils检查日期是否在不可用期内
  return !teacher.unavailablePeriods.some(period => {
    return dateUtils.isDateInRange(date, period.startDate, period.endDate)
  })
}

// 🆕 获取考官当前的不可用期（如果有）
const getCurrentUnavailablePeriod = (teacher: Teacher): UnavailablePeriod | null => {
  if (!teacher.unavailablePeriods || teacher.unavailablePeriods.length === 0) {
    return null
  }

  // 使用dateUtils获取今天的标准日期格式
  const today = dateUtils.toStandardDate(new Date())
  return (
    teacher.unavailablePeriods.find(period => {
      return dateUtils.isDateInRange(today, period.startDate, period.endDate)
    }) || null
  )
}

// 解析CSV行（处理引号和逗号）
const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 双引号转义
        current += '"'
        i += 2
      } else {
        // 切换引号状态
        inQuotes = !inQuotes
        i++
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current.trim())
      current = ''
      i++
    } else {
      current += char
      i++
    }
  }

  // 添加最后一个字段
  result.push(current.trim())

  return result
}

// 导出考官数据为XLSX格式
const exportTeachers = async () => {
  if (teachers.value.length === 0) {
    alert('没有考官数据可导出！')
    return
  }

  try {
    // 动态导入xlsx库
    const XLSX = await import('xlsx')

    // 准备导出数据（移除专业特长字段）
    const exportData = teachers.value.map(teacher => ({
      姓名: teacher.name,
      所在科室: displayDepartment(teacher.department),
      所在班组: teacher.group,
      当日班次: teacher.shift,
      状态: teacher.status,
    }))

    // 创建工作簿和工作表
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(exportData)

    // 自动调整列宽
    const columnWidths: Array<{ wch: number }> = []
    const headers = Object.keys(exportData[0] || {})

    headers.forEach((header, index) => {
      // 计算标题长度
      let maxWidth = header.length * 2 // 中文字符宽度估算

      // 计算数据列的最大宽度
      exportData.forEach(row => {
        const cellValue = String(row[header as keyof typeof row] || '')
        const cellWidth = cellValue.length * (cellValue.match(/[\u4e00-\u9fa5]/g) ? 2 : 1)
        maxWidth = Math.max(maxWidth, cellWidth)
      })

      // 设置合理的列宽范围
      columnWidths.push({ wch: Math.min(Math.max(maxWidth, 10), 30) })
    })

    worksheet['!cols'] = columnWidths

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '考官数据')

    // 生成文件并下载
    const fileName = `考官数据_${dateUtils.toStorageDate(new Date())}.xlsx`
    XLSX.writeFile(workbook, fileName)

    alert('考官数据导出成功！')
  } catch (error) {
    console.error('导出失败:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    alert('导出失败，请稍后重试: ' + errorMessage)
  }
}

// 更新考官状态
const updateTeacherStatus = (teacher: Teacher, status: '可用' | '不可用') => {
  teacher.status = status
}

// 刷新所有考官的班次信息以确保数据同步
const refreshAllTeacherShifts = () => {
  teachers.value = teachers.value.map(teacher => updateTeacherShift(teacher))
  process.env.NODE_ENV === 'development' && console.log('所有考官班次已刷新以确保数据同步')
}

// 🆕 清理过期的不可用期
const cleanExpiredUnavailablePeriods = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // 设置为当天凌晨零点

  let hasChanges = false

  teachers.value.forEach(teacher => {
    if (!teacher.unavailablePeriods || teacher.unavailablePeriods.length === 0) {
      return
    }

    // 过滤掉已过期的不可用期（结束日期在今天之前的）
    const originalLength = teacher.unavailablePeriods.length
    teacher.unavailablePeriods = teacher.unavailablePeriods.filter(period => {
      const endDate = new Date(period.endDate)
      endDate.setHours(23, 59, 59, 999) // 设置为结束日期的23:59:59
      return endDate >= today // 保留今天及以后的不可用期
    })

    // 如果有不可用期被删除
    if (teacher.unavailablePeriods.length < originalLength) {
      hasChanges = true
      process.env.NODE_ENV === 'development' && console.log(
        `✅ 已清理考官「${teacher.name}」的 ${originalLength - teacher.unavailablePeriods.length} 个过期不可用期`
      )
    }

    // 如果没有不可用期了，自动设置为可用状态
    if (teacher.unavailablePeriods.length === 0 && teacher.status === '不可用') {
      teacher.status = '可用'
      process.env.NODE_ENV === 'development' && console.log(`✅ 考官「${teacher.name}」已自动恢复为可用状态`)
      hasChanges = true
    }
  })

  if (hasChanges) {
    process.env.NODE_ENV === 'development' && console.log('🔄 不可用期自动清理完成，数据已更新')
    // 触发数据保存
    saveTeachersToStorage(teachers.value)
  } else {
    process.env.NODE_ENV === 'development' && console.log('ℹ️ 无过期的不可用期需要清理')
  }
}

// 🆕 计算距离下一个凌晨零点的毫秒数
const getMillisecondsUntilMidnight = () => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow.getTime() - now.getTime()
}

// 🆕 设置每日凌晨零点的定时清理任务
const scheduleMidnightCleanup = () => {
  // 首先清除可能存在的旧定时器
  if (midnightCleanupTimeout) {
    clearTimeout(midnightCleanupTimeout)
  }
  if (dailyCleanupInterval) {
    clearInterval(dailyCleanupInterval)
  }

  // 计算到下一个凌晨零点的时间
  const msUntilMidnight = getMillisecondsUntilMidnight()

  process.env.NODE_ENV === 'development' && console.log(`⏰ 下次自动清理将在 ${new Date(Date.now() + msUntilMidnight).toLocaleString()} 执行`)

  // 设置在下一个凌晨零点执行清理
  midnightCleanupTimeout = setTimeout(() => {
    process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('🌙 凌晨零点 - 开始自动清理过期不可用期...')
    cleanExpiredUnavailablePeriods()

    // 设置每24小时执行一次清理
    dailyCleanupInterval = setInterval(
      () => {
        console.log('🌙 凌晨零点 - 开始自动清理过期不可用期...')
        cleanExpiredUnavailablePeriods()
      },
      24 * 60 * 60 * 1000
    ) // 24小时
  }, msUntilMidnight)
}

// 定时器变量
let shiftUpdateInterval: NodeJS.Timeout | null = null
let midnightCleanupTimeout: NodeJS.Timeout | null = null
let dailyCleanupInterval: NodeJS.Timeout | null = null

// 组件挂载时初始化数据和检查存储状态
onMounted(async () => {
  await initializeTeachers()
  refreshAllTeacherShifts()
  checkDataStorage()

  // 🆕 首次执行清理过期不可用期
  cleanExpiredUnavailablePeriods()

  // 🆕 设置每日凌晨零点自动清理
  scheduleMidnightCleanup()

  // 每小时更新考官班次信息（以防跨日变化）
  shiftUpdateInterval = setInterval(refreshAllTeacherShifts, 60 * 60 * 1000)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (shiftUpdateInterval) {
    clearInterval(shiftUpdateInterval)
    shiftUpdateInterval = null
  }

  // 🆕 清理不可用期自动清理定时器
  if (midnightCleanupTimeout) {
    clearTimeout(midnightCleanupTimeout)
    midnightCleanupTimeout = null
  }

  if (dailyCleanupInterval) {
    clearInterval(dailyCleanupInterval)
    dailyCleanupInterval = null
  }
})
</script>

<style scoped>
/* CSS变量定义 */
:root {
  --sidebar-width: 280px;
  --sidebar-collapsed-width: 80px;
}

/* 基础样式重置 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 主容器 */
.app-container {
  width: 100%;
  max-width: 100vw;
  height: 100%;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  background: #f5f7fa;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
}

/* 侧边栏样式 */
.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: linear-gradient(180deg, #1e3a5f 0%, #2c5282 100%);
  color: white;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;
}

.sidebar-collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-text {
  flex: 1;
}

.system-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.system-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

/* 导航样式 */
.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 20px;
}

.sidebar-collapsed .nav-items {
  padding: 0 10px;
}

.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item-active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
}

/* 侧边栏底部 - 版本信息 */
.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: auto;
}

.version-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.version-info:hover {
  background: rgba(255, 255, 255, 0.12);
}

.version-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.version-number {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* 侧边栏切换按钮 */
.sidebar-toggle {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}

.sidebar-toggle:hover {
  transform: translateY(-50%) scale(1.1);
}

.toggle-icon {
  width: 16px;
  height: 16px;
  color: #374151;
  transition: transform 0.3s ease;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

/* 主内容区域 */
.main-content {
  flex: 1;
  height: 100%;
  background: #f5f7fa;
  padding: 32px;
  overflow-y: auto;
}

/* 页面标题区 */
.page-header {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

/* 存储信息区域 */
.storage-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.storage-stats {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #6b7280;
}

.stats-item {
  padding: 2px 6px;
  background: #f3f4f6;
  border-radius: 4px;
}

/* 🆕 自动清理提示信息 */
.auto-cleanup-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
  font-size: 12px;
  color: #1e40af;
  margin-top: 8px;
}

.info-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.info-text {
  line-height: 1.4;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.action-btn-secondary:hover {
  background: #e5e7eb;
  color: #374151;
}

.action-btn-primary {
  background: #3b82f6;
  color: white;
}

.action-btn-primary:hover {
  background: #2563eb;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 表格容器 */
.table-container {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.teachers-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.teachers-table th {
  background: #f9fafb;
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.teachers-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  color: #6b7280;
}

.teachers-table tbody tr:hover {
  background: #f9fafb;
}

.teachers-table tbody tr:last-child td {
  border-bottom: none;
}

.teachers-table tr.selected {
  background: #eff6ff;
}

.checkbox-column {
  width: 50px;
  text-align: center;
}

.checkbox-column input[type='checkbox'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* 空状态样式*/
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #9ca3af;
}

.empty-content p {
  color: #6b7280;
  font-size: 16px;
  margin: 0;
}

/* 状态相关样式*/
.status-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-text {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-text.status-available {
  background: #dcfce7;
  color: #166534;
}

.status-text.status-unavailable {
  background: #fee2e2;
  color: #991b1b;
}

.status-actions {
  display: flex;
  gap: 4px;
}

.status-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-btn-enable {
  background: #dcfce7;
  color: #166534;
}

.status-btn-enable:hover {
  background: #bbf7d0;
}

.status-btn-disable {
  background: #fee2e2;
  color: #991b1b;
}

.status-btn-disable:hover {
  background: #fecaca;
}

.status-icon {
  width: 14px;
  height: 14px;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn-small {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn-edit {
  background: #dbeafe;
  color: #1e40af;
}

.action-btn-edit:hover {
  background: #bfdbfe;
}

.action-btn-danger {
  background: #fee2e2;
  color: #991b1b;
}

.action-btn-danger:hover {
  background: #fecaca;
}

.action-icon {
  width: 16px;
  height: 16px;
}

/* 禁用状态*/
.action-btn-secondary.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* 弹窗样式 */
.modal-overlay {
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
  padding: 16px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  margin: auto;
}

.modal-small {
  max-width: 450px;
}

.modal-header {
  padding: 24px 24px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease;
}

.modal-close:hover {
  background: #e5e7eb;
}

.close-icon {
  width: 18px;
  height: 18px;
  color: #6b7280;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 0 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* 表单样式 */
.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.form-group {
  flex: 1;
}

.form-group.full-width {
  flex: none;
  width: 100%;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #1f2937;
  transition: border-color 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input::placeholder {
  color: #9ca3af;
}

.form-input:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

/* 单选按钮组 */
.radio-group {
  display: flex;
  gap: 20px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.radio-item input[type='radio'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.radio-text {
  font-size: 14px;
  color: #374151;
}

/* 确认弹窗样式 */
.confirm-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.confirm-icon {
  width: 48px;
  height: 48px;
  color: #f59e0b;
}

.confirm-text {
  font-size: 16px;
  color: #1f2937;
  margin: 0;
}

.confirm-warning {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .app-container {
    width: 100%;
    max-width: 100vw;
  }

  .main-content {
    padding: 24px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-actions {
    justify-content: flex-end;
    flex-wrap: wrap;
  }
}

/* 平板端优化 */
@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar {
    width: var(--sidebar-width);
  }

  .sidebar-collapsed {
    width: var(--sidebar-collapsed-width);
  }

  .main-content {
    padding: 20px;
  }

  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .teachers-table {
    min-width: 700px;
  }
}

/* 移动端优化 */
@media (max-width: 767px) {
  .sidebar {
    width: var(--sidebar-width);
  }

  .sidebar-collapsed {
    width: var(--sidebar-collapsed-width);
  }

  .main-content {
    padding: 16px;
  }

  .page-header {
    padding: 16px 20px;
    margin-bottom: 16px;
    border-radius: 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .header-actions {
    justify-content: flex-start;
    gap: 8px;
  }

  .action-btn {
    padding: 8px 12px;
    font-size: 13px;
    flex: 1;
    min-width: fit-content;
  }

  .btn-icon {
    width: 14px;
    height: 14px;
  }

  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border-radius: 12px;
  }

  .teachers-table {
    min-width: 850px;
  }

  .teachers-table th,
  .teachers-table td {
    padding: 12px 16px;
    font-size: 13px;
  }

  .checkbox-column {
    width: 40px;
  }

  .unavailable-dates-cell {
    min-width: 180px;
  }

  .date-reason {
    max-width: 140px;
  }

  .modal-content {
    max-width: 95%;
    width: 95%;
    margin: 0;
    border-radius: 16px;
  }

  .modal-header {
    padding: 20px 20px 0;
  }

  .modal-body {
    padding: 20px;
  }

  .modal-footer {
    padding: 0 20px 20px;
  }

  .form-row {
    flex-direction: column;
    gap: 16px;
  }

  .storage-stats {
    flex-direction: column;
    gap: 8px;
  }

  .auto-cleanup-info {
    font-size: 11px;
    padding: 5px 10px;
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .app-container {
    font-size: 13px;
  }

  .sidebar {
    width: var(--sidebar-width);
  }

  .main-content {
    padding: 12px;
  }

  .page-header {
    padding: 12px 16px;
    margin-bottom: 12px;
  }

  .page-title {
    font-size: 18px;
  }

  .header-left {
    gap: 8px;
  }

  .storage-stats {
    font-size: 10px;
  }

  .header-actions {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 6px;
  }

  .action-btn {
    justify-content: center;
    padding: 8px 12px;
    font-size: 12px;
    flex: 1;
    min-width: calc(50% - 3px);
  }

  .teachers-table {
    min-width: 800px;
  }

  .teachers-table th,
  .teachers-table td {
    padding: 8px 12px;
    font-size: 12px;
  }

  .checkbox-column {
    width: 36px;
  }

  .unavailable-dates-cell {
    min-width: 160px;
  }

  .date-item {
    padding: 4px 6px;
    font-size: 11px;
  }

  .date-reason {
    max-width: 120px;
    font-size: 10px;
  }

  .manage-dates-btn {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
  }

  .btn-icon-small {
    width: 12px;
    height: 12px;
  }

  .action-btn-small {
    width: 28px;
    height: 28px;
  }

  .action-icon {
    width: 14px;
    height: 14px;
  }

  .modal-content {
    max-width: 98%;
    width: 98%;
    margin: 0;
    max-height: 95vh;
    border-radius: 12px;
  }

  .modal-header {
    padding: 16px 16px 0;
  }

  .modal-title {
    font-size: 18px;
  }

  .modal-body {
    padding: 16px;
  }

  .modal-footer {
    padding: 0 16px 16px;
    flex-direction: row;
    gap: 8px;
  }

  .modal-footer .action-btn {
    flex: 1;
  }

  .form-input,
  .form-select {
    padding: 10px 12px;
    font-size: 14px;
  }

  .form-label {
    font-size: 13px;
  }

  .auto-cleanup-info {
    font-size: 10px;
    padding: 4px 8px;
  }

  .info-text {
    font-size: 10px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .action-btn,
  .nav-item,
  .sidebar-toggle {
    min-height: 44px;
  }

  .action-btn-small {
    min-width: 44px;
    min-height: 44px;
  }

  .checkbox-column input[type='checkbox'] {
    width: 20px;
    height: 20px;
  }
}

/* 横屏手机优化 */
@media (max-width: 920px) and (orientation: landscape) {
  .modal-content {
    max-height: 85vh;
  }

  .main-content {
    padding: 16px;
  }
}

/* 大屏幕优化 */
@media (min-width: 1536px) {
  .page-header {
    padding: 24px 28px;
  }

  .page-title {
    font-size: 26px;
  }

  .action-btn {
    padding: 10px 20px;
    font-size: 15px;
  }

  .teachers-table th,
  .teachers-table td {
    padding: 18px 24px;
    font-size: 15px;
  }
}

/* 🆕 导入重复数据确认对话框样式 */
.duplicate-analysis {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.analysis-summary {
  display: flex;
  gap: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-label {
  font-size: 14px;
  color: #6b7280;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.summary-item.success .summary-value {
  color: #10b981;
}

.summary-item.warning .summary-value {
  color: #f59e0b;
}

.summary-item.error .summary-value {
  color: #ef4444;
}

.import-options {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.options-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.radio-option:hover {
  background: #f9fafb;
  border-color: #667eea;
}

.radio-option input[type='radio'] {
  margin-top: 2px;
  cursor: pointer;
}

.radio-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.radio-label strong {
  color: #111827;
  font-size: 15px;
}

.radio-label small {
  color: #6b7280;
  font-size: 13px;
}

.data-details {
  max-height: 400px;
  overflow-y: auto;
}

.details-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.details-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.detail-item:hover {
  background: #f9fafb;
}

.detail-item.item-new {
  border-left: 3px solid #10b981;
}

.detail-item.item-duplicate {
  border-left: 3px solid #f59e0b;
  background: #fffbeb;
}

.detail-item.item-anomaly {
  border-left: 3px solid #ef4444;
  background: #fef2f2;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
}

.item-name {
  font-weight: 600;
  color: #111827;
  min-width: 80px;
}

.item-dept {
  color: #6b7280;
  min-width: 100px;
}

.item-group {
  color: #6b7280;
  min-width: 60px;
}

.item-status {
  color: #6b7280;
  min-width: 60px;
}

.item-badges {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-new {
  background: #d1fae5;
  color: #065f46;
}

.badge-duplicate {
  background: #fef3c7;
  color: #92400e;
}

.badge-anomaly {
  background: #fee2e2;
  color: #991b1b;
}

.item-errors {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.error-reason {
  font-size: 12px;
  color: #dc2626;
  padding: 2px 8px;
  background: #fef2f2;
  border-radius: 4px;
  border: 1px solid #fecaca;
}

/* 大号模态框 */
.modal-large {
  max-width: 800px;
  max-height: 85vh;
  overflow-y: auto;
}

/* 中号模态框 */
.modal-medium {
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

/* 🆕 不可用期管理样式 */
.status-count {
  font-size: 12px;
  color: #6b7280;
  margin-left: 4px;
}

/* 🆕 不可用日期单元格样式 */
.unavailable-dates-cell {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 200px;
}

.dates-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.date-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  font-size: 12px;
}

.date-range {
  color: #92400e;
  font-weight: 500;
}

.date-reason {
  color: #78350f;
  font-size: 11px;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.no-dates {
  color: #9ca3af;
  font-size: 14px;
  flex: 1;
}

.manage-dates-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  border: none;
  border-radius: 6px;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.manage-dates-btn:hover {
  background: #d1d5db;
  color: #374151;
}

.btn-icon-small {
  width: 14px;
  height: 14px;
}

.status-btn-manage {
  background: #3b82f6 !important;
  color: white !important;
}

.status-btn-manage:hover {
  background: #2563eb !important;
}

.unavailable-form {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 24px;
}

.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.required {
  color: #ef4444;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s;
  /* 🔧 修复：确保输入框始终可交互 */
  pointer-events: auto !important;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  /* 🔧 修复：防止触摸设备上的问题 */
  touch-action: auto;
  line-height: 1.5;
  width: 100%;
}

.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.unavailable-list {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.unavailable-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.unavailable-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s;
}

.unavailable-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

/* 🆕 过期不可用期样式 */
.unavailable-item.period-expired {
  opacity: 0.6;
  background: #f9fafb;
}

.unavailable-item.period-expired .date-value {
  text-decoration: line-through;
  color: #9ca3af;
}

.expired-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 6px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 10px;
  font-weight: 500;
  border-radius: 3px;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-dates {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.date-label,
.reason-label {
  font-weight: 500;
  color: #6b7280;
}

.date-value {
  color: #111827;
  font-weight: 500;
}

.date-separator {
  color: #9ca3af;
}

.item-reason {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.reason-value {
  color: #4b5563;
}

.item-delete-btn {
  padding: 8px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-delete-btn:hover {
  background: #fecaca;
  transform: scale(1.05);
}

.delete-icon {
  width: 16px;
  height: 16px;
}

.unavailable-empty {
  padding: 32px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}
</style>
