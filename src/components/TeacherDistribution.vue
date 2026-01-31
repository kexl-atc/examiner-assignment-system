<template>
  <div class="teacher-distribution">
    <!-- 标题栏 -->
    <div class="section-header">
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
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="m22 21-3-3m0 0a5.5 5.5 0 1 0-7.78-7.78 5.5 5.5 0 0 0 7.78 7.78Z" />
        </svg>
        考官分布情况
      </h2>
      <div class="section-actions">
        <button class="action-btn" @click="refreshData" :disabled="loading">
          <RefreshCw class="btn-icon" :class="{ 'animate-spin': loading }" />
          <span>刷新数据</span>
        </button>
      </div>
    </div>

    <div class="distribution-grid">
      <!-- 科室分布饼图 -->
      <div class="chart-panel">
        <div class="panel-header">
          <div class="panel-title">
            <Building2 class="title-icon" />
            <span>科室分布</span>
          </div>
          <div class="panel-stats">
            <span class="stats-badge">共 {{ totalTeachers }} 人</span>
          </div>
        </div>
        <div class="panel-content">
          <div class="chart-wrapper">
            <div ref="departmentChartRef" class="pie-chart-container"></div>
            <div v-if="loading" class="loading-overlay">
              <div class="loading-spinner"></div>
              <span class="loading-text">加载中...</span>
            </div>
          </div>
          <div class="chart-legend" v-if="!loading && departmentData.length > 0">
            <div
              v-for="(item, index) in departmentData"
              :key="item.name"
              class="legend-item"
              @mouseenter="highlightPieSlice(index)"
              @mouseleave="unhighlightPieSlice()"
              @click="showDepartmentDetail(item.name)"
            >
              <div
                class="legend-dot"
                :style="{ backgroundColor: departmentColors[index % departmentColors.length] }"
              ></div>
              <span class="legend-label">{{ item.name }}</span>
              <span class="legend-count">{{ item.value }}人</span>
              <span class="legend-percent"
                >({{ ((item.value / totalTeachers) * 100).toFixed(1) }}%)</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- 班组分布柱状图 -->
      <div class="chart-panel">
        <div class="panel-header">
          <div class="panel-title">
            <Users class="title-icon" />
            <span>班组分布</span>
          </div>
          <!-- 移除视图切换按钮，因为只有一个总数选项 -->
        </div>
        <div class="panel-content">
          <div class="chart-wrapper">
            <div ref="groupChartRef" class="bar-chart-container"></div>
            <div v-if="loading" class="loading-overlay">
              <div class="loading-spinner"></div>
              <span class="loading-text">加载中...</span>
            </div>
          </div>
          <div class="chart-summary" v-if="!loading && groupData.length > 0">
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">最大班组</span>
                <span class="summary-value"
                  >{{ maxGroupInfo.name }} ({{ maxGroupInfo.count }}人)</span
                >
              </div>
              <div class="summary-item">
                <span class="summary-label">平均人数</span>
                <span class="summary-value">{{ averageGroupSize.toFixed(1) }}人</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">班组总数</span>
                <span class="summary-value">{{ groupData.length }}个</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 详细信息弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ selectedDetail.title }}</h3>
          <button class="close-btn" @click="closeDetailModal">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="modal-body">
          <div class="teacher-list">
            <div v-for="teacher in selectedDetail.teachers" :key="teacher.id" class="teacher-item">
              <div class="teacher-avatar">
                <User class="w-6 h-6" />
              </div>
              <div class="teacher-info">
                <span class="teacher-name">{{ teacher.name }}</span>
                <span class="teacher-meta"
                  >{{ displayDepartment(teacher.department) }} · {{ teacher.group || '未分组' }}</span
                >
              </div>
              <div class="teacher-status">
                <span
                  class="status-badge"
                  :class="teacher.status === '可用' ? 'available' : 'unavailable'"
                >
                  {{ teacher.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { RefreshCw, Building2, Users, User, X } from 'lucide-vue-next'
import * as echarts from 'echarts'
import { normalizeDeptToFull } from '../utils/departmentNormalizer'

// 🆕 科室名称显示转换函数（统一显示为"区域X室"格式）
const displayDepartment = (dept: string | undefined | null): string => {
  if (!dept) return '未分配科室'
  return normalizeDeptToFull(dept)
}

interface Teacher {
  id: string
  name: string
  department: string
  group?: string
  status: string
}

interface DepartmentData {
  name: string
  value: number
}

interface GroupData {
  name: string
  value: number
  available: number
  unavailable: number
}

interface DetailModal {
  title: string
  teachers: Teacher[]
}

// 响应式数据
const loading = ref(false)
const departmentChartRef = ref<HTMLElement>()
const groupChartRef = ref<HTMLElement>()
const showDetailModal = ref(false)
const selectedDetail = ref<DetailModal>({ title: '', teachers: [] })
const currentGroupView = ref('total')

// 图表实例
let departmentChart: echarts.ECharts | null = null
let groupChart: echarts.ECharts | null = null

// 模拟数据
const teachers = ref<Teacher[]>([])
const departmentData = ref<DepartmentData[]>([])
const groupData = ref<GroupData[]>([])

// 视图选项
const groupViews = [{ value: 'total', label: '总数' }]

// 颜色配置
const departmentColors = [
  '#667eea',
  '#764ba2',
  '#f093fb',
  '#f5576c',
  '#4facfe',
  '#43e97b',
  '#fa709a',
  '#fee140',
  '#a8edea',
  '#d299c2',
]

const groupColors = {
  total: '#667eea',
  available: '#43e97b',
  unavailable: '#f5576c',
}

// 计算属性
const totalTeachers = computed(() =>
  departmentData.value.reduce((sum, item) => sum + item.value, 0)
)

const maxGroupInfo = computed(() => {
  if (groupData.value.length === 0) return { name: '无', count: 0 }
  const maxGroup = groupData.value.reduce((max, current) =>
    current.value > max.value ? current : max
  )
  return { name: maxGroup.name, count: maxGroup.value }
})

const averageGroupSize = computed(() => {
  if (groupData.value.length === 0) return 0
  const total = groupData.value.reduce((sum, item) => sum + item.value, 0)
  return total / groupData.value.length
})

// 加载考官数据
const loadTeacherData = async () => {
  loading.value = true
  try {
    // 从存储服务加载考官数据
    const { storageService } = await import('../utils/storageService')
    const teacherList = await storageService.loadTeachers()

    if (teacherList.length > 0) {
      teachers.value = teacherList.map(teacher => ({
        id: teacher.id,
        name: teacher.name,
        department: teacher.department,
        group: teacher.group,
        status: teacher.status || '可用',
      }))

      // 处理科室分布数据（使用统一的"区域X室"格式显示）
      const deptMap = new Map<string, number>()
      teachers.value.forEach(teacher => {
        const dept = displayDepartment(teacher.department)
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1)
      })

      departmentData.value = Array.from(deptMap.entries())
        .map(([name, value]) => ({
          name,
          value,
        }))
        .sort((a, b) => b.value - a.value)

      // 处理班组分布数据
      const groupMap = new Map<string, { total: number; available: number; unavailable: number }>()
      teachers.value.forEach(teacher => {
        const group = teacher.group || '未分组'
        const current = groupMap.get(group) || { total: 0, available: 0, unavailable: 0 }
        current.total++
        if (teacher.status === '可用') {
          current.available++
        } else {
          current.unavailable++
        }
        groupMap.set(group, current)
      })

      groupData.value = Array.from(groupMap.entries())
        .map(([name, data]) => ({
          name,
          value: data.total,
          available: data.available,
          unavailable: data.unavailable,
        }))
        .sort((a, b) => b.value - a.value)
    } else {
      // 使用模拟数据
      process.env.NODE_ENV === 'development' && console.log('使用模拟数据')
      departmentData.value = [
        { name: '内科', value: 15 },
        { name: '外科', value: 12 },
        { name: '儿科', value: 8 },
        { name: '妇产科', value: 10 },
        { name: '急诊科', value: 6 },
      ]

      groupData.value = [
        { name: '一组', value: 13, available: 11, unavailable: 2 },
        { name: '二组', value: 12, available: 10, unavailable: 2 },
        { name: '三组', value: 11, available: 9, unavailable: 2 },
        { name: '四组', value: 15, available: 12, unavailable: 3 },
      ]
    }
  } catch (error) {
    console.error('加载考官数据失败:', error)
    // 使用模拟数据
    process.env.NODE_ENV === 'development' && console.log('使用模拟数据（错误情况）')
    departmentData.value = [
      { name: '内科', value: 15 },
      { name: '外科', value: 12 },
      { name: '儿科', value: 8 },
      { name: '妇产科', value: 10 },
      { name: '急诊科', value: 6 },
    ]

    groupData.value = [
      { name: '一组', value: 13, available: 11, unavailable: 2 },
      { name: '二组', value: 12, available: 10, unavailable: 2 },
      { name: '三组', value: 11, available: 9, unavailable: 2 },
      { name: '四组', value: 15, available: 12, unavailable: 3 },
    ]
  } finally {
    loading.value = false
  }
}

// 初始化饼图
const initDepartmentChart = () => {
  if (!departmentChartRef.value) return

  departmentChart = echarts.init(departmentChartRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c}人 ({d}%)',
      backgroundColor: 'rgba(50, 50, 93, 0.9)',
      borderColor: 'transparent',
      textStyle: {
        color: '#fff',
        fontSize: 12,
      },
      borderRadius: 6,
    },
    legend: {
      show: false,
    },
    series: [
      {
        name: '科室分布',
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
          shadowBlur: 8,
          shadowColor: 'rgba(0, 0, 0, 0.1)',
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: '#333',
          },
          itemStyle: {
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
          scale: true,
          scaleSize: 5,
        },
        labelLine: {
          show: false,
        },
        data: departmentData.value.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: departmentColors[index % departmentColors.length],
          },
        })),
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDelay: (idx: number) => idx * 100,
      },
    ],
  }

  departmentChart.setOption(option)

  // 添加点击事件
  departmentChart.on('click', params => {
    showDepartmentDetail(params.name)
  })
}

