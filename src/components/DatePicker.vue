<template>
  <div class="date-picker" :class="{ disabled: disabled, error: hasError }">
    <label v-if="label" class="date-picker-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>

    <div class="date-picker-wrapper">
      <div class="date-input-container" @click="toggleCalendar">
        <input
          ref="dateInput"
          v-model="displayValue"
          type="text"
          class="date-input"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
        />
        <div class="date-input-icons">
          <Calendar class="calendar-icon" :class="{ active: showCalendar }" />
          <X
            v-if="modelValue && clearable && !disabled"
            class="clear-icon"
            @click.stop="clearDate"
          />
        </div>
      </div>

      <div v-if="hasError && errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <!-- 日历弹窗 -->
      <transition name="calendar-fade">
        <div v-if="showCalendar" class="calendar-popup" @click.stop>
          <div class="calendar-header">
            <button class="nav-button" @click="previousMonth" :disabled="disabled">
              <ChevronLeft class="w-4 h-4" />
            </button>
            <div class="month-year-selector">
              <select
                v-model="currentYear"
                class="year-select"
                :disabled="disabled"
                @change="updateCalendar"
              >
                <option v-for="year in availableYears" :key="year" :value="year">
                  {{ year }}年
                </option>
              </select>
              <select
                v-model="currentMonth"
                class="month-select"
                :disabled="disabled"
                @change="updateCalendar"
              >
                <option v-for="(month, index) in months" :key="index" :value="index">
                  {{ month }}
                </option>
              </select>
            </div>
            <button class="nav-button" @click="nextMonth" :disabled="disabled">
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
                v-for="day in calendarDays"
                :key="day.key"
                class="day-button"
                :class="{
                  'other-month': !day.isCurrentMonth,
                  today: day.isToday,
                  selected: day.isSelected,
                  disabled: day.isDisabled || disabled,
                  'in-range': day.inRange,
                  'range-start': day.isRangeStart,
                  'range-end': day.isRangeEnd,
                  holiday: day.isHoliday,
                  workday: day.isWorkday,
                }"
                :disabled="day.isDisabled || disabled"
                :title="day.holidayTooltip"
                @click="selectDate(day)"
                @mouseenter="handleDayHover(day)"
              >
                {{ day.day }}
                <span v-if="day.isHoliday" class="holiday-indicator">节</span>
              </button>
            </div>
          </div>

          <div class="calendar-footer">
            <div class="quick-actions">
              <button class="quick-btn" @click="selectToday" :disabled="disabled">今天</button>
              <button class="quick-btn" @click="clearDate" :disabled="disabled">清除</button>
            </div>
            <div class="calendar-actions">
              <button class="cancel-btn" @click="closeCalendar">取消</button>
              <button class="confirm-btn" @click="confirmSelection" :disabled="disabled">
                确定
              </button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 点击外部关闭日历 -->
    <div v-if="showCalendar" class="calendar-overlay" @click="closeCalendar"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import { holidayService, type Holiday } from '../services/holidayService'
import { DateUtils as dateUtils } from '../utils/dateUtils'

interface DatePickerProps {
  modelValue?: string | Date | null
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
  size?: 'small' | 'medium' | 'large'
  theme?: 'light' | 'dark'
  errorMessage?: string
  range?: boolean
}

interface CalendarDay {
  date: Date
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  isDisabled: boolean
  inRange?: boolean
  isRangeStart?: boolean
  isRangeEnd?: boolean
  isHoliday?: boolean
  isWorkday?: boolean
  holidayTooltip?: string
  key: string
}

const props = withDefaults(defineProps<DatePickerProps>(), {
  placeholder: '请选择日期',
  disabled: false,
  readonly: false,
  required: false,
  clearable: true,
  format: 'YYYY-MM-DD',
  size: 'medium',
  theme: 'light',
  range: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | Date | null]
  change: [value: string | Date | null]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const dateInput = ref<HTMLInputElement>()
const showCalendar = ref(false)
const currentDate = ref(new Date())
const selectedDate = ref<Date | null>(null)
const hoverDate = ref<Date | null>(null)
const tempSelectedDate = ref<Date | null>(null)

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

const currentYear = ref(currentDate.value.getFullYear())
const currentMonth = ref(currentDate.value.getMonth())

const hasError = computed(() => {
  return !!props.errorMessage
})

const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear - 50; i <= currentYear + 50; i++) {
    years.push(i)
  }
  return years
})

