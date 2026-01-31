<template>
  <div class="heatmap-chart">
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
import type { HeatmapData } from '../../types/statistics'

interface Props {
  data: HeatmapData[]
  loading?: boolean
  title?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  title: '考试热力图',
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

  // 处理热力图数据
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const dates = [...new Set(props.data.map(item => item.date))].sort()

  const heatmapData = props.data.map(item => [
    dates.indexOf(item.date),
    hours.indexOf(item.hour),
    item.examCount || item.workload,
  ])

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
      position: 'top',
      formatter: (params: any) => {
        const date = dates[params.data[0]]
        const hour = hours[params.data[1]]
        const value = params.data[2]
        return `
          <div style="font-weight: bold; margin-bottom: 8px;">${date} ${hour}:00</div>
          <div>考试数量: ${value}</div>
        `
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45,
        fontSize: 10,
      },
    },
    yAxis: {
      type: 'category',
      data: hours.map(hour => `${hour}:00`),
      inverse: true,
      axisLabel: {
        fontSize: 10,
      },
    },
    visualMap: {
      min: 0,
      max: Math.max(...props.data.map(item => item.examCount || item.workload)),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: {
        color: [
          '#313695',
          '#4575b4',
          '#74add1',
          '#abd9e9',
          '#e0f3f8',
          '#ffffbf',
          '#fee090',
          '#fdae61',
          '#f46d43',
          '#d73027',
          '#a50026',
        ],
      },
    },
    series: [
      {
        name: '考试热度',
        type: 'heatmap',
        data: heatmapData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
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
.heatmap-chart {
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
