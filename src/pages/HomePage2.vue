<template>
  <div class="app-container">
    <!-- 侧边栏 -->
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
          <router-link to="/" class="nav-item nav-item-active">
            <Home class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">首页</span>
          </router-link>
          <router-link to="/teachers" class="nav-item">
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

      <!-- 侧边栏收缩按钮 -->
      <div class="sidebar-toggle" @click="toggleSidebar">
        <ChevronLeft class="toggle-icon" :class="{ rotated: sidebarCollapsed }" />
      </div>
    </aside>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 顶部状态栏 -->
      <div class="status-bar">
        <div class="status-left">
          <div class="status-info">
            <Calendar class="status-icon" />
            <span class="status-date">{{ currentTime }}</span>
          </div>
          <div class="system-status">
            <div class="status-indicator"></div>
            <span class="status-text">系统运行正常</span>
          </div>
        </div>
        <div class="status-right">
          <div class="quick-actions">
            <button class="quick-btn" @click="navigateToNewSchedule">
              <Plus class="btn-icon" />
              <span>新建排班</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 今日执勤班次 -->
      <div class="duty-section">
        <h2 class="section-title">
          <svg
            class="section-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M3 10h18" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
            <path d="M16 14h.01" />
            <path d="M8 18h.01" />
            <path d="M12 18h.01" />
            <path d="M16 18h.01" />
          </svg>
          今日执勤班次
        </h2>
        <div class="duty-cards">
          <div
            v-for="duty in todayDutySchedule"
            :key="duty.group"
            class="duty-card"
            :class="duty.cardType"
            @click="showDutyTeachersForGroup(duty.group)"
          >
            <div class="duty-card-inner">
              <div class="duty-icon">
                <svg
                  v-if="duty.status === '白班'"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2" />
                  <path d="M12 21v2" />
                  <path d="M4.22 4.22l1.42 1.42" />
                  <path d="M18.36 18.36l1.42 1.42" />
                  <path d="M1 12h2" />
                  <path d="M21 12h2" />
                  <path d="M4.22 19.78l1.42-1.42" />
                  <path d="M18.36 5.64l1.42-1.42" />
                </svg>
                <svg
                  v-else-if="duty.status === '晚班'"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <div class="duty-content">
                <div class="duty-header">{{ duty.group }}</div>
                <div class="duty-status">{{ duty.status }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 考官分布情况组件 -->
      <div class="teacher-distribution-section">
        <TeacherDistribution />
      </div>
    </div>
  </div>

  <!-- 考官详情弹窗 -->
  <div v-if="showModal" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">{{ selectedGroupName }} - 考官详情</h3>
        <button class="modal-close" @click="closeModal">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>
        <div v-else-if="error" class="error-state">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6" />
            <path d="M9 9l6 6" />
          </svg>
          <span>{{ error }}</span>
        </div>
        <div v-else>
          <div class="duty-info">
            <p class="duty-group-info">
              班组状态：{{ todayShifts[0]?.currentShift || '未排班' }}
              <span v-if="todayShifts[0]?.available === false" class="unavailable-notice">
                （白班考官不可担任考官）
              </span>
            </p>
          </div>
          <div class="teachers-list">
            <div
              v-for="teacher in todayShifts"
              :key="teacher.id"
              class="teacher-card"
              :class="{ unavailable: !teacher.available }"
            >
              <div class="teacher-info">
                <h4 class="teacher-name">{{ teacher.name }}</h4>
                <p class="teacher-department">{{ displayDepartment(teacher.department) }}</p>
                <div class="teacher-status">
                  <span
                    class="status-badge"
                    :class="teacher.available ? 'available' : 'unavailable'"
                  >
                    {{ teacher.available ? '可用' : '不可用' }}
                  </span>
                  <span class="shift-info">{{ teacher.currentShift }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Home, Users, Calendar, Settings, ChevronLeft, Plus, BarChart, Shuffle } from 'lucide-vue-next'
import {
  calculateDutySchedule,
  getTodayDutySchedule,
  type DutySchedule,
} from '../utils/scheduleService'
import { useSidebarAutoCollapse } from '../composables/useSidebarAutoCollapse'
import { DateUtils as dateUtils } from '../utils/dateUtils'
import { normalizeDeptToFull } from '../utils/departmentNormalizer'

// 🆕 科室名称显示转换函数（统一显示为"区域X室"格式）
const displayDepartment = (dept: string | undefined): string => {
  if (!dept) return '未分配科室'
  return normalizeDeptToFull(dept)
}
import TeacherDistribution from '../components/TeacherDistribution.vue'

interface TodayShiftTeacher {
  id: string
  name: string
  department?: string
  group?: string
  currentShift: string
  available: boolean
  [key: string]: any
}

// 路由实例
const router = useRouter()

// 自动收缩侧边栏功能
const {
  checkContentOverflow,
  handleResize,
  checkContentOverflowDelayed,
  cleanup: cleanupAutoCollapse,
} = useSidebarAutoCollapse(
  '.main-content',
  '.dashboard-grid',
  () => sidebarCollapsed.value,
  collapsed => {
    sidebarCollapsed.value = collapsed
  }
)

// 应用版本号 - 从 package.json 自动读取
const appVersion = ref(import.meta.env.VITE_APP_VERSION || '6.1.0')

// 响应式数据
const sidebarCollapsed = ref(false)
const currentTime = ref('')
let timeInterval: NodeJS.Timeout | null = null

// 图表相关 - 已移除工作量图表相关代码
const selectedGroupName = ref('')

// 新增的响应式数据
const todayShifts = ref<TodayShiftTeacher[]>([])
const isLoading = ref(false)
const error = ref('')
const showModal = ref(false)
const showExamModal = ref(false)
const examDetails = ref([])
const examError = ref('')
const isExamLoading = ref(false)

// 更新时间显示
const updateTime = () => {
  const now = new Date()
  // 使用dateUtils格式化日期时间显示
  currentTime.value = dateUtils.toDateTimeString(now)
}

// 切换侧边栏状态
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// 导航到新建排班页面
const navigateToNewSchedule = () => {
  router.push('/schedules?action=create')
}

// 显示班组考官详情
const showDutyTeachersForGroup = async (groupName: string) => {
  try {
    selectedGroupName.value = groupName
    isLoading.value = true
    error.value = ''

    // 从存储服务加载考官数据
    const { storageService } = await import('../utils/storageService')
    const teacherList = await storageService.loadTeachers()

    // 筛选出指定班组的考官
    const groupTeachers = teacherList.filter(teacher => teacher.group === groupName)

    if (groupTeachers.length === 0) {
      error.value = `${groupName}暂无考官数据`
      todayShifts.value = []
    } else {
      // 获取今日执勤状态
      const today = new Date()
      const dutySchedule = calculateDutySchedule(today)
      const groupDuty = dutySchedule.find(duty => duty.group === groupName)

      todayShifts.value = groupTeachers.map(teacher => ({
        ...teacher,
        currentShift: groupDuty?.status || '未排班',
        available: groupDuty?.status !== '白班', // 白班考官不可用作考官
      }))
    }

    showModal.value = true
  } catch (err) {
    console.error('加载班组考官数据失败:', err)
    error.value = '加载考官数据失败，请稍后重试'
    todayShifts.value = []
    showModal.value = true
  } finally {
    isLoading.value = false
  }
}

// 关闭考官详情弹窗
const closeModal = () => {
  showModal.value = false
  selectedGroupName.value = ''
  todayShifts.value = []
  error.value = ''
}

// 四班组轮换算法 - 现在使用集中化的调度服务

// 获取今日执勤班次
const todayDutySchedule = ref<DutySchedule[]>([])
let dutyUpdateInterval: NodeJS.Timeout | null = null

// 更新执勤班次
const updateDutySchedule = async () => {
  // 使用当前日期计算排班
  const today = new Date()
  const dateStr = today.toDateString()
  process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('=== 执勤班次计算 ===')
  process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('当前日期:', dateStr)
  process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('当前时间戳:', today.getTime())

  const result = calculateDutySchedule(today)
  process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('今日排班结果:', result)

  // 详细输出每个组的状态
  result.forEach(duty => {
    process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log(`${duty.group}: ${duty.status} (${duty.cardType})`)
  })

  // 更新响应式数据
  todayDutySchedule.value = result

  process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('计算完成时间:', new Date().toLocaleTimeString())
  process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('=== 计算完成 ===')
}

// 在组件挂载时初始化
onMounted(async () => {
  // 初始化时间显示
  updateTime()
  // 每秒更新时间
  timeInterval = setInterval(updateTime, 1000)

  // 初始化执勤班次
  updateDutySchedule()
  // 每小时更新执勤班次（以防跨日变化）
  dutyUpdateInterval = setInterval(updateDutySchedule, 60 * 60 * 1000)

  // 延迟检查内容溢出，触发自动收缩
  checkContentOverflowDelayed(300)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
    timeInterval = null
  }
  if (dutyUpdateInterval) {
    clearInterval(dutyUpdateInterval)
    dutyUpdateInterval = null
  }
  // 清理自动收缩功能
  cleanupAutoCollapse()
})
</script>