// 初始化柱状图
const initGroupChart = () => {
  if (!groupChartRef.value) return

  groupChart = echarts.init(groupChartRef.value)
  updateGroupChart()
}

// 更新柱状图
const updateGroupChart = () => {
  if (!groupChart) return

  // 只显示总数统计
  const seriesData = [
    {
      name: '总人数',
      type: 'bar',
      data: groupData.value.map(item => item.value),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#667eea' },
          { offset: 1, color: '#764ba2' },
        ]),
        borderRadius: [6, 6, 0, 0],
        shadowBlur: 8,
        shadowColor: 'rgba(102, 126, 234, 0.3)',
      },
      animationDelay: (idx: number) => idx * 100,
      barWidth: '60%',
    },
  ]

  const option: any = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(102, 126, 234, 0.1)',
        },
      },
      backgroundColor: 'rgba(50, 50, 93, 0.9)',
      borderColor: 'transparent',
      textStyle: {
        color: '#fff',
        fontSize: 12,
      },
      borderRadius: 6,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '8%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: groupData.value.map(item => item.name),
      axisTick: {
        alignWithLabel: true,
        lineStyle: {
          color: '#e0e0e0',
        },
      },
      axisLabel: {
        color: '#666',
        fontSize: 12,
        fontWeight: 500,
      },
      axisLine: {
        lineStyle: {
          color: '#e0e0e0',
        },
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#666',
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: '#f5f5f5',
          type: 'dashed',
        },
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
    },
    series: seriesData,
    animationEasing: 'elasticOut' as const,
    animationDuration: 800,
  }

  if (!groupChart) return
  groupChart.setOption(option, true)

  // 添加点击事件
  groupChart.off('click')
  groupChart.on('click', (params: any) => {
    showGroupDetail(params?.name)
  })
}

