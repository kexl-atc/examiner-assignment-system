<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    @click.self="onClose"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
      <div class="p-6 space-y-4">
        <!-- 标题 -->
        <div class="flex items-start justify-between">
          <div class="flex items-center space-x-3">
            <div class="text-4xl">❌</div>
            <div>
              <h2 class="text-xl font-bold text-gray-900">系统错误</h2>
              <p class="text-sm text-gray-500">排班服务调用失败</p>
            </div>
          </div>
          <button
            @click="onClose"
            class="text-gray-400 hover:text-gray-600 transition-colors"
            title="关闭"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- 错误信息 -->
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="font-medium text-red-800 mb-2">错误详情：</div>
          <div class="text-sm text-red-700 font-mono whitespace-pre-wrap">{{ errorMessage }}</div>
        </div>

        <!-- 通用解决建议 -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="font-medium text-blue-800 mb-2">💡 通用解决建议：</div>
          <ol class="text-sm text-blue-700 space-y-2 list-decimal list-inside">
            <li>检查后端服务是否正在运行（在终端查看Quarkus日志）</li>
            <li>确认后端服务端口是否为 8081（或检查实际端口）</li>
            <li>如果是Electron环境，确保后端已完全启动</li>
            <li>检查防火墙或杀毒软件是否拦截了连接</li>
            <li>尝试重启应用程序</li>
          </ol>
        </div>

        <!-- 诊断工具 -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="font-medium text-yellow-800 mb-2">🔍 自动诊断：</div>
          <p class="text-sm text-yellow-700 mb-3">
            使用内置诊断工具检查后端连接状态和端点可用性
          </p>
          <router-link
            to="/diagnostics"
            class="inline-block px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors"
            @click="onClose"
          >
            打开诊断页面 →
          </router-link>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button
            @click="onClose"
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
          >
            关闭
          </button>
          <button
            @click="copyError"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            复制错误信息
          </button>
          <button
            v-if="onRetry"
            @click="handleRetry"
            class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// defineProps 和 defineEmits 在 <script setup> 中是自动可用的编译器宏，无需导入

interface Props {
  show: boolean
  errorMessage: string
  onRetry?: () => void
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

function onClose() {
  emit('close')
}

function handleRetry() {
  if (props.onRetry) {
    props.onRetry()
  }
  onClose()
}

function copyError() {
  navigator.clipboard.writeText(props.errorMessage).then(() => {
    alert('错误信息已复制到剪贴板')
  })
}
</script>