<style scoped>
/* 可点击的统计项 */
.stat-item.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.stat-item.clickable:hover {
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
  transform: translateY(-1px);
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
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: #6b7280;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #6b7280;
  font-size: 16px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state svg {
  color: #ef4444;
}

.duty-info {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.duty-group-info {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
  margin: 0;
}

.unavailable-notice {
  color: #ef4444;
  font-weight: 600;
}

.teachers-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.teacher-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.teacher-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.teacher-card.unavailable {
  background: #fef2f2;
  border-color: #fecaca;
}

.teacher-card.unavailable:hover {
  border-color: #f87171;
}

.teacher-info {
  text-align: left;
}

.teacher-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.teacher-department {
  font-size: 14px;
  color: #3b82f6;
  margin: 0 0 12px 0;
  font-weight: 500;
}

.teacher-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.available {
  background: #dcfce7;
  color: #166534;
}

.status-badge.unavailable {
  background: #fee2e2;
  color: #991b1b;
}

.shift-info {
  font-size: 12px;
  color: #6b7280;
  padding: 2px 6px;
  background: #f3f4f6;
  border-radius: 4px;
}

/* 今日考试弹窗样式 */
.today-exam-modal {
  max-width: 1200px;
  width: 95%;
}

.today-exams-container {
  max-height: 70vh;
  overflow-y: auto;
}

.exam-table-wrapper {
  overflow-x: auto;
}

.today-exam-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.today-exam-table th {
  background: #f8fafc;
  color: #374151;
  font-weight: 600;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}

.today-exam-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #1f2937;
  white-space: nowrap;
}

.exam-row:hover {
  background: #f8fafc;
}

.exam-row:last-child td {
  border-bottom: none;
}

.no-exams {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 16px;
}

.no-exams p {
  margin: 0;
}

.loading-exams {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 16px;
}

.loading-exams p {
  margin: 0;
}
/* 基础样式重置 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 主容器 - 固定1440x900尺寸 */
/* Main app container: use flexible sizing so layout can adapt to viewport */
.app-container {
  display: flex;
  flex-direction: row;
  height: 100vh;
  width: 100%;
  background: #f5f7fa;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
  /* allow vertical scrolling but prevent horizontal overflow */
  overflow-x: hidden;
  overflow-y: auto;
}

/* CSS变量定义 */
:root {
  --sidebar-width: 280px;
  --sidebar-collapsed-width: 80px;
}

/* 侧边栏样式 */
.sidebar {
  width: var(--sidebar-width);
  height: 100vh; /* ensure full viewport height like MainLayout */
  background: linear-gradient(180deg, #1e3a5f 0%, #2c5282 100%);
  color: white;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;
  overflow: auto; /* make sidebar scrollable when content overflows */
  z-index: 900; /* keep sidebar below the toggle */
}

/* Prevent horizontal scroll inside sidebar and hide horizontal scrollbar visually */
.sidebar {
  overflow-x: hidden; /* prevent horizontal scroll */
}

/* hide scrollbar for WebKit (Chrome, Edge, Safari) */
.sidebar::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}
.sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 6px;
}
.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

