<template>
  <div class="department-chart">
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
import { DateUtils as dateUtils } from '../../utils/dateUtils'

interface DepartmentData {
  name: string
  value: number
  color?: string
}

interface Props {
  data: DepartmentData[]
  loading?: boolean
  title?: string
  height?: string
  chartType?: 'pie' | 'bar' | 'doughnut'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  title: '科室分布',
  height: '400px',
  chartType: 'pie',
})

const chartRef = ref<HTMLDivElement>()
const chart = ref<ECharts>()

// 预定义颜色方案
const colorScheme = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
  '#ff9f7f',
]

const initChart = () => {
  if (!chartRef.value) return

  chart.value = echarts.init(chartRef.value)
  updateChart()
}

const updateChart = () => {
  if (!chart.value || !props.data.length) return

  let option: EChartsOption

  if (props.chartType === 'pie' || props.chartType === 'doughnut') {
    // 饼图配置
    option = {
      title: {
        text: props.title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `
            <div style="font-weight: bold; margin-bottom: 8px;">${params.name}</div>
            <div>数量: ${params.value}</div>
            <div>占比: ${params.percent}%</div>
          `
        },
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        data: props.data.map(item => item.name),
        textStyle: {
          fontSize: 12,
        },
      },
      series: [
        {
          name: '科室分布',
          type: 'pie',
          radius: props.chartType === 'doughnut' ? ['40%', '70%'] : '70%',
          center: ['60%', '50%'],
          data: props.data.map((item, index) => ({
            name: item.name,
            value: item.value,
            itemStyle: {
              color: item.color || colorScheme[index % colorScheme.length],
            },
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            show: true,
            formatter: '{b}: {c}',
            fontSize: 11,
          },
          labelLine: {
            show: true,
          },
        },
      ],
    }
  } else {
    // 柱状图配置
    option = {
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
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: any) => {
          const data = params[0]
          return `
            <div style="font-weight: bold; margin-bottom: 8px;">${data.name}</div>
            <div>数量: ${data.value}</div>
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
        data: props.data.map(item => item.name),
        axisLabel: {
          rotate: 45,
          fontSize: 11,
        },
      },
      yAxis: {
        type: 'value',
        name: '数量',
        nameTextStyle: {
          padding: [0, 0, 0, 40],
        },
      },
      series: [
        {
          name: '数量',
          type: 'bar',
          data: props.data.map((item, index) => ({
            value: item.value,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: item.color || colorScheme[index % colorScheme.length] },
                {
                  offset: 1,
                  color: echarts.color.lift(
                    item.color || colorScheme[index % colorScheme.length],
                    -0.3
                  ),
                },
              ]),
            },
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
          barWidth: '60%',
        },
      ],
    }
  }

  chart.value.setOption(option, true)
}

const handleResize = () => {
  chart.value?.resize()
}

// 暴露方法给父组件
const downloadChart = () => {
  if (chart.value) {
    const url = chart.value.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    })

    const link = document.createElement('a')
    link.href = url
    // 使用dateUtils获取当前日期作为文件名
    link.download = `科室分布_${dateUtils.toStandardDate(new Date())}.png`
    link.click()
  }
}

const switchChartType = (type: 'pie' | 'bar' | 'doughnut') => {
  // 这个方法可以被父组件调用来切换图表类型
  updateChart()
}

defineExpose({
  downloadChart,
  switchChartType,
})

watch(() => props.data, updateChart, { deep: true })
watch(() => props.chartType, updateChart)
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
.department-chart {
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
