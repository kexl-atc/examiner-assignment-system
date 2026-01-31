<template>
  <div class="simple-date-range-picker" :class="{ disabled: disabled }">
    <label v-if="label" class="picker-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>

    <div class="picker-wrapper">
      <div class="date-input-container" @click="togglePicker">
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
        <div class="input-icons">
          <Calendar class="calendar-icon" :class="{ active: showPicker }" />
          <button
            v-if="(startDate || endDate) && clearable && !disabled"
            class="clear-btn"
            @click.stop="clearSelection"
            title="清除选择"
          >
            <X class="clear-icon" />
          </button>
        </div>
      </div>

      <!-- 日历弹窗 -->
      <transition name="calendar-fade">
        <div v-if="showPicker" class="calendar-popup" @click.stop>
          <div class="calendar-header">
            <button class="nav-btn" @click="previousMonth" :disabled="disabled">
              <ChevronLeft class="w-4 h-4" />
            </button>
            <div class="month-year">
              <span class="month-text">{{ currentMonthText }}</span>
            </div>
            <button class="nav-btn" @click="nextMonth" :disabled="disabled">
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>

          <div class="calendar-body">
            <div class="weekdays">
              <div v-for="day in weekdays" :key="day" class="weekday">
                {{ day }}
              </div>
            </div>

            <div class="days-grid">
              <button
                v-for="day in calendarDays"
                :key="day.key"
                class="day-btn"
                :class="{
                  'other-month': !day.isCurrentMonth,
                  today: day.isToday,
                  selected: day.isSelected,
                  'in-range': day.inRange,
                  'range-start': day.isRangeStart,
                  'range-end': day.isRangeEnd,
                  disabled: day.isDisabled || disabled,
                  hover: day.isHover,
                  holiday: day.isHoliday,
                  workday: day.isWorkday,
                }"
                :disabled="day.isDisabled || disabled"
                :title="day.holidayTooltip"
                @click="selectDate(day)"
                @mouseenter="handleDayHover(day)"
                @mouseleave="handleDayLeave()"
              >
                {{ day.day }}
                <span v-if="day.isHoliday" class="holiday-indicator">节</span>
              </button>
            </div>
          </div>

          <div class="calendar-footer">
            <div class="selected-info">
              <div v-if="startDate && endDate" class="range-info">
                <div class="range-text">
                  {{ formatDate(startDate) }} 至 {{ formatDate(endDate) }}
                </div>
                <div class="range-statistics">
                  <span class="stat-item">共{{ rangeStatistics.totalDays }}天</span>
                  <span class="stat-item workdays">工作日{{ rangeStatistics.workdays }}天</span>
                  <span v-if="rangeStatistics.holidays > 0" class="stat-item holidays">
                    节假日{{ rangeStatistics.holidays }}天
                  </span>
                  <span v-if="rangeStatistics.adjustedWorkdays > 0" class="stat-item adjusted">
                    (含调休{{ rangeStatistics.adjustedWorkdays }}天)
                  </span>
                </div>
              </div>
              <span v-else-if="startDate" class="range-text">
                开始: {{ formatDate(startDate) }}
              </span>
              <span v-else class="range-text"> 请选择日期范围 </span>
            </div>
            <div class="action-buttons">
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

    <!-- 遮罩层 -->
    <div v-if="showPicker" class="picker-overlay" @click="closePicker"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import { holidayService } from '../services/holidayService'

interface SimpleDateRangePickerProps {
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
  isHoliday?: boolean
  isWorkday?: boolean
  holidayTooltip?: string
  key: string
}