// 显示科室详情（使用统一的"区域X室"格式匹配）
const showDepartmentDetail = (departmentName: string) => {
  const departmentTeachers = teachers.value.filter(
    teacher => displayDepartment(teacher.department) === departmentName
  )

  selectedDetail.value = {
    title: `${departmentName} - 考官列表`,
    teachers: departmentTeachers,
  }
  showDetailModal.value = true
}

// 显示班组详情
const showGroupDetail = (groupName: string) => {
  const groupTeachers = teachers.value.filter(teacher => (teacher.group || '未分组') === groupName)

  selectedDetail.value = {
    title: `${groupName} - 考官列表`,
    teachers: groupTeachers,
  }
  showDetailModal.value = true
}

// 关闭详情弹窗
const closeDetailModal = () => {
  showDetailModal.value = false
}

// 高亮饼图扇形
const highlightPieSlice = (index: number) => {
  if (departmentChart) {
    departmentChart.dispatchAction({
      type: 'highlight',
      seriesIndex: 0,
      dataIndex: index,
    })
  }
}

// 取消高亮
const unhighlightPieSlice = () => {
  if (departmentChart) {
    departmentChart.dispatchAction({
      type: 'downplay',
      seriesIndex: 0,
    })
  }
}

// 刷新数据
const refreshData = async () => {
  await loadTeacherData()
  if (departmentChart) {
    initDepartmentChart()
  }
  if (groupChart) {
    updateGroupChart()
  }
}

// 组件挂载
onMounted(async () => {
  await loadTeacherData()

  nextTick(() => {
    initDepartmentChart()
    initGroupChart()

    // 响应式处理
    const handleResize = () => {
      departmentChart?.resize()
      groupChart?.resize()
    }

    window.addEventListener('resize', handleResize)

    // 组件卸载时清理
    return () => {
      window.removeEventListener('resize', handleResize)
      departmentChart?.dispose()
      groupChart?.dispose()
    }
  })
})
</script>

