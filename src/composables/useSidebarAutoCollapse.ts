import { ref, nextTick, onMounted, onUnmounted } from 'vue'

/**
 * 自动收缩侧边栏的 composable 函数
 * 当检测到内容溢出时，自动收缩侧边栏以提供更多空间
 */
export function useSidebarAutoCollapse(
  containerSelector: string,
  contentSelector: string,
  getSidebarCollapsed: () => boolean,
  setSidebarCollapsed: (collapsed: boolean) => void,
  options: {
    mainContentPadding?: number
    sidebarWidth?: number
    sidebarCollapsedWidth?: number
    enableLogging?: boolean
  } = {}
) {
  const {
    mainContentPadding = 64, // 32px * 2
    sidebarWidth = 280,
    sidebarCollapsedWidth = 80,
    enableLogging = false,
  } = options

  /**
   * 检查内容是否溢出，如果溢出则自动收缩侧边栏
   */
  const checkContentOverflow = () => {
    const container = document.querySelector(containerSelector)
    const contentElement = document.querySelector(contentSelector)

    if (!container || !contentElement) {
      if (enableLogging) {
        process.env.NODE_ENV === 'development' && console.log('自动收缩检查: 未找到必要的DOM元素', {
          container: !!container,
          contentElement: !!contentElement,
          containerSelector,
          contentSelector,
        })
      }
      return
    }

    const containerRect = container.getBoundingClientRect()
    const contentRect = contentElement.getBoundingClientRect()

    // 计算可用宽度
    const currentSidebarWidth = getSidebarCollapsed() ? sidebarCollapsedWidth : sidebarWidth
    const availableWidth = containerRect.width - currentSidebarWidth - mainContentPadding

    if (enableLogging) {
      process.env.NODE_ENV === 'development' && console.log('自动收缩检查:', {
        containerWidth: containerRect.width,
        contentWidth: contentRect.width,
        currentSidebarWidth,
        availableWidth,
        sidebarCollapsed: getSidebarCollapsed(),
        needsCollapse: contentRect.width > availableWidth,
      })
    }

    // 如果内容宽度超过可用宽度，且侧边栏未收缩，则收缩侧边栏
    if (contentRect.width > availableWidth && !getSidebarCollapsed()) {
      if (enableLogging) {
        process.env.NODE_ENV === 'development' && console.log('自动收缩: 内容溢出，收缩侧边栏')
      }
      setSidebarCollapsed(true)
    }
  }

  /**
   * 延迟检查内容溢出
   */
  const checkContentOverflowDelayed = (delay: number = 100) => {
    setTimeout(checkContentOverflow, delay)
  }

  /**
   * 触发检查（立即执行）
   */
  const triggerCheck = () => {
    nextTick(() => {
      checkContentOverflow()
    })
  }

  /**
   * 处理窗口大小变化
   */
  const handleResize = () => {
    checkContentOverflowDelayed(150) // 防抖延迟
  }

  /**
   * 更新屏幕尺寸相关的响应式处理
   */
  const updateScreenSize = () => {
    const isMobile = window.innerWidth <= 768
    const isTablet = window.innerWidth <= 1024

    if (isMobile && !getSidebarCollapsed()) {
      // 移动端自动收起侧边栏
      setSidebarCollapsed(true)
    }

    // 触发内容溢出检查
    checkContentOverflowDelayed(100)
  }

  // 清理函数
  const cleanup = () => {
    window.removeEventListener('resize', handleResize)
  }

  onMounted(() => {
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)

    // 初始检查
    nextTick(() => {
      updateScreenSize()
      setTimeout(checkContentOverflow, 100) // 延迟检查确保DOM完全渲染
    })
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    checkContentOverflow,
    checkContentOverflowDelayed,
    triggerCheck,
    handleResize,
    updateScreenSize,
    cleanup,
  }
}

export type SidebarAutoCollapseOptions = Parameters<typeof useSidebarAutoCollapse>[4]
