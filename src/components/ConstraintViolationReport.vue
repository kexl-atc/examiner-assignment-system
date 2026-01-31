<template>
  <div class="constraint-violation-report">
    <!-- 报告头部 -->
    <div class="report-header">
      <div class="header-content">
        <h2 class="report-title">
          <i class="icon-alert"></i>
          约束违反报告
        </h2>
        <div class="report-meta">
          <span class="report-time">生成时间: {{ formatTime(reportTime) }}</span>
          <span class="report-status" :class="getStatusClass()">
            {{ getStatusText() }}
          </span>
        </div>
      </div>
      <div class="report-actions">
        <button @click="refreshReport" class="btn-refresh" :disabled="loading">
          <i class="icon-refresh" :class="{ spinning: loading }"></i>
          刷新报告
        </button>
        <button @click="exportReport" class="btn-export">
          <i class="icon-download"></i>
          导出报告
        </button>
      </div>
    </div>

    <!-- 违反统计概览 -->
    <div class="violation-summary">
      <div class="summary-card error" v-if="hardViolations.length > 0">
        <div class="card-icon">
          <i class="icon-error"></i>
        </div>
        <div class="card-content">
          <div class="card-number">{{ hardViolations.length }}</div>
          <div class="card-label">硬约束违反</div>
          <div class="card-description">必须立即修复</div>
        </div>
      </div>

      <div class="summary-card warning" v-if="softViolations.length > 0">
        <div class="card-icon">
          <i class="icon-warning"></i>
        </div>
        <div class="card-content">
          <div class="card-number">{{ softViolations.length }}</div>
          <div class="card-label">软约束违反</div>
          <div class="card-description">建议优化</div>
        </div>
      </div>

      <div class="summary-card success" v-if="hardViolations.length === 0">
        <div class="card-icon">
          <i class="icon-check"></i>
        </div>
        <div class="card-content">
          <div class="card-number">0</div>
          <div class="card-label">硬约束违反</div>
          <div class="card-description">系统运行正常</div>
        </div>
      </div>

      <div class="summary-card info">
        <div class="card-icon">
          <i class="icon-chart"></i>
        </div>
        <div class="card-content">
          <div class="card-number">{{ satisfactionRate }}%</div>
          <div class="card-label">约束满足率</div>
          <div class="card-description">整体质量评估</div>
        </div>
      </div>
    </div>

    <!-- 硬约束违反详�?-->
    <div class="violation-section" v-if="hardViolations.length > 0">
      <div class="section-header error">
        <h3 class="section-title">
          <i class="icon-error"></i>
          硬约束违反({{ hardViolations.length }}项)
        </h3>
        <p class="section-description">以下违反必须立即修复，否则系统无法正常运行</p>
      </div>

      <div class="violation-list">
        <div v-for="violation in hardViolations" :key="violation.id" class="violation-item error">
          <div class="violation-header">
            <div class="violation-title">
              <i class="icon-error"></i>
              <span class="constraint-name">{{ violation.constraintName }}</span>
              <span class="violation-count">{{ violation.count }}次违反</span>
            </div>
            <div class="violation-actions">
              <button @click="showDetails(violation)" class="btn-details">查看详情</button>
              <button @click="autoFix(violation)" class="btn-fix" :disabled="!violation.canAutoFix">
                {{ violation.canAutoFix ? '自动修复' : '手动修复' }}
              </button>
            </div>
          </div>

          <div class="violation-content">
            <p class="violation-description">{{ violation.description }}</p>

            <div class="affected-items" v-if="violation.affectedItems.length > 0">
              <h4>受影响的考试安排:</h4>
              <div class="item-list">
                <div
                  v-for="item in violation.affectedItems.slice(0, 3)"
                  :key="item.id"
                  class="affected-item"
                >
                  <span class="item-student">{{ item.studentName }}</span>
                  <span class="item-date">{{ formatDate(item.examDate) }}</span>
                  <span class="item-time">{{ item.timeSlot }}</span>
                  <span class="item-issue">{{ item.issueDescription }}</span>
                </div>
                <div v-if="violation.affectedItems.length > 3" class="more-items">
                  还有 {{ violation.affectedItems.length - 3 }} �?..
                </div>
              </div>
            </div>

            <div class="fix-suggestions">
              <h4>修复建议:</h4>
              <ul class="suggestion-list">
                <li v-for="suggestion in violation.suggestions" :key="suggestion">
                  {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 软约束违反详�?-->
    <div class="violation-section" v-if="softViolations.length > 0">
      <div class="section-header warning">
        <h3>
          <i class="icon-warning"></i>
          软约束违�?({{ softViolations.length }}�?
        </h3>
        <p class="section-description">以下违反会影响排班质量，建议进行优化</p>
      </div>

      <div class="violation-list">
        <div v-for="violation in softViolations" :key="violation.id" class="violation-item warning">
          <div class="violation-header">
            <div class="violation-title">
              <i class="icon-warning"></i>
              <span class="constraint-name">{{ violation.constraintName }}</span>
              <span class="violation-score">影响分数: -{{ violation.impactScore }}</span>
            </div>
            <div class="violation-actions">
              <button @click="showDetails(violation)" class="btn-details">查看详情</button>
              <button @click="optimize(violation)" class="btn-optimize">优化建议</button>
            </div>
          </div>

          <div class="violation-content">
            <p class="violation-description">{{ violation.description }}</p>

            <div class="impact-analysis">
              <div class="impact-item">
                <span class="impact-label">权重:</span>
                <span class="impact-value">{{ violation.weight }}</span>
              </div>
              <div class="impact-item">
                <span class="impact-label">违反次数:</span>
                <span class="impact-value">{{ violation.count }}</span>
              </div>
              <div class="impact-item">
                <span class="impact-label">影响程度:</span>
                <span class="impact-value" :class="getImpactClass(violation.impactLevel)">
                  {{ violation.impactLevel }}
                </span>
              </div>
            </div>

            <div class="optimization-suggestions">
              <h4>优化建议:</h4>
              <ul class="suggestion-list">
                <li v-for="suggestion in violation.suggestions" :key="suggestion">
                  {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 无违反状态 -->
    <div class="no-violations" v-if="hardViolations.length === 0 && softViolations.length === 0">
      <div class="success-icon">
        <i class="icon-check-circle"></i>
      </div>
      <h3>约束检查通过</h3>
      <p>当前排班方案满足所有约束条件，系统运行正常。</p>
      <div class="quality-metrics">
        <div class="metric">
          <span class="metric-label">硬约束满足率:</span>
          <span class="metric-value success">100%</span>
        </div>
        <div class="metric">
          <span class="metric-label">软约束满足率:</span>
          <span class="metric-value success">{{ satisfactionRate }}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">整体质量评分:</span>
          <span class="metric-value" :class="getScoreClass(qualityScore)"
            >{{ qualityScore }}/100</span
          >
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetailModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedViolation?.constraintName }} - 详细信息</h3>
          <button @click="closeDetailModal" class="btn-close">
            <i class="icon-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <h4>约束描述</h4>
            <p>{{ selectedViolation?.description }}</p>
          </div>

          <div class="detail-section" v-if="selectedViolation?.affectedItems">
            <h4>所有受影响项目 ({{ selectedViolation.affectedItems.length }}个)</h4>
            <div class="detail-table">
              <table>
                <thead>
                  <tr>
                    <th>学员姓名</th>
                    <th>考试日期</th>
                    <th>时间槽</th>
                    <th>问题描述</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in selectedViolation.affectedItems" :key="item.id">
                    <td>{{ item.studentName }}</td>
                    <td>{{ formatDate(item.examDate) }}</td>
                    <td>{{ item.timeSlot }}</td>
                    <td>{{ item.issueDescription }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="detail-section">
            <h4>修复建议</h4>
            <ul>
              <li v-for="suggestion in selectedViolation?.suggestions" :key="suggestion">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { DateUtils as dateUtils } from '../utils/dateUtils'

// 类型定义
interface ViolationItem {
  id: string
  constraintName: string
  constraintType: 'hard' | 'soft'
  description: string
  count: number
  weight?: number
  impactScore?: number
  impactLevel?: 'high' | 'medium' | 'low'
  canAutoFix: boolean
  affectedItems: Array<{
    id: string
    studentName: string
    examDate: string
    timeSlot: string
    issueDescription: string
  }>
  suggestions: string[]
}

// 响应式数�?
const loading = ref(false)
const reportTime = ref(new Date())
const violations = ref<ViolationItem[]>([])
const showDetailModal = ref(false)
const selectedViolation = ref<ViolationItem | null>(null)

// 计算属�?
const hardViolations = computed(() => violations.value.filter(v => v.constraintType === 'hard'))

const softViolations = computed(() => violations.value.filter(v => v.constraintType === 'soft'))

const satisfactionRate = computed(() => {
  const totalConstraints = 9 // 4个硬约束 + 5个软约束
  const violatedConstraints = violations.value.length
  return Math.round(((totalConstraints - violatedConstraints) / totalConstraints) * 100)
})

const qualityScore = computed(() => {
  let score = 100
  score -= hardViolations.value.length * 20 // 硬约束违反严重扣分
  score -= softViolations.value.reduce((sum, v) => sum + (v.impactScore || 0), 0) * 0.1
  return Math.max(0, Math.round(score))
})

// 方法
const getStatusClass = () => {
  if (hardViolations.value.length > 0) return 'error'
  if (softViolations.value.length > 0) return 'warning'
  return 'success'
}

const getStatusText = () => {
  if (hardViolations.value.length > 0) return '存在严重问题'
  if (softViolations.value.length > 0) return '需要优化'
  return '运行正常'
}

const getImpactClass = (level: string | undefined) => {
  switch (level) {
    case 'high':
      return 'impact-high'
    case 'medium':
      return 'impact-medium'
    case 'low':
      return 'impact-low'
    default:
      return ''
  }
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'score-excellent'
  if (score >= 80) return 'score-good'
  if (score >= 70) return 'score-fair'
  return 'score-poor'
}

const formatTime = (date: Date) => {
  return date.toLocaleString('zh-CN')
}

const formatDate = (dateStr: string) => {
  // 使用dateUtils格式化日期显示
  return dateUtils.toDisplayDate(dateStr)
}

const refreshReport = async () => {
  loading.value = true
  try {
    // 调用API获取最新违反报�?
    await loadViolationReport()
    reportTime.value = new Date()
  } finally {
    loading.value = false
  }
}

const exportReport = () => {
  // 导出报告逻辑
  const reportData = {
    reportTime: reportTime.value,
    hardViolations: hardViolations.value,
    softViolations: softViolations.value,
    satisfactionRate: satisfactionRate.value,
    qualityScore: qualityScore.value,
  }

  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `constraint-violation-report-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const showDetails = (violation: ViolationItem) => {
  selectedViolation.value = violation
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedViolation.value = null
}

const autoFix = async (violation: ViolationItem) => {
  if (!violation.canAutoFix) return

  loading.value = true
  try {
    // 调用自动修复API
    process.env.NODE_ENV === 'development' && console.log('自动修复约束违反:', violation.id)
    // await api.autoFixViolation(violation.id)
    await refreshReport()
  } finally {
    loading.value = false
  }
}

const optimize = (violation: ViolationItem) => {
  // 显示优化建议
  process.env.NODE_ENV === 'development' && console.log('优化建议:', violation.suggestions)
}

const loadViolationReport = async () => {
  // 模拟数据，实际应该从API获取
  violations.value = [
    {
      id: '1',
      constraintName: '考官当日白班时段禁止安排考试',
      constraintType: 'hard',
      description: '考官在白班值勤时段不能同时担任考试考官',
      count: 3,
      canAutoFix: true,
      affectedItems: [
        {
          id: '1-1',
          studentName: '张三',
          examDate: '2024-03-15',
          timeSlot: '09:00-11:00',
          issueDescription: '考官李四在此时段值白班',
        },
      ],
      suggestions: ['调整考试时间到考官非值班时段', '更换其他可用考官', '调整考官值班安排'],
    },
  ]
}

// 生命周期
onMounted(() => {
  loadViolationReport()
})
</script>

<style scoped>
.constraint-violation-report {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-content .report-title {
  margin: 0 0 8px 0;
  color: #1976d2;
  display: flex;
  align-items: center;
  gap: 8px;
}

.report-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #666;
}

.report-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.report-status.success {
  background: #e8f5e8;
  color: #4caf50;
}
.report-status.warning {
  background: #fff3e0;
  color: #ff9800;
}
.report-status.error {
  background: #ffebee;
  color: #f44336;
}

.report-actions {
  display: flex;
  gap: 12px;
}

.btn-refresh,
.btn-export {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-refresh:hover,
.btn-export:hover {
  background: #f5f5f5;
}

.spinning {
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

.violation-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.summary-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
}

.summary-card.error {
  border-left: 4px solid #f44336;
}
.summary-card.warning {
  border-left: 4px solid #ff9800;
}
.summary-card.success {
  border-left: 4px solid #4caf50;
}
.summary-card.info {
  border-left: 4px solid #2196f3;
}

.card-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.summary-card.error .card-icon {
  background: #ffebee;
  color: #f44336;
}
.summary-card.warning .card-icon {
  background: #fff3e0;
  color: #ff9800;
}
.summary-card.success .card-icon {
  background: #e8f5e8;
  color: #4caf50;
}
.summary-card.info .card-icon {
  background: #e3f2fd;
  color: #2196f3;
}

.card-number {
  font-size: 32px;
  font-weight: bold;
  line-height: 1;
}

.card-label {
  font-size: 16px;
  font-weight: 500;
  margin: 4px 0;
}

.card-description {
  font-size: 14px;
  color: #666;
}

.violation-section {
  margin-bottom: 32px;
}

.section-header {
  background: white;
  padding: 20px 24px;
  border-radius: 8px 8px 0 0;
  border-left: 4px solid;
}

.section-header.error {
  border-left-color: #f44336;
}
.section-header.warning {
  border-left-color: #ff9800;
}

.section-header h3 {
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.violation-list {
  background: white;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.violation-item {
  border-bottom: 1px solid #eee;
  padding: 24px;
}

.violation-item:last-child {
  border-bottom: none;
}

.violation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.violation-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.constraint-name {
  font-weight: 500;
  font-size: 16px;
}

.violation-count,
.violation-score {
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.violation-actions {
  display: flex;
  gap: 8px;
}

.btn-details,
.btn-fix,
.btn-optimize {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
}

.btn-fix {
  background: #1976d2;
  color: white;
  border-color: #1976d2;
}

.btn-optimize {
  background: #ff9800;
  color: white;
  border-color: #ff9800;
}

.violation-description {
  margin: 0 0 16px 0;
  color: #666;
}

.affected-items,
.fix-suggestions,
.optimization-suggestions {
  margin-bottom: 16px;
}

.affected-items h4,
.fix-suggestions h4,
.optimization-suggestions h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
}

.item-list {
  background: #f9f9f9;
  border-radius: 4px;
  padding: 12px;
}

.affected-item {
  display: grid;
  grid-template-columns: 1fr 100px 120px 2fr;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  font-size: 14px;
}

.affected-item:last-child {
  border-bottom: none;
}

.more-items {
  text-align: center;
  color: #666;
  font-size: 12px;
  padding: 8px;
}

.suggestion-list {
  margin: 0;
  padding-left: 20px;
}

.suggestion-list li {
  margin-bottom: 4px;
  font-size: 14px;
  color: #666;
}

.impact-analysis {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 4px;
}

.impact-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.impact-label {
  font-size: 12px;
  color: #666;
}

.impact-value {
  font-weight: 500;
}

.impact-high {
  color: #f44336;
}
.impact-medium {
  color: #ff9800;
}
.impact-low {
  color: #4caf50;
}

.no-violations {
  text-align: center;
  background: white;
  padding: 48px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.success-icon {
  font-size: 64px;
  color: #4caf50;
  margin-bottom: 16px;
}

.no-violations h3 {
  margin: 0 0 8px 0;
  color: #4caf50;
}

.no-violations p {
  margin: 0 0 24px 0;
  color: #666;
}

.quality-metrics {
  display: flex;
  justify-content: center;
  gap: 32px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.metric-label {
  font-size: 14px;
  color: #666;
}

.metric-value {
  font-size: 18px;
  font-weight: bold;
}

.metric-value.success {
  color: #4caf50;
}
.score-excellent {
  color: #4caf50;
}
.score-good {
  color: #8bc34a;
}
.score-fair {
  color: #ff9800;
}
.score-poor {
  color: #f44336;
}

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
  border-radius: 8px;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

.modal-body {
  padding: 24px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.detail-table {
  overflow-x: auto;
}

.detail-table table {
  width: 100%;
  border-collapse: collapse;
}

.detail-table th,
.detail-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.detail-table th {
  background: #f5f5f5;
  font-weight: 500;
}
</style>
