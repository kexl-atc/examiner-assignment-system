import { defineConfig, loadEnv } from 'vite'
import { execSync } from 'child_process'
import { baseConfig, getAppVersion } from './vite.config.base.mjs'

// 🔧 Win7 兼容：移除 HTML 中的 crossorigin 属性
function removeCrossOriginPlugin() {
  return {
    name: 'remove-crossorigin',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml(html) {
      return html
        .replace(/\scrossorigin(="")?/g, '')
        .replace(/crossorigin /g, '')
    }
  }
}

// 检查后端端口是否可用（使用 netstat）
function checkBackendPort(port) {
  try {
    execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { 
      stdio: 'ignore',
      shell: true,
      windowsHide: true
    })
    return true
  } catch {
    return false
  }
}

// 智能检测后端端口
function detectBackendPort() {
  // 优先检查开发环境端口 8081
  if (checkBackendPort(8081)) {
    console.log('✅ 检测到后端运行在端口 8081 (开发环境)')
    return 8081
  }
  
  // 检查生产环境端口 8082
  if (checkBackendPort(8082)) {
    console.log('✅ 检测到后端运行在端口 8082 (生产环境)')
    return 8082
  }
  
  // 默认返回开发环境端口
  console.log('⚠️  未检测到后端服务，使用默认端口 8081')
  console.log('💡 提示：请确保后端服务已启动')
  console.log('   开发环境：cd optaplanner-service && mvn quarkus:dev')
  console.log('   生产环境：java -Dquarkus.profile=prod -jar supervisor/backend/app/quarkus-run.jar')
  return 8081
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // 智能检测后端端口
  const backendPort = detectBackendPort()
  const backendUrl = env.VITE_BACKEND_URL || `http://localhost:${backendPort}`
  
  console.log(`🔧 Vite 代理配置：${backendUrl}`)

  const appVersion = getAppVersion()

  return {
    // 使用公共配置
    ...baseConfig,

    // 开发/生产环境的 base 路径
    base: mode === 'production' ? './' : '/',

    // 🔧 Win7 兼容：使用插件移除 crossorigin 属性
    plugins: [
      ...(baseConfig.plugins || []),
      mode === 'production' && removeCrossOriginPlugin()
    ].filter(Boolean),

    // CSS 配置（覆盖公共配置，添加 devSourcemap）
    css: {
      ...baseConfig.css,
      devSourcemap: mode === 'development'
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production'
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // 核心框架
            vendor: ['vue', 'vue-router', 'pinia'],

            // 图表库
            charts: ['chart.js', 'echarts', 'vue-echarts'],

            // 工具库
            utils: ['axios', 'dayjs', 'lodash-es', 'clsx', 'tailwind-merge'],

            // UI组件库
            ui: ['@element-plus/icons-vue', 'element-plus'],

            // Excel处理
            excel: ['xlsx', 'exceljs', 'jszip']
          },
          // 优化文件命名
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      // 提高警告阈值
      chunkSizeWarningLimit: 1000
    },

    server: {
      port: 5173,
      host: '0.0.0.0',
      hmr: {
        overlay: mode === 'development'
      },
      proxy: {
        // 🚀 优化：所有API统一代理到Java后端（OptaPlanner服务）
        // 🔧 修复：智能检测后端端口，支持 8081（开发）和 8082（生产）
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.error('🚨 Vite Proxy Error:', err.message)
              console.error('💡 提示：请确保后端服务已启动')
              console.error(`   开发环境：cd optaplanner-service && mvn quarkus:dev (端口 8081)`)
              console.error(`   生产环境：java -Dquarkus.profile=prod -jar supervisor/backend/app/quarkus-run.jar (端口 8082)`)
              console.error(`   当前代理目标：${options.target}`)
            })
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`📡 代理请求：${req.method} ${req.url} -> ${options.target}${req.url}`)
            })
          }
        },
        // WebSocket 代理到后端 Quarkus (用于实时进度)
        '/ws': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
          secure: false
        }
      }
    },

    // 依赖预构建优化（使用公共配置）
    // optimizeDeps 已在 baseConfig 中定义

    // 定义全局常量（使用公共配置的函数）
    define: baseConfig.getDefine(mode, appVersion),

    // ESBuild配置（扩展公共配置）
    esbuild: {
      ...baseConfig.esbuild,
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    }
  }
})
