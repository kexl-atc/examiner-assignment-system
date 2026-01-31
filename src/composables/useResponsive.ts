import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

export interface ResponsiveBreakpoints {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
  '3xl': number
}

export const breakpoints: ResponsiveBreakpoints = {
  xs: 475,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
}

export function useResponsive() {
  const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 768)

  // 基础断点检测
  const isXs = computed(() => windowWidth.value >= breakpoints.xs)
  const isSm = computed(() => windowWidth.value >= breakpoints.sm)
  const isMd = computed(() => windowWidth.value >= breakpoints.md)
  const isLg = computed(() => windowWidth.value >= breakpoints.lg)
  const isXl = computed(() => windowWidth.value >= breakpoints.xl)
  const is2xl = computed(() => windowWidth.value >= breakpoints['2xl'])
  const is3xl = computed(() => windowWidth.value >= breakpoints['3xl'])

  // 设备类型检测
  const isMobile = computed(() => windowWidth.value < breakpoints.md)
  const isTablet = computed(
    () => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg
  )
  const isDesktop = computed(() => windowWidth.value >= breakpoints.lg)
  const isWideScreen = computed(() => windowWidth.value >= breakpoints['2xl'])
  const isUltraWide = computed(() => windowWidth.value >= breakpoints['3xl'])

  // 屏幕方向检测
  const isLandscape = computed(() => windowWidth.value > windowHeight.value)
  const isPortrait = computed(() => windowHeight.value >= windowWidth.value)

  // 具体断点范围检测
  const isMobileOnly = computed(() => windowWidth.value < breakpoints.md)
  const isTabletOnly = computed(
    () => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg
  )
  const isDesktopOnly = computed(
    () => windowWidth.value >= breakpoints.lg && windowWidth.value < breakpoints.xl
  )
  const isLargeDesktop = computed(
    () => windowWidth.value >= breakpoints.xl && windowWidth.value < breakpoints['2xl']
  )
  const isExtraLarge = computed(() => windowWidth.value >= breakpoints['2xl'])

  // 响应式列数计算
  const gridCols = computed(() => {
    if (windowWidth.value < breakpoints.sm) return 1
    if (windowWidth.value < breakpoints.md) return 2
    if (windowWidth.value < breakpoints.lg) return 3
    if (windowWidth.value < breakpoints.xl) return 4
    if (windowWidth.value < breakpoints['2xl']) return 5
    return 6
  })

  // 侧边栏宽度计算
  const sidebarWidth = computed(() => {
    if (windowWidth.value < breakpoints.md) return '100vw'
    if (windowWidth.value < breakpoints.lg) return '240px'
    if (windowWidth.value < breakpoints.xl) return '280px'
    if (windowWidth.value < breakpoints['2xl']) return '320px'
    return '360px'
  })

  // 内容区域padding计算
  const contentPadding = computed(() => {
    if (windowWidth.value < breakpoints.sm) return '16px'
    if (windowWidth.value < breakpoints.md) return '20px'
    if (windowWidth.value < breakpoints.lg) return '24px'
    if (windowWidth.value < breakpoints.xl) return '32px'
    if (windowWidth.value < breakpoints['2xl']) return '40px'
    return '48px'
  })

  // 字体大小计算
  const fontSize = computed(() => {
    if (windowWidth.value < breakpoints.sm) return 'text-sm'
    if (windowWidth.value < breakpoints.md) return 'text-base'
    if (windowWidth.value < breakpoints.lg) return 'text-base'
    return 'text-lg'
  })

  // 按钮大小计算
  const buttonSize = computed(() => {
    if (windowWidth.value < breakpoints.md) return 'small'
    if (windowWidth.value < breakpoints.lg) return 'medium'
    return 'large'
  })

  // 表格配置计算
  const tableConfig = computed(() => ({
    showAllColumns: windowWidth.value >= breakpoints.lg,
    showImportantColumns: windowWidth.value >= breakpoints.md,
    useCardLayout: windowWidth.value < breakpoints.md,
    enableHorizontalScroll: windowWidth.value < breakpoints.lg,
    compactMode: windowWidth.value < breakpoints.md,
  }))

  // 模态框配置计算
  const modalConfig = computed(() => ({
    width:
      windowWidth.value < breakpoints.sm
        ? '95vw'
        : windowWidth.value < breakpoints.md
          ? '90vw'
          : windowWidth.value < breakpoints.lg
            ? '80vw'
            : '70vw',
    maxWidth:
      windowWidth.value < breakpoints.md
        ? '500px'
        : windowWidth.value < breakpoints.lg
          ? '600px'
          : '800px',
    fullScreen: windowWidth.value < breakpoints.sm,
  }))

  // 导航配置计算
  const navigationConfig = computed(() => ({
    showFullMenu: windowWidth.value >= breakpoints.lg,
    showCollapsedMenu: windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg,
    showMobileMenu: windowWidth.value < breakpoints.md,
    enableSwipeGestures: windowWidth.value < breakpoints.md,
  }))

  // 获取当前断点名称
  const currentBreakpoint = computed(() => {
    if (windowWidth.value < breakpoints.xs) return 'xs-down'
    if (windowWidth.value < breakpoints.sm) return 'xs'
    if (windowWidth.value < breakpoints.md) return 'sm'
    if (windowWidth.value < breakpoints.lg) return 'md'
    if (windowWidth.value < breakpoints.xl) return 'lg'
    if (windowWidth.value < breakpoints['2xl']) return 'xl'
    if (windowWidth.value < breakpoints['3xl']) return '2xl'
    return '3xl'
  })

  // 检测是否在指定断点范围内
  const between = (min: keyof ResponsiveBreakpoints, max: keyof ResponsiveBreakpoints) => {
    return computed(
      () => windowWidth.value >= breakpoints[min] && windowWidth.value < breakpoints[max]
    )
  }

  // 检测是否大于等于指定断点
  const greaterOrEqual = (breakpoint: keyof ResponsiveBreakpoints) => {
    return computed(() => windowWidth.value >= breakpoints[breakpoint])
  }

  // 检测是否小于指定断点
  const smaller = (breakpoint: keyof ResponsiveBreakpoints) => {
    return computed(() => windowWidth.value < breakpoints[breakpoint])
  }

  // 窗口尺寸更新处理
  const updateWindowSize = () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  }

  // 防抖处理
  let resizeTimer: number | null = null
  const handleResize = () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }
    resizeTimer = window.setTimeout(updateWindowSize, 100)
  }

  // 生命周期管理
  onMounted(() => {
    if (typeof window !== 'undefined') {
      updateWindowSize()
      window.addEventListener('resize', handleResize)
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) {
        clearTimeout(resizeTimer)
      }
    }
  })

  return {
    // 窗口尺寸
    windowWidth: readonly(windowWidth),
    windowHeight: readonly(windowHeight),

    // 基础断点
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    is3xl,

    // 设备类型
    isMobile,
    isTablet,
    isDesktop,
    isWideScreen,
    isUltraWide,

    // 屏幕方向
    isLandscape,
    isPortrait,

    // 具体范围
    isMobileOnly,
    isTabletOnly,
    isDesktopOnly,
    isLargeDesktop,
    isExtraLarge,

    // 计算属性
    gridCols,
    sidebarWidth,
    contentPadding,
    fontSize,
    buttonSize,
    tableConfig,
    modalConfig,
    navigationConfig,
    currentBreakpoint,

    // 工具函数
    between,
    greaterOrEqual,
    smaller,

    // 断点常量
    breakpoints,
  }
}

// 只读包装函数
function readonly<T>(ref: Ref<T>) {
  return computed(() => ref.value)
}

// 类型导出
export type UseResponsiveReturn = ReturnType<typeof useResponsive>