/* For Firefox: only show vertical scrollbar when needed */
.sidebar {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
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
  position: fixed; /* place in root stacking context so it cannot be under transformed content */
  left: calc(var(--sidebar-width) - 12px);
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
  transition:
    transform 0.2s ease,
    left 0.2s ease;
  z-index: 2147483647 !important; /* ensure the toggle sits above everything */
  pointer-events: auto;
}

/* When sidebar is collapsed, move the fixed toggle accordingly */
.sidebar.sidebar-collapsed .sidebar-toggle {
  left: calc(var(--sidebar-collapsed-width) - 12px) !important;
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
  flex: 1 1 auto;
  min-width: 0; /* allow flex children to shrink, prevents overflow */
  background: #f5f7fa;
  padding: 32px;
  overflow-y: auto;
  min-height: 100vh;
  z-index: 800; /* ensure main content stays below the toggle */
}

/* 状态栏 */
.status-bar {
  background: white;
  border-radius: 16px;
  padding: 24px 32px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 80px;
}

.status-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  width: 20px;
  height: 20px;
  color: #6b7280;
}

.status-date {
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
}

.status-text {
  font-size: 14px;
  color: #6b7280;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 32px;
}

.quick-stats {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #3b82f6;
  color: white;
}

.quick-btn:hover {
  background: #2563eb;
}

.quick-btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.quick-btn-secondary:hover {
  background: #e5e7eb;
  color: #374151;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 执勤班次区域 */
.duty-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 24px;
  letter-spacing: -0.025em;
}

.section-icon {
  color: #3b82f6;
}

