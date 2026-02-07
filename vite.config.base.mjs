import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 获取应用版本号
export function getAppVersion() {
  const packageJson = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8'))
  return packageJson.version
}

/**
 * Vite 公共配置
 * 包含开发和生产环境共享的配置项
 */
export const baseConfig = {
  // Vue 插件
  plugins: [vue()],

  // 路径别名配置
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
      'chart.js',
      'echarts'
    ],
    exclude: ['@iconify/json', 'fsevents']
  },

  // 全局常量定义（函数形式，支持动态 mode）
  getDefine: (mode, version) => ({
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __ENV__: JSON.stringify(mode),
    'process.env.NODE_ENV': JSON.stringify(mode),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version)
  }),

  // ESBuild 基础配置
  esbuild: {
    target: 'es2020',
    legalComments: 'none'
  }
}

/**
 * 获取构建配置的公共部分
 */
export const getCommonBuildConfig = () => ({
  outDir: 'dist',
  assetsDir: 'assets',
  minify: 'terser',
})

export default baseConfig
