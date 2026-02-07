<template>
  <div class="app-container">
    <!-- 移动端遮罩层 -->
    <div v-if="isMobile && mobileMenuOpen" class="mobile-overlay" @click="closeMobileMenu"></div>

    <!-- 侧边栏 -->
    <aside
      class="sidebar"
      :class="{
        'sidebar-collapsed': sidebarCollapsed && !isMobile,
        'mobile-open': isMobile && mobileMenuOpen,
      }"
    >
      <div class="sidebar-header">
        <div class="logo-container">
          <div class="logo-icon">
            <img src="/icon.png" alt="系统图标" class="logo-img" />
          </div>
          <div class="logo-text" v-show="!sidebarCollapsed || (isMobile && mobileMenuOpen)">
            <h1 class="system-title">考试自动排班助手</h1>
            <p class="system-subtitle">Examiner Assignment Assistant</p>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-items">
          <router-link to="/" class="nav-item" @click="handleNavClick">
            <Home class="nav-icon" />
            <span v-show="!sidebarCollapsed || (isMobile && mobileMenuOpen)" class="nav-text"
              >首页</span
            >
          </router-link>
          <router-link to="/teachers" class="nav-item" @click="handleNavClick">
            <Users class="nav-icon" />
            <span v-show="!sidebarCollapsed || (isMobile && mobileMenuOpen)" class="nav-text"
              >考官管理</span
            >
          </router-link>
          <router-link to="/schedules" class="nav-item" @click="handleNavClick">
            <Calendar class="nav-icon" />
            <span v-show="!sidebarCollapsed || (isMobile && mobileMenuOpen)" class="nav-text"
              >排班管理</span
            >
          </router-link>
          <router-link to="/statistics" class="nav-item nav-item-active" @click="handleNavClick">
            <BarChart3 class="nav-icon" />
            <span v-show="!sidebarCollapsed || (isMobile && mobileMenuOpen)" class="nav-text"
              >数据统计</span
            >
          </router-link>
        </div>
      </nav>

      <!-- 版本号显示 -->
      <div class="sidebar-footer" v-show="!sidebarCollapsed || (isMobile && mobileMenuOpen)">
        <div class="version-info">
          <span class="version-label">版本</span>
          <span class="version-number">v{{ appVersion }}</span>
        </div>
      </div>

      <!-- 侧边栏收缩按钮 (仅桌面端显示) -->
      <div v-if="!isMobile" class="sidebar-toggle" @click="toggleSidebar">
        <ChevronLeft class="toggle-icon" :class="{ 'rotate-180': sidebarCollapsed }" />
      </div>
    </aside>

    <!-- 主内容区域 -->
    <div
      class="main-content"
      :class="{
        'sidebar-collapsed': sidebarCollapsed && !isMobile,
        'mobile-layout': isMobile,
      }"
    >
      <!-- 顶部状态栏 -->
      <div class="status-bar">
        <div class="status-left">
          <!-- 移动端菜单按钮 -->
          <button v-if="isMobile" class="mobile-menu-btn" @click="openMobileMenu">
            <Menu style="width: 24px; height: 24px" />
          </button>

          <div class="status-info">
            <Calendar class="status-icon" />
            <span class="status-date">{{ currentTime }}</span>
          </div>
          <div class="system-status">
            <div class="status-indicator" :class="{ connected: websocketConnected }"></div>
            <span class="status-text">{{ websocketConnected ? '实时连接' : '连接断开' }}</span>
          </div>
        </div>
        <div class="status-right">
          <div class="quick-stats">
            <div class="stat-item clickable" @click="refreshData">
              <span class="stat-label">数据刷新</span>
              <span class="stat-value">{{ lastUpdateTime }}</span>
            </div>
          </div>
          <div class="quick-actions">
            <button class="quick-btn" @click="refreshData" :disabled="loading">
              <RefreshCw class="btn-icon" :class="{ 'animate-spin': loading }" />
              <span>刷新数据</span>
            </button>
            <button class="quick-btn" @click="exportData">
              <Download class="btn-icon" />
              <span>导出报表</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 数据概览卡片 -->
      <div class="overview-section">
        <h2 class="section-title">数据概览</h2>
        <div class="overview-grid">
          <div class="overview-card primary" @click="showDetail('schedules')">
            <div class="card-icon">
              <Calendar style="width: 32px; height: 32px" />
            </div>
            <div class="card-content">
              <div class="card-label">总排班数</div>
              <div class="card-value">{{ formatNumber(overviewData.totalSchedules) }}</div>
              <div class="card-trend">
                <TrendingUp
                  v-if="overviewData.scheduleTrend > 0"
                  style="width: 16px; height: 16px"
                />
                <TrendingDown
                  v-else-if="overviewData.scheduleTrend < 0"
                  style="width: 16px; height: 16px"
                />
                <Minus v-else style="width: 16px; height: 16px" />
                {{ Math.abs(overviewData.scheduleTrend) }}%
              </div>
            </div>
          </div>

          <div class="overview-card success" @click="showDetail('teachers')">
            <div class="card-icon">
              <Users style="width: 32px; height: 32px" />
            </div>
            <div class="card-content">
              <div class="card-label">活跃考官</div>
              <div class="card-value">
                {{ overviewData.activeExaminers }}/{{ overviewData.totalExaminers }}
              </div>
              <div class="card-progress">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{
                      width:
                        (overviewData.activeExaminers / overviewData.totalExaminers) * 100 + '%',
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div class="overview-card warning" @click="showDetail('workload')">
            <div class="card-icon">
              <BarChart3 style="width: 32px; height: 32px" />
            </div>
            <div class="card-content">
              <div class="card-label">平均工作量</div>
              <div class="card-value">{{ overviewData.avgWorkload.toFixed(1) }}h</div>
              <div class="card-description">每日平均</div>
            </div>
          </div>

          <div class="overview-card info" @click="showDetail('completion')">
            <div class="card-icon">
              <CheckCircle style="width: 32px; height: 32px" />
            </div>
            <div class="card-content">
              <div class="card-label">完成率</div>
              <div class="card-value">{{ (overviewData.completionRate * 100).toFixed(1) }}%</div>
              <div class="card-progress">
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: overviewData.completionRate * 100 + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 筛选控制面板 -->
      <div class="filter-section">
        <h2 class="section-title">数据筛选</h2>
        <div class="filter-panel">
          <div class="filter-row">
            <div class="filter-item">
              <label class="filter-label">时间范围</label>
              <el-date-picker
                v-model="filterForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="yyyy-MM-dd"
                class="filter-input"
              />
            </div>
            <div class="filter-item">
              <label class="filter-label">考官</label>
              <el-select
                v-model="filterForm.teacherIds"
                multiple
                placeholder="选择考官"
                filterable
                clearable
                class="filter-input"
              >
                <el-option
                  v-for="teacher in teachers"
                  :key="teacher.id"
                  :label="teacher.name"
                  :value="teacher.id"
                />
              </el-select>
            </div>
            <div class="filter-item">
              <label class="filter-label">班级</label>
              <el-select
                v-model="filterForm.classes"
                multiple
                placeholder="选择班级"
                filterable
                clearable
                class="filter-input"
              >
                <el-option v-for="cls in classOptions" :key="cls" :label="cls" :value="cls" />
              </el-select>
            </div>
            <div class="filter-actions">
              <button class="filter-btn primary" @click="handleFilter">
                <Search style="width: 16px; height: 16px" />
                查询
              </button>
              <button class="filter-btn secondary" @click="resetFilter">
                <RotateCcw style="width: 16px; height: 16px" />
                重置
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-section">
        <h2 class="section-title">数据可视化</h2>
        <div class="charts-grid">
          <!-- 工作量分布图 -->
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">考官工作量分布</h3>
              <div class="chart-actions">
                <button class="chart-action-btn" @click="downloadChart('workload')">
                  <Download style="width: 16px; height: 16px" />
                </button>
                <button class="chart-action-btn" @click="fullscreenChart('workload')">
                  <Maximize style="width: 16px; height: 16px" />
                </button>
              </div>
            </div>
            <div class="chart-content">
              <WorkloadChart :data="workloadData" :loading="loading" height="350px" />
            </div>
          </div>

          <!-- 热力图 -->
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">排班热力图</h3>
              <div class="chart-actions">
                <button class="chart-action-btn" @click="downloadChart('heatmap')">
                  <Download style="width: 16px; height: 16px" />
                </button>
                <button class="chart-action-btn" @click="fullscreenChart('heatmap')">
                  <Maximize style="width: 16px; height: 16px" />
                </button>
              </div>
            </div>
            <div class="chart-content">
              <HeatmapChart :data="heatmapData" :loading="loading" height="350px" />
            </div>
          </div>

          <!-- 趋势图 -->
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">工作量趋势</h3>
              <div class="chart-actions">
                <button class="chart-action-btn" @click="downloadChart('trend')">
                  <Download style="width: 16px; height: 16px" />
                </button>
                <button class="chart-action-btn" @click="fullscreenChart('trend')">
                  <Maximize style="width: 16px; height: 16px" />
                </button>
              </div>
            </div>
            <div class="chart-content">
              <div ref="trendChart" class="chart-container"></div>
            </div>
          </div>

          <!-- 班级分布图 -->
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">班级考试分布</h3>
              <div class="chart-actions">
                <button class="chart-action-btn" @click="downloadChart('class')">
                  <Download style="width: 16px; height: 16px" />
                </button>
                <button class="chart-action-btn" @click="fullscreenChart('class')">
                  <Maximize style="width: 16px; height: 16px" />
                </button>
              </div>
            </div>
            <div class="chart-content">
              <div ref="classDistributionChart" class="chart-container"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 数据表格区域 -->
      <div class="table-section">
        <h2 class="section-title">详细数据</h2>
        <div class="table-card">
          <div class="table-header">
            <div class="table-tabs">
              <button
                v-for="view in tableViews"
                :key="view.key"
                class="table-tab"
                :class="{ active: tableView === view.key }"
                @click="switchTableView(view.key)"
              >
                <component :is="view.icon" style="width: 16px; height: 16px" />
                {{ view.label }}
              </button>
            </div>
            <div class="table-controls">
              <button class="control-btn" @click="refreshTableData">
                <RefreshCw style="width: 16px; height: 16px" />
              </button>
              <button class="control-btn" @click="exportTableData">
                <Download style="width: 16px; height: 16px" />
              </button>
            </div>
          </div>

          <div class="table-content">
            <!-- 排班数据表格 -->
            <div v-if="tableView === 'schedule'" class="table-wrapper">
              <el-table :data="scheduleData" v-loading="loading" stripe border class="data-table">
                <el-table-column prop="date" label="日期" width="120" sortable />
                <el-table-column prop="teacherName" label="考官" width="120" sortable />
                <el-table-column prop="className" label="班级" width="120" sortable />
                <el-table-column prop="subject" label="科目" width="120" sortable />
                <el-table-column prop="workload" label="工作量" width="100" sortable>
                  <template #default="{ row }">
                    <span class="workload-value">{{ row.workload }}h</span>
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getStatusType(row.status)">
                      {{ row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="createdAt" label="创建时间" width="160" sortable />
              </el-table>
            </div>

            <!-- 考官数据表格 -->
            <div v-else-if="tableView === 'teacher'" class="table-wrapper">
              <el-table :data="teacherData" v-loading="loading" stripe border class="data-table">
                <el-table-column prop="name" label="姓名" width="120" sortable />
                <el-table-column prop="department" label="部门" width="120" sortable />
                <el-table-column prop="totalWorkload" label="总工作量" width="120" sortable>
                  <template #default="{ row }">
                    <span class="workload-value">{{ row.totalWorkload }}h</span>
                  </template>
                </el-table-column>
                <el-table-column prop="avgWorkload" label="平均工作量" width="120" sortable>
                  <template #default="{ row }">
                    <span class="workload-value">{{ row.avgWorkload }}h</span>
                  </template>
                </el-table-column>
                <el-table-column prop="completionRate" label="完成率" width="100" sortable>
                  <template #default="{ row }">
                    <div class="completion-rate">
                      <div class="rate-bar">
                        <div class="rate-fill" :style="{ width: row.completionRate + '%' }"></div>
                      </div>
                      <span class="rate-text">{{ row.completionRate }}%</span>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 学员数据表格 -->
            <div v-else class="table-wrapper">
              <el-table :data="studentData" v-loading="loading" stripe border class="data-table">
                <el-table-column prop="name" label="姓名" width="120" sortable />
                <el-table-column prop="studentId" label="学号" width="120" sortable />
                <el-table-column prop="className" label="班级" width="120" sortable />
                <el-table-column prop="examCount" label="考试次数" width="100" sortable />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getStatusType(row.status)">
                      {{ row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 分页 -->
            <div class="pagination-wrapper">
              <el-pagination
                v-model:current-page="pagination.current"
                v-model:page-size="pagination.size"
                :total="pagination.total"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { DateUtils as dateUtils } from '../utils/dateUtils'
import {
  Home,
  Users,
  Calendar,
  BarChart3,
  ChevronLeft,
  RefreshCw,
  Download,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Menu,
  Minus,
  Maximize,
  CheckCircle,
} from 'lucide-vue-next'
// import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js'

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

const router = useRouter()

// 数据状态
const overviewData = reactive({
  totalSchedules: 0,
  scheduleTrend: 0,
  activeExaminers: 0,
  totalExaminers: 0,
  avgWorkload: 0,
  completionRate: 0,
})

const filterForm = reactive({
  dateRange: null,
  teacherIds: [],
  classes: [],
  departments: [],
})

const pagination = reactive({
  current: 1,
  size: 20,
  total: 0,
})

// 应用版本号 - 从 package.json 自动读取
const appVersion = ref(import.meta.env.VITE_APP_VERSION || '0.0.0')

// 响应式状态
const sidebarCollapsed = ref(false)
const isMobile = ref(false)
const mobileMenuOpen = ref(false)
const loading = ref(false)
const websocketConnected = ref(true)
const currentTime = ref('')
const lastUpdateTime = ref('')

// 检测屏幕尺寸
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    mobileMenuOpen.value = false
  }
}

// 侧边栏控制
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const openMobileMenu = () => {
  mobileMenuOpen.value = true
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

const handleNavClick = () => {
  if (isMobile.value) {
    closeMobileMenu()
  }
}

// 时间更新 - 使用dateUtils格式化时间显示
const updateTime = () => {
  const now = new Date()
  currentTime.value = dateUtils.toDateTimeString(now)
  lastUpdateTime.value = dateUtils.toTimeString(now)
}

// 工具函数
const formatNumber = num => {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString()
}

// 数据刷新
const refreshData = async () => {
  loading.value = true
  try {
    // 模拟数据刷新
    await new Promise(resolve => setTimeout(resolve, 1000))
    updateTime()
  } catch (error) {
    console.error('数据刷新失败:', error)
  } finally {
    loading.value = false
  }
}

const loadOverviewData = async () => {
  try {
    const response = await apiService.getOverviewStats()
    if (response.success && response.data) {
      Object.assign(overviewData, response.data)
    }
  } catch (error) {
    console.error('加载概览数据失败:', error)
  }
}

const loadTeachers = async () => {
  try {
    const response = await apiService.getTeachers({ page: 1, pageSize: 1000 })
    if (response.success && response.data) {
      teachers.value = response.data
      // 提取班级选项
      const classes = new Set()
      teachers.value.forEach(teacher => {
        if (teacher.classes) {
          teacher.classes.forEach(cls => classes.add(cls))
        }
      })
      classOptions.value = Array.from(classes)
    }
  } catch (error) {
    console.error('加载考官数据失败:', error)
  }
}

const loadWorkloadData = async () => {
  try {
    const data = await statisticsService.getWorkloadStatistics(filterForm)
    workloadData.value = data
  } catch (error) {
    console.error('加载工作量数据失败:', error)
  }
}

const loadHeatmapData = async () => {
  try {
    const data = await statisticsService.getHeatmapData(filterForm)
    heatmapData.value = data
  } catch (error) {
    console.error('加载热力图数据失败:', error)
  }
}

const loadTableData = async () => {
  // 根据当前视图加载对应数据
  switch (tableView.value) {
    case 'schedule':
      await loadScheduleData()
      break
    case 'teacher':
      await loadTeacherStatistics()
      break
    case 'student':
      await loadStudentData()
      break
  }
}

const loadScheduleData = async () => {
  try {
    const response = await apiService.getSchedule('all')
    if (response.success && response.data) {
      scheduleData.value = Array.isArray(response.data) ? response.data : []
      pagination.total = Array.isArray(response.data) ? response.data.length : 0
    }
  } catch (error) {
    console.error('加载排班数据失败:', error)
  }
}

const loadTeacherStatistics = async () => {
  try {
    const response = await apiService.getTeachers({
      page: pagination.current,
      pageSize: pagination.size,
      ...filterForm,
    })
    if (response.success && response.data) {
      teacherData.value = response.data.map(teacher => ({
        ...teacher,
        totalWorkload: teacher.totalWorkload || 0,
        avgWorkload: teacher.avgWorkload || 0,
        completionRate: teacher.completionRate || 0,
      }))
      pagination.total = response.data.length
    }
  } catch (error) {
    console.error('加载考官统计数据失败:', error)
  }
}

const loadStudentData = async () => {
  try {
    const response = await apiService.getStudents({
      page: pagination.current,
      pageSize: pagination.size,
      ...filterForm,
    })
    if (response.success && response.data) {
      studentData.value = response.data.map(student => ({
        ...student,
        examCount: student.examCount || 0,
        status: student.status || '正常',
      }))
      pagination.total = response.data.length
    }
  } catch (error) {
    console.error('加载学员数据失败:', error)
  }
}

const handleFilter = async () => {
  await refreshData()
}

const resetFilter = () => {
  Object.assign(filterForm, {
    dateRange: null,
    teacherIds: [],
    classes: [],
    departments: [],
  })
  handleFilter()
}

const showDetail = type => {
  ElMessageBox.alert(`查看${type}详细信息`, '详细信息', {
    confirmButtonText: '确定',
  })
}

const switchTableView = view => {
  tableView.value = view
  loadTableData()
}

const refreshTableData = () => {
  loadTableData()
}

const exportTableData = async () => {
  try {
    const blob = await statisticsService.exportStatistics(filterForm, 'excel')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // 使用dateUtils获取当前日期作为文件名
    a.download = `statistics_${dateUtils.toStandardDate(new Date())}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 导出数据
const exportData = () => {
  // 模拟导出功能
  process.env.NODE_ENV === 'development' && console.log('导出数据')
}

// 生命周期钩子
onMounted(() => {
  checkScreenSize()
  updateTime()

  // 监听窗口大小变化
  window.addEventListener('resize', checkScreenSize)

  // 定时更新时间
  const timeInterval = setInterval(updateTime, 1000)

  // 清理函数
  onUnmounted(() => {
    window.removeEventListener('resize', checkScreenSize)
    clearInterval(timeInterval)
  })
})

// 监听路由变化，自动关闭移动端菜单
watch(
  () => router.currentRoute.value,
  () => {
    if (isMobile.value) {
      closeMobileMenu()
    }
  }
)
</script>

<style scoped>
/* 使用与HomePage2.vue相同的样式 */
.app-container {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: linear-gradient(180deg, #1e3a5f 0%, #2c5282 100%);
  color: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.1);
}

/* 移动端侧边栏 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 280px;
    transform: translateX(-100%);
    z-index: 999;
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }
}

.sidebar-collapsed {
  width: 80px;
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
  min-width: 0;
}

.system-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin: 0;
  line-height: 1.2;
}

.system-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin: 2px 0 0 0;
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 16px;
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
  position: relative;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateX(4px);
}

.nav-item-active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

/* 移动端遮罩层 */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
  backdrop-filter: blur(2px);
}

.sidebar-toggle {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
}

.toggle-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-icon.rotate-180 {
  transform: rotate(180deg);
}

/* 移动端菜单按钮 */
.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  margin-right: 1rem;
}

.mobile-menu-btn:hover {
  background: #f8f9fa;
  transform: scale(1.05);
}

/* 主内容区域 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 0;
  padding: 32px; /* 统一与首页一致的边距 */
  background: #f5f7fa;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.main-content.sidebar-collapsed {
  margin-left: 0;
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    width: 100%;
  }

  .main-content.mobile-layout {
    margin-left: 0;
  }
}

/* 状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

@media (max-width: 768px) {
  .status-bar {
    padding: 0.75rem 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

.status-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex: 1;
}

@media (max-width: 768px) {
  .status-left {
    gap: 1rem;
    flex-wrap: wrap;
  }
}

.status-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

@media (max-width: 768px) {
  .status-right {
    width: 100%;
    justify-content: space-between;
    margin-top: 0.5rem;
  }

  .quick-actions .quick-btn span {
    display: none;
  }

  .quick-actions .quick-btn {
    padding: 0.5rem;
  }
}

.status-icon {
  width: 18px;
  height: 18px;
  color: #64748b;
}

.status-date {
  font-size: 14px;
  color: #475569;
  font-weight: 500;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  animation: pulse 2s infinite;
}

.status-indicator.connected {
  background: #22c55e;
}

.status-text {
  font-size: 13px;
  color: #64748b;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.quick-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-item.clickable {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.stat-item.clickable:hover {
  transform: translateY(-1px);
}

.stat-label {
  font-size: 12px;
  color: #64748b;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.quick-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  width: 14px;
  height: 14px;
}

.overview-section {
  padding: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px 0;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.overview-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.overview-card.primary {
  border-color: #3b82f6;
}

.overview-card.primary .card-icon {
  color: #3b82f6;
}

.overview-card.success {
  border-color: #10b981;
}

.overview-card.success .card-icon {
  color: #10b981;
}

.overview-card.warning {
  border-color: #f59e0b;
}

.overview-card.warning .card-icon {
  color: #f59e0b;
}

.overview-card.info {
  border-color: #8b5cf6;
}

.overview-card.info .card-icon {
  color: #8b5cf6;
}

.card-icon {
  margin-bottom: 16px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}

.card-trend.trend-up {
  color: #10b981;
}

.card-trend.trend-down {
  color: #ef4444;
}

.card-trend.trend-neutral {
  color: #64748b;
}

.card-progress {
  margin-top: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: currentColor;
  transition: width 0.3s ease;
}

.card-description {
  font-size: 12px;
  color: #64748b;
}

.filter-section {
  padding: 0 24px 24px;
}

.filter-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-row {
  display: flex;
  align-items: end;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
}

.filter-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.filter-input {
  width: 100%;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn.primary {
  background: #3b82f6;
  color: white;
}

.filter-btn.primary:hover {
  background: #2563eb;
}

.filter-btn.secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.filter-btn.secondary:hover {
  background: #e2e8f0;
}

.charts-section {
  padding: 0 24px 24px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.chart-actions {
  display: flex;
  gap: 8px;
}

.chart-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chart-action-btn:hover {
  background: #e2e8f0;
  color: #475569;
}

.chart-content {
  padding: 20px 24px 24px;
}

.chart-container {
  width: 100%;
  height: 350px;
}

.table-section {
  padding: 0 24px 24px;
}

.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.table-tabs {
  display: flex;
  gap: 4px;
}

.table-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.table-tab:hover {
  background: #f1f5f9;
  color: #475569;
}

.table-tab.active {
  background: #3b82f6;
  color: white;
}

.table-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #e2e8f0;
  color: #475569;
}

.table-content {
  padding: 0 24px 24px;
}

.table-wrapper {
  margin-bottom: 16px;
}

.data-table {
  width: 100%;
}

.workload-value {
  font-weight: 600;
  color: #3b82f6;
}

.completion-rate {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rate-bar {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.rate-fill {
  height: 100%;
  background: #10b981;
  transition: width 0.3s ease;
}

.rate-text {
  font-size: 12px;
  font-weight: 500;
  color: #10b981;
  min-width: 35px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -280px;
    z-index: 1000;
  }

  .sidebar.mobile-open {
    left: 0;
  }

  .main-content {
    margin-left: 0;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-item {
    min-width: auto;
  }
}
</style>
