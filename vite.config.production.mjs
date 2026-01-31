import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 从 package.json 读取版本号
const packageJson = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8'))
const appVersion = packageJson.version

// 生产环境专用配置 - 用于打包独立exe
export default defineConfig({
  plugins: [vue()],
  base: './', // Electron需要相对路径

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
    devSourcemap: false
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // 生产环境不需要sourcemap
    minify: 'terser',
    chunkSizeWarningLimit: 2000,
    
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true
      }
    },

    rollupOptions: {
      output: {
        manualChunks: {
          // 🔧 局域网优化：更细粒度的代码分割，支持并行加载
          
          // 核心框架 - 最重要的依赖（必须首先加载）
          'vendor-core': ['vue', 'vue-router', 'pinia'],
          
          // UI组件库 - 拆分为核心和图标
          'vendor-ui-core': ['element-plus'],
          'vendor-ui-icons': ['@element-plus/icons-vue', 'lucide-vue-next'],
          
          // 图表库 - 按需加载 (拆分以减小体积)
          'vendor-charts-core': ['chart.js'],
          'vendor-echarts': ['echarts', 'vue-echarts'],
          
          // 工具库 - 拆分为核心和辅助
          'vendor-utils-core': ['axios', 'dayjs'],
          'vendor-utils-ui': ['clsx', 'tailwind-merge'],
          
          // Excel处理 - 大型库单独打包 (拆分以减小体积)
          // 这些库只在导出时才需要加载
          'vendor-excel-xlsx': ['xlsx'],
          'vendor-excel-js': ['exceljs'],
          'vendor-excel-zip': ['jszip']
        },
        
        // 优化文件命名 - 使用更短的hash
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            const name = path.basename(facadeModuleId, path.extname(facadeModuleId))
            return `assets/js/${name}-[hash:8].js`
          }
          return 'assets/js/[name]-[hash:8].js'
        },
        entryFileNames: 'assets/js/[name]-[hash:8].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash:8].[ext]`
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash:8].[ext]`
          }
          return `assets/${ext}/[name]-[hash:8].[ext]`
        }
      },
      
      // 外部依赖优化
      external: [],
      
      // 输入优化
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    },
    
    // 启用压缩
    reportCompressedSize: true,
    
    // 构建目标
    target: 'es2020',
    
    // 清理输出目录
    emptyOutDir: true
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
    exclude: [
      '@iconify/json',
      'fsevents'
    ]
  },

  // 定义全局常量
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __ENV__: JSON.stringify('production'),
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
  },

  // ESBuild配置 - 生产环境优化
  esbuild: {
    target: 'es2020',
    drop: ['console', 'debugger'],
    legalComments: 'none',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  },

  // 服务器配置（虽然生产环境不需要，但保留以防万一）
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})