<style scoped>
.teacher-distribution {
  @apply bg-white rounded-lg shadow-sm border border-gray-200;
}

/* 标题栏样式 */
.section-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200;
}

.section-title {
  @apply text-xl font-semibold text-gray-900 flex items-center gap-2;
}

.section-icon {
  @apply text-blue-600;
}

.section-actions {
  @apply flex items-center gap-3;
}

.action-btn {
  @apply flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.btn-icon {
  @apply w-4 h-4;
}

/* 分布网格样式 */
.distribution-grid {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6 p-6;
}

/* 图表面板样式 */
.chart-panel {
  @apply bg-gray-50 rounded-lg p-4 border border-gray-200;
}

.panel-header {
  @apply flex items-center justify-between mb-4;
}

.panel-title {
  @apply flex items-center gap-2 text-lg font-medium text-gray-900;
}

.title-icon {
  @apply w-5 h-5 text-blue-600;
}

.panel-stats {
  @apply text-sm text-gray-600;
}

.stats-badge {
  @apply px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium;
}

.panel-controls {
  @apply flex items-center gap-2;
}

.control-tabs {
  @apply flex items-center gap-1 bg-white rounded-md p-1 border border-gray-200;
}

.tab-btn {
  @apply px-3 py-1 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 transition-colors;
}

.tab-btn.active {
  @apply bg-blue-600 text-white shadow-sm;
}

.panel-content {
  @apply space-y-4;
}

/* 图表容器样式 */
.chart-wrapper {
  @apply relative;
}

.pie-chart-container,
.bar-chart-container {
  @apply w-full h-64;
}

.loading-overlay {
  @apply absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 rounded-lg;
}

.loading-spinner {
  @apply w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2;
}

.loading-text {
  @apply text-sm text-gray-600;
}

/* 图例样式 */
.chart-legend {
  @apply space-y-2;
}

.legend-item {
  @apply flex items-center gap-3 p-2 rounded-md hover:bg-white transition-colors cursor-pointer;
}

.legend-dot {
  @apply w-4 h-4 rounded-full;
}

.legend-label {
  @apply flex-1 text-sm font-medium text-gray-900;
}

.legend-count {
  @apply text-sm font-semibold text-gray-700;
}

.legend-percent {
  @apply text-sm text-gray-500;
}

/* 图表摘要样式 */
.chart-summary {
  @apply mt-4 pt-4 border-t border-gray-200;
}

.summary-grid {
  @apply grid grid-cols-3 gap-4;
}

.summary-item {
  @apply text-center;
}

.summary-label {
  @apply block text-sm text-gray-600 mb-1;
}

.summary-value {
  @apply text-lg font-semibold text-gray-900;
}

/* 弹窗样式 */
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50;
}

.modal-content {
  @apply bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden;
}

.modal-header {
  @apply flex items-center justify-between p-6 border-b border-gray-200;
}

.modal-title {
  @apply text-xl font-semibold text-gray-900;
}

.close-btn {
  @apply p-2 text-gray-400 hover:text-gray-600 transition-colors;
}

.modal-body {
  @apply p-6 max-h-96 overflow-y-auto;
}

.teacher-list {
  @apply space-y-3;
}

.teacher-item {
  @apply flex items-center gap-4 p-3 bg-gray-50 rounded-lg;
}

.teacher-avatar {
  @apply w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600;
}

.teacher-info {
  @apply flex-1;
}

.teacher-name {
  @apply block font-medium text-gray-900;
}

.teacher-meta {
  @apply text-sm text-gray-600;
}

.teacher-status {
  @apply flex items-center;
}

.status-badge {
  @apply px-2 py-1 text-xs font-medium rounded-full;
}

.status-badge.available {
  @apply bg-green-100 text-green-800;
}

.status-badge.unavailable {
  @apply bg-red-100 text-red-800;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chart-card {
  animation: fadeIn 0.3s ease-out;
}

.legend-item:hover {
  transform: translateX(4px);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .distribution-grid {
    @apply grid-cols-1;
  }

  .summary-grid {
    @apply grid-cols-2;
  }
}

@media (max-width: 640px) {
  .section-header {
    @apply flex-col gap-4 items-start;
  }

  .pie-chart-container,
  .bar-chart-container {
    @apply h-48;
  }

  .summary-grid {
    @apply grid-cols-1;
  }

  .control-tabs {
    @apply flex-wrap;
  }
}
</style>