const props = withDefaults(defineProps<SimpleDateRangePickerProps>(), {
  placeholder: '请选择日期范围',
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

const dateInput = ref<HTMLInputElement>()
const showPicker = ref(false)
const startDate = ref<Date | null>(null)
const endDate = ref<Date | null>(null)
const hoverDate = ref<Date | null>(null)
const isSelectingRange = ref(false)
const currentDate = ref(new Date())

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

const currentMonthText = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = months[currentDate.value.getMonth()]
  return `${year}年${month}`
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

const isValidRange = computed(() => {
  return startDate.value && endDate.value
})

// 计算选定日期范围的统计信息
const rangeStatistics = computed(() => {
  if (!startDate.value || !endDate.value) {
    return {
      totalDays: 0,
      workdays: 0,
      weekends: 0,
      holidays: 0,
      adjustedWorkdays: 0,
    }
  }

  const start = new Date(startDate.value)
  const end = new Date(endDate.value)
  const current = new Date(start)

  let totalDays = 0
  let workdays = 0
  let weekends = 0
  let holidays = 0
  let adjustedWorkdays = 0

  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0]
    const dayOfWeek = current.getDay()

    totalDays++

    if (holidayService.isHoliday(dateStr)) {
      holidays++
    } else if (holidayService.isWorkday(dateStr)) {
      adjustedWorkdays++
    } else if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekends++
    } else {
      workdays++
    }

    current.setDate(current.getDate() + 1)
  }

  return {
    totalDays,
    workdays: workdays + adjustedWorkdays,
    normalWorkdays: workdays,
    weekends,
    holidays,
    adjustedWorkdays,
  }
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startCalendar = new Date(firstDay)

  // 调整到周日开始
  startCalendar.setDate(startCalendar.getDate() - firstDay.getDay())

  const days: CalendarDay[] = []
  const today = new Date()

  for (let i = 0; i < 42; i++) {
    const date = new Date(startCalendar)
    date.setDate(startCalendar.getDate() + i)

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

    // 获取节假日信息
    const dateStr = date.toISOString().split('T')[0]
    const isHoliday = holidayService.isHoliday(dateStr)
    const isWorkday = holidayService.isWorkday(dateStr)
    let holidayTooltip = ''
    if (isHoliday) {
      const holidayInfo = holidayService.getHolidayInfo(dateStr)
      holidayTooltip = holidayInfo
        ? `${holidayInfo.name} - ${holidayInfo.description || '法定节假日'}`
        : '法定节假日'
    } else if (isWorkday) {
      holidayTooltip = '调休工作日'
    }

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
      isHoliday,
      isWorkday,
      holidayTooltip,
      key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
    })
  }

  return days
})

const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
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
      const minTime = Math.min(start.getTime(), end.getTime())
      const maxTime = Math.max(start.getTime(), end.getTime())
      return date.getTime() >= minTime && date.getTime() <= maxTime
    }
    return false
  }

  return date >= startDate.value && date <= endDate.value
}

const togglePicker = () => {
  if (props.disabled || props.readonly) return
  showPicker.value = !showPicker.value

  if (showPicker.value) {
    // 如果有选中的日期，显示对应月份
    if (startDate.value) {
      currentDate.value = new Date(startDate.value.getFullYear(), startDate.value.getMonth(), 1)
    } else {
      currentDate.value = new Date()
    }
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

const clearSelection = () => {
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

const previousMonth = () => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() - 1)
  currentDate.value = newDate
}

const nextMonth = () => {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + 1)
  currentDate.value = newDate
}

const handleDayHover = (day: CalendarDay) => {
  if (isSelectingRange.value && startDate.value && !endDate.value) {
    hoverDate.value = day.date
  }
}

