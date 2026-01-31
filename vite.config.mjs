import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 从 package.json 读取版本号
const packageJson = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8'))
const appVersion = packageJson.version

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

  return {
    plugins: [vue()],
    base: mode === 'production' ? './' : '/',

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@config': path.resolve(__dirname, './src/config'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@composables': path.resolve(__dirname, './src/composables'),
        '@services': path.resolve(__dirname, './src/services'),
        '@types': path.resolve(__dirname, './src/types')
      },
    },

    css: {
      postcss: './postcss.config.js',
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

    // 依赖预构建优化
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'pinia',
        'axios',
        'dayjs',
        'element-plus',
        '@element-plus/icons-vue',
        'chart.js',
        'echarts'
      ],
      exclude: ['@iconify/json', 'fsevents']
    },

    // 定义全局常量
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __ENV__: JSON.stringify(mode),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
    },

    // ESBuild配置
    esbuild: {
      target: 'es2020',
      drop: mode === 'production' ? ['console', 'debugger'] : [],
      legalComments: 'none'
    }
  }
})
