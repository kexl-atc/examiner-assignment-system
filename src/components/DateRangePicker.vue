<template>
  <div class="date-range-picker" :class="{ disabled: disabled, error: hasError }">
    <label v-if="label" class="date-range-picker-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>

    <div class="date-range-picker-wrapper">
      <div class="date-range-input-container" @click="togglePicker">
        <input
          ref="dateRangeInput"
          v-model="displayValue"
          type="text"
          class="date-range-input"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
        />
        <div class="date-range-input-icons">
          <CalendarRange class="calendar-range-icon" :class="{ active: showPicker }" />
          <button
            v-if="(startDate || endDate) && clearable && !disabled"
            class="clear-icon-btn"
            @click.stop="clearDateRange"
            title="清除日期"
          >
            <X class="clear-icon" />
          </button>
        </div>
      </div>

      <div v-if="hasError && errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <!-- 日历范围选择弹窗 -->
      <transition name="calendar-fade">
        <div v-if="showPicker" class="calendar-range-popup" @click.stop>
          <div class="calendar-range-header">
            <div class="selected-range-display">
              <span class="range-value">{{ selectedRangeDisplay || '请选择考试日期范围' }}</span>
              <button
                v-if="startDate || endDate"
                class="clear-range-btn"
                @click="clearDateRange"
                title="清除选择"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="calendar-range-content">
            <!-- 双月日历显示 -->
            <div class="dual-calendar">
              <!-- 左侧日历 -->
              <div class="calendar-panel">
                <div class="calendar-header">
                  <button class="nav-button" @click="previousMonth('left')" :disabled="disabled">
                    <ChevronLeft class="w-4 h-4" />
                  </button>
                  <div class="month-year-display">
                    <span class="month-year-text">{{ formatMonthYear(leftCalendarDate) }}</span>
                  </div>
                  <button class="nav-button" @click="nextMonth('left')" :disabled="disabled">
                    <ChevronRight class="w-4 h-4" />
                  </button>
                </div>

                <div class="calendar-grid">
                  <div class="weekdays">
                    <div v-for="day in weekdays" :key="day" class="weekday">
                      {{ day }}
                    </div>
                  </div>

                  <div class="days-grid">
                    <button
                      v-for="day in leftCalendarDays"
                      :key="day.key"
                      class="day-button"
                      :class="{
                        'other-month': !day.isCurrentMonth,
                        today: day.isToday,
                        selected: day.isSelected,
                        'in-range': day.inRange,
                        'range-start': day.isRangeStart,
                        'range-end': day.isRangeEnd,
                        disabled: day.isDisabled || disabled,
                        hover: day.isHover,
                      }"
                      :disabled="day.isDisabled || disabled"
                      @click="selectDate(day)"
                      @mouseenter="handleDayHover(day)"
                      @mouseleave="handleDayLeave(day)"
                    >
                      {{ day.day }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- 右侧日历 -->
              <div class="calendar-panel">
                <div class="calendar-header">
                  <button class="nav-button" @click="previousMonth('right')" :disabled="disabled">
                    <ChevronLeft class="w-4 h-4" />
                  </button>
                  <div class="month-year-display">
                    <span class="month-year-text">{{ formatMonthYear(rightCalendarDate) }}</span>
                  </div>
                  <button class="nav-button" @click="nextMonth('right')" :disabled="disabled">
                    <ChevronRight class="w-4 h-4" />
                  </button>
                </div>

                <div class="calendar-grid">
                  <div class="weekdays">
                    <div v-for="day in weekdays" :key="day" class="weekday">
                      {{ day }}
                    </div>
                  </div>

                  <div class="days-grid">
                    <button
                      v-for="day in rightCalendarDays"
                      :key="day.key"
                      class="day-button"
                      :class="{
                        'other-month': !day.isCurrentMonth,
                        today: day.isToday,
                        selected: day.isSelected,
                        'in-range': day.inRange,
                        'range-start': day.isRangeStart,
                        'range-end': day.isRangeEnd,
                        disabled: day.isDisabled || disabled,
                        hover: day.isHover,
                      }"
                      :disabled="day.isDisabled || disabled"
                      @click="selectDate(day)"
                      @mouseenter="handleDayHover(day)"
                      @mouseleave="handleDayLeave(day)"
                    >
                      {{ day.day }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 快捷选择 -->
            <div class="quick-ranges">
              <div class="quick-range-buttons">
                <button
                  v-for="quickRange in quickRanges"
                  :key="quickRange.label"
                  class="quick-range-btn"
                  @click="selectQuickRange(quickRange)"
                  :disabled="disabled"
                >
                  {{ quickRange.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="calendar-range-footer">
            <div class="calendar-actions">
              <button class="cancel-btn" @click="closePicker">取消</button>
              <button
                class="confirm-btn"
                @click="confirmSelection"
                :disabled="disabled || !isValidRange"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 点击外部关闭选择器 -->
    <div v-if="showPicker" class="calendar-overlay" @click="closePicker"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { CalendarRange, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import { DateUtils as dateUtils } from '../utils/dateUtils'

interface DateRangePickerProps {
  startDate?: string | Date | null
  endDate?: string | Date | null
  placeholder?: string
  label?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  clearable?: boolean
  format?: string
  minDate?: string | Date
  maxDate?: string | Date
  disabledDates?: (date: Date) => boolean
  errorMessage?: string
}

interface CalendarDay {
  date: Date
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isDisabled: boolean
  inRange: boolean
  isRangeStart: boolean
  isRangeEnd: boolean
  isHover: boolean
  key: string
}

interface QuickRange {
  label: string
  days: number
}

const props = withDefaults(defineProps<DateRangePickerProps>(), {
  placeholder: '请选择考试日期范围',
  disabled: false,
  readonly: false,
  required: false,
  clearable: true,
  format: 'YYYY-MM-DD',
})

const emit = defineEmits<{
  'update:startDate': [value: string | Date | null]
  'update:endDate': [value: string | Date | null]
  change: [startDate: string | Date | null, endDate: string | Date | null]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const dateRangeInput = ref<HTMLInputElement>()
const showPicker = ref(false)
const startDate = ref<Date | null>(null)
const endDate = ref<Date | null>(null)
const hoverDate = ref<Date | null>(null)
const isSelectingRange = ref(false)

const leftCalendarDate = ref(new Date())
const rightCalendarDate = ref(new Date())

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const months = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
]

const hasError = computed(() => {
  return !!props.errorMessage
})

const quickRanges = computed<QuickRange[]>(() => {
  return [
    { label: '未来3天', days: 3 },
    { label: '未来1周', days: 7 },
    { label: '未来2周', days: 14 },
    { label: '未来1个月', days: 30 },
  ]
})

const displayValue = computed(() => {
  if (!startDate.value && !endDate.value) return ''

  const start = startDate.value ? formatDate(startDate.value) : ''
  const end = endDate.value ? formatDate(endDate.value) : ''

  if (start && end) {
    return `${start} 至 ${end}`
  } else if (start) {
    return `${start} 至 ?`
  } else if (end) {
    return `? 至 ${end}`
  }

  return ''
})

const selectedRangeDisplay = computed(() => {
  if (!startDate.value && !endDate.value) return ''

  const start = startDate.value ? formatDate(startDate.value) : ''
  const end = endDate.value ? formatDate(endDate.value) : ''

  if (start && end) {
    const days =
      Math.ceil((endDate.value!.getTime() - startDate.value!.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return `${start} 至 ${end} (共${days}天)`
  } else if (start) {
    return `开始: ${start}`
  } else if (end) {
    return `结束: ${end}`
  }

  return ''
})

const isValidRange = computed(() => {
  return startDate.value && endDate.value
})

const leftCalendarDays = computed(() => {
  return generateCalendarDays(leftCalendarDate.value)
})

const rightCalendarDays = computed(() => {
  return generateCalendarDays(rightCalendarDate.value)
})

const formatDate = (date: Date): string => {
  // 使用dateUtils格式化日期
  return dateUtils.toStandardDate(date)
}

const formatMonthYear = (date: Date): string => {
  const year = date.getFullYear()
  const month = months[date.getMonth()]
  return `${year}年 ${month}`
}

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null

  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (match) {
    const [, year, month, day] = match
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    if (
      date.getFullYear() === parseInt(year) &&
      date.getMonth() === parseInt(month) - 1 &&
      date.getDate() === parseInt(day)
    ) {
      return date
    }
  }

  return null
}

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

const isDateDisabled = (date: Date): boolean => {
  // 禁用过去的日期 - 使用dateUtils获取当前日期
  const today = dateUtils.getStartOfDay(new Date())
  if (date < today) return true

  if (props.minDate) {
    const minDate = typeof props.minDate === 'string' ? parseDate(props.minDate) : props.minDate
    if (minDate && date < minDate) return true
  }

  if (props.maxDate) {
    const maxDate = typeof props.maxDate === 'string' ? parseDate(props.maxDate) : props.maxDate
    if (maxDate && date > maxDate) return true
  }

  if (props.disabledDates) {
    return props.disabledDates(date)
  }

  return false
}

const isDateInRange = (date: Date): boolean => {
  if (!startDate.value || !endDate.value) {
    if (hoverDate.value && startDate.value && !endDate.value) {
      const start = startDate.value
      const end = hoverDate.value
      return (
        date.getTime() >= Math.min(start.getTime(), end.getTime()) &&
        date.getTime() <= Math.max(start.getTime(), end.getTime())
      )
    }
    return false
  }

  return date >= startDate.value && date <= endDate.value
}

const generateCalendarDays = (currentDate: Date): CalendarDay[] => {
  // 使用dateUtils获取月份的开始和结束日期
  const month = currentDate.getMonth()
  const firstDay = dateUtils.getStartOfMonth(currentDate)
  const lastDay = dateUtils.getEndOfMonth(currentDate)
  const calendarStartDate = new Date(firstDay)

  // 调整到周日开始
  calendarStartDate.setDate(calendarStartDate.getDate() - firstDay.getDay())

  const days: CalendarDay[] = []
  const today = new Date()

  for (let i = 0; i < 42; i++) {
    const date = new Date(calendarStartDate)
    date.setDate(calendarStartDate.getDate() + i)

    const isCurrentMonth = date.getMonth() === month
    const isToday = isSameDay(date, today)
    const isSelected =
      !!(startDate.value && isSameDay(date, startDate.value)) ||
      !!(endDate.value && isSameDay(date, endDate.value))
    const isDisabled = isDateDisabled(date)
    const inRange = isDateInRange(date)
    const isRangeStart = !!(startDate.value && isSameDay(date, startDate.value))
    const isRangeEnd = !!(endDate.value && isSameDay(date, endDate.value))
    const isHover = !!(hoverDate.value && isSameDay(date, hoverDate.value))

    days.push({
      date: new Date(date),
      day: date.getDate(),
      isCurrentMonth,
      isToday,
      isSelected,
      isDisabled,
      inRange,
      isRangeStart,
      isRangeEnd,
      isHover,
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    })
  }

  return days
}

const togglePicker = () => {
  if (props.disabled || props.readonly) return
  showPicker.value = !showPicker.value

  if (showPicker.value) {
    // 初始化日历显示 - 使用dateUtils获取当前日期
    const today = new Date()
    leftCalendarDate.value = dateUtils.getStartOfMonth(today)
    rightCalendarDate.value = dateUtils.getStartOfNextMonth(today)
  }
}

const closePicker = () => {
  showPicker.value = false
  hoverDate.value = null
  isSelectingRange.value = false
}

const selectDate = (day: CalendarDay) => {
  if (day.isDisabled || props.disabled) return

  if (!startDate.value || (startDate.value && endDate.value)) {
    // 开始新的选择
    startDate.value = day.date
    endDate.value = null
    isSelectingRange.value = true
  } else if (startDate.value && !endDate.value) {
    // 选择结束日期
    if (day.date >= startDate.value) {
      endDate.value = day.date
    } else {
      endDate.value = startDate.value
      startDate.value = day.date
    }
    isSelectingRange.value = false
  }
}

const selectQuickRange = (quickRange: QuickRange) => {
  // 使用dateUtils获取当前日期
  const today = dateUtils.getStartOfDay(new Date())

  const start = new Date(today)
  const end = new Date(today)
  end.setDate(end.getDate() + quickRange.days - 1)

  startDate.value = start
  endDate.value = end
  isSelectingRange.value = false
}

const clearDateRange = () => {
  startDate.value = null
  endDate.value = null
  hoverDate.value = null
  isSelectingRange.value = false
  emit('update:startDate', null)
  emit('update:endDate', null)
  emit('change', null, null)
  closePicker()
}

const confirmSelection = () => {
  if (!isValidRange.value) return

  emit('update:startDate', startDate.value)
  emit('update:endDate', endDate.value)
  emit('change', startDate.value, endDate.value)
  closePicker()
}

const previousMonth = (side: 'left' | 'right') => {
  if (side === 'left') {
    // 使用dateUtils获取上个月的日期
    leftCalendarDate.value = dateUtils.addMonths(leftCalendarDate.value, -1)
    // 确保右侧日历始终比左侧晚一个月
    rightCalendarDate.value = dateUtils.addMonths(leftCalendarDate.value, 1)
  } else {
    // 使用dateUtils获取上个月的日期
    rightCalendarDate.value = dateUtils.addMonths(rightCalendarDate.value, -1)
    // 确保左侧日历始终比右侧早一个月
    leftCalendarDate.value = dateUtils.addMonths(rightCalendarDate.value, -1)
  }
}

const nextMonth = (side: 'left' | 'right') => {
  if (side === 'left') {
    // 使用dateUtils获取下个月的日期
    leftCalendarDate.value = dateUtils.addMonths(leftCalendarDate.value, 1)
    // 确保右侧日历始终比左侧晚一个月
    rightCalendarDate.value = dateUtils.addMonths(leftCalendarDate.value, 1)
  } else {
    // 使用dateUtils获取下个月的日期
    rightCalendarDate.value = dateUtils.addMonths(rightCalendarDate.value, 1)
    // 确保左侧日历始终比右侧早一个月
    leftCalendarDate.value = dateUtils.addMonths(rightCalendarDate.value, -1)
  }
}

const handleDayHover = (day: CalendarDay) => {
  if (isSelectingRange.value && startDate.value && !endDate.value) {
    hoverDate.value = day.date
  }
}

const handleDayLeave = (day: CalendarDay) => {
  // 可以在这里处理鼠标离开的逻辑
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    togglePicker()
  } else if (event.key === 'Escape') {
    closePicker()
  }
}

// 监听 props 变化
watch(
  () => props.startDate,
  newValue => {
    if (newValue) {
      const date = typeof newValue === 'string' ? parseDate(newValue) : newValue
      if (date) {
        startDate.value = date
      }
    } else {
      startDate.value = null
    }
  },
  { immediate: true }
)

watch(
  () => props.endDate,
  newValue => {
    if (newValue) {
      const date = typeof newValue === 'string' ? parseDate(newValue) : newValue
      if (date) {
        endDate.value = date
      }
    } else {
      endDate.value = null
    }
  },
  { immediate: true }
)

// 点击外部关闭选择器
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.closest('.date-range-picker')) {
    closePicker()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.date-range-picker {
  @apply relative w-full;
}

.date-range-picker.disabled {
  @apply opacity-50 cursor-not-allowed;
}

.date-range-picker.error .date-range-input {
  @apply border-red-500 focus:ring-red-500;
}

.date-range-picker-label {
  @apply block text-sm font-medium text-gray-700 mb-2;
}

.required-mark {
  @apply text-red-500 ml-1;
}

.date-range-picker-wrapper {
  @apply relative;
}

.date-range-input-container {
  @apply relative cursor-pointer;
}

.date-range-input {
  @apply w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer;
}

.date-range-input:disabled {
  @apply bg-gray-100 cursor-not-allowed;
}

.date-range-input-icons {
  @apply absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2;
}

.calendar-range-icon {
  @apply w-5 h-5 text-gray-400 transition-colors;
}

.calendar-range-icon.active {
  @apply text-blue-500;
}

.clear-icon-btn {
  @apply p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors;
}

.clear-icon {
  @apply w-4 h-4;
}

.error-message {
  @apply mt-1 text-sm text-red-600;
}

.calendar-overlay {
  @apply fixed inset-0 z-40;
}

.calendar-range-popup {
  @apply absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[700px];
}

.calendar-fade-enter-active,
.calendar-fade-leave-active {
  @apply transition-all duration-200;
}

.calendar-fade-enter-from,
.calendar-fade-leave-to {
  @apply opacity-0 transform scale-95;
}

.calendar-range-header {
  @apply p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50;
}

.selected-range-display {
  @apply flex items-center justify-between;
}

.range-value {
  @apply text-lg font-semibold text-gray-900;
}

.clear-range-btn {
  @apply p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors;
}

.calendar-range-content {
  @apply p-4;
}

.dual-calendar {
  @apply flex space-x-6 mb-6;
}

.calendar-panel {
  @apply flex-1;
}

.calendar-header {
  @apply flex items-center justify-between mb-4 px-2;
}

.nav-button {
  @apply p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.month-year-display {
  @apply flex-1 text-center;
}

.month-year-text {
  @apply text-lg font-semibold text-gray-900;
}

.calendar-grid {
  @apply space-y-1;
}

.weekdays {
  @apply grid grid-cols-7 gap-1 mb-2;
}

.weekday {
  @apply text-center text-sm font-medium text-gray-600 py-2;
}

.days-grid {
  @apply grid grid-cols-7 gap-1;
}

.day-button {
  @apply w-10 h-10 flex items-center justify-center text-sm rounded-lg transition-all duration-150 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 relative;
}

.day-button.other-month {
  @apply text-gray-400;
}

.day-button.today {
  @apply bg-blue-100 text-blue-600 font-semibold;
}

.day-button.selected {
  @apply bg-blue-600 text-white font-semibold;
}

.day-button.disabled {
  @apply text-gray-300 cursor-not-allowed hover:bg-transparent;
}

.day-button.in-range {
  @apply bg-blue-100 text-blue-700;
}

.day-button.range-start {
  @apply bg-blue-600 text-white font-semibold rounded-l-lg;
}

.day-button.range-end {
  @apply bg-blue-600 text-white font-semibold rounded-r-lg;
}

.day-button.hover {
  @apply bg-blue-200 text-blue-800;
}

.quick-ranges {
  @apply border-t border-gray-200 pt-4;
}

.quick-range-buttons {
  @apply flex flex-wrap gap-2 justify-center;
}

.quick-range-btn {
  @apply px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm;
}

.calendar-range-footer {
  @apply flex items-center justify-center p-4 border-t border-gray-200 bg-gray-50;
}

.calendar-actions {
  @apply flex space-x-3;
}

.cancel-btn {
  @apply px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors;
}

.confirm-btn {
  @apply px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}
</style>
