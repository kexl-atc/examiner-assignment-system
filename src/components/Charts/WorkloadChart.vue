<template>
  <div class="workload-chart">
    <div ref="chartRef" class="chart-container"></div>
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import type { WorkloadStatistic } from '../../types/statistics'

interface Props {
  data: WorkloadStatistic[]
  loading?: boolean
  title?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  title: '考官工作量分布',
  height: '400px',
})

const chartRef = ref<HTMLDivElement>()
const chart = ref<ECharts>()

const initChart = () => {
  if (!chartRef.value) return

  chart.value = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chart.value || !props.data.length) return

  const option: EChartsOption = {
    title: {
      text: props.title,
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0].data
        return `
          <div style="font-weight: bold; margin-bottom: 8px;">${data.examinerName}</div>
          <div>总考试数: ${data.totalExams}</div>
          <div>总工时: ${data.totalHours}小时</div>
          <div>平均工作量: ${data.averageWorkload.toFixed(1)}</div>
        `
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: props.data.map(item => item.examinerName),
      axisLabel: {
        rotate: 45,
        fontSize: 12,
      },
    },
    yAxis: {
      type: 'value',
      name: '工作量',
      nameTextStyle: {
        padding: [0, 0, 0, 40],
      },
    },
    series: [
      {
        name: '总考试数',
        type: 'bar',
        data: props.data.map(item => ({
          value: item.totalExams,
          examinerName: item.examinerName,
          totalExams: item.totalExams,
          totalHours: item.totalHours,
          averageWorkload: item.averageWorkload,
        })),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#5470c6' },
            { offset: 1, color: '#91cc75' },
          ]),
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#415a9b' },
              { offset: 1, color: '#6da05b' },
            ]),
          },
        },
      },
      {
        name: '总工时',
        type: 'line',
        yAxisIndex: 0,
        data: props.data.map(item => item.totalHours),
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: '#ee6666',
        },
        lineStyle: {
          width: 3,
        },
      },
    ],
    legend: {
      data: ['总考试数', '总工时'],
      top: 30,
      right: 10,
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
      },
    ],
  }

  chart.value.setOption(option)
}

const handleResize = () => {
  chart.value?.resize()
}

watch(() => props.data, updateChart, { deep: true })
watch(
  () => props.loading,
  loading => {
    if (!loading) {
      setTimeout(() => chart.value?.resize(), 100)
    }
  }
)

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  chart.value?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.workload-chart {
  position: relative;
  width: 100%;
  height: v-bind(height);
}

.chart-container {
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