const displayValue = computed({
  get() {
    if (!selectedDate.value) return ''
    return formatDate(selectedDate.value, props.format)
  },
  set(value: string) {
    if (!value) {
      selectedDate.value = null
      return
    }

    const parsed = parseDate(value)
    if (parsed && isValidDate(parsed)) {
      selectedDate.value = parsed
    }
  },
})

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)

  // 调整到周日开始
  startDate.setDate(startDate.getDate() - firstDay.getDay())

  const days: CalendarDay[] = []
  const today = new Date()

  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)

    const isCurrentMonth = date.getMonth() === month
    const isToday = isSameDay(date, today)
    const isSelected = selectedDate.value ? isSameDay(date, selectedDate.value) : false
    const disabled = isDateDisabled(date)
    const holidayInfo = getHolidayInfo(date)

    days.push({
      date: new Date(date),
      day: date.getDate(),
      isCurrentMonth,
      isToday,
      isSelected,
      isDisabled: disabled,
      isHoliday: holidayInfo.isHoliday,
      isWorkday: holidayInfo.isWorkday,
      holidayTooltip: holidayInfo.tooltip,
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    })
  }

  return days
})

const formatDate = (date: Date, format: string): string => {
  // 使用dateUtils格式化日期
  return dateUtils.toStandardDate(date)
}

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null

  // 尝试解析不同格式
  const formats = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      const [, p1, p2, p3] = match
      let year, month, day

      if (p1.length === 4) {
        year = parseInt(p1)
        month = parseInt(p2) - 1
        day = parseInt(p3)
      } else {
        year = parseInt(p3)
        month = parseInt(p2) - 1
        day = parseInt(p1)
      }

      const date = new Date(year, month, day)
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date
      }
    }
  }

  return null
}

const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime())
}

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

const isDateDisabled = (date: Date): boolean => {
  if (props.minDate) {
    const minDate = typeof props.minDate === 'string' ? new Date(props.minDate) : props.minDate
    if (date < minDate) return true
  }

  if (props.maxDate) {
    const maxDate = typeof props.maxDate === 'string' ? new Date(props.maxDate) : props.maxDate
    if (date > maxDate) return true
  }

  if (props.disabledDates) {
    return props.disabledDates(date)
  }

  return false
}

// 获取日期的节假日信息
const getHolidayInfo = (
  date: Date
): { isHoliday: boolean; isWorkday: boolean; tooltip: string } => {
  // 使用dateUtils格式化日期
  const dateStr = dateUtils.toStandardDate(date)
  const isHoliday = holidayService.isHoliday(dateStr)
  const isWorkday = holidayService.isWorkday(dateStr)

  // 添加调试日志
  if (isHoliday || isWorkday) {
    process.env.NODE_ENV === 'development' && console.log(
      `[DatePicker] 节假日检查 - 日期: ${dateStr}, 是节假日: ${isHoliday}, 是调休: ${isWorkday}`
    )
  }

  let tooltip = ''
  if (isHoliday) {
    const holidayInfo = holidayService.getHolidayInfo(dateStr)
    tooltip = holidayInfo
      ? `${holidayInfo.name} - ${holidayInfo.description || '法定节假日'}`
      : '法定节假日'
    process.env.NODE_ENV === 'development' && console.log(`[DatePicker] 节假日信息 - ${dateStr}: ${tooltip}`)
  } else if (isWorkday) {
    tooltip = '调休工作日'
    process.env.NODE_ENV === 'development' && console.log(`[DatePicker] 调休工作日 - ${dateStr}: ${tooltip}`)
  }

  return { isHoliday, isWorkday, tooltip }
}

const toggleCalendar = () => {
  if (props.disabled || props.readonly) return
  showCalendar.value = !showCalendar.value
}

const closeCalendar = () => {
  showCalendar.value = false
  tempSelectedDate.value = null
}

const selectDate = (day: CalendarDay) => {
  if (day.isDisabled || props.disabled) return

  tempSelectedDate.value = day.date
  if (!props.range) {
    selectedDate.value = day.date
    emit('update:modelValue', day.date)
    emit('change', day.date)
    closeCalendar()
  }
}

const selectToday = () => {
  const today = new Date()
  if (!isDateDisabled(today)) {
    selectedDate.value = today
    emit('update:modelValue', today)
    emit('change', today)
    closeCalendar()
  }
}

const clearDate = () => {
  selectedDate.value = null
  tempSelectedDate.value = null
  emit('update:modelValue', null)
  emit('change', null)
  closeCalendar()
}

const confirmSelection = () => {
  if (tempSelectedDate.value) {
    selectedDate.value = tempSelectedDate.value
    emit('update:modelValue', tempSelectedDate.value)
    emit('change', tempSelectedDate.value)
  }
  closeCalendar()
}

const previousMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const updateCalendar = () => {
  currentDate.value = new Date(currentYear.value, currentMonth.value, 1)
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
    toggleCalendar()
  } else if (event.key === 'Escape') {
    closeCalendar()
  }
}

const handleDayHover = (day: CalendarDay) => {
  if (!props.range) return
  hoverDate.value = day.date
}

// 监听 modelValue 变化
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      const date = typeof newValue === 'string' ? parseDate(newValue) : newValue
      if (date && isValidDate(date)) {
        selectedDate.value = date
        currentYear.value = date.getFullYear()
        currentMonth.value = date.getMonth()
      }
    } else {
      selectedDate.value = null
    }
  },
  { immediate: true }
)

// 点击外部关闭日历
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element
  if (!target.closest('.date-picker')) {
    closeCalendar()
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
.date-picker {
  @apply relative w-full;
}

.date-picker.disabled {
  @apply opacity-50 cursor-not-allowed;
}

.date-picker.error .date-input {
  @apply border-red-500 focus:ring-red-500;
}

.date-picker-label {
  @apply block text-sm font-medium text-gray-700 mb-2;
}

.required-mark {
  @apply text-red-500 ml-1;
}

.date-picker-wrapper {
  @apply relative;
}

.date-input-container {
  @apply relative cursor-pointer;
}

.date-input {
  @apply w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer;
}

.date-input:disabled {
  @apply bg-gray-100 cursor-not-allowed;
}

.date-input-icons {
  @apply absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2;
}

.calendar-icon {
  @apply w-5 h-5 text-gray-400 transition-colors;
}

.calendar-icon.active {
  @apply text-blue-500;
}

.clear-icon {
  @apply w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors;
}

.error-message {
  @apply mt-1 text-sm text-red-600;
}

.calendar-overlay {
  @apply fixed inset-0 z-40;
}

.calendar-popup {
  @apply absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[320px];
}

.calendar-fade-enter-active,
.calendar-fade-leave-active {
  @apply transition-all duration-200;
}

.calendar-fade-enter-from,
.calendar-fade-leave-to {
  @apply opacity-0 transform scale-95;
}

.calendar-header {
  @apply flex items-center justify-between p-4 border-b border-gray-200;
}

.nav-button {
  @apply p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

.month-year-selector {
  @apply flex items-center space-x-2;
}

.year-select,
.month-select {
  @apply px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}

.calendar-grid {
  @apply p-4;
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
  @apply bg-blue-100 text-blue-600 font-medium;
}

.day-button.selected {
  @apply bg-blue-600 text-white font-medium;
}

.day-button.disabled {
  @apply text-gray-300 cursor-not-allowed hover:bg-transparent;
}

.day-button.in-range {
  @apply bg-blue-100 text-blue-600;
}

.day-button.range-start,
.day-button.range-end {
  @apply bg-blue-600 text-white;
}

.day-button.holiday {
  @apply text-red-600 font-medium bg-red-50;
}

.day-button.holiday:hover:not(:disabled) {
  @apply bg-red-100;
}

.day-button.workday {
  @apply text-orange-600 bg-orange-50;
}

.day-button.workday:hover:not(:disabled) {
  @apply bg-orange-100;
}

.holiday-indicator {
  @apply absolute -top-1 -right-1 text-xs text-red-500 font-bold leading-none;
  font-size: 10px;
}

.calendar-footer {
  @apply flex items-center justify-between p-4 border-t border-gray-200;
}

.quick-actions {
  @apply flex space-x-2;
}

.quick-btn {
  @apply px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors;
}

.calendar-actions {
  @apply flex space-x-2;
}

.cancel-btn {
  @apply px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors;
}

.confirm-btn {
  @apply px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
}

/* 大小变体 */
.date-picker.size-small .date-input {
  @apply px-3 py-2 text-sm;
}

.date-picker.size-large .date-input {
  @apply px-5 py-4 text-lg;
}

/* 主题变体 */
.date-picker.theme-dark {
  @apply text-white;
}

.date-picker.theme-dark .date-input {
  @apply bg-gray-800 border-gray-600 text-white placeholder-gray-400;
}

.date-picker.theme-dark .calendar-popup {
  @apply bg-gray-800 border-gray-600;
}

.date-picker.theme-dark .weekday {
  @apply text-gray-400;
}

.date-picker.theme-dark .day-button {
  @apply text-gray-300 hover:bg-gray-700;
}

.date-picker.theme-dark .day-button.today {
  @apply bg-blue-900 text-blue-300;
}
</style>