.duty-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.duty-card {
  background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
  border-radius: 16px;
  padding: 0;
  border: 2px solid white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.duty-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.duty-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.duty-card:hover::before {
  opacity: 1;
}

.duty-card:active {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
}

.duty-card-inner {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.duty-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.duty-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.duty-header {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.025em;
}

.duty-status {
  font-size: 14px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 20px;
  letter-spacing: 0.025em;
}

.duty-morning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%);
  border-color: white;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.25);
}

.duty-morning .duty-icon {
  background: linear-gradient(135deg, #ffffff 0%, #fef3c7 100%);
  color: #d97706;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.duty-morning .duty-status {
  background: rgba(255, 255, 255, 0.9);
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.duty-evening {
  background: linear-gradient(135deg, #dbeafe 0%, #93c5fd 50%, #3b82f6 100%);
  border-color: white;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
}

.duty-evening .duty-icon {
  background: linear-gradient(135deg, #ffffff 0%, #dbeafe 100%);
  color: #1d4ed8;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.duty-evening .duty-status {
  background: rgba(255, 255, 255, 0.9);
  color: #1e40af;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.duty-rest {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #10b981 100%);
  border-color: white;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25);
}

.duty-rest .duty-icon {
  background: linear-gradient(135deg, #ffffff 0%, #d1fae5 100%);
  color: #047857;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.duty-rest .duty-status {
  background: rgba(255, 255, 255, 0.9);
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

/* 工作量图表区域 */
.workload-chart-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-container {
  margin-top: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fafbfc;
  padding: 16px;
}

.workload-chart {
  width: 100%;
  height: clamp(200px, 35vh, 420px);
  min-height: 180px;
}

/* 响应式布局 */
@media (max-width: 1200px) {
  .app-container {
    width: 100%;
    max-width: 100vw;
    flex-direction: row;
  }

  .today-exam-modal {
    max-width: 95%;
    width: 95%;
  }

  .exam-table-wrapper {
    overflow-x: auto;
  }

  /* Avoid forcing a large min-width on tables; allow them to wrap/scroll when necessary */
  .today-exam-table {
    min-width: 0;
    width: 100%;
    table-layout: auto;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: var(--sidebar-width);
  }

  .sidebar-collapsed {
    width: var(--sidebar-collapsed-width);
  }

  .status-bar {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .status-left,
  .status-right {
    width: 100%;
  }

  .quick-stats {
    justify-content: space-around;
  }

  .quick-actions {
    justify-content: center;
  }

  .duty-section {
    padding: 20px;
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 18px;
    margin-bottom: 20px;
  }

  .duty-cards {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 16px;
  }

  .duty-card-inner {
    padding: 20px;
    gap: 12px;
  }

  .duty-icon {
    width: 48px;
    height: 48px;
  }

  .duty-header {
    font-size: 16px;
  }

  .duty-status {
    font-size: 13px;
    padding: 4px 10px;
  }

  .today-exam-modal {
    max-width: 98%;
    width: 98%;
    margin: 10px;
  }

  .modal-content {
    max-height: 90vh;
  }

  .modal-body {
    padding: 16px;
  }

  .today-exam-table th,
  .today-exam-table td {
    padding: 8px 12px;
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .app-container {
    font-size: 13px;
    flex-direction: column;
  }

  /* On very small screens, make sidebar overlay or narrower */
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
  }

  .sidebar-collapsed {
    width: var(--sidebar-collapsed-width);
  }

  .system-title {
    font-size: 16px;
  }

  .system-subtitle {
    font-size: 11px;
  }

  .status-bar {
    padding: 12px;
  }

  .status-date {
    font-size: 13px;
  }

  .stat-label {
    font-size: 11px;
  }

  .stat-value {
    font-size: 16px;
  }

  .quick-btn {
    padding: 8px 12px;
    font-size: 13px;
  }

  .section-title {
    font-size: 16px;
  }

  .duty-section,
  .exam-section {
    padding: 16px;
    margin-bottom: 16px;
  }

  .modal-header {
    padding: 16px;
  }

  .modal-title {
    font-size: 16px;
  }

  .today-exam-table {
    /* allow table to shrink; when content is wide it will scroll inside .exam-table-wrapper */
    min-width: 0;
    width: 100%;
  }

  .today-exam-table th,
  .today-exam-table td {
    padding: 6px 8px;
    font-size: 12px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  .duty-card:hover {
    transform: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .duty-card:active {
    transform: scale(0.98);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }

  .quick-btn:hover {
    background: #3b82f6;
  }

  .quick-btn:active {
    transform: scale(0.95);
  }

  .stat-item.clickable:hover {
    background: rgba(59, 130, 246, 0.05);
    transform: none;
  }

  .stat-item.clickable:active {
    background: rgba(59, 130, 246, 0.15);
    transform: scale(0.98);
  }
}
</style>