const handleDayLeave = () => {
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
  const target = event?.target as Element
  if (!target?.closest('.simple-date-range-picker')) {
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
.simple-date-range-picker {
  position: relative;
  width: 100%;
}

.simple-date-range-picker.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.picker-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.required-mark {
  color: #ef4444;
  margin-left: 4px;
}

.picker-wrapper {
  position: relative;
  width: 100%;
  overflow: visible;
}

.date-input-container {
  position: relative;
  cursor: pointer;
}

.date-input {
  width: 100%;
  padding: 12px 16px;
  padding-right: 48px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background-color: white;
  color: #1f2937;
  font-size: 14px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.date-input::placeholder {
  color: #9ca3af;
}

.date-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.date-input:hover {
  border-color: #9ca3af;
}

.date-input:disabled {
  background-color: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
}

.input-icons {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.calendar-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #9ca3af;
  transition: color 0.2s;
}

.calendar-icon.active {
  color: #3b82f6;
}

.clear-btn {
  padding: 0.25rem;
  color: #9ca3af;
  border-radius: 0.25rem;
  transition: all 0.2s;
  border: none;
  background: none;
  cursor: pointer;
}

.clear-btn:hover {
  color: #ef4444;
  background-color: #fef2f2;
}

.clear-icon {
  width: 1rem;
  height: 1rem;
}

.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
}

.calendar-popup {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  z-index: 1000;
  width: 360px;
  max-height: none;
  overflow: visible;
}

.calendar-fade-enter-active,
.calendar-fade-leave-active {
  transition: all 0.2s;
}

.calendar-fade-enter-from,
.calendar-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  background-color: #f8fafc;
  border-radius: 12px 12px 0 0;
}

.nav-btn {
  padding: 8px;
  color: #6b7280;
  background-color: transparent;
  border: none;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:hover {
  color: #374151;
  background-color: white;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.month-year {
  flex: 1;
  text-align: center;
}

.month-text {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.calendar-body {
  padding: 20px;
  min-height: 280px;
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 12px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  padding: 8px 0;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  justify-items: center;
}

.day-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border-radius: 6px;
  transition: all 0.2s ease;
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
  font-weight: 500;
}

.day-btn:hover {
  background-color: #f8fafc;
}

.day-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.day-btn.other-month {
  color: #d1d5db;
}

.day-btn.today {
  background-color: #f0f9ff;
  color: #0284c7;
  font-weight: 600;
  border: 1px solid #e0f2fe;
}

.day-btn.selected {
  background-color: #3b82f6;
  color: white;
  font-weight: 600;
}

.day-btn.disabled {
  color: #e5e7eb;
  cursor: not-allowed;
}

.day-btn.disabled:hover {
  background-color: transparent;
}

.day-btn.in-range {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.day-btn.range-start {
  background-color: #3b82f6;
  color: white;
  font-weight: 600;
}

.day-btn.range-end {
  background-color: #3b82f6;
  color: white;
  font-weight: 600;
}

.day-btn.hover {
  background-color: #dbeafe;
  color: #1e40af;
}

/* 节假日样式 */
.day-btn.holiday {
  background-color: #fef2f2;
  color: #dc2626;
  position: relative;
}

.day-btn.holiday:hover {
  background-color: #fee2e2;
}

.day-btn.workday {
  background-color: #fff7ed;
  color: #ea580c;
  position: relative;
}

.day-btn.workday:hover {
  background-color: #fed7aa;
}

.holiday-indicator {
  position: absolute;
  top: -2px;
  right: -2px;
  font-size: 8px;
  background-color: #dc2626;
  color: white;
  border-radius: 2px;
  padding: 1px 2px;
  line-height: 1;
}

.calendar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid #f3f4f6;
  background-color: #f8fafc;
  border-radius: 0 0 12px 12px;
}

.selected-info {
  flex: 1;
}

.range-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.range-text {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.range-statistics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.stat-item {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f3f4f6;
  color: #4b5563;
}

.stat-item.workdays {
  background-color: #dcfce7;
  color: #166534;
}

.stat-item.holidays {
  background-color: #fee2e2;
  color: #dc2626;
}

.stat-item.adjusted {
  background-color: #fed7aa;
  color: #ea580c;
  font-weight: normal;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.cancel-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.cancel-btn:hover {
  color: #374151;
  border-color: #9ca3af;
  background-color: #f9fafb;
}

.confirm-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.confirm-btn:hover {
  background-color: #2563eb;
}

.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #9ca3af;
}
</style>
