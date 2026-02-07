/**
 * Vite 公共配置 - 被 vite.config.mjs 和 vite.config.production.mjs 共享
 */
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * 获取应用版本号
 */
export function getAppVersion() {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

/**
 * 获取公共构建配置（用于生产环境扩展）
 */
export function getCommonBuildConfig() {
  return {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
  }
}

/**
 * 公共配置对象
 */
export const baseConfig = {
  // 插件
  plugins: [vue()],

  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './src/config'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@composables': path.resolve(__dirname, './src/composables'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },

  // CSS 配置
  css: {
    postcss: './postcss.config.js',
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
      'echarts',
      'vue-echarts',
      'chart.js',
      'exceljs',
      'xlsx',
      'jszip',
      'clsx',
      'tailwind-merge',
    ],
    exclude: ['@iconify/json', 'fsevents'],
  },

  // ESBuild 配置
  esbuild: {
    target: 'es2020',
  },

  /**
   * 获取 define 全局常量（根据 mode 和版本号）
   * @param {string} mode - 'development' | 'production'
   * @param {string} appVersion - 应用版本号
   */
  getDefine(mode, appVersion) {
    return {
      __APP_VERSION__: JSON.stringify(appVersion),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __ENV__: JSON.stringify(mode),
    }
  },
}